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