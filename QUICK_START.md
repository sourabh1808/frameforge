# FrameForge - Quick Start Guide

Get FrameForge running in **under 30 minutes** using cloud services.

## Prerequisites

- Node.js 20+ installed
- Google Cloud account (free tier available)
- Google AI Studio API key

## Step 1: Get API Keys (5 minutes)

### 1.1: Google AI Studio
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Save the key

### 1.2: MongoDB Atlas (Optional - Cloud Database)
1. Visit https://www.mongodb.com/cloud/atlas
2. Sign up for free account
3. Create a cluster (free tier M0)
4. Get connection string
5. Whitelist your IP address

### 1.3: Upstash Redis (Optional - Cloud Redis)
1. Visit https://upstash.com
2. Sign up for free account
3. Create Redis database
4. Note: Host, Port, Password

## Step 2: Clone & Install (3 minutes)

```bash
# Clone repository
git clone https://github.com/sourabh1808/frameforge.git
cd frameforge

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

## Step 3: Deploy Cloud Renderer (10 minutes)

Create a new folder for the renderer:

```bash
mkdir manim-cloud-renderer
cd manim-cloud-renderer
```

Create these 3 files:

**Dockerfile:**
```dockerfile
FROM manimcommunity/manim:stable
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:server
```

**requirements.txt:**
```
Flask==3.0.3
gunicorn==22.0.0
google-cloud-storage==2.17.0
```

**app.py:**
```python
import os
import subprocess
import uuid
from flask import Flask, request, jsonify
from google.cloud import storage

GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME')
storage_client = storage.Client()
server = Flask(__name__)

if GCS_BUCKET_NAME:
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
else:
    bucket = None

@server.route('/render', methods=['POST'])
def render_manim_scene():
    if not bucket:
        return jsonify({"error": "GCS_BUCKET_NAME not set"}), 500
    
    data = request.get_json()
    if 'code' not in data:
        return jsonify({"error": "No 'code' field"}), 400

    manim_code = data['code']
    job_id = str(uuid.uuid4())
    scene_dir = os.path.join('/tmp', job_id)
    os.makedirs(scene_dir, exist_ok=True)
    script_path = os.path.join(scene_dir, 'scene.py')
    
    with open(script_path, 'w') as f:
        f.write(manim_code)

    try:
        subprocess.run(
            ['manim', '-qm', script_path],
            cwd=scene_dir,
            capture_output=True, text=True, timeout=1700, check=True
        )
        
        output_dir = os.path.join(scene_dir, 'media', 'videos', 'scene', '1080p60')
        video_files = [f for f in os.listdir(output_dir) if f.endswith('.mp4')]
        
        if not video_files:
            return jsonify({"error": "No video file found"}), 500

        local_video_path = os.path.join(output_dir, video_files[0])
        gcs_video_name = f'renders/{job_id}/{video_files[0]}'
        blob = bucket.blob(gcs_video_name)
        blob.upload_from_filename(local_video_path)
        blob.make_public()
        
        return jsonify({"video_url": blob.public_url})

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Manim failed", "logs": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    server.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
```

**Deploy to Google Cloud:**

```bash
# Login to Google Cloud
gcloud auth login

# Create project (or use existing)
gcloud projects create frameforge-$(date +%s) --name="FrameForge"
gcloud config set project YOUR_PROJECT_ID

# Enable services
gcloud services enable run.googleapis.com storage.googleapis.com cloudbuild.googleapis.com

# Create storage bucket
gsutil mb -l us-central1 gs://frameforge-videos-$(date +%s)
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME

# Deploy to Cloud Run
gcloud run deploy manim-renderer \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 1800 \
  --set-env-vars GCS_BUCKET_NAME=YOUR_BUCKET_NAME
```

**Save the Cloud Run URL** - you'll need it in the next step!

## Step 4: Configure Environment (2 minutes)

Edit `server/.env`:

```env
PORT=5000
NODE_ENV=development

# MongoDB Atlas connection string (or use local: mongodb://localhost:27017/frameforge)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/frameforge

# Google AI API Key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Upstash Redis (or use local: localhost)
REDIS_HOST=your-redis-host.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Cloud Renderer URL (from Step 3)
RENDERER_URL=https://manim-renderer-xxxxx-uc.a.run.app/render

JWT_SECRET=frameforge-secret-key-change-in-production
JWT_EXPIRES_IN=7d
STORAGE_PATH=./storage/videos
CLIENT_URL=http://localhost:5173
```

## Step 5: Start Application (2 minutes)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Worker:**
```bash
cd server
npm run worker
```

**Terminal 3 - Frontend:**
```bash
cd client
npm run dev
```

## Step 6: Test It! (1 minute)

1. Open http://localhost:5173
2. Sign up for an account
3. Create a new animation
4. Enter prompt: "Create a blue circle that grows and then shrinks"
5. Click "Generate Animation"
6. Wait 30-60 seconds
7. Watch your video!

## Troubleshooting

**"RENDERER_URL not configured"**
- Add `RENDERER_URL` to `server/.env`

**"Cannot connect to MongoDB"**
- Check MongoDB Atlas connection string
- Whitelist your IP in Network Access

**"Redis connection error"**
- Verify Upstash credentials
- Or run local Redis: `docker run -d -p 6379:6379 redis:alpine`

**"Cloud renderer failed"**
- Check Cloud Run logs: `gcloud run services logs read manim-renderer`
- Verify GCS bucket permissions

## What's Next?

- Customize the AI prompts in `server/src/services/aiService.js`
- Add more complex animations
- Deploy to production (Vercel + Railway)
- Add user quotas and rate limiting

## Cost Estimate

Using free tiers:
- Google AI Studio: Free (up to limits)
- MongoDB Atlas: Free (512MB)
- Upstash Redis: Free (10K commands/day)
- Google Cloud Run: Free tier (2M requests/month)
- **Total: $0-5/month** for moderate usage

## Support

- Read the full guide: [CLOUD_RENDERER_SETUP.md](CLOUD_RENDERER_SETUP.md)
- Check [README.md](README.md) for detailed documentation

Happy animating! 🎬✨
