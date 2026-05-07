import { Loader2, Upload } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

interface GeneratorMediaUrlFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  helperText?: string;
  uploadLabel: string;
  optionalText?: string;
  errorText?: string | null;
  isUploading?: boolean;
  showUploadButton?: boolean;
  compact?: boolean;
  rows?: number;
  onChange: (value: string) => void;
  onUpload: () => void;
}

function getOptionalLabel(optionalText?: string) {
  return optionalText ? `(${optionalText})` : undefined;
}

export function GeneratorMediaUrlField({
  id,
  label,
  value,
  placeholder,
  helperText,
  uploadLabel,
  optionalText,
  errorText,
  isUploading = false,
  showUploadButton = true,
  compact = false,
  rows = 4,
  onChange,
  onUpload,
}: GeneratorMediaUrlFieldProps) {
  const optionalLabel = getOptionalLabel(optionalText);
  const statusText = errorText ?? helperText;

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor={id}
            className={cn(
              compact ? 'text-xs font-semibold' : 'text-sm font-semibold'
            )}
          >
            {label}
          </Label>
          {optionalLabel ? (
            <span className="text-foreground/72 text-xs">{optionalLabel}</span>
          ) : null}
        </div>
        {showUploadButton ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={cn('gap-2', compact ? 'h-7 px-2 text-xs' : undefined)}
            onClick={onUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {uploadLabel}
          </Button>
        ) : null}
      </div>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        aria-invalid={errorText ? 'true' : 'false'}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          compact ? 'min-h-16 text-xs' : 'min-h-20 text-sm',
          errorText
            ? 'border-destructive/60 focus-visible:ring-destructive/20'
            : undefined
        )}
      />
      {statusText ? (
        <p
          className={cn(
            compact ? 'text-xs leading-5' : 'text-xs leading-relaxed',
            errorText ? 'text-destructive' : 'text-foreground/72'
          )}
        >
          {statusText}
        </p>
      ) : null}
    </div>
  );
}
