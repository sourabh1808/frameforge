import { Redis } from 'ioredis';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
};

if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
}

const redisConnection = new Redis(redisConfig);

redisConnection.on('connect', () => {
  console.log('Redis Connected');
});

redisConnection.on('error', (err) => {
  console.error('Redis Error:', err);
});

export default redisConnection;
