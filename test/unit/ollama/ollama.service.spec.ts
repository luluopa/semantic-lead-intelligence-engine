import axios from 'axios';
import { Logger } from '@nestjs/common';
import { OllamaService } from '../../../src/ollama/ollama.service';
import { Model } from '../../../src/utils/models';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaService', () => {
  const mockModel: Model = {
    name: 'test-model',
    description: 'Test Description',
    url: 'http://test-url',
  };
  const mockPrompt = 'Test Prompt';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generate', () => {
    it('should successfully generate a response and parse it as JSON', async () => {
      const mockResponseData = {
        response: JSON.stringify({ key: 'value' }),
      };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponseData });

      const result = await OllamaService.generate(mockModel, mockPrompt);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockModel.url}/api/generate`,
        {
          model: mockModel.name,
          prompt: mockPrompt,
          stream: false,
          format: 'json',
        },
      );
      expect(result).toEqual({ key: 'value' });
    });

    it('should log an error and return undefined when axios fails', async () => {
      const error = new Error('Axios error');
      mockedAxios.post.mockRejectedValueOnce(error);
      
      // Spy on the static logger of OllamaService
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      const result = await OllamaService.generate(mockModel, mockPrompt);

      expect(result).toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();
      
      loggerSpy.mockRestore();
    });

    it('should log an error and return undefined when JSON parsing fails', async () => {
      const mockResponseData = {
        response: 'invalid-json',
      };
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponseData });
      const loggerSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

      const result = await OllamaService.generate(mockModel, mockPrompt);

      expect(result).toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();

      loggerSpy.mockRestore();
    });
  });
});
