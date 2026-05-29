import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { Model } from '../utils/models';

@Injectable()
export class OllamaService {
    private static readonly logger = new Logger(OllamaService.name);

    static async generate(model: Model, prompt: string): Promise<Record<string, unknown>> {
        try {
            const response = await axios.post<Record<string, unknown>>(
                `${model.url}/api/generate`,
                {
                    model: model.name,
                    prompt,
                    stream: false,
                    format: 'json'
                }
            )

            const rawResponse = response.data.response as string;
            const rawJson = JSON.parse(rawResponse) as Record<string, unknown>;

            return rawJson;
        } catch (error: unknown) {
            this.logger.error(`Failed to generate response from model ${model}`, error)
        }
    }
}