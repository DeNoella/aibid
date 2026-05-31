import { useState, useEffect, useRef, useCallback } from 'react';
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

// Silence after which the accumulated transcript is treated as the final question
const SILENCE_TIMEOUT_MS = 2200;

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
  // Accumulated text across multiple utterances in one session
  const accumulatedRef = useRef('');
  const lastConfidenceRef = useRef(0);
  // Timer that fires after SILENCE_TIMEOUT_MS of no new speech
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const fireFinal = useCallback(() => {
    clearSilenceTimer();
    const full = accumulatedRef.current.trim();
    if (!full) return;
    onResultRef.current?.({
      transcript: full,
      confidence: lastConfidenceRef.current,
      isFinal: true,
    });
    accumulatedRef.current = '';
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(fireFinal, SILENCE_TIMEOUT_MS);
  }, [fireFinal]);

  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRec();
    recognitionRef.current = recognition;

    // Keep listening until we detect silence — this gives users time for full questions
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
      setHasPermission(true);
    };

    recognition.onresult = (event: any) => {
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const piece = result[0].transcript;

        if (result.isFinal) {
          accumulatedRef.current += piece + ' ';
          lastConfidenceRef.current = result[0].confidence || 0;
          setConfidence(result[0].confidence || 0);
          // Reset the silence timer on every new final word
          resetSilenceTimer();
        } else {
          interimText += piece;
          // Also reset on interim results so fast speakers get enough time
          resetSilenceTimer();
        }
      }

      setTranscript((accumulatedRef.current + interimText).trim());
    };

    recognition.onerror = (event: any) => {
      clearSilenceTimer();
      setIsListening(false);

      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
        setHasPermission(false);
        toast.error('Microphone Access Denied', {
          description: 'Allow microphone access in your browser settings.',
          duration: 5000,
        });
      } else if (event.error === 'no-speech') {
        // Suppress no-speech in continuous mode — just keep waiting
        setError(null);
      } else if (event.error === 'network') {
        setError('Network error. Please check your connection.');
        toast.error('Network Error', { description: 'Please check your internet connection.' });
      } else if (event.error === 'aborted') {
        setError(null);
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // If we ended while still expecting more (e.g. browser cut off), restart
      if (isListening && accumulatedRef.current.trim()) {
        // Already have some text — fire immediately
        fireFinal();
      } else if (isListening) {
        // Restart silently so the user can continue speaking
        try { recognition.start(); } catch { setIsListening(false); }
      }
    };

    return () => {
      clearSilenceTimer();
      try { recognition.stop(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setHasPermission(true);
      setError(null);
      toast.success('Microphone Access Granted');
    } catch {
      setHasPermission(false);
      setError('Microphone access denied. Please check your browser settings.');
      toast.error('Permission Denied', {
        description: 'Allow microphone access in your browser settings.',
        duration: 5000,
      });
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current || isListening) return;
    accumulatedRef.current = '';
    setTranscript('');
    setConfidence(0);
    setError(null);
    clearSilenceTimer();

    try {
      if (hasPermission === null || hasPermission === false) {
        await requestPermission();
      }
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        setIsListening(true);
        return;
      }
      setError('Failed to start voice recognition. Please try again.');
      setIsListening(false);
      if (err.name === 'NotAllowedError') {
        setHasPermission(false);
        toast.error('Microphone Access Required', { duration: 5000 });
      }
    }
  };

  const stopListening = () => {
    clearSilenceTimer();
    // If there's accumulated text, fire the result before stopping
    if (accumulatedRef.current.trim()) {
      const full = accumulatedRef.current.trim();
      onResultRef.current?.({ transcript: full, confidence: lastConfidenceRef.current, isFinal: true });
      accumulatedRef.current = '';
    }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsListening(false);
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
    requestPermission,
  };
};
