import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from '../../../src/leads/leads.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { RabbitmqService, ENRICHMENT_QUEUE } from '../../../src/rabbitmq/rabbitmq.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { LeadSource } from '@prisma/client';

describe('LeadsService', () => {
  let service: LeadsService;
  let prismaService: PrismaService;
  let rabbitmqService: RabbitmqService;

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockRabbitmqService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RabbitmqService, useValue: mockRabbitmqService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prismaService = module.get<PrismaService>(PrismaService);
    rabbitmqService = module.get<RabbitmqService>(RabbitmqService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createLeadDto = {
      fullName: 'Test Lead',
      email: 'test@example.com',
      phone: '+5511999999999',
      companyName: 'Test Corp',
      companyCnpj: '12345678000199',
      source: 'WEBSITE' as LeadSource,
    };

    it('should create a lead successfully and publish to enrichment queue', async () => {
      const mockCreatedLead = { id: 'uuid-123', ...createLeadDto, status: 'PENDING' };
      
      mockPrismaService.lead.findUnique.mockResolvedValue(null);
      mockPrismaService.lead.create.mockResolvedValue(mockCreatedLead);

      const result = await service.create(createLeadDto);

      expect(result).toEqual(mockCreatedLead);
      expect(mockPrismaService.lead.create).toHaveBeenCalledWith({
        data: { ...createLeadDto, status: 'PENDING' },
      });
      // Check if it triggered ONLY for the enrichment queue
      expect(mockRabbitmqService.publish).toHaveBeenCalledTimes(1);
      expect(mockRabbitmqService.publish).toHaveBeenCalledWith(ENRICHMENT_QUEUE, {
        leadId: mockCreatedLead.id,
      });
    });

    it('should throw ConflictException if email is already in use', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValueOnce({ id: 'existing-id' });

      await expect(service.create(createLeadDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.lead.create).not.toHaveBeenCalled();
      expect(mockRabbitmqService.publish).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if CNPJ is already in use', async () => {
      mockPrismaService.lead.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'existing-id' }); // cnpj check

      await expect(service.create(createLeadDto)).rejects.toThrow(ConflictException);
      expect(mockPrismaService.lead.create).not.toHaveBeenCalled();
      expect(mockRabbitmqService.publish).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a lead with its relations', async () => {
      const mockLead = { id: 'uuid-123', fullName: 'Test Lead' };
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.findOne('uuid-123');

      expect(result).toEqual(mockLead);
      expect(mockPrismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        include: {
          enrichments: { orderBy: { requestedAt: 'desc' } },
          classifications: { orderBy: { requestedAt: 'desc' } },
        },
      });
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });
});
