export default () => ({
  port: parseInt(process.env.PORT ?? '5555', 10),
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  },
});
