import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { LeadsModule } from './leads/leads.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { ClassificationModule } from './classification/classification.module';
import { WorkersModule } from './workers/workers.module';

@Module({
  imports: [
    PrismaModule,
    RabbitmqModule,
    LeadsModule,
    EnrichmentModule,
    ClassificationModule,
    WorkersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
