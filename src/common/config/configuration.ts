import { type EnvSchema, parseCorsOrigins } from './env.schema';

export default () => {
  const nodeEnv = (process.env.NODE_ENV ??
    'development') as EnvSchema['NODE_ENV'];

  return {
    nodeEnv,
    port: parseInt(process.env.PORT ?? '5555', 10),
    cors: {
      origins: parseCorsOrigins(process.env.CORS_ORIGIN, nodeEnv),
      credentials: true,
    },
    database: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
  };
};
