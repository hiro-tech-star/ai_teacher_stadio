/**
 * AI Teacher Studio - Centralized OpenAI & Cost Protection Configuration
 */

const CONFIG = {
  // Model Configuration
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  
  // Output and Input Limits (800 tokens ensures complete 3-layer JSON without truncation)
  MAX_OUTPUT_TOKENS: parseInt(process.env.MAX_OUTPUT_TOKENS || '800', 10),
  MAX_INPUT_CHARS: parseInt(process.env.MAX_INPUT_CHARS || '200', 10),
  
  // Per-User / Per-Client Usage Quotas (Prevents cost runaway on public demo)
  MAX_REQUESTS_PER_DAY: parseInt(process.env.MAX_REQUESTS_PER_DAY || '100', 10),
  
  // Rate Limiting (Protects from spam / rapid burst requests)
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '30000', 10), // 30 seconds
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10), // max 10 reqs per 30s
  
  // Conversation History Window (Limits prompt context size)
  MAX_HISTORY_MESSAGES: parseInt(process.env.MAX_HISTORY_MESSAGES || '6', 10)
};

module.exports = CONFIG;
