import { useState, useEffect, useCallback } from 'react';

/**
 * useSpeechToText
 * 
 * A custom React hook that utilizes the browser's native Web Speech API (SpeechRecognition).
 * It listens to voice input and returns the recognized text in real-time.
 * 
 * Features:
 * - Real-time transcription (interim results).
 * - Automatic stop/restart handling.
 * - Error state tracking.
 * - Language support (defaults to Korean 'ko-KR').
 */
export function useSpeechToText(lang = 'ko-KR') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('이 브라우저에서는 음성 인식을 지원하지 않습니다. (Chrome, Edge를 권장합니다)');
      return;
    }

    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = true; // Keep listening until explicitly stopped
    recognitionInstance.interimResults = true; // Show results while speaking
    recognitionInstance.lang = lang;

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognitionInstance.onresult = (event) => {
      let currentTranscript = '';
      let currentInterimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          currentTranscript += result[0].transcript;
        } else {
          currentInterimTranscript += result[0].transcript;
        }
      }

      if (currentTranscript) {
        setTranscript((prev) => prev + currentTranscript + ' ');
      }
      setInterimTranscript(currentInterimTranscript);
    };

    recognitionInstance.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'not-allowed':
          setError('마이크 권한이 거부되었습니다. 브라우저 설정에서 마이크를 허용해주세요.');
          break;
        case 'no-speech':
          // Can be safely ignored or show a prompt "Please speak..."
          break;
        case 'network':
          setError('네트워크 오류가 발생했습니다.');
          break;
        default:
          setError(`음성 인식 오류: ${event.error}`);
      }
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
      // Optional: Auto-restart logic could go here if continuous listening drops
    };

    setRecognition(recognitionInstance);

    return () => {
      recognitionInstance.stop();
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        setTranscript('');
        setInterimTranscript('');
        setError(null);
        recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript, // Useful for showing live "typing" effect on the canvas
    error,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: !!recognition
  };
}
