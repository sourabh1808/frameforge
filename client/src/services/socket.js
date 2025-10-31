import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

class SocketService {
  constructor() {
    this.socket = null
  }

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      this.socket.on('connect', () => {
        console.log('✅ Connected to server:', this.socket.id)
      })

      this.socket.on('disconnect', () => {
        console.log('❌ Disconnected from server')
      })

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error)
      })
    }
    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket() {
    return this.socket
  }

  createSession(sessionId, userName, isHost) {
    if (this.socket) {
      this.socket.emit('create-session', { sessionId, userName, isHost })
    }
  }

  joinSession(sessionId, userName, isHost) {
    if (this.socket) {
      this.socket.emit('join-session', { sessionId, userName, isHost })
    }
  }

  sendOffer(to, offer) {
    if (this.socket) {
      this.socket.emit('webrtc-offer', { to, offer })
    }
  }

  sendAnswer(to, answer) {
    if (this.socket) {
      this.socket.emit('webrtc-answer', { to, answer })
    }
  }

  sendIceCandidate(to, candidate) {
    if (this.socket) {
      this.socket.emit('webrtc-ice-candidate', { to, candidate })
    }
  }

  startRecording(sessionId) {
    if (this.socket) {
      this.socket.emit('start-recording', { sessionId })
    }
  }

  pauseRecording(sessionId) {
    if (this.socket) {
      this.socket.emit('pause-recording', { sessionId })
    }
  }

  resumeRecording(sessionId) {
    if (this.socket) {
      this.socket.emit('resume-recording', { sessionId })
    }
  }

  stopRecording(sessionId) {
    if (this.socket) {
      this.socket.emit('stop-recording', { sessionId })
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export default new SocketService()
