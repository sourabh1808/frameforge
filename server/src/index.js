import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  },
  maxHttpBufferSize: 1e8
})

const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const uploadsDir = path.join(__dirname, '../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

app.use('/uploads', express.static(uploadsDir))

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }
})

const sessions = new Map()
const userSockets = new Map()

app.get('/', (req, res) => {
  res.json({ message: 'FrameForge Server Running', status: 'OK' })
})

app.get('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const session = sessions.get(sessionId)
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  res.json({
    sessionId: session.id,
    host: session.host,
    participants: Array.from(session.participants.values()),
    createdAt: session.createdAt,
    isRecording: session.isRecording
  })
})

app.post('/api/upload-recording', upload.single('recording'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const { sessionId, userName, participantId } = req.body
    
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
    
    res.json({
      success: true,
      fileUrl,
      filename: req.file.filename,
      size: req.file.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

app.get('/api/recordings/:sessionId', (req, res) => {
  const { sessionId } = req.params
  const session = sessions.get(sessionId)
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }
  
  res.json({
    recordings: session.recordings || []
  })
})

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`)

  socket.on('create-session', ({ sessionId, userName, isHost }) => {
    if (sessions.has(sessionId)) {
      socket.emit('session-error', { message: 'Session already exists' })
      return
    }

    const session = {
      id: sessionId,
      host: { socketId: socket.id, userName, isHost: true },
      participants: new Map(),
      createdAt: new Date(),
      isRecording: false,
      recordings: []
    }

    sessions.set(sessionId, session)
    userSockets.set(socket.id, { sessionId, userName, isHost: true })
    
    socket.join(sessionId)
    
    socket.emit('session-created', { 
      sessionId, 
      role: 'host',
      userName 
    })
    
    console.log(`Session created: ${sessionId} by ${userName}`)
  })

  socket.on('join-session', ({ sessionId, userName, isHost }) => {
    const session = sessions.get(sessionId)
    
    if (!session) {
      socket.emit('session-error', { message: 'Session not found' })
      return
    }

    const participant = {
      socketId: socket.id,
      userName,
      isHost: false,
      joinedAt: new Date()
    }

    session.participants.set(socket.id, participant)
    userSockets.set(socket.id, { sessionId, userName, isHost: false })
    
    socket.join(sessionId)
    
    socket.emit('session-joined', {
      sessionId,
      role: 'guest',
      userName,
      host: session.host
    })

    socket.to(session.host.socketId).emit('participant-joined', {
      socketId: socket.id,
      userName
    })
    
    console.log(`${userName} joined session: ${sessionId}`)
  })

  socket.on('webrtc-offer', ({ to, offer }) => {
    socket.to(to).emit('webrtc-offer', {
      from: socket.id,
      offer
    })
  })

  socket.on('webrtc-answer', ({ to, answer }) => {
    socket.to(to).emit('webrtc-answer', {
      from: socket.id,
      answer
    })
  })

  socket.on('webrtc-ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate
    })
  })

  socket.on('start-recording', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    
    if (session) {
      session.isRecording = true
      io.to(sessionId).emit('recording-started', { 
        timestamp: new Date() 
      })
      console.log(`Recording started in session: ${sessionId}`)
    }
  })

  socket.on('pause-recording', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    
    if (session) {
      io.to(sessionId).emit('recording-paused', { 
        timestamp: new Date() 
      })
      console.log(`Recording paused in session: ${sessionId}`)
    }
  })

  socket.on('resume-recording', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    
    if (session) {
      io.to(sessionId).emit('recording-resumed', { 
        timestamp: new Date() 
      })
      console.log(`Recording resumed in session: ${sessionId}`)
    }
  })

  socket.on('stop-recording', ({ sessionId }) => {
    const session = sessions.get(sessionId)
    
    if (session) {
      session.isRecording = false
      io.to(sessionId).emit('recording-stopped', { 
        timestamp: new Date() 
      })
      console.log(`Recording stopped in session: ${sessionId}`)
    }
  })

  socket.on('save-recording-info', ({ sessionId, fileName, fileSize, duration }) => {
    const session = sessions.get(sessionId)
    
    if (session) {
      const recordingInfo = {
        fileName,
        fileSize,
        duration,
        uploadedAt: new Date(),
        uploadedBy: userSockets.get(socket.id)?.userName
      }
      
      if (!session.recordings) {
        session.recordings = []
      }
      session.recordings.push(recordingInfo)
      
      console.log(`Recording saved for session ${sessionId}: ${fileName}`)
    }
  })

  socket.on('disconnect', () => {
    const userData = userSockets.get(socket.id)
    
    if (userData) {
      const { sessionId, userName, isHost } = userData
      const session = sessions.get(sessionId)
      
      if (session) {
        if (isHost) {
          io.to(sessionId).emit('host-disconnected')
          sessions.delete(sessionId)
          console.log(`Host disconnected, session ${sessionId} deleted`)
        } else {
          session.participants.delete(socket.id)
          socket.to(session.host.socketId).emit('participant-left', {
            socketId: socket.id,
            userName
          })
          console.log(`${userName} left session: ${sessionId}`)
        }
      }
      
      userSockets.delete(socket.id)
    }
    
    console.log(`User disconnected: ${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 FrameForge Server running on port ${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`)
})
