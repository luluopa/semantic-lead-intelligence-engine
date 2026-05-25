import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitmqService,
  CLASSIFICATION_QUEUE,
} from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
import { ClassificationService } from '../classification/classification.service';
import * as amqp from 'amqplib';

interface ClassificationMessage {
  leadId: string;
}

@Injectable()
export class ClassificationWorker implements OnModuleInit {
  private readonly logger = new Logger(ClassificationWorker.name);

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly prisma: PrismaService,
    private readonly classificationService: ClassificationService,
  ) {}

  async onModuleInit() {
    await this.rabbitmqService.channelWrapper.addSetup(
      async (channel: amqp.ConfirmChannel) => {
        await channel.assertQueue(CLASSIFICATION_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'lead.dlx',
            'x-dead-letter-routing-key': CLASSIFICATION_QUEUE,
          },
        });

        await channel.consume(
          CLASSIFICATION_QUEUE,
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          async (msg: amqp.ConsumeMessage | null) => {
            if (!msg) return;

            const content = JSON.parse(
              msg.content.toString(),
            ) as ClassificationMessage;
            const { leadId } = content;

            try {
              this.logger.log(`Processing classification for lead ${leadId}`);

              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'CLASSIFYING' },
              });

              const lead = await this.prisma.lead.findUnique({
                where: { id: leadId },
                include: {
                  enrichments: { orderBy: { createdAt: 'desc' }, take: 1 },
                },
              });

              if (!lead) throw new Error('Lead not found');

              const latestEnrichment = lead.enrichments[0];

              // Call AI service with Zod Validation
              const aiResult = await this.classificationService.classifyLead(
                lead,
                latestEnrichment || null,
              );

              // Save Classification History
              await this.prisma.aiClassification.create({
                data: {
                  leadId,
                  score: aiResult.score,
                  classification: aiResult.classification,
                  justification: aiResult.justification,
                  commercialPotential: aiResult.commercialPotential,
                  modelUsed: 'tinyllama',
                  status: 'SUCCESS',
                  completedAt: new Date(),
                },
              });

              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'CLASSIFIED' },
              });

              this.logger.log(`Classification successful for lead ${leadId}`);
              channel.ack(msg);
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : 'Unknown error';
              this.logger.error(
                `Failed to classify lead ${leadId}`,
                errorMessage,
              );

              await this.prisma.aiClassification.create({
                data: {
                  leadId,
                  status: 'FAILED',
                  errorMessage,
                  completedAt: new Date(),
                },
              });

              await this.prisma.lead.update({
                where: { id: leadId },
                data: { status: 'FAILED' },
              });

              // Nack to send to DLQ
              channel.nack(msg, false, false);
            }
          },
        );
      },
    );
  }
}
