import { AssemblyAI } from 'assemblyai';

export interface AssemblyAIStreamingConfig {
  sampleRate?: number;
  formatTurns?: boolean;
  endOfTurnConfidenceThreshold?: number;
  minEndOfTurnSilenceWhenConfident?: number;
}

export interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence?: number;
  endOfTurn?: boolean;
  words?: Array<{
    text: string;
    confidence: number;
    start: number;
    end: number;
  }>;
}

export class AssemblyAIStreamingService {
  private client: AssemblyAI | null = null;
  private transcriber: any = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private config: AssemblyAIStreamingConfig;

  // Event handlers
  private onTranscriptHandler?: (event: TranscriptEvent) => void;
  private onErrorHandler?: (error: Error) => void;
  private onConnectedHandler?: () => void;
  private onDisconnectedHandler?: () => void;

  constructor(config: AssemblyAIStreamingConfig) {
    this.config = {
      sampleRate: 16000,
      formatTurns: true,
      endOfTurnConfidenceThreshold: 0.8,
      minEndOfTurnSilenceWhenConfident: 500,
      ...config,
    };
  }

  // Event listeners
  onTranscript(handler: (event: TranscriptEvent) => void) {
    this.onTranscriptHandler = handler;
  }

  onError(handler: (error: Error) => void) {
    this.onErrorHandler = handler;
  }

  onConnected(handler: () => void) {
    this.onConnectedHandler = handler;
  }

  onDisconnected(handler: () => void) {
    this.onDisconnectedHandler = handler;
  }

  async connect(): Promise<void> {
    try {
      // Fetch temporary token from server
      const tokenResponse = await fetch('/api/assemblyai/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        throw new Error(`Failed to get AssemblyAI token: ${tokenResponse.status}`);
      }

      const { token } = await tokenResponse.json();

      // Initialize the AssemblyAI client with token
      this.client = new AssemblyAI({
        apiKey: 'dummy', // Required but not used with token
      });

      // Create the streaming transcriber with token
      // Note: Higher sample rate = better accuracy for email dictation
      this.transcriber = this.client.streaming.transcriber({
        token: token,
        sampleRate: this.config.sampleRate!,
      });

      // Set up event handlers
      this.transcriber.on('open', ({ id, expires_at }: { id: string, expires_at: string }) => {
        console.log('AssemblyAI connection opened', { id, expires_at });
        this.isConnected = true;
        if (this.onConnectedHandler) {
          this.onConnectedHandler();
        }
      });

      this.transcriber.on('turn', (transcript: any) => {
        console.log(`📝 AssemblyAI transcript received:`, transcript);
        if (this.onTranscriptHandler) {
          const transcriptEvent = {
            text: transcript.transcript, // Fix: use 'transcript' field not 'text'
            isFinal: transcript.message_type === 'FinalTranscript',
            confidence: transcript.confidence,
            endOfTurn: transcript.end_of_turn,
            words: transcript.words?.map((word: any) => ({
              text: word.text,
              confidence: word.confidence,
              start: word.start,
              end: word.end,
            })),
          };
          console.log(`🎯 Processed transcript event:`, transcriptEvent);
          this.onTranscriptHandler(transcriptEvent);
        }
      });

      this.transcriber.on('error', (error: any) => {
        console.error('AssemblyAI transcription error:', error);
        if (this.onErrorHandler) {
          this.onErrorHandler(new Error(error.error_code || 'Unknown error'));
        }
      });

      this.transcriber.on('close', (event: any) => {
        console.log('AssemblyAI connection closed', event);
        this.isConnected = false;
        if (this.onDisconnectedHandler) {
          this.onDisconnectedHandler();
        }
      });

      // Add listener for all events to debug
      this.transcriber.on('*', (eventName: string, data: any) => {
        console.log(`🔔 AssemblyAI event [${eventName}]:`, data);
      });

      // Connect to AssemblyAI
      console.log(`🔌 Connecting to AssemblyAI...`);
      await this.transcriber.connect();
      console.log(`✅ AssemblyAI connection completed`);

    } catch (error) {
      console.error('Failed to connect to AssemblyAI:', error);
      if (this.onErrorHandler) {
        this.onErrorHandler(error instanceof Error ? error : new Error('Connection failed'));
      }
      throw error;
    }
  }

  async startRecording(): Promise<void> {
    if (!this.isConnected || !this.transcriber) {
      throw new Error('AssemblyAI not connected. Call connect() first.');
    }

    try {
      // Get user media
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Load the AudioWorklet module
      await this.audioContext.audioWorklet.addModule('/linear-pcm-processor.js');

      // Create AudioWorkletNode
      this.workletNode = new AudioWorkletNode(this.audioContext, 'linear-pcm-processor');

      // Listen for PCM chunks from the worklet
      this.workletNode.port.onmessage = (event) => {
        if (this.transcriber && this.isConnected) {
          const pcm16Buffer = event.data as Int16Array;

          // Debug: Calculate audio level for logging
          const audioLevel = Math.max(...Array.from(pcm16Buffer).map(s => Math.abs(s / 0x7FFF)));
          if (audioLevel > 0.01) { // Only log when there's actual audio
            console.log(`📤 Sending audio to AssemblyAI: ${pcm16Buffer.length} samples, level: ${audioLevel.toFixed(3)}`);
          }

          // Send audio data to AssemblyAI
          this.transcriber.send(pcm16Buffer);
        }
      };

      // Connect the audio processing chain
      source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination);

      console.log(`🎤 Started recording with AssemblyAI using AudioWorklet - Audio Context State: ${this.audioContext.state}`);
      console.log(`🔧 Audio Setup: Sample Rate: ${this.audioContext.sampleRate}, Using AudioWorkletNode`);

    } catch (error) {
      console.error('Failed to start recording:', error);
      if (this.onErrorHandler) {
        this.onErrorHandler(error instanceof Error ? error : new Error('Recording failed'));
      }
      throw error;
    }
  }

  stopRecording(): void {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode.port.close();
      this.workletNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    console.log('Stopped recording');
  }

  async disconnect(): Promise<void> {
    this.stopRecording();

    if (this.transcriber && this.isConnected) {
      await this.transcriber.close();
      this.transcriber = null;
      this.isConnected = false;
    }

    this.client = null;
    console.log('Disconnected from AssemblyAI');
  }

  get connected(): boolean {
    return this.isConnected;
  }

  // Static method to check if AssemblyAI is supported
  static isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}

export default AssemblyAIStreamingService;