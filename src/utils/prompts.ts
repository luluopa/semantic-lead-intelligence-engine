export const PROMPTS = {
    CLASSIFICATION_PROMPT_V1: (companyName: string, industry: string, annualRevenue: number, employeeCount: number) => {
        return `
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
        `
    }
}