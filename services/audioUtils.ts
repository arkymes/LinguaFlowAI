
import type { Blob } from '@google/genai';

/**
 * Downsamples audio data from a source sample rate to a target sample rate.
 * Critical for Gemini API which performs best with 16kHz input.
 */
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number = 16000): Float32Array {
  if (outputRate === inputRate) {
    return buffer;
  }
  
  const sampleRateRatio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  let offsetResult = 0;
  let offsetBuffer = 0;
  
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    
    // Simple linear interpolation / averaging for downsampling
    let accum = 0;
    let count = 0;
    
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  
  return result;
}

export function createAudioBlob(data: Float32Array, inputSampleRate: number): Blob {
  // 1. Downsample to 16kHz for optimal AI recognition
  const targetSampleRate = 16000;
  const downsampledData = downsampleBuffer(data, inputSampleRate, targetSampleRate);
  
  // 2. Convert to Int16 PCM
  const l = downsampledData.length;
  const int16 = new Int16Array(l);
  
  for (let i = 0; i < l; i++) {
     // Clamp values to [-1, 1]
     const s = Math.max(-1, Math.min(1, downsampledData[i]));
     // Scale to Int16 range
     int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // 3. Convert to Base64
  const uint8 = new Uint8Array(int16.buffer);
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  const base64 = btoa(binary);

  return {
    data: base64,
    mimeType: `audio/pcm;rate=${targetSampleRate}`,
  };
}

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function convertPCMToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
