import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { OllamaService} from '../ollama/ollama.service';
import { z as zod } from 'zod';
import { MODELS_AVAILABLE } from '../utils/models';
import { PROMPTS } from '../utils/prompts'

// Zod Schema to validate Ollama output
const OllamaResponseSchema = zod.object({
  score: zod.number().min(0).max(100),
  classification: zod.enum(['HOT', 'WARM', 'COLD']),
  justification: zod.string().min(10),
  commercialPotential: zod.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export type ValidatedClassification = zod.infer<typeof OllamaResponseSchema>;

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  async classifyLead(
    leadData: Record<string, unknown>,
    enrichmentData: Record<string, unknown> | null,
  ): Promise<ValidatedClassification> {
    const model = MODELS_AVAILABLE.find(model => model.name == 'tinyllama');

    const industry = enrichmentData?.industry
      ? String(enrichmentData.industry)
      : 'Unknown';
    const annualRevenue = enrichmentData?.annualRevenue
      ? Number(enrichmentData.annualRevenue)
      : 0;
    const employeeCount = enrichmentData?.employeeCount
      ? Number(enrichmentData.employeeCount)
      : 0;
    const companyName = leadData.companyName
      ? String(leadData.companyName)
      : 'Unknown';

    const prompt = PROMPTS.CLASSIFICATION_PROMPT_V1(companyName, industry, annualRevenue, employeeCount);

    try {
      const rawJson = await OllamaService.generate(model, prompt);

      // Strict validation with Zod
      const validatedData = OllamaResponseSchema.parse(rawJson);

      return validatedData;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to classify lead with Ollama or invalid JSON returned', errorMessage);
      throw new Error(`AI Classification Failed: ${errorMessage}`);
    }
  }
}
