import * as Joi from 'joi';

// Validated once at boot. The app refuses to start if required secrets/config
// are missing rather than silently falling back to insecure defaults.
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().required(),
  COOKIE_SECURE: Joi.boolean().default(false),
  AUDIT_HASH_SECRET: Joi.string().min(32).required(),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_TTL: Joi.string().default('7d'),

  RATE_LIMIT_WINDOW_SECONDS: Joi.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(20),

  LLM_PROVIDER: Joi.string().valid('anthropic', 'openai', 'mock').default('mock'),
  ANTHROPIC_API_KEY: Joi.string().allow('').optional(),
  OPENAI_API_KEY: Joi.string().allow('').optional(),

  POLICY_BLOCKED_CATEGORIES: Joi.string().allow('').optional(),
});
