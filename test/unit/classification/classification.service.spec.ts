import { Test, TestingModule } from '@nestjs/testing';
import { ClassificationService } from '../../../src/classification/classification.service';
import { OllamaService } from '../../../src/ollama/ollama.service';

describe('ClassificationService', () => {
  let service: ClassificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClassificationService],
    }).compile();

    service = module.get<ClassificationService>(ClassificationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyLead', () => {
    it('should successfully classify a lead', async () => {
      const leadData = { companyName: 'Test Corp' };
      const enrichmentData = { industry: 'Tech', annualRevenue: 1000000, employeeCount: 100 };
      
      const mockOllamaResponse = {
        score: 90,
        classification: 'HOT',
        justification: 'High revenue and employee count',
        commercialPotential: 'HIGH',
      };

      const generateSpy = jest.spyOn(OllamaService, 'generate').mockResolvedValue(mockOllamaResponse);

      const result = await service.classifyLead(leadData, enrichmentData);

      expect(result).toEqual(mockOllamaResponse);
      expect(generateSpy).toHaveBeenCalled();
    });

    it('should handle missing enrichment data with defaults', async () => {
      const leadData = { companyName: 'Test Corp' };
      const enrichmentData = null;
      
      const mockOllamaResponse = {
        score: 50,
        classification: 'WARM',
        justification: 'Moderate potential',
        commercialPotential: 'MEDIUM',
      };

      const generateSpy = jest.spyOn(OllamaService, 'generate').mockResolvedValue(mockOllamaResponse);

      const result = await service.classifyLead(leadData, enrichmentData);

      expect(result).toEqual(mockOllamaResponse);
      expect(generateSpy).toHaveBeenCalled();
    });

    it('should throw an error when OllamaService returns invalid data', async () => {
      const leadData = { companyName: 'Test Corp' };
      const enrichmentData = { industry: 'Tech', annualRevenue: 1000000, employeeCount: 100 };
      
      const mockInvalidResponse = {
        score: 'invalid', // Should be a number
      };

      jest.spyOn(OllamaService, 'generate').mockResolvedValue(mockInvalidResponse);

      await expect(service.classifyLead(leadData, enrichmentData)).rejects.toThrow('AI Classification Failed');
    });

    it('should throw an error when OllamaService fails', async () => {
      const leadData = { companyName: 'Test Corp' };
      const enrichmentData = { industry: 'Tech', annualRevenue: 1000000, employeeCount: 100 };
      
      jest.spyOn(OllamaService, 'generate').mockRejectedValue(new Error('Ollama error'));

      await expect(service.classifyLead(leadData, enrichmentData)).rejects.toThrow('AI Classification Failed');
    });
  });
});
