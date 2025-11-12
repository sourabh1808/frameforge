import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

const AnimationStudio = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('Untitled Animation');
  const [manimCode, setManimCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  useEffect(() => {
    if (project && ['generating-code', 'rendering'].includes(project.status)) {
      const interval = setInterval(() => {
        fetchProject();
      }, 3000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    } else {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    }
  }, [project?.status]);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/v1/projects/${projectId}`);
      setProject(response.data);
      setPrompt(response.data.prompt);
      setTitle(response.data.title);
      if (response.data.manimCode) {
        setManimCode(response.data.manimCode);
      }
    } catch (err) {
      setError('Failed to load project');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let newProject;
      if (projectId) {
        const updateRes = await axios.put(`/api/v1/projects/${projectId}`, {
          prompt,
          title,
        });
        newProject = updateRes.data;
      } else {
        const createRes = await axios.post('/api/v1/projects', {
          prompt,
          title,
        });
        newProject = createRes.data;
        navigate(`/studio/${createRes.data._id}`, { replace: true });
      }

      const generateRes = await axios.post(`/api/v1/projects/${newProject._id}/generate-code`);
      setProject(generateRes.data);
      if (generateRes.data.manimCode) {
        setManimCode(generateRes.data.manimCode);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate animation');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!manimCode.trim()) {
      setError('Code cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.put(`/api/v1/projects/${project._id}/code`, {
        manimCode,
      });
      setProject(response.data);
    } catch (err) {
      setError('Failed to regenerate with edited code');
    } finally {
      setLoading(false);
    }
  };

  const getProgressMessage = () => {
    const messages = {
      pending: 'Waiting to start...',
      'generating-code': 'Step 1/3: Generating Manim code with AI...',
      'code-ready': 'Step 2/3: Code ready, queuing render job...',
      rendering: 'Step 2/3: Compiling your animation...',
      completed: 'Step 3/3: Complete!',
      failed: 'Failed',
    };
    return messages[project?.status] || 'Processing...';
  };

  const handleDownload = () => {
    if (project?.videoUrl) {
      window.open(project.videoUrl, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-2xl font-bold border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1 w-full"
          placeholder="Animation Title"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-lg font-semibold mb-3">
          Describe your animation
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Example: Create a blue circle moving in a sine wave across the screen"
          disabled={loading || (project && ['generating-code', 'rendering'].includes(project.status))}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || (project && ['generating-code', 'rendering'].includes(project.status))}
          className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {loading ? 'Generating...' : project ? 'Regenerate' : 'Generate Animation'}
        </button>
      </div>

      {project && (
        <>
          {['generating-code', 'rendering', 'code-ready'].includes(project.status) && (
            <div className="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded mb-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-800 mr-3"></div>
                {getProgressMessage()}
              </div>
            </div>
          )}

          {project.status === 'failed' && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              Compilation Failed: {project.errorMessage || 'The Manim code was invalid. Try simplifying your prompt or editing the code.'}
            </div>
          )}

          {manimCode && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center mb-3">
                <label className="text-lg font-semibold">Generated Manim Code</label>
                <button
                  onClick={handleRegenerate}
                  disabled={loading || (project && ['generating-code', 'rendering'].includes(project.status))}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50 text-sm"
                >
                  Re-render with Edited Code
                </button>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <CodeMirror
                  value={manimCode}
                  height="400px"
                  extensions={[python()]}
                  onChange={(value) => setManimCode(value)}
                  theme="light"
                />
              </div>
            </div>
          )}

          {project.status === 'completed' && project.videoUrl && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Your Animation</h3>
              <video
                src={project.videoUrl}
                controls
                className="w-full rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                >
                  Download Video
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/studio/${project._id}`);
                    alert('Link copied to clipboard!');
                  }}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
                >
                  Copy Share Link
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnimationStudio;
