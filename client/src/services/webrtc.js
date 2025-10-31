const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
}

export class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
  }

  async createPeerConnection(onRemoteStream, onIceCandidate) {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS)

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate(event.candidate)
      }
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        onRemoteStream(event.streams[0])
      }
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE Connection State:', this.peerConnection.iceConnectionState)
    }

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection State:', this.peerConnection.connectionState)
    }

    return this.peerConnection
  }

  async addLocalStream(stream) {
    this.localStream = stream
    if (this.peerConnection) {
      stream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, stream)
      })
    }
  }

  async createOffer() {
    if (!this.peerConnection) return null

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await this.peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('Error creating offer:', error)
      return null
    }
  }

  async createAnswer() {
    if (!this.peerConnection) return null

    try {
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('Error creating answer:', error)
      return null
    }
  }

  async setRemoteDescription(description) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(description))
    } catch (error) {
      console.error('Error setting remote description:', error)
    }
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) return

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (error) {
      console.error('Error adding ICE candidate:', error)
    }
  }

  closePeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
  }

  cleanup() {
    this.closePeerConnection()
    this.stopLocalStream()
    this.remoteStream = null
  }
}
