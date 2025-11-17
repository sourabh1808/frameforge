# Cloud Manim Renderer Setup Guide

This guide will help you deploy the Manim rendering service to Google Cloud Run.

## Why Cloud Rendering?

FrameForge uses a cloud-native architecture that provides:
- ✅ Runs rendering on Google Cloud infrastructure
- ✅ Scales automatically based on demand
- ✅ No local resource constraints
- ✅ Videos stored in Google Cloud Storage with public URLs
- ✅ Pay-per-use pricing (free tier available)

## Architecture

```
User → React Frontend → Node.js API → Google Cloud Run (Manim Renderer) → Google Cloud Storage → Video URL
```

## Step 1: Create the Manim Renderer Service

Create a new directory for your cloud renderer:

```bash
mkdir manim-cloud-renderer
cd manim-cloud-renderer
```

### File 1: `Dockerfile`

```dockerfile
# Deploys the official Manim image with a Python web server
FROM manimcommunity/manim:stable
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# $PORT is provided by Cloud Run
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:server
```

### File 2: `requirements.txt`

```
Flask==3.0.3
gunicorn==22.0.0
google-cloud-storage==2.17.0
```

### File 3: `app.py`

```python
import os
import subprocess
import uuid
from flask import Flask, request, jsonify
from google.cloud import storage

# This will be configured by the user via environment variables
GCS_BUCKET_NAME = os.environ.get('GCS_BUCKET_NAME') 

storage_client = storage.Client()
server = Flask(__name__)

if GCS_BUCKET_NAME:
    bucket = storage_client.bucket(GCS_BUCKET_NAME)
else:
    print("FATAL ERROR: GCS_BUCKET_NAME environment variable not set.")
    bucket = None

@server.route('/render', methods=['POST'])
def render_manim_scene():
    if not bucket:
        return jsonify({"error": "Server is not configured. GCS_BUCKET_NAME is missing."}), 500
        
    data = request.get_json()
    if 'code' not in data:
        return jsonify({"error": "No 'code' field."}), 400

    manim_code = data['code']
    job_id = str(uuid.uuid4())
    scene_dir = os.path.join('/tmp', job_id)
    os.makedirs(scene_dir, exist_ok=True)
    script_path = os.path.join(scene_dir, 'scene.py')
    
    with open(script_path, 'w') as f:
        f.write(manim_code)

    try:
        # Run Manim command
        subprocess.run(
            ['manim', '-qm', script_path],
            cwd=scene_dir,
            capture_output=True, text=True, timeout=1700, check=True
        )
        
        # Find the output file
        output_dir = os.path.join(scene_dir, 'media', 'videos', 'scene', '1080p60')
        video_files = [f for f in os.listdir(output_dir) if f.endswith('.mp4')]
        
        if not video_files:
            return jsonify({"error": "Manim ran but no video file was found."}), 500

        # Upload to GCS
        local_video_path = os.path.join(output_dir, video_files[0])
        gcs_video_name = f'renders/{job_id}/{video_files[0]}'
        blob = bucket.blob(gcs_video_name)
        blob.upload_from_filename(local_video_path)
        
        # Make the blob publicly accessible
        blob.make_public()
        
        # Return public URL
        public_url = blob.public_url
        return jsonify({"video_url": public_url})

    except subprocess.CalledProcessError as e:
        return jsonify({"error": "Manim compilation failed.", "logs": e.stderr}), 500
    except Exception as e:
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    server.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
```

## Step 2: Set Up Google Cloud

### 2.1: Install Google Cloud CLI

Download and install: https://cloud.google.com/sdk/docs/install

### 2.2: Login and Set Project

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

If you don't have a project:
```bash
gcloud projects create frameforge-render-$(date +%s) --name="FrameForge Renderer"
gcloud config set project frameforge-render-XXXXX
```

### 2.3: Enable Required APIs

```bash
gcloud services enable run.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Step 3: Create Google Cloud Storage Bucket

```bash
gsutil mb -l us-central1 gs://frameforge-videos-$(date +%s)
```

**Note the bucket name!** You'll need it for the next step.

Make the bucket publicly readable:
```bash
gsutil iam ch allUsers:objectViewer gs://YOUR_BUCKET_NAME
```

## Step 4: Deploy to Cloud Run

From your `manim-cloud-renderer` directory:

```bash
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

**Important:** Replace `YOUR_BUCKET_NAME` with your actual bucket name!

This will:
- Build the Docker image
- Deploy to Cloud Run
- Give you a public URL like: `https://manim-renderer-XXXXX-uc.a.run.app`

## Step 5: Configure Your Node.js Application

Copy the Cloud Run URL from the deployment output.

Update your `server/.env` file:

```env
# Add this line with your Cloud Run URL
RENDERER_URL=https://manim-renderer-XXXXX-uc.a.run.app/render
```

## Step 6: Test the Setup

Run your backend:
```bash
cd server
npm run dev
npm run worker  # In another terminal
```

Run your frontend:
```bash
cd client
npm run dev
```

Create an animation and it will now render in the cloud!

## Monitoring & Troubleshooting

### View Cloud Run Logs
```bash
gcloud run services logs read manim-renderer --region us-central1
```

### Check Service Status
```bash
gcloud run services describe manim-renderer --region us-central1
```

### Test the Renderer Directly
```bash
curl -X POST https://YOUR_CLOUD_RUN_URL/render \
  -H "Content-Type: application/json" \
  -d '{
    "code": "from manim import *\n\nclass PromptAnimation(Scene):\n    def construct(self):\n        circle = Circle(color=BLUE)\n        self.play(Create(circle))\n        self.wait()"
  }'
```

## Costs

- **Cloud Run**: Free tier includes 2 million requests/month
- **Cloud Storage**: ~$0.02/GB/month
- **Bandwidth**: First 1GB free, then ~$0.12/GB

For typical usage (10-20 animations/day), expect **< $5/month**.

## Scaling

Cloud Run automatically scales from 0 to 1000 instances based on load. No configuration needed!

## Security Notes

- The `/render` endpoint is public (no authentication)
- Consider adding API key authentication for production
- Videos are publicly accessible via GCS URLs
- Implement rate limiting if needed

## Next Steps

- ✅ Deploy the cloud renderer
- ✅ Update your `.env` with `RENDERER_URL`
- ✅ Remove Docker Desktop (no longer needed!)
- ✅ Enjoy stable, scalable rendering
