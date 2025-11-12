import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/v1/projects');
      setProjects(response.data);
    } catch (err) {
      setError('Failed to load projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await axios.delete(`/api/v1/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      alert('Failed to delete project');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-200 text-gray-800',
      'generating-code': 'bg-blue-200 text-blue-800',
      'code-ready': 'bg-yellow-200 text-yellow-800',
      rendering: 'bg-purple-200 text-purple-800',
      completed: 'bg-green-200 text-green-800',
      failed: 'bg-red-200 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status] || badges.pending}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-xl">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Link
          to="/studio"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Create New Animation
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">You haven't created any animations yet.</p>
          <Link
            to="/studio"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Create Your First Animation
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                {project.videoUrl ? (
                  <video
                    src={project.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="text-white text-lg font-semibold">
                    {project.title}
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold truncate flex-1">
                    {project.title}
                  </h3>
                  {getStatusBadge(project.status)}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {project.prompt}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/studio/${project._id}`)}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition text-sm"
                  >
                    {project.status === 'completed' ? 'View' : 'Continue'}
                  </button>
                  <button
                    onClick={() => handleDelete(project._id)}
                    className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
