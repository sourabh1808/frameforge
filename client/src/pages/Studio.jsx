import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import RecordingControls from '../components/RecordingControls'
import socketService from '../services/socket'
import { WebRTCService } from '../services/webrtc'
import './Studio.css'

function Studio() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const webrtcServiceRef = useRef(null)
  const remotePeerIdRef = useRef(null)
  
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('connecting')
  
  const sessionId = searchParams.get('session')
  const userName = searchParams.get('name')
  const isHost = searchParams.get('host') === 'true'

  useEffect(() => {
    initializeMedia()
    setupSocketConnection()
    
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    let interval
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, isPaused])

  const setupSocketConnection = () => {
    const socket = socketService.connect()

    if (isHost) {
      socketService.createSession(sessionId, userName, isHost)
    } else {
      socketService.joinSession(sessionId, userName, isHost)
    }

    socket.on('session-created', () => {
      console.log('Session created successfully')
      setConnectionStatus('waiting')
    })

    socket.on('session-joined', () => {
      console.log('Joined session successfully')
      setConnectionStatus('connected')
    })

    socket.on('participant-joined', async ({ socketId }) => {
      console.log('Participant joined:', socketId)
      remotePeerIdRef.current = socketId
      setConnectionStatus('connected')
      await initiateWebRTCConnection(socketId)
    })

    socket.on('webrtc-offer', async ({ from, offer }) => {
      console.log('Received offer from:', from)
      remotePeerIdRef.current = from
      await handleWebRTCOffer(from, offer)
    })

    socket.on('webrtc-answer', async ({ from, answer }) => {
      console.log('Received answer from:', from)
      await handleWebRTCAnswer(answer)
    })

    socket.on('webrtc-ice-candidate', async ({ from, candidate }) => {
      console.log('Received ICE candidate from:', from)
      await handleIceCandidate(candidate)
    })

    socket.on('recording-started', () => {
      console.log('Recording started by host')
    })

    socket.on('recording-stopped', () => {
      console.log('Recording stopped by host')
    })

    socket.on('participant-left', () => {
      setConnectionStatus('waiting')
      setRemoteStream(null)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null
      }
    })

    socket.on('host-disconnected', () => {
      alert('Host has left the session')
      navigate('/')
    })
  }

  const initiateWebRTCConnection = async (remotePeerId) => {
    if (!localStream) return

    const webrtc = new WebRTCService()
    webrtcServiceRef.current = webrtc

    await webrtc.createPeerConnection(
      (stream) => {
        console.log('Received remote stream')
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      },
      (candidate) => {
        socketService.sendIceCandidate(remotePeerId, candidate)
      }
    )

    await webrtc.addLocalStream(localStream)
    const offer = await webrtc.createOffer()
    
    if (offer) {
      socketService.sendOffer(remotePeerId, offer)
    }
  }

  const handleWebRTCOffer = async (from, offer) => {
    if (!localStream) return

    const webrtc = new WebRTCService()
    webrtcServiceRef.current = webrtc

    await webrtc.createPeerConnection(
      (stream) => {
        console.log('Received remote stream')
        setRemoteStream(stream)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream
        }
      },
      (candidate) => {
        socketService.sendIceCandidate(from, candidate)
      }
    )

    await webrtc.addLocalStream(localStream)
    await webrtc.setRemoteDescription(offer)
    const answer = await webrtc.createAnswer()
    
    if (answer) {
      socketService.sendAnswer(from, answer)
    }
  }

  const handleWebRTCAnswer = async (answer) => {
    if (webrtcServiceRef.current) {
      await webrtcServiceRef.current.setRemoteDescription(answer)
    }
  }

  const handleIceCandidate = async (candidate) => {
    if (webrtcServiceRef.current) {
      await webrtcServiceRef.current.addIceCandidate(candidate)
    }
  }

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1920, height: 1080 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000
        }
      })
      setLocalStream(stream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing media:', error)
      alert('Failed to access camera/microphone')
    }
  }

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.cleanup()
    }
    socketService.disconnect()
  }

  const startRecording = () => {
    if (!localStream) return

    recordedChunksRef.current = []
    
    const options = {
      mimeType: 'video/webm;codecs=vp9,opus',
      videoBitsPerSecond: 8000000
    }

    try {
      const mediaRecorder = new MediaRecorder(localStream, options)
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        
        localStorage.setItem('recordedVideo', url)
        localStorage.setItem('recordingDuration', recordingTime)
        localStorage.setItem('userName', userName)
      }

      mediaRecorder.start(1000)
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
      setRecordingTime(0)
      
      socketService.startRecording(sessionId)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Failed to start recording')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      socketService.pauseRecording(sessionId)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      socketService.resumeRecording(sessionId)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      socketService.stopRecording(sessionId)
      
      setTimeout(() => {
        navigate(`/downloads?session=${sessionId}`)
      }, 500)
    }
  }

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoOff(!isVideoOff)
    }
  }

  const leaveCall = () => {
    if (isRecording) {
      const confirmLeave = confirm('Recording is in progress. Stop recording and leave?')
      if (!confirmLeave) return
      stopRecording()
    } else {
      navigate('/')
    }
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="studio-container">
      <div className="studio-header">
        <div className="session-badge">
          <span className="session-label">Session:</span>
          <span className="session-id">{sessionId}</span>
        </div>
        
        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot"></span>
            <span className="rec-text">REC {formatTime(recordingTime)}</span>
            {isPaused && <span className="paused-text">(PAUSED)</span>}
          </div>
        )}
        
        <button className="leave-btn" onClick={leaveCall}>
          Leave Call
        </button>
      </div>

      <div className="video-grid">
        <div className="video-container local">
          <video ref={localVideoRef} autoPlay muted className="video-element" />
          {isVideoOff && (
            <div className="video-placeholder">
              <div className="avatar">{userName?.[0]?.toUpperCase()}</div>
            </div>
          )}
          <div className="video-label">
            <span>{userName} (You)</span>
            {isRecording && <span className="recording-badge">● Recording</span>}
          </div>
        </div>

        <div className="video-container remote">
          <video ref={remoteVideoRef} autoPlay className="video-element" />
          {!remoteStream && (
            <div className="video-placeholder">
              <div className="waiting-text">
                {connectionStatus === 'waiting' ? 'Waiting for guest to join...' : 'Connecting...'}
              </div>
            </div>
          )}
          <div className="video-label">Guest</div>
        </div>
      </div>

      <RecordingControls
        isRecording={isRecording}
        isPaused={isPaused}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isHost={isHost}
        onStartRecording={startRecording}
        onPauseRecording={pauseRecording}
        onResumeRecording={resumeRecording}
        onStopRecording={stopRecording}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
      />
    </div>
  )
}

export default Studio
