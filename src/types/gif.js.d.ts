declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: string;
    dither?: boolean | string;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | CanvasImageSource,
      options?: { delay?: number; copy?: boolean }
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'abort', callback: () => void): void;
    on(event: string, callback: (...args: any[]) => void): void;
    render(): void;
    abort(): void;
  }
}
