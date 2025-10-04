import { useState, useRef, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Phone, 
  PhoneOff,
  User,
  Mail,
  MessageCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/utils/tracking';
import { apiRequest } from '@/lib/queryClient';
import { useAssemblyAI } from '@/hooks/useAssemblyAI';
import type { TranscriptEvent } from '@/services/assemblyAiStreaming';
import type { VoiceAgentRequest, VoiceAgentResponse, BookingRequest, BookingResponse, TTSRequest, TTSResponse } from '@shared/schema';

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface CollectedData {
  name?: string;
  email?: string;
  meetingPreference?: string;
}

interface VoiceSession {
  sessionId: string;
  isActive: boolean;
  messages: Array<{ role: 'user' | 'assistant', content: string, timestamp: Date }>;
  collectedData: CollectedData;
}

export default function LiveVoiceAgentDemo() {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [websocketConnected, setWebsocketConnected] = useState(false);
  const [useWebSocket, setUseWebSocket] = useState(true);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [sttProvider, setSttProvider] = useState<'web-speech' | 'assemblyai'>('assemblyai');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const messageIdRef = useRef<number>(0);
  const pendingMessages = useRef<Map<string, (response: any) => void>>(new Map());
  const sessionRef = useRef<VoiceSession | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // AssemblyAI streaming hook
  const assemblyAI = useAssemblyAI({
    sampleRate: 16000,
    formatTurns: true,
    endOfTurnConfidenceThreshold: 0.8,
    minEndOfTurnSilenceWhenConfident: 700,
    onTranscript: (event: TranscriptEvent) => {
      if (sttProvider === 'assemblyai' && session) {
        if (event.endOfTurn && event.text.trim()) {
          // Final transcript - send to voice agent
          setCurrentTranscript(event.text);
          setInterimTranscript('');
          console.log(`🚀 Sending final transcript to LLM: "${event.text}"`);
          sendMessage(event.text, true, websocketConnected);
        } else if (event.text.trim()) {
          // Interim transcript - just display
          setInterimTranscript(event.text);
          console.log(`💬 Interim transcript: "${event.text}"`);
        }
      }
    },
    onError: (error) => {
      console.error('AssemblyAI error:', error);
      toast({
        title: "AssemblyAI Error",
        description: error.message,
        variant: "destructive"
      });
    },
    onConnectionChange: (connected) => {
      console.log(`AssemblyAI connection: ${connected ? 'connected' : 'disconnected'}`);
    }
  });

  // Keep sessionRef in sync with session state for WebSocket handlers
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
      setShowManualInput(true);
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice recognition. You can still use text input.",
        variant: "default"
      });
    }
  }, [toast]);

  // WebSocket connection setup
  useEffect(() => {
    if (!useWebSocket) return;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/voice-ws`;

        console.log(`Connecting to Voice WebSocket: ${wsUrl}`);
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('WebSocket connected');
          setWebsocketConnected(true);
          websocketRef.current = ws;
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setWebsocketConnected(false);
          websocketRef.current = null;

          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWebsocketConnected(false);
          // Fallback to HTTP
          setUseWebSocket(false);
          toast({
            title: "WebSocket Connection Failed",
            description: "Falling back to HTTP communication.",
            variant: "default"
          });
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setUseWebSocket(false);
      }
    };

    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
    };
  }, [useWebSocket, toast]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    console.log('WebSocket message received:', message);

    switch (message.type) {
      case 'connected':
        console.log('WebSocket connection confirmed');
        break;

      case 'voice_agent_response':
        // Handle regular voice agent response and update UI
        if (message.messageId && pendingMessages.current.has(message.messageId)) {
          const resolver = pendingMessages.current.get(message.messageId);
          pendingMessages.current.delete(message.messageId);

          // Update the UI with the response text immediately for non-streaming
          if (message.data && sessionRef.current) {
            const updatedSession = {
              ...sessionRef.current,
              messages: [...sessionRef.current.messages, {
                role: 'assistant' as const,
                content: message.data.replyText,
                timestamp: new Date()
              }],
              collectedData: { ...sessionRef.current.collectedData, ...message.data.sessionState.collectedData }
            };
            setSession(updatedSession);

            // Handle audio playback if available
            if (message.data.audioUrl) {
              const audio = new Audio(message.data.audioUrl);
              currentAudioRef.current = audio;
              setIsSpeaking(true);
              audio.onended = () => setIsSpeaking(false);
              audio.onerror = () => setIsSpeaking(false);
              audio.play().catch(error => {
                console.error('Audio playback failed:', error);
                setIsSpeaking(false);
              });
            }
          }

          resolver?.(message.data);
        }
        break;

      case 'voice_agent_stream_start':
        console.log(`Streaming started for session: ${message.sessionId}`);
        break;

      case 'audio_chunk':
        // Handle streaming audio chunk
        if (message.chunk) {
          setAudioQueue(prev => [...prev, message.chunk]);
        }
        break;

      case 'voice_agent_stream_complete':
        // Handle final streaming response and update UI
        if (message.messageId && pendingMessages.current.has(message.messageId)) {
          const resolver = pendingMessages.current.get(message.messageId);
          pendingMessages.current.delete(message.messageId);

          // Update the UI with the response text immediately
          if (message.data && sessionRef.current) {
            const updatedSession = {
              ...sessionRef.current,
              messages: [...sessionRef.current.messages, {
                role: 'assistant' as const,
                content: message.data.replyText,
                timestamp: new Date()
              }],
              collectedData: { ...sessionRef.current.collectedData, ...message.data.sessionState.collectedData }
            };
            setSession(updatedSession);
          }

          resolver?.(message.data);
        }
        break;

      case 'voice_agent_stream_error':
      case 'error':
        console.error('WebSocket error:', message.error);
        if (message.messageId && pendingMessages.current.has(message.messageId)) {
          const resolver = pendingMessages.current.get(message.messageId);
          pendingMessages.current.delete(message.messageId);
          resolver?.(null);
        }
        break;

      case 'pong':
        // Handle ping/pong for connection keep-alive
        break;

      default:
        console.warn('Unknown WebSocket message type:', message.type);
    }
  }, []);

  // Audio queue processing for streaming
  useEffect(() => {
    if (audioQueue.length > 0 && !isSpeaking) {
      const nextChunk = audioQueue[0];
      setAudioQueue(prev => prev.slice(1));

      // Play the audio chunk
      const audio = new Audio(nextChunk);
      currentAudioRef.current = audio;

      setIsSpeaking(true);
      audio.onended = () => {
        setIsSpeaking(false);
        // This will trigger the effect again to play the next chunk
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        console.error('Audio chunk playback error');
      };

      audio.play().catch(error => {
        console.error('Failed to play audio chunk:', error);
        setIsSpeaking(false);
      });
    }
  }, [audioQueue, isSpeaking]);

  // Send WebSocket message with promise support
  const sendWebSocketMessage = useCallback((type: string, data: any, streaming = false): Promise<any> => {
    return new Promise((resolve) => {
      if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) {
        resolve(null);
        return;
      }

      const messageId = `msg_${++messageIdRef.current}`;

      if (!streaming) {
        pendingMessages.current.set(messageId, resolve);
      } else {
        // For streaming, still track messageId for completion but resolve immediately
        pendingMessages.current.set(messageId, resolve);
        resolve({ streaming: true });
      }

      const message = {
        type: streaming ? 'voice_agent_stream' : type,
        data,
        messageId
      };

      websocketRef.current.send(JSON.stringify(message));
    });
  }, []);

  // Voice Agent API mutation
  const voiceAgentMutation = useMutation({
    mutationFn: async (request: VoiceAgentRequest): Promise<VoiceAgentResponse> => {
      const response = await apiRequest('POST', '/api/agent', request);
      return await response.json();
    },
    onError: (error) => {
      console.error('Voice agent error:', error);
      toast({
        title: "Voice Agent Error",
        description: "Failed to communicate with the voice agent. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Booking API mutation  
  const bookingMutation = useMutation({
    mutationFn: async (request: BookingRequest): Promise<BookingResponse> => {
      const response = await apiRequest('POST', '/api/book', request);
      return await response.json();
    },
    onSuccess: (data: BookingResponse) => {
      window.open(data.calendlyUrl, '_blank');
      toast({
        title: "Booking Confirmed!",
        description: "Your Calendly link has opened in a new tab to complete the booking.",
        variant: "default"
      });
      trackEvent('voice_booking_completed', {
        sessionId: session?.sessionId,
        collectedData: session?.collectedData
      });
    },
    onError: (error) => {
      console.error('Booking error:', error);
      toast({
        title: "Booking Error", 
        description: "Failed to create booking link. Please try again.",
        variant: "destructive"
      });
    }
  });

  // TTS API mutation using ElevenLabs
  const ttsMutation = useMutation({
    mutationFn: async (request: TTSRequest): Promise<TTSResponse> => {
      const response = await apiRequest('POST', '/api/tts', request);
      return await response.json();
    },
    onError: (error) => {
      console.error('TTS error:', error);
      toast({
        title: "Text-to-Speech Error",
        description: "Failed to generate voice audio. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Start voice session
  const startVoiceSession = useCallback(async () => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: VoiceSession = {
      sessionId,
      isActive: true,
      messages: [],
      collectedData: {}
    };

    setSession(newSession);
    trackEvent('voice_session_started', { sessionId });

    // Send initial empty message to get greeting
    try {
      const response = await voiceAgentMutation.mutateAsync({
        sessionId,
        text: '',
        final: true
      });

      handleAgentResponse(response, newSession);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [voiceAgentMutation]);

  // Handle agent response
  const handleAgentResponse = useCallback(async (response: VoiceAgentResponse, currentSession: VoiceSession) => {
    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, {
        role: 'assistant' as const,
        content: response.replyText,
        timestamp: new Date()
      }],
      collectedData: { ...currentSession.collectedData, ...response.sessionState.collectedData }
    };

    setSession(updatedSession);

    // Play audio - either from inline generation or fallback to separate TTS call
    if (response.replyText) {
      try {
        setIsSpeaking(true);

        let audioUrl: string;

        // Check if audio was generated inline with the response
        if (response.audioUrl) {
          console.log('Using inline audio from agent response');
          audioUrl = response.audioUrl;
        } else {
          console.log('Falling back to separate TTS call');
          const ttsResponse = await ttsMutation.mutateAsync({
            text: response.replyText
          });
          audioUrl = ttsResponse.audioUrl;
        }

        // Stop any currently playing audio
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        }

        // Play the new audio
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => {
          setIsSpeaking(false);
          console.error('Audio playback error');
        };

        await audio.play();
      } catch (error) {
        console.error('Audio generation/playback failed:', error);
        setIsSpeaking(false);
      }
    }

    // If ready to book, proceed with booking
    if (response.readyToBook && updatedSession.collectedData.name && updatedSession.collectedData.email) {
      await bookingMutation.mutateAsync({
        name: updatedSession.collectedData.name,
        email: updatedSession.collectedData.email
      });
    }
  }, [bookingMutation, ttsMutation]);

  // Send message to agent (WebSocket with HTTP fallback)
  const sendMessage = useCallback(async (text: string, isFinal: boolean = true, useStreaming = false) => {
    if (!session || !text.trim()) return;

    setIsProcessing(true);

    // Add user message to session
    const updatedSession = {
      ...session,
      messages: [...session.messages, {
        role: 'user' as const,
        content: text,
        timestamp: new Date()
      }]
    };
    setSession(updatedSession);

    try {
      let response: VoiceAgentResponse | null = null;

      // Try WebSocket first if connected and enabled
      if (websocketConnected && websocketRef.current && useWebSocket) {
        console.log(`Sending via WebSocket${useStreaming ? ' (streaming)' : ''}`);

        response = await sendWebSocketMessage('voice_agent', {
          sessionId: session.sessionId,
          text,
          final: isFinal
        }, useStreaming);

        if (!response && !useStreaming) {
          console.log('WebSocket failed, falling back to HTTP');
          // Fallback to HTTP
          response = await voiceAgentMutation.mutateAsync({
            sessionId: session.sessionId,
            text,
            final: isFinal
          });
        }
      } else {
        // Use HTTP
        console.log('Sending via HTTP');
        response = await voiceAgentMutation.mutateAsync({
          sessionId: session.sessionId,
          text,
          final: isFinal
        });
      }

      // Handle response only for HTTP requests (WebSocket responses are handled in message handler)
      if (response && !websocketConnected) {
        await handleAgentResponse(response, updatedSession);
      } else if (response && useStreaming && websocketConnected) {
        // For WebSocket streaming, we've initiated the stream
        // Audio chunks and final response will come via WebSocket messages
        const streamResponse = response as any;
        if (streamResponse.streaming) {
          console.log('WebSocket streaming initiated, waiting for audio chunks...');
        }
      }
      // For regular WebSocket (non-streaming), the response is handled in handleWebSocketMessage

    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Communication Error",
        description: "Failed to communicate with the voice agent. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [session, voiceAgentMutation, handleAgentResponse, websocketConnected, useWebSocket, sendWebSocketMessage, toast]);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!speechSupported || recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      console.log('Speech recognition started');
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log('Speech recognition ended');
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event);
      setIsListening(false);
      toast({
        title: "Voice Recognition Error",
        description: "There was an issue with voice recognition. Please try again.",
        variant: "destructive"
      });
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (session) {
        setCurrentTranscript(finalTranscript);
        setInterimTranscript(interimTranscript);

        if (finalTranscript.trim()) {
          // Use streaming if WebSocket is connected
          sendMessage(finalTranscript, true, websocketConnected);
        }
      }
    };

    recognitionRef.current = recognition;
  }, [speechSupported, session, sendMessage, toast]);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      if (sttProvider === 'assemblyai') {
        // Use AssemblyAI
        if (!assemblyAI.isConnected) {
          await assemblyAI.connect();
        }
        await assemblyAI.startRecording();
      } else {
        // Use Web Speech API
        if (!recognitionRef.current) {
          initializeRecognition();
        }
        recognitionRef.current?.start();
      }

      setIsListening(true);
      trackEvent('voice_listening_started', {
        sessionId: session?.sessionId,
        provider: sttProvider
      });
    } catch (error) {
      console.error('Failed to start listening:', error);
      toast({
        title: "Failed to start listening",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    }
  }, [sttProvider, assemblyAI, initializeRecognition, session?.sessionId, toast]);

  // Stop listening
  const stopListening = useCallback(() => {
    try {
      if (sttProvider === 'assemblyai') {
        assemblyAI.stopRecording();
      } else {
        recognitionRef.current?.stop();
      }

      setIsListening(false);
      trackEvent('voice_listening_stopped', {
        sessionId: session?.sessionId,
        provider: sttProvider
      });
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
  }, [sttProvider, assemblyAI, session?.sessionId]);

  // Stop session
  const stopSession = useCallback(async () => {
    try {
      // Stop speech recognition
      recognitionRef.current?.abort();

      // Disconnect AssemblyAI if connected
      if (assemblyAI.isConnected) {
        await assemblyAI.disconnect();
      }

      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }

      setSession(null);
      setIsListening(false);
      setIsSpeaking(false);
      setIsProcessing(false);
      setCurrentTranscript('');
      setInterimTranscript('');

      trackEvent('voice_session_ended', { sessionId: session?.sessionId });
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  }, [session?.sessionId, assemblyAI]);

  // Send manual input
  const sendManualInput = useCallback(() => {
    if (manualInput.trim()) {
      // Use streaming if WebSocket is connected
      sendMessage(manualInput.trim(), true, websocketConnected);
      setManualInput('');
    }
  }, [manualInput, sendMessage, websocketConnected]);

  const getCollectionStatus = () => {
    if (!session) return [];
    
    const { collectedData } = session;
    return [
      { label: 'Name', collected: !!collectedData.name, value: collectedData.name },
      { label: 'Email', collected: !!collectedData.email, value: collectedData.email },
      { label: 'Meeting', collected: !!collectedData.meetingPreference, value: collectedData.meetingPreference },
    ];
  };

  return (
    <Card className="max-w-4xl mx-auto hover-elevate border-primary/20" data-testid="live-voice-demo">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <Phone className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-display font-bold text-xl text-foreground">
              Live Voice Agent Demo
            </h3>
            <p className="text-muted-foreground text-sm font-normal">
              Book a call using our AI voice assistant
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {!session ? (
          <div className="space-y-6">
            {/* STT Provider Configuration */}
            <div className="space-y-4 p-4 bg-muted/20 rounded-lg border">
              <h4 className="font-semibold text-foreground flex items-center">
                <Mic className="w-4 h-4 mr-2" />
                Speech-to-Text Configuration
              </h4>

              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Choose STT Provider:</label>
                <div className="flex space-x-4">
                  <Button
                    variant={sttProvider === 'web-speech' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSttProvider('web-speech')}
                    disabled={!speechSupported}
                  >
                    Web Speech API
                    {!speechSupported && <span className="ml-1 text-xs">(Not Supported)</span>}
                  </Button>
                  <Button
                    variant={sttProvider === 'assemblyai' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSttProvider('assemblyai')}
                  >
                    AssemblyAI
                    <Badge variant="outline" className="ml-2 text-xs">
                      Recommended
                    </Badge>
                  </Button>
                </div>
              </div>


              {/* Provider Status */}
              <div className="flex items-center space-x-2 text-xs">
                {sttProvider === 'web-speech' ? (
                  speechSupported ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      ✓ Web Speech API Available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      ✗ Web Speech API Not Supported
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className={assemblyAI.isSupported ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}>
                    {assemblyAI.isSupported ? '✓' : '✗'} AssemblyAI Ready
                  </Badge>
                )}
              </div>
            </div>

            {/* Start Session Button */}
            <div className="text-center py-4">
              <Button
                size="lg"
                onClick={startVoiceSession}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-start-session"
              >
                <Phone className="w-5 h-5 mr-2" />
                Book Call Using Voice Agent
              </Button>
              <p className="text-muted-foreground text-sm mt-4">
                {sttProvider === 'assemblyai'
                  ? "Click to start a voice conversation using AssemblyAI real-time streaming"
                  : speechSupported
                    ? "Click to start a voice conversation using Web Speech API"
                    : "Voice not supported - you'll be able to use text input"
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Session Status */}
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-foreground">Session Active</span>
                <Badge variant="outline" className="text-xs">
                  ID: {session.sessionId.split('_')[1]}
                </Badge>
                {/* STT Provider Status */}
                <Badge
                  variant="outline"
                  className={`text-xs ${sttProvider === 'assemblyai' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}
                >
                  🎤 {sttProvider === 'assemblyai' ? 'AssemblyAI' : 'Web Speech'}
                  {sttProvider === 'assemblyai' && assemblyAI.isConnected && (
                    <span className="ml-1">●</span>
                  )}
                </Badge>
                {/* WebSocket Status */}
                <Badge
                  variant={websocketConnected ? "default" : "secondary"}
                  className={`text-xs ${websocketConnected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  {websocketConnected ? '⚡ WebSocket' : '🔄 HTTP'}
                </Badge>
                {/* Streaming Status */}
                {websocketConnected && audioQueue.length > 0 && (
                  <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                    🎵 Streaming ({audioQueue.length} chunks)
                  </Badge>
                )}
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopSession}
                data-testid="button-stop-session"
              >
                <PhoneOff className="w-4 h-4 mr-2" />
                Stop Session
              </Button>
            </div>

            {/* Collection Status */}
            <div className="grid grid-cols-3 gap-4">
              {getCollectionStatus().map((item) => (
                <div key={item.label} className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    {item.label === 'Name' && <User className="w-5 h-5" />}
                    {item.label === 'Email' && <Mail className="w-5 h-5" />}
                    {item.label === 'Meeting' && <MessageCircle className="w-5 h-5" />}
                  </div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {item.collected ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        ✓ {item.value}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Voice Controls */}
            {speechSupported && (
              <div className="flex items-center justify-center space-x-4">
                <Button
                  variant={isListening ? "destructive" : "default"}
                  size="lg"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isSpeaking || isProcessing}
                  data-testid={isListening ? "button-stop-listening" : "button-start-listening"}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Stop Listening
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Start Listening
                    </>
                  )}
                </Button>

                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  {isSpeaking && (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>AI Speaking{audioQueue.length > 0 ? ' (Streaming)' : ''}...</span>
                    </>
                  )}
                  {isProcessing && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing{websocketConnected ? ' (WebSocket)' : ' (HTTP)'}...</span>
                    </>
                  )}
                  {!isSpeaking && !isProcessing && (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Ready{websocketConnected ? ' (Real-time)' : ''}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Manual Input */}
            <div className="space-y-3">
              {(!speechSupported || showManualInput) && (
                <div className="flex space-x-2">
                  <Input
                    placeholder="Type your response..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendManualInput()}
                    disabled={isProcessing}
                    data-testid="input-manual-text"
                  />
                  <Button 
                    onClick={sendManualInput}
                    disabled={!manualInput.trim() || isProcessing}
                    data-testid="button-send-text"
                  >
                    Send
                  </Button>
                </div>
              )}
              
              {speechSupported && !showManualInput && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowManualInput(true)}
                  data-testid="button-show-manual"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Use Text Input Instead
                </Button>
              )}
            </div>

            {/* Live Transcript */}
            <div className="bg-muted/10 rounded-lg p-4 min-h-[200px]">
              <h4 className="font-semibold text-foreground mb-3 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                Conversation
              </h4>
              <div className="space-y-3 text-sm max-h-[300px] overflow-y-auto">
                {session.messages.map((message, index) => (
                  <div key={index} className={`p-3 rounded-lg ${
                    message.role === 'assistant' 
                      ? 'bg-primary/10 border-l-4 border-primary' 
                      : 'bg-muted/20 border-l-4 border-muted'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-medium ${
                        message.role === 'assistant' ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {message.role === 'assistant' ? 'SleeckOS Agent' : 'You'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-foreground">{message.content}</p>
                  </div>
                ))}
                
                {/* Current transcript */}
                {currentTranscript && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500">
                    <span className="font-medium text-blue-700 dark:text-blue-400">You (Final):</span>
                    <p className="text-blue-800 dark:text-blue-300">{currentTranscript}</p>
                  </div>
                )}

                {/* Interim transcript */}
                {interimTranscript && (
                  <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-l-4 border-yellow-500">
                    <span className="font-medium text-yellow-700 dark:text-yellow-400">You (Speaking...):</span>
                    <p className="text-yellow-800 dark:text-yellow-300 italic">{interimTranscript}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}