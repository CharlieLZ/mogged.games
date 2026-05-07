'use client';

import { useRef, useState } from 'react';
import {
  Clipboard,
  Copy,
  Languages,
  Loader2,
  Maximize2,
  Minimize2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { TRANSLATE_PROMPT_COST_CREDITS } from '@/shared/lib/prompt-tools';
import { cn } from '@/shared/lib/utils';

import { getPromptExamples, type GeneratorPromptMode } from './prompt-examples';

type GeneratorPromptFieldProps = {
  mode: GeneratorPromptMode;
  prompt: string;
  maxPromptLength: number;
  isPromptTooLong: boolean;
  isTranslating: boolean;
  onPromptChange: (value: string) => void;
  onTranslate: () => Promise<void> | void;
  translationNamespace?: 'ai.video.generator' | 'ai.image.generator';
  optionalText?: string;
  compact?: boolean;
};

async function copyText(value: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', 'true');
  input.style.position = 'absolute';
  input.style.left = '-9999px';

  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(input);

  return copied;
}

export function GeneratorPromptField({
  mode,
  prompt,
  maxPromptLength,
  isPromptTooLong,
  isTranslating,
  onPromptChange,
  onTranslate,
  translationNamespace = 'ai.video.generator',
  optionalText,
  compact = false,
}: GeneratorPromptFieldProps) {
  const t = useTranslations(translationNamespace);
  const locale = useLocale();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const exampleIndexesRef = useRef<Record<GeneratorPromptMode, number>>({
    'text-to-video': 0,
    'image-to-video': 0,
    'reference-to-video': 0,
    'text-to-image': 0,
    'image-to-image': 0,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const promptLength = prompt.trim().length;
  const hasPrompt = prompt.trim().length > 0;

  const handleTryExample = () => {
    const examples = getPromptExamples(mode, locale);
    const currentIndex = exampleIndexesRef.current[mode] ?? 0;
    const nextPrompt = examples[currentIndex % examples.length] ?? '';

    exampleIndexesRef.current[mode] = (currentIndex + 1) % examples.length;
    onPromptChange(nextPrompt);
    toast.success(t('form.example_loaded'));
  };

  const handleCopy = async () => {
    const copied = await copyText(prompt.trim());
    toast.success(copied ? t('form.prompt_copied') : t('form.copy_failed'));
  };

  const handlePaste = async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      toast.error(t('form.paste_failed'));
      return;
    }

    try {
      const pastedText = (await navigator.clipboard.readText()).trim();
      if (!pastedText) {
        toast.error(t('form.paste_failed'));
        return;
      }

      const textarea = textareaRef.current;
      if (!textarea) {
        onPromptChange(pastedText);
        toast.success(t('form.prompt_pasted'));
        return;
      }

      const selectionStart = textarea.selectionStart ?? prompt.length;
      const selectionEnd = textarea.selectionEnd ?? prompt.length;
      const nextPrompt =
        prompt.slice(0, selectionStart) +
        pastedText +
        prompt.slice(selectionEnd);

      onPromptChange(nextPrompt);
      requestAnimationFrame(() => {
        textarea.focus();
        const nextCursor = selectionStart + pastedText.length;
        textarea.setSelectionRange(nextCursor, nextCursor);
      });
      toast.success(t('form.prompt_pasted'));
    } catch (error) {
      console.error('[generator/prompt-field] clipboard paste failed', error);
      toast.error(t('form.paste_failed'));
    }
  };

  const handleClear = () => {
    onPromptChange('');
    textareaRef.current?.focus();
    toast.success(t('form.prompt_cleared'));
  };

  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Label
            htmlFor="video-prompt"
            className={cn(
              compact ? 'text-xs font-semibold' : 'text-sm font-medium'
            )}
          >
            {t('form.prompt')}
          </Label>
          {optionalText ? (
            <span className="text-foreground/72 text-xs">({optionalText})</span>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex flex-wrap items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-full',
                compact ? 'h-7 px-2 text-xs' : 'h-8 px-2.5'
              )}
              onClick={handleTryExample}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t('form.try_example')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'text-muted-foreground hover:text-foreground rounded-full',
                compact ? 'h-7 px-2 text-xs' : 'h-8 px-2.5'
              )}
              onClick={() => void onTranslate()}
              disabled={!hasPrompt || isTranslating}
            >
              {isTranslating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Languages className="h-3.5 w-3.5" />
              )}
              {isTranslating ? t('form.translating') : t('form.translate')}
            </Button>
          </div>
          <p className="text-muted-foreground text-[11px]">
            {t('credits_cost', {
              credits: TRANSLATE_PROMPT_COST_CREDITS,
            })}
          </p>
        </div>
      </div>

      <div
        data-slot="generator-prompt-surface"
        className={cn(
          'border-border/40 bg-card/72 focus-within:border-primary/45 focus-within:ring-primary/10 border shadow-xs transition-colors focus-within:ring-2',
          compact ? 'rounded-xl' : 'rounded-2xl'
        )}
      >
        <Textarea
          ref={textareaRef}
          id="video-prompt"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={t('form.prompt_placeholder')}
          className={cn(
            'resize-none border-none bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
            compact
              ? 'min-h-20 px-3 py-2 text-xs'
              : 'min-h-28 px-4 py-3 text-sm',
            isExpanded && 'min-h-72'
          )}
          maxLength={maxPromptLength}
        />

        <div className="border-border/60 text-foreground/72 flex items-center justify-between gap-3 border-t px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-2">
            <span>
              {promptLength} / {maxPromptLength}
            </span>
            {isPromptTooLong ? (
              <span className="text-destructive">
                {t('form.prompt_too_long')}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-foreground/65 hover:text-foreground rounded-full"
              onClick={() => void handleCopy()}
              disabled={!hasPrompt}
              aria-label={t('form.copy_prompt')}
              title={t('form.copy_prompt')}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-foreground/65 hover:text-foreground rounded-full"
              onClick={() => void handlePaste()}
              aria-label={t('form.paste_prompt')}
              title={t('form.paste_prompt')}
            >
              <Clipboard className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-foreground/65 hover:text-foreground rounded-full"
              onClick={handleClear}
              disabled={!hasPrompt}
              aria-label={t('form.clear_prompt')}
              title={t('form.clear_prompt')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-foreground/65 hover:text-foreground rounded-full"
              onClick={() => setIsExpanded((value) => !value)}
              aria-label={
                isExpanded ? t('form.collapse_prompt') : t('form.expand_prompt')
              }
              title={
                isExpanded ? t('form.collapse_prompt') : t('form.expand_prompt')
              }
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
