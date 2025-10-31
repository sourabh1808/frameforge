import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Downloads.css'

function Downloads() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [videoUrl, setVideoUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [userName, setUserName] = useState('')
  const [downloadStatus, setDownloadStatus] = useState('')

  const sessionId = searchParams.get('session')

  useEffect(() => {
    const storedVideoUrl = localStorage.getItem('recordedVideo')
    const storedDuration = localStorage.getItem('recordingDuration')
    const storedUserName = localStorage.getItem('userName')

    if (storedVideoUrl) {
      setVideoUrl(storedVideoUrl)
      setDuration(parseInt(storedDuration) || 0)
      setUserName(storedUserName || 'Unknown')
    }
  }, [])

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs}h ${mins}m ${secs}s`
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const downloadVideo = async () => {
    if (!videoUrl) return

    try {
      setDownloadStatus('Preparing download...')
      
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `FrameForge_${userName}_${timestamp}.webm`
      
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      setDownloadStatus('Download started!')
      setTimeout(() => setDownloadStatus(''), 3000)
    } catch (error) {
      console.error('Download error:', error)
      setDownloadStatus('Download failed')
    }
  }

  const startNewSession = () => {
    localStorage.removeItem('recordedVideo')
    localStorage.removeItem('recordingDuration')
    localStorage.removeItem('userName')
    navigate('/')
  }

  return (
    <div className="downloads-container">
      <div className="downloads-content">
        <div className="downloads-header">
          <h1>Recording Complete! 🎉</h1>
          <p>Your high-quality recording is ready for download</p>
        </div>

        <div className="download-card">
          <div className="video-preview-section">
            {videoUrl ? (
              <video 
                src={videoUrl} 
                controls 
                className="preview-player"
              />
            ) : (
              <div className="no-video">
                <p>No recording found</p>
              </div>
            )}
          </div>

          <div className="recording-info">
            <h3>Recording Details</h3>
            
            <div className="info-grid">
              <div className="info-card">
                <div className="info-icon">⏱️</div>
                <div className="info-content">
                  <div className="info-label">Duration</div>
                  <div className="info-value">{formatTime(duration)}</div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">👤</div>
                <div className="info-content">
                  <div className="info-label">Participant</div>
                  <div className="info-value">{userName}</div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">🎬</div>
                <div className="info-content">
                  <div className="info-label">Session ID</div>
                  <div className="info-value">{sessionId}</div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-icon">📹</div>
                <div className="info-content">
                  <div className="info-label">Quality</div>
                  <div className="info-value">1080p HD</div>
                </div>
              </div>
            </div>
          </div>

          <div className="download-actions">
            <button 
              className="download-btn primary"
              onClick={downloadVideo}
              disabled={!videoUrl}
            >
              <span className="btn-icon">⬇️</span>
              Download Your Recording
            </button>

            {downloadStatus && (
              <div className="download-status">{downloadStatus}</div>
            )}

            <div className="secondary-actions">
              <button className="action-btn" onClick={startNewSession}>
                Start New Session
              </button>
            </div>
          </div>

          <div className="download-note">
            <p><strong>Note:</strong> In a real implementation with WebRTC peer connections, you would receive separate high-quality video files for each participant. This demo shows local recording only.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Downloads
