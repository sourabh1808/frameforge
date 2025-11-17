import 'dotenv/config';
import { Worker } from 'bullmq';
import { connectDatabase } from './config/database.js';
import redisConnection from './config/redis.js';
import Project from './models/Project.js';
import { renderManimInCloud } from './services/cloudRenderer.js';

await connectDatabase();

const renderWorker = new Worker(
  'render',
  async (job) => {
    const { projectId, manimCode } = job.data;

    console.log(`Processing render job for project ${projectId}`);

    try {
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      project.status = 'rendering';
      await project.save();

      console.log(`Sending Manim code to cloud renderer for project ${projectId}`);

      const videoUrl = await renderManimInCloud(manimCode);

      project.status = 'completed';
      project.videoUrl = videoUrl;
      await project.save();

      console.log(`Successfully completed render for project ${projectId}`);
      console.log(`Video available at: ${videoUrl}`);

      return { success: true, videoUrl };
    } catch (error) {
      console.error(`Render failed for project ${projectId}:`, error);

      const project = await Project.findById(projectId);
      if (project) {
        project.status = 'failed';
        project.errorMessage = error.message || 'Rendering failed';
        await project.save();
      }

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

renderWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

renderWorker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Render worker started and listening for jobs...');
console.log(`Cloud renderer URL: ${process.env.RENDERER_URL || 'NOT CONFIGURED'}`);
