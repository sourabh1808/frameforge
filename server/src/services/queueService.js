import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

export const renderQueue = new Queue('render', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600,
    },
    removeOnFail: {
      count: 200,
      age: 7 * 24 * 3600,
    },
  },
});

export const addRenderJob = async (projectId, manimCode, renderSettings = {}) => {
  const job = await renderQueue.add('render-video', {
    projectId,
    manimCode,
    renderSettings: {
      quality: renderSettings.quality || 'medium',
      resolution: renderSettings.resolution || '1280x720',
      fps: renderSettings.fps || 30,
    },
  });

  return job;
};
