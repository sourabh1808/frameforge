export const setupWebRTCSignaling = (io) => {
  io.on('connection', (socket) => {
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
  })
}
