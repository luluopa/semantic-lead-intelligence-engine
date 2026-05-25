import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  RabbitmqService,
  ENRICHMENT_QUEUE,
  CLASSIFICATION_QUEUE,
} from '../rabbitmq/rabbitmq.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { Prisma, LeadSource } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmqService: RabbitmqService,
  ) {}

  async create(dto: CreateLeadDto) {
    // Uniqueness validation
    const existingEmail = await this.prisma.lead.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Email already in use');

    const existingCnpj = await this.prisma.lead.findUnique({
      where: { companyCnpj: dto.companyCnpj },
    });
    if (existingCnpj) throw new ConflictException('CNPJ already in use');

    // Create lead with PENDING status
    const newLead = await this.prisma.lead.create({
      data: {
        ...dto,
        status: 'PENDING',
      },
    });

    // SINGLE TRIGGER: Only Enrichment (Queue chaining for Classification will be handled by the Worker)
    await this.rabbitmqService.publish(ENRICHMENT_QUEUE, {
      leadId: newLead.id,
    });

    return newLead;
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        enrichments: { orderBy: { requestedAt: 'desc' } },
        classifications: { orderBy: { requestedAt: 'desc' } },
      },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    return lead;
  }

  async findAll(page: number = 1, limit: number = 10, search?: string, source?: LeadSource) {
    const skip = (page - 1) * limit;
    
    const where: Prisma.LeadWhereInput = {};
    
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (source) {
      where.source = source;
    }
    
    const [data, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);

    // Prevent updating immutable fields via spread (for security)
    delete dto.email;
    delete dto.companyCnpj;

    return this.prisma.lead.update({
      where: { id },
      data: dto,
    });
  }

  async exportData() {
    // For simplicity, we will only fetch leads with the most recent classifications
    return this.prisma.lead.findMany({
      include: {
        enrichments: { orderBy: { requestedAt: 'desc' }, take: 1 },
        classifications: { orderBy: { requestedAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async requestEnrichment(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);

    await this.rabbitmqService.publish(ENRICHMENT_QUEUE, { leadId: id });
    return { message: 'Enrichment requested successfully' };
  }

  async requestClassification(id: string) {
    const lead = await this.prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);

    await this.rabbitmqService.publish(CLASSIFICATION_QUEUE, { leadId: id });
    return { message: 'Classification requested successfully' };
  }
}
