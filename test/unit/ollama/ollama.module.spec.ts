import { Test, TestingModule } from '@nestjs/testing';
import { OllamaModule } from '../../../src/ollama/ollama.module';
import { OllamaService } from '../../../src/ollama/ollama.service';

describe('OllamaModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [OllamaModule],
    }).compile();

    expect(module).toBeDefined();
    expect(module.get(OllamaService)).toBeInstanceOf(OllamaService);
  });
});
