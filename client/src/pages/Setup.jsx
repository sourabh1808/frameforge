import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Setup.css'

function Setup() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [devices, setDevices] = useState({ cameras: [], microphones: [] })
  const [selectedCamera, setSelectedCamera] = useState('')
  const [selectedMic, setSelectedMic] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)

  const sessionId = searchParams.get('session')
  const userName = searchParams.get('name')
  const isHost = searchParams.get('host') === 'true'

  useEffect(() => {
    getDevices()
    startPreview()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const getDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices()
      const cameras = deviceList.filter(device => device.kind === 'videoinput')
      const microphones = deviceList.filter(device => device.kind === 'audioinput')
      
      setDevices({ cameras, microphones })
      if (cameras.length > 0) setSelectedCamera(cameras[0].deviceId)
      if (microphones.length > 0) setSelectedMic(microphones[0].deviceId)
    } catch (error) {
      console.error('Error getting devices:', error)
    }
  }

  const startPreview = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error('Error accessing media devices:', error)
      alert('Please allow camera and microphone access')
    }
  }

  const switchCamera = async (deviceId) => {
    setSelectedCamera(deviceId)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined }
      })
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
    } catch (error) {
      console.error('Error switching camera:', error)
    }
  }

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const handleJoinStudio = () => {
    navigate(`/studio?session=${sessionId}&name=${userName}&host=${isHost}`)
  }

  return (
    <div className="setup-container">
      <div className="setup-content">
        <div className="setup-header">
          <h2>Device Setup</h2>
          <p>Test your camera and microphone before joining</p>
        </div>

        <div className="setup-main">
          <div className="video-preview">
            <video ref={videoRef} autoPlay muted className="preview-video" />
            {isVideoOff && <div className="video-off-overlay">Camera Off</div>}
            
            <div className="preview-controls">
              <button 
                className={isMuted ? 'control-btn muted' : 'control-btn'}
                onClick={toggleMute}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>
              <button 
                className={isVideoOff ? 'control-btn off' : 'control-btn'}
                onClick={toggleVideo}
              >
                {isVideoOff ? '📷' : '📹'}
              </button>
            </div>
          </div>

          <div className="device-settings">
            <div className="session-info">
              <h3>Session Details</h3>
              <div className="info-item">
                <span className="info-label">Session ID:</span>
                <span className="info-value">{sessionId}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Your Name:</span>
                <span className="info-value">{userName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Role:</span>
                <span className="info-value">{isHost ? 'Host' : 'Guest'}</span>
              </div>
            </div>

            <div className="device-selector">
              <label>Camera</label>
              <select 
                value={selectedCamera} 
                onChange={(e) => switchCamera(e.target.value)}
              >
                {devices.cameras.map(camera => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${camera.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="device-selector">
              <label>Microphone</label>
              <select 
                value={selectedMic} 
                onChange={(e) => setSelectedMic(e.target.value)}
              >
                {devices.microphones.map(mic => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                  </option>
                ))}
              </select>
            </div>

            <button className="join-btn" onClick={handleJoinStudio}>
              Join Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Setup
