/// <reference lib="esnext" />
/// <reference lib="webworker" />

/**
 * LinearPCMProcessor - AudioWorkletProcessor for converting microphone input
 * from Float32 samples to 16-bit PCM for AssemblyAI streaming.
 *
 * This replaces the deprecated ScriptProcessorNode with modern AudioWorklet API.
 */
class LinearPCMProcessor extends AudioWorkletProcessor {
  static BUFFER_SIZE = 8192;

  constructor() {
    super();
    this.buffer = new Int16Array(LinearPCMProcessor.BUFFER_SIZE);
    this.offset = 0;
  }

  /**
   * Process audio frames (128 samples per call by default)
   * @param {Float32Array[][]} inputs - Input audio data
   * @param {Float32Array[][]} outputs - Output audio data (unused)
   * @param {Object} parameters - Audio parameters (unused)
   * @returns {boolean} - Return true to keep processor alive
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0]?.[0]; // Get first channel of first input

    if (!input) {
      return true; // Keep processor alive even without input
    }

    // Process each sample in the input buffer
    for (let i = 0; i < input.length; i++) {
      // Clamp the float sample to [-1, 1] range
      const sample = Math.max(-1, Math.min(1, input[i]));

      // Scale to 16-bit PCM range
      // Negative values: multiply by 0x8000 (32768)
      // Positive values: multiply by 0x7FFF (32767)
      this.buffer[this.offset++] = sample < 0
        ? sample * 0x8000
        : sample * 0x7FFF;

      // When buffer is full, send it to main thread
      if (this.offset >= this.buffer.length) {
        // Create a copy of the buffer to send
        const bufferCopy = new Int16Array(this.buffer);
        this.port.postMessage(bufferCopy);

        // Reset offset for next batch
        this.offset = 0;
      }
    }

    return true; // Keep processor alive
  }
}

// Register the processor with a unique name
registerProcessor('linear-pcm-processor', LinearPCMProcessor);
