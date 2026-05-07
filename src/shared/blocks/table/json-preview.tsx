'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

export function JsonPreview({
  value,
  placeholder,
  className,
}: {
  value: unknown;
  placeholder?: string;
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  let formattedJson = '';
  let previewText = '';
  const rawValue =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2);

  try {
    const json = typeof value === 'string' ? JSON.parse(value) : value;
    formattedJson = JSON.stringify(json, null, 2);
    previewText =
      formattedJson.length > 100
        ? formattedJson.substring(0, 100) + '...'
        : formattedJson;
  } catch {
    formattedJson = rawValue;
    previewText =
      rawValue.length > 100 ? rawValue.substring(0, 100) + '...' : rawValue;
  }

  return (
    <div className="space-y-1">
      <pre className={`overflow-hidden text-xs ${className}`}>
        {isExpanded ? formattedJson : previewText}
      </pre>
      {(formattedJson.length > 100 || rawValue.length > 100) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 px-2 text-xs"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              Expand
            </>
          )}
        </Button>
      )}
    </div>
  );
}
