/**
 * Type definitions for AudioWorklet support
 * Ensures TypeScript recognizes AudioWorklet APIs
 */

/// <reference lib="dom" />
/// <reference lib="esnext" />

declare global {
  interface AudioContext {
    audioWorklet: AudioWorklet;
  }

  interface AudioWorklet {
    addModule(moduleURL: string): Promise<void>;
  }

  interface AudioWorkletNodeOptions extends AudioNodeOptions {
    numberOfInputs?: number;
    numberOfOutputs?: number;
    outputChannelCount?: number[];
    parameterData?: Record<string, number>;
    processorOptions?: any;
  }

  class AudioWorkletNode extends AudioNode {
    constructor(context: AudioContext, name: string, options?: AudioWorkletNodeOptions);
    readonly port: MessagePort;
    readonly parameters: AudioParamMap;
    onprocessorerror: ((this: AudioWorkletNode, ev: Event) => any) | null;
  }

  interface AudioWorkletProcessor {
    readonly port: MessagePort;
    process(
      inputs: Float32Array[][],
      outputs: Float32Array[][],
      parameters: Record<string, Float32Array>
    ): boolean;
  }

  var AudioWorkletProcessor: {
    prototype: AudioWorkletProcessor;
    new(options?: any): AudioWorkletProcessor;
  };

  function registerProcessor(
    name: string,
    processorCtor: new (options?: any) => AudioWorkletProcessor
  ): void;
}

export {};
