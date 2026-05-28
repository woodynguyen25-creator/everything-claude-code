export const PRICING = {
  gemini:   { input: 0.075, output: 0.30 },
  cerebras: { input: 0.20,  output: 0.60 },
  groq:     { input: 0.59,  output: 0.79 },
  deepseek: { input: 0.27,  output: 1.10 },
} as const;

export type Provider = keyof typeof PRICING;

export function estimateCost(
  provider: Provider,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[provider];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '$0.0000';
  return `$${usd.toFixed(4)}`;
}
