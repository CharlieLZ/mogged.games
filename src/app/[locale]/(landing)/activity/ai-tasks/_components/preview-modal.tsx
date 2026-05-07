'use client';

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';

type MediaType = 'image' | 'audio' | 'video' | 'file';

type MediaItem = {
  url: string;
  type: MediaType;
  nameHint?: string;
};

export function PreviewModal({
  items,
  previewLabel,
  downloadLabel,
}: {
  items: MediaItem[];
  previewLabel: string;
  downloadLabel: string;
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-8 w-8 p-0"
        title={previewLabel}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{previewLabel}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {items.map((item, index) => (
            <div key={`${item.url}-${index}`} className="space-y-2">
              {item.type === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.nameHint || `Image ${index + 1}`}
                  className="max-h-[60vh] w-full rounded-lg object-contain"
                />
              )}
              {item.type === 'video' && (
                <video
                  src={item.url}
                  controls
                  className="max-h-[60vh] w-full rounded-lg"
                >
                  Your browser does not support video playback.
                </video>
              )}
              {item.type === 'audio' && (
                <audio src={item.url} controls className="w-full">
                  Your browser does not support audio playback.
                </audio>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground truncate text-sm">
                  {item.nameHint || `${item.type}-${index + 1}`}
                </span>
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={item.url}
                    download={item.nameHint || `${item.type}-${index + 1}`}
                  >
                    <Download className="mr-1 h-3 w-3" />
                    {downloadLabel}
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
