import { useState, useRef, useCallback, useEffect } from 'react';
import AssemblyAIStreamingService, {
  type TranscriptEvent,
  type AssemblyAIStreamingConfig
} from '@/services/assemblyAiStreaming';

export interface UseAssemblyAIOptions {
  sampleRate?: number;
  formatTurns?: boolean;
  endOfTurnConfidenceThreshold?: number;
  minEndOfTurnSilenceWhenConfident?: number;
  onTranscript?: (event: TranscriptEvent) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export interface UseAssemblyAIReturn {
  isConnected: boolean;
  isRecording: boolean;
  isSupported: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: Error | null;
  clearError: () => void;
}

export function useAssemblyAI(options: UseAssemblyAIOptions = {}): UseAssemblyAIReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const serviceRef = useRef<AssemblyAIStreamingService | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Check if service is supported
  const isSupported = AssemblyAIStreamingService.isSupported();

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize service if needed
  const initializeService = useCallback(() => {
    if (!serviceRef.current) {
      const config: AssemblyAIStreamingConfig = {
        sampleRate: options.sampleRate,
        formatTurns: options.formatTurns,
        endOfTurnConfidenceThreshold: options.endOfTurnConfidenceThreshold,
        minEndOfTurnSilenceWhenConfident: options.minEndOfTurnSilenceWhenConfident,
      };

      serviceRef.current = new AssemblyAIStreamingService(config);

      // Set up event handlers
      serviceRef.current.onTranscript((event) => {
        optionsRef.current.onTranscript?.(event);
      });

      serviceRef.current.onError((error) => {
        setError(error);
        optionsRef.current.onError?.(error);
      });

      serviceRef.current.onConnected(() => {
        setIsConnected(true);
        optionsRef.current.onConnectionChange?.(true);
      });

      serviceRef.current.onDisconnected(() => {
        setIsConnected(false);
        setIsRecording(false);
        optionsRef.current.onConnectionChange?.(false);
      });
    }
  }, [options.sampleRate, options.formatTurns, options.endOfTurnConfidenceThreshold, options.minEndOfTurnSilenceWhenConfident]);

  // Connect to AssemblyAI
  const connect = useCallback(async () => {
    try {
      clearError();

      if (!isSupported) {
        throw new Error('AssemblyAI streaming is not supported in this browser');
      }

      initializeService();

      if (!serviceRef.current) {
        throw new Error('Failed to initialize AssemblyAI service');
      }

      await serviceRef.current.connect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Connection failed');
      setError(error);
      throw error;
    }
  }, [isSupported, initializeService, clearError]);

  // Disconnect from AssemblyAI
  const disconnect = useCallback(async () => {
    try {
      if (serviceRef.current) {
        await serviceRef.current.disconnect();
        serviceRef.current = null;
      }
      setIsConnected(false);
      setIsRecording(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Disconnection failed');
      setError(error);
      throw error;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      clearError();

      if (!serviceRef.current || !serviceRef.current.connected) {
        throw new Error('Not connected to AssemblyAI. Call connect() first.');
      }

      await serviceRef.current.startRecording();
      setIsRecording(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error);
      throw error;
    }
  }, [clearError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      if (serviceRef.current) {
        serviceRef.current.stopRecording();
      }
      setIsRecording(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to stop recording');
      setError(error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  return {
    isConnected,
    isRecording,
    isSupported,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
}

export default useAssemblyAI;