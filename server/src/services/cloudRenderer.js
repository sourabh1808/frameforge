import axios from 'axios';

const CLOUD_RENDERER_URL = process.env.RENDERER_URL || null;

export const renderManimInCloud = async (manimCode) => {
  if (!CLOUD_RENDERER_URL || CLOUD_RENDERER_URL === 'USER_MUST_PROVIDE_THIS_URL') {
    console.error('FATAL: RENDERER_URL is not configured in environment variables.');
    throw new Error('Cloud renderer service is not configured. Please set RENDERER_URL in your .env file.');
  }

  console.log(`Sending render job to cloud worker at ${CLOUD_RENDERER_URL}...`);
  
  try {
    const response = await axios.post(
      CLOUD_RENDERER_URL,
      {
        code: manimCode,
      },
      {
        timeout: 1800 * 1000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && response.data.video_url) {
      console.log('Render job complete! Video URL:', response.data.video_url);
      return response.data.video_url;
    } else {
      throw new Error(response.data.error || 'Unknown rendering error from cloud worker');
    }
  } catch (error) {
    console.error('Error calling cloud renderer:', error.message);
    
    if (error.response && error.response.data) {
      console.error('Cloud Worker Error Details:', error.response.data.logs || error.response.data.error);
      throw new Error(error.response.data.error || 'Failed to render video in cloud.');
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to cloud renderer. Is the service running?');
    }
    
    if (error.code === 'ETIMEDOUT') {
      throw new Error('Cloud renderer request timed out. The animation may be too complex.');
    }
    
    throw new Error('Failed to connect to cloud renderer: ' + error.message);
  }
};
