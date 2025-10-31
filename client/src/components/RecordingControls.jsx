import './RecordingControls.css'

function RecordingControls({
  isRecording,
  isPaused,
  isMuted,
  isVideoOff,
  isHost,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onToggleMute,
  onToggleVideo
}) {
  return (
    <div className="controls-container">
      <div className="controls-left">
        <button 
          className={isMuted ? 'control-button muted' : 'control-button'}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="control-icon">{isMuted ? '🔇' : '🎤'}</span>
          <span className="control-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button 
          className={isVideoOff ? 'control-button off' : 'control-button'}
          onClick={onToggleVideo}
          title={isVideoOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          <span className="control-icon">{isVideoOff ? '📷' : '📹'}</span>
          <span className="control-label">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
        </button>
      </div>

      {isHost && (
        <div className="controls-center">
          {!isRecording ? (
            <button className="record-button start" onClick={onStartRecording}>
              <span className="record-icon">●</span>
              <span className="record-label">Start Recording</span>
            </button>
          ) : (
            <div className="recording-controls">
              {!isPaused ? (
                <button className="record-button pause" onClick={onPauseRecording}>
                  <span className="record-icon">⏸</span>
                  <span className="record-label">Pause</span>
                </button>
              ) : (
                <button className="record-button resume" onClick={onResumeRecording}>
                  <span className="record-icon">▶</span>
                  <span className="record-label">Resume</span>
                </button>
              )}
              
              <button className="record-button stop" onClick={onStopRecording}>
                <span className="record-icon">⏹</span>
                <span className="record-label">Stop & Download</span>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="controls-right">
        {!isHost && isRecording && (
          <div className="guest-recording-status">
            <span className="status-dot"></span>
            <span>Host is recording</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecordingControls
