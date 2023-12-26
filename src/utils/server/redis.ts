import Redis from 'ioredis';

export const redis_connection = new Redis('redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
redis_connection.on('connect', () => {
  console.info('Redis connected');
});
