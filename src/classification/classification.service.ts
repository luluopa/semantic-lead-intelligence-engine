import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { z } from 'zod';

// Zod Schema to validate Ollama output
const OllamaResponseSchema = z.object({
  score: z.number().min(0).max(100),
  classification: z.enum(['HOT', 'WARM', 'COLD']),
  justification: z.string().min(10),
  commercialPotential: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export type ValidatedClassification = z.infer<typeof OllamaResponseSchema>;

@Injectable()
export class ClassificationService {
  private readonly logger = new Logger(ClassificationService.name);

  async classifyLead(
    leadData: Record<string, any>,
    enrichmentData: Record<string, any> | null,
  ): Promise<ValidatedClassification> {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = 'tinyllama';

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

    const prompt = `
      You are a B2B sales expert. Analyze this lead and return ONLY a valid JSON.
      Classification Rules:
      - HOT (High): Revenue > 1000000 and more than 50 employees.
      - WARM (Medium): Revenue between 500000 and 1000000.
      - COLD (Low): Revenue < 500000 or insufficient data.
      
      Lead Data:
      Name: ${companyName}
      Industry: ${industry}
      Revenue: ${annualRevenue}
      Employees: ${employeeCount}

      The JSON must have EXACTLY this format:
      {
        "score": number from 0 to 100,
        "classification": "HOT", "WARM" or "COLD",
        "justification": "Your justification here",
        "commercialPotential": "HIGH", "MEDIUM" or "LOW"
      }
    `;

    try {
      const response = await axios.post<Record<string, any>>(
        `${ollamaUrl}/api/generate`,
        {
          model,
          prompt,
          stream: false,
          format: 'json',
        },
      );

      const rawResponse = response.data.response as string;
      const rawJson = JSON.parse(rawResponse) as Record<string, unknown>;

      // Strict validation with Zod
      const validatedData = OllamaResponseSchema.parse(rawJson);

      return validatedData;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to classify lead with Ollama or invalid JSON returned',
        errorMessage,
      );
      throw new Error(`AI Classification Failed: ${errorMessage}`);
    }
  }
}
