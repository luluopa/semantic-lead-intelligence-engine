import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import {
  RabbitmqService,
  ENRICHMENT_QUEUE,
  CLASSIFICATION_QUEUE,
} from '../rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as amqp from 'amqplib';
import { Prisma } from '@prisma/client';

interface EnrichmentMessage {
  leadId: string;
}

@Injectable()
export class EnrichmentWorker implements OnModuleInit {
  private readonly logger = new Logger(EnrichmentWorker.name);

  constructor(
    private readonly rabbitmqService: RabbitmqService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.rabbitmqService.channelWrapper.addSetup(
      async (channel: amqp.ConfirmChannel) => {
        await channel.assertQueue(ENRICHMENT_QUEUE, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': 'lead.dlx',
            'x-dead-letter-routing-key': ENRICHMENT_QUEUE,
          },
        });

        await channel.consume(
          ENRICHMENT_QUEUE,
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          async (msg: amqp.ConsumeMessage | null) => {
            await this.processMessage(msg, channel);
          },
        );
      },
    );
  }

  async processMessage(
    msg: amqp.ConsumeMessage | null,
    channel: amqp.ConfirmChannel,
  ) {
    if (!msg) return;

    const content = JSON.parse(msg.content.toString()) as EnrichmentMessage;
    const { leadId } = content;

    try {
      this.logger.log(`Processing enrichment for lead ${leadId}`);

      // 1. Update lead status to ENRICHING
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'ENRICHING' },
      });

      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });
      if (!lead) throw new Error('Lead not found');

      // 2. Call Mock API
      const mockApiUrl = process.env.MOCK_API_URL || 'http://localhost:4000';
      const response = await axios.get<Record<string, any>>(
        `${mockApiUrl}/enrich/${lead.companyCnpj}`,
      );
      const data = response.data;

      // 3. Save Enrichment History (with JSONB fields)
      await this.prisma.enrichment.create({
        data: {
          leadId,
          companyName: String(data.companyName || ''),
          tradeName: String(data.tradeName || ''),
          cnpj: String(data.cnpj || ''),
          industry: String(data.industry || ''),
          legalNature: String(data.legalNature || ''),
          employeeCount: Number(data.employeeCount || 0),
          annualRevenue: Number(data.annualRevenue || 0),
          foundedAt: data.foundedAt ? new Date(String(data.foundedAt)) : null,
          address: data.address as Prisma.InputJsonValue,
          cnaes: data.cnaes as Prisma.InputJsonValue,
          partners: data.partners as Prisma.InputJsonValue,
          phones: data.phones as Prisma.InputJsonValue,
          emails: data.emails as Prisma.InputJsonValue,
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      // 4. Update lead status to ENRICHED
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'ENRICHED' },
      });

      // 5. QUEUE CHAINING: Trigger Classification after success
      this.logger.log(
        `Enrichment successful. Dispatching classification for lead ${leadId}`,
      );
      await this.rabbitmqService.publish(CLASSIFICATION_QUEUE, {
        leadId,
      });

      channel.ack(msg);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to enrich lead ${leadId}`, errorMessage);

      // Record failure in history
      await this.prisma.enrichment.create({
        data: {
          leadId,
          status: 'FAILED',
          errorMessage,
          completedAt: new Date(),
        },
      });

      // Update lead status to FAILED
      await this.prisma.lead.update({
        where: { id: leadId },
        data: { status: 'FAILED' },
      });

      // Nack to send to DLQ
      channel.nack(msg, false, false);
    }
  }
}
