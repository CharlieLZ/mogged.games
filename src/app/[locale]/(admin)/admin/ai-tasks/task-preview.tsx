'use client';

import { useState } from 'react';
import { Eye } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { parseDbJsonValue } from '@/shared/lib/db-json';

type TaskPreviewProps = {
  taskInfo: unknown;
  mediaType: string;
  status: string;
};

type MediaItem = {
  url: string;
  type: 'image' | 'video' | 'audio';
};

const imageUrlKeys = ['imageUrl', 'url', 'image', 'src', 'thumbnailUrl'];
const videoUrlKeys = ['videoUrl', 'video_url', 'video', 'url', 'src'];
const audioUrlKeys = ['audioUrl', 'audio_url', 'audio', 'url', 'src'];

function isBlockedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('queue.fal.run')) {
      return true;
    }
  } catch {
    // ignore parse errors
  }
  return false;
}

function resolveUrl(source: unknown, keys: string[]) {
  if (typeof source === 'string' && source.trim()) {
    return source.trim();
  }

  if (!source || typeof source !== 'object') {
    return undefined;
  }

  for (const key of keys) {
    const value = (source as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function collectMediaItems(taskInfo: unknown): MediaItem[] {
  const items: MediaItem[] = [];
  const seen = new Set<string>();

  const addItem = (url: string, type: 'image' | 'video' | 'audio') => {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl || seen.has(trimmedUrl) || isBlockedUrl(trimmedUrl)) {
      return;
    }
    seen.add(trimmedUrl);
    items.push({ url: trimmedUrl, type });
  };

  if (!taskInfo || typeof taskInfo !== 'object') {
    return items;
  }

  const info = taskInfo as Record<string, unknown>;

  // Handle images array
  if (Array.isArray(info.images)) {
    info.images.forEach((image: unknown) => {
      const imageUrl = resolveUrl(image, imageUrlKeys);
      if (imageUrl) addItem(imageUrl, 'image');
    });
  }

  // Handle videos array
  if (Array.isArray(info.videos)) {
    info.videos.forEach((video: unknown) => {
      const videoUrl = resolveUrl(video, videoUrlKeys);
      if (videoUrl) addItem(videoUrl, 'video');
      const thumbnailUrl = resolveUrl(video, imageUrlKeys);
      if (thumbnailUrl) addItem(thumbnailUrl, 'image');
    });
  }

  // Handle root level URLs
  const rootImageUrl = resolveUrl(info, imageUrlKeys);
  if (rootImageUrl) addItem(rootImageUrl, 'image');

  const rootVideoUrl = resolveUrl(info, videoUrlKeys);
  if (rootVideoUrl) addItem(rootVideoUrl, 'video');

  const rootAudioUrl = resolveUrl(info, audioUrlKeys);
  if (rootAudioUrl) addItem(rootAudioUrl, 'audio');

  return items;
}

export function TaskPreview({ taskInfo, mediaType, status }: TaskPreviewProps) {
  const [open, setOpen] = useState(false);

  const parsedInfo = parseDbJsonValue(taskInfo);
  const mediaItems = collectMediaItems(parsedInfo);
  const hasContent = mediaItems.length > 0;

  // Don't show preview button if no content or task is still processing
  if (!hasContent || status === 'pending' || status === 'processing') {
    return (
      <span className="text-muted-foreground text-xs">
        {status === 'pending' || status === 'processing'
          ? 'Processing...'
          : '-'}
      </span>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setOpen(true)}
        title="Preview"
      >
        <Eye className="h-4 w-4" />
      </Button>
      <DialogContent
        className="max-h-[80vh] max-w-3xl overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            {mediaType === 'video'
              ? 'Video Preview'
              : mediaType === 'image'
                ? 'Image Preview'
                : mediaType === 'audio'
                  ? 'Audio Preview'
                  : 'Task Preview'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mediaItems.map((item, index) => (
            <div key={index} className="w-full">
              {item.type === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={`Preview ${index + 1}`}
                  className="h-auto max-h-[60vh] w-full rounded-lg object-contain"
                />
              )}
              {item.type === 'video' && (
                <video
                  src={item.url}
                  controls
                  className="h-auto max-h-[60vh] w-full rounded-lg"
                  preload="metadata"
                >
                  Your browser does not support video playback.
                </video>
              )}
              {item.type === 'audio' && (
                <audio src={item.url} controls className="w-full">
                  Your browser does not support audio playback.
                </audio>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
