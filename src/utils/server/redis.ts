import Redis from 'ioredis';

export const redis_connection = new Redis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    // password: process.env.REDIS_PASSWORD,
  }
);
redis_connection.on('connect', () => {
  console.info('Redis connected');
});
