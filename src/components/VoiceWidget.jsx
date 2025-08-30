import React, { useState, useRef, useEffect } from 'react'

export default function VoiceWidget({ onTranscript }) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  
  const recognitionRef = useRef(null)
  const synthRef = useRef(null)

  useEffect(() => {
    // Initialize Speech Recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = ''
        let interimTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript)
          onTranscript?.(finalTranscript)
        }
      }
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`)
        setIsListening(false)
      }
      
      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }

    // Initialize Speech Synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [onTranscript])

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setError('')
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const speakText = (text) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8
      
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)
      
      synthRef.current.speak(utterance)
    }
  }

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
    }
  }

  return (
    <div className="voice-widget">
      <div className="voice-controls">
        {/* Speech-to-Text */}
        <button
          onClick={isListening ? stopListening : startListening}
          className={`voice-btn stt-btn ${isListening ? 'active' : ''}`}
          title={isListening ? 'Stop listening' : 'Start dictation'}
        >
          {isListening ? '🔴' : '🎤'}
        </button>

        {/* Text-to-Speech */}
        <button
          onClick={isSpeaking ? stopSpeaking : () => {
            const selection = window.getSelection().toString()
            if (selection) {
              speakText(selection)
            }
          }}
          className={`voice-btn tts-btn ${isSpeaking ? 'active' : ''}`}
          title={isSpeaking ? 'Stop speaking' : 'Read selection'}
        >
          {isSpeaking ? '🔇' : '🔊'}
        </button>
      </div>

      {isListening && (
        <div className="listening-indicator">
          <div className="pulse-dot"></div>
          <span>Listening...</span>
        </div>
      )}

      {transcript && (
        <div className="transcript-preview">
          <div className="transcript-text">{transcript}</div>
          <button 
            onClick={() => setTranscript('')}
            className="clear-transcript"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="voice-error">
          {error}
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}
    </div>
  )
}
