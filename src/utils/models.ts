export type Model = {
    name: string;
    description: string;
    url: string;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

export const MODELS_AVAILABLE: Model[] = [
    {
        name: 'tinyllama',
        description: 'A small, fast, and efficient model for classification tasks. Recommended for low-latency applications.',
        url: OLLAMA_URL,
    }
];

