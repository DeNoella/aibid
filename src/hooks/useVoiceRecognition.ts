import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

interface UseVoiceRecognitionReturn {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  confidence: number;
  error: string | null;
  hasPermission: boolean | null;
  requestPermission: () => Promise<void>;
}

export const useVoiceRecognition = (
  onResult?: (result: VoiceRecognitionResult) => void
): UseVoiceRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptPiece = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcriptPiece + ' ';
            if (i >= event.resultIndex) {
              setConfidence(result[0].confidence);
              if (onResult) {
                onResult({
                  transcript: transcriptPiece,
                  confidence: result[0].confidence,
                  isFinal: true
                });
              }

              // Stop automatically after a completed utterance.
              // This prevents endless listening after user stops speaking.
              try {
                recognitionRef.current.stop();
              } catch {
                // Ignore stop race conditions.
              }
              setIsListening(false);
            }
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        setTranscript((finalTranscript + interimTranscript).trim());
      };

      recognitionRef.current.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Handle different error types
        if (event.error === 'not-allowed') {
          setError('Microphone access denied. Please allow microphone permissions.');
          setHasPermission(false);
          toast.error('Microphone Access Denied', {
            description: 'Please allow microphone access in your browser settings to use voice control.',
            duration: 5000
          });
        } else if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.');
          toast.error('No Speech Detected', {
            description: 'Please speak clearly and try again.'
          });
        } else if (event.error === 'network') {
          setError('Network error. Please check your connection.');
          toast.error('Network Error', {
            description: 'Please check your internet connection.'
          });
        } else if (event.error === 'aborted') {
          // User stopped manually, don't show error
          setError(null);
        } else {
          setError(`Speech recognition error: ${event.error}`);
          toast.error('Voice Control Error', {
            description: `Error: ${event.error}`
          });
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onstart = () => {
        setError(null);
        setHasPermission(true);
      };
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [onResult]);

  const requestPermission = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      setError(null);
      toast.success('Microphone Access Granted', {
        description: 'You can now use voice control.'
      });
    } catch (err) {
      setHasPermission(false);
      setError('Microphone access denied. Please check your browser settings.');
      toast.error('Permission Denied', {
        description: 'Please allow microphone access in your browser settings.',
        duration: 5000
      });
    }
  };

  const startListening = async () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setConfidence(0);
      setError(null);
      
      try {
        // Check for permission first
        if (hasPermission === null || hasPermission === false) {
          await requestPermission();
        }
        
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err: any) {
        if (err.name === 'InvalidStateError' || err.message?.includes('already started')) {
          setIsListening(true);
          return;
        }
        
        console.warn('Error starting recognition:', err);
        setError('Failed to start voice recognition. Please try again.');
        setIsListening(false);
        
        if (err.message?.includes('not-allowed') || err.name === 'NotAllowedError') {
          setHasPermission(false);
          toast.error('Microphone Access Required', {
            description: 'Please allow microphone access to use voice control.',
            duration: 5000
          });
        }
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.warn('Error stopping recognition:', err);
        setIsListening(false);
      }
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
    confidence,
    error,
    hasPermission,
    requestPermission
  };
};