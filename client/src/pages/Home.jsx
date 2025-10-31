import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Home.css'

function Home() {
  const [sessionId, setSessionId] = useState('')
  const [userName, setUserName] = useState('')
  const [isHost, setIsHost] = useState(true)
  const navigate = useNavigate()

  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  const handleCreateSession = () => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }
    const newSessionId = generateSessionId()
    navigate(`/setup?session=${newSessionId}&name=${userName}&host=true`)
  }

  const handleJoinSession = () => {
    if (!userName.trim() || !sessionId.trim()) {
      alert('Please enter your name and session ID')
      return
    }
    navigate(`/setup?session=${sessionId}&name=${userName}&host=false`)
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="logo">FrameForge</h1>
        <p className="tagline">Professional Virtual Interviews & Podcasting</p>

        <div className="session-card">
          <div className="input-group">
            <label>Your Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
          </div>

          <div className="tabs">
            <button 
              className={isHost ? 'tab active' : 'tab'}
              onClick={() => setIsHost(true)}
            >
              Create Session
            </button>
            <button 
              className={!isHost ? 'tab active' : 'tab'}
              onClick={() => setIsHost(false)}
            >
              Join Session
            </button>
          </div>

          {isHost ? (
            <div className="create-section">
              <p className="description">
                Start a new recording session and invite guests
              </p>
              <button className="primary-btn" onClick={handleCreateSession}>
                Create New Session
              </button>
            </div>
          ) : (
            <div className="join-section">
              <div className="input-group">
                <label>Session ID</label>
                <input
                  type="text"
                  placeholder="Enter session ID"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                />
              </div>
              <button className="primary-btn" onClick={handleJoinSession}>
                Join Session
              </button>
            </div>
          )}
        </div>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">🎥</div>
            <h3>High Quality Recording</h3>
            <p>Local recording ensures studio-quality output</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📁</div>
            <h3>Separate Tracks</h3>
            <p>Download individual video files for easy editing</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Real-time Call</h3>
            <p>Smooth video call experience while recording</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
