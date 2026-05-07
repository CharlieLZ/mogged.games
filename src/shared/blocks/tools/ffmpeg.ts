'use client';

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile as fetchFileFromUtil } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_VERSION = '0.12.10';
const CORE_CDN_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

export function ensureUint8Array(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) {
    return data;
  }

  return new TextEncoder().encode(
    typeof data === 'string' ? data : String(data ?? '')
  );
}

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) {
    return ffmpegInstance;
  }

  if (!loadPromise) {
    const instance = new FFmpeg();

    loadPromise = instance
      .load({
        coreURL: `${CORE_CDN_BASE}/ffmpeg-core.js`,
        wasmURL: `${CORE_CDN_BASE}/ffmpeg-core.wasm`,
        workerURL: `${CORE_CDN_BASE}/ffmpeg-core.worker.js`,
      })
      .then(() => {
        ffmpegInstance = instance;
        return instance;
      })
      .catch((error) => {
        loadPromise = null;
        ffmpegInstance = null;
        throw error;
      });
  }

  return loadPromise;
}

export const fetchFile = fetchFileFromUtil;
