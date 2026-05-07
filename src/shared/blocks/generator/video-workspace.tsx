'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BellRing,
  CreditCard,
  Loader2,
  Mic2,
  Search,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import {
  getAIGenerationCostCredits,
  getRequestedModelForScene,
  type AIGenerationScene,
} from '@/config/ai-model-registry';
import { SEEDANCE_PROVIDER } from '@/extensions/ai/seedance/types';
import { AITaskStatus } from '@/extensions/ai/types';
import { DurationTimeline } from '@/shared/blocks/generator/duration-timeline';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import { GeneratorMediaUrlField } from '@/shared/blocks/generator/media-url-field';
import { GeneratorPricingModal } from '@/shared/blocks/generator/pricing-modal';
import { GeneratorPromptField } from '@/shared/blocks/generator/prompt-field';
import { useVideoGeneratorTask } from '@/shared/blocks/generator/use-video-generator-task';
import {
  DEFAULT_VIDEO_ASPECT_RATIO,
  DEFAULT_VIDEO_DURATION_SECONDS,
  DEFAULT_VIDEO_RESOLUTION,
  MAX_VIDEO_DURATION_SECONDS,
  MIN_VIDEO_DURATION_SECONDS,
  VIDEO_ASPECT_RATIO_OPTIONS,
  VIDEO_RESOLUTION_OPTIONS,
} from '@/shared/blocks/generator/video-generator-config';
import { getVideoGeneratorErrorDescriptor } from '@/shared/blocks/generator/video-generator-error';
import {
  DEFAULT_VIDEO_GENERATOR_MODE,
  parseVideoGeneratorMode,
  type VideoGeneratorMode,
} from '@/shared/blocks/generator/video-generator-mode';
import { VideoGeneratorPreview } from '@/shared/blocks/generator/video-generator-preview';
import type { VideoGeneratorPreviewMediaItem } from '@/shared/blocks/generator/video-generator-preview-state';
import { PaymentModal } from '@/shared/blocks/payment/payment-modal';
import { StripeEmbeddedCheckoutModal } from '@/shared/blocks/payment/stripe-embedded-checkout-modal';
import { usePricingCheckout } from '@/shared/blocks/payment/use-pricing-checkout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Progress } from '@/shared/components/ui/progress';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { useViewerInfo } from '@/shared/hooks/use-viewer-info';
import { IMAGE_TO_VIDEO_SOURCE_IMAGE_QUERY_PARAM } from '@/shared/lib/ai-video-generator-route';
import { isPromptToolInsufficientCreditsMessage } from '@/shared/lib/prompt-tools';
import {
  appendReferenceMediaUrl,
  validateReferenceMediaUrlList,
  type ReferenceMediaKind,
  type ReferenceMediaUrlListIssue,
} from '@/shared/lib/reference-media-url';
import { uploadFileWithDirectStorage } from '@/shared/lib/upload-client';
import { cn } from '@/shared/lib/utils';

interface VideoWorkspaceProps {
  pricingPayload?: GeneratorPricingPayload | null;
  srOnlyTitle?: string;
  defaultMode?: VideoGeneratorMode;
  showSamplePreview?: boolean;
}

type UploadTarget =
  | 'first-image'
  | 'last-image'
  | 'reference-images'
  | 'reference-videos'
  | 'reference-audios'
  | null;

const MAX_PROMPT_LENGTH = 2000;
const DEFAULT_PROVIDER = SEEDANCE_PROVIDER;
const GENERATOR_MODE_TABS: readonly VideoGeneratorMode[] = [
  'text-to-video',
  'image-to-video',
  'reference-to-video',
];

function formatDuration(seconds: number): string {
  const mins = seconds / 60;
  if (mins >= 1) {
    const value = mins >= 10 ? Math.round(mins) : Number(mins.toFixed(1));
    return `${value} min`;
  }

  return `${Math.max(1, Math.round(seconds))} s`;
}

function getMediaValidationMessageKey(
  kind: ReferenceMediaKind,
  issue: ReferenceMediaUrlListIssue | null
) {
  if (!issue) {
    return null;
  }

  if (kind === 'image') {
    switch (issue.code) {
      case 'cloud_drive_or_social':
        return 'form.image_url_cloud_drive';
      case 'private_host':
        return 'form.image_url_private';
      case 'wrong_media_type':
        return 'form.image_url_video';
      case 'too_many':
        return 'form.image_url_too_many';
      case 'invalid':
      case 'unsupported_protocol':
      case 'non_media_attachment':
        return 'form.image_url_invalid';
    }
  }

  if (kind === 'video') {
    switch (issue.code) {
      case 'cloud_drive_or_social':
        return 'form.video_url_cloud_drive';
      case 'private_host':
        return 'form.video_url_private';
      case 'wrong_media_type':
        return 'form.video_url_media_type';
      case 'too_many':
        return 'form.video_url_too_many';
      case 'invalid':
      case 'unsupported_protocol':
      case 'non_media_attachment':
        return 'form.video_url_invalid';
    }
  }

  switch (issue.code) {
    case 'cloud_drive_or_social':
      return 'form.audio_url_cloud_drive';
    case 'private_host':
      return 'form.audio_url_private';
    case 'wrong_media_type':
      return 'form.audio_url_media_type';
    case 'too_many':
      return 'form.audio_url_too_many';
    case 'invalid':
    case 'unsupported_protocol':
    case 'non_media_attachment':
      return 'form.audio_url_invalid';
  }
}

function getFirstValidationMessageKey(
  ...keys: Array<string | null | undefined>
): string | null {
  return keys.find((key): key is string => Boolean(key)) ?? null;
}

function buildAspectRatioPreviewClassName(value: string) {
  switch (value) {
    case '9:16':
      return 'h-4.5 w-1.5';
    case '1:1':
      return 'size-2.5';
    case '4:3':
      return 'h-2.5 w-3.5';
    case '3:4':
      return 'h-3.5 w-2.5';
    case '21:9':
      return 'h-1 w-5';
    case 'auto':
      return 'h-2 w-3.5';
    case '16:9':
    default:
      return 'h-2 w-5';
  }
}

function GeneratorSettingRow({
  icon: Icon,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-border/60 bg-card/35 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg border px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Icon className="text-muted-foreground h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        {hint ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {hint}
          </p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  );
}

function GeneratorChoiceGroup({
  label,
  value,
  options,
  onChange,
  optionsClassName,
  renderPreview,
  variant = 'card',
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  optionsClassName: string;
  renderPreview?: (optionValue: string, active: boolean) => ReactNode;
  variant?: 'card' | 'minimal';
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className={optionsClassName}>
        {options.map((option) => {
          const active = value === option.value;

          return (
            <button
              type="button"
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-col items-center justify-center text-center text-xs font-medium transition-colors focus-visible:outline-none',
                renderPreview ? 'gap-0' : 'gap-0.5',
                variant === 'minimal'
                  ? active
                    ? 'text-foreground min-h-11 min-w-0 flex-1 bg-transparent px-0.5 py-1 sm:min-w-[3.5rem] sm:flex-none sm:px-1 sm:py-1.5'
                    : 'text-foreground/72 hover:text-foreground min-h-11 min-w-0 flex-1 bg-transparent px-0.5 py-1 sm:min-w-[3.5rem] sm:flex-none sm:px-1 sm:py-1.5'
                  : active
                    ? 'border-primary/70 bg-primary/12 text-foreground min-h-10 rounded-lg border px-1.5 py-1.5 shadow-sm'
                    : 'border-border/60 bg-card/85 text-foreground/72 hover:bg-muted/55 hover:text-foreground min-h-10 rounded-lg border px-1.5 py-1.5'
              )}
            >
              {renderPreview ? renderPreview(option.value, active) : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VideoWorkspace({
  pricingPayload,
  srOnlyTitle,
  defaultMode = DEFAULT_VIDEO_GENERATOR_MODE,
  showSamplePreview,
}: VideoWorkspaceProps) {
  const locale = useLocale();
  const t = useTranslations('ai.video.generator');
  const commonActions = useTranslations('common.actions');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isCheckSign, setIsShowSignModal } = useAppContext();
  const {
    viewerInfo,
    isLoading: isViewerInfoLoading,
    refreshViewerInfo,
  } = useViewerInfo();
  const {
    checkoutWithProvider,
    closeEmbeddedCheckout,
    embeddedCheckoutSession,
    finalizeEmbeddedCheckout,
    isEmbeddedCheckoutFinalizing,
    isEmbeddedCheckoutOpen,
    isLoading: isCheckoutLoading,
    pricingItem,
    productId: checkoutProductId,
    startCheckoutFlow,
    stripePublishableKey,
  } = usePricingCheckout({ locale });

  const [mode, setMode] = useState<VideoGeneratorMode>(defaultMode);
  const [prompt, setPrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [fast, setFast] = useState(true);
  const [generateAudio, setGenerateAudio] = useState(true);
  const [webSearch, setWebSearch] = useState(false);
  const [returnLastFrame, setReturnLastFrame] = useState(false);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<string>(
    DEFAULT_VIDEO_DURATION_SECONDS
  );
  const [videoResolution, setVideoResolution] = useState<string>(
    DEFAULT_VIDEO_RESOLUTION
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<string>(
    DEFAULT_VIDEO_ASPECT_RATIO
  );
  const [firstImageUrl, setFirstImageUrl] = useState('');
  const [lastImageUrl, setLastImageUrl] = useState('');
  const [referenceImageUrlsText, setReferenceImageUrlsText] = useState('');
  const [referenceVideoUrlsText, setReferenceVideoUrlsText] = useState('');
  const [referenceAudioUrlsText, setReferenceAudioUrlsText] = useState('');
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<UploadTarget>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isTranslatingPrompt, setIsTranslatingPrompt] = useState(false);
  const [isRewritingPrompt, setIsRewritingPrompt] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(
    user?.notificationPreferences?.aiTaskCompletionEmailEnabled === true
  );
  const [notifyOnCompletionByDefault, setNotifyOnCompletionByDefault] =
    useState(
      user?.notificationPreferences?.aiTaskCompletionEmailEnabled === true
    );
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const promptRef = useRef(prompt);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
    const enabled =
      user?.notificationPreferences?.aiTaskCompletionEmailEnabled === true;
    setNotifyOnCompletion(enabled);
    setNotifyOnCompletionByDefault(enabled);
  }, [user?.id, user?.notificationPreferences?.aiTaskCompletionEmailEnabled]);

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam) {
      setMode(parseVideoGeneratorMode(modeParam, defaultMode));
    }

    const imageUrlParam = searchParams
      .get(IMAGE_TO_VIDEO_SOURCE_IMAGE_QUERY_PARAM)
      ?.trim();

    if (imageUrlParam) {
      setMode('image-to-video');
      setFirstImageUrl(imageUrlParam);
    }
  }, [defaultMode, searchParams]);

  const scene = useMemo<AIGenerationScene>(() => {
    switch (mode) {
      case 'image-to-video':
        return 'image-to-video';
      case 'reference-to-video':
        return 'reference-to-video';
      case 'text-to-video':
      default:
        return 'text-to-video';
    }
  }, [mode]);

  const model = useMemo(() => getRequestedModelForScene(scene), [scene]);
  const promptLength = prompt.trim().length;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;
  const isGuestViewer = !user && viewerInfo?.isGuest === true;
  const guestQuota = isGuestViewer ? viewerInfo?.guestQuota : null;
  const guestQuotaLimit = guestQuota?.limit ?? viewerInfo?.quotaTotal ?? 0;
  const guestQuotaRemaining = guestQuota?.remaining ?? 0;
  const remainingCredits =
    user?.credits?.remainingCredits ??
    viewerInfo?.credits?.remainingCredits ??
    0;
  const canUseHostedGeneration = Boolean(user || isGuestViewer);

  const firstFrameValidation = useMemo(
    () => validateReferenceMediaUrlList(firstImageUrl, 'image', 1),
    [firstImageUrl]
  );
  const lastFrameValidation = useMemo(
    () => validateReferenceMediaUrlList(lastImageUrl, 'image', 1),
    [lastImageUrl]
  );
  const referenceImageValidation = useMemo(
    () => validateReferenceMediaUrlList(referenceImageUrlsText, 'image', 9),
    [referenceImageUrlsText]
  );
  const referenceVideoValidation = useMemo(
    () => validateReferenceMediaUrlList(referenceVideoUrlsText, 'video', 3),
    [referenceVideoUrlsText]
  );
  const referenceAudioValidation = useMemo(
    () => validateReferenceMediaUrlList(referenceAudioUrlsText, 'audio', 3),
    [referenceAudioUrlsText]
  );

  const imageUrls = useMemo(() => {
    if (mode === 'image-to-video') {
      return [...firstFrameValidation.items, ...lastFrameValidation.items];
    }
    if (mode === 'reference-to-video') {
      return referenceImageValidation.items;
    }
    return [];
  }, [
    firstFrameValidation,
    lastFrameValidation,
    mode,
    referenceImageValidation,
  ]);

  const videoUrls = useMemo(
    () => (mode === 'reference-to-video' ? referenceVideoValidation.items : []),
    [mode, referenceVideoValidation]
  );
  const audioUrls = useMemo(
    () => (mode === 'reference-to-video' ? referenceAudioValidation.items : []),
    [mode, referenceAudioValidation]
  );
  const costCredits = getAIGenerationCostCredits(scene, {
    durationSeconds: videoDurationSeconds,
    resolution: videoResolution,
    fast,
    webSearch,
    hasVideoInput: videoUrls.length > 0,
  });
  const hasPricingModal = Boolean(pricingPayload?.pricing.items?.length);
  const hasInsufficientCredits =
    canUseHostedGeneration && remainingCredits < costCredits;

  const primaryReferenceUrl =
    mode === 'image-to-video'
      ? firstImageUrl.trim()
      : (referenceImageValidation.items[0] ?? referenceImageUrlsText.trim());
  const firstFrameIssueKey = getMediaValidationMessageKey(
    'image',
    firstFrameValidation.issue
  );
  const lastFrameIssueKey = getMediaValidationMessageKey(
    'image',
    lastFrameValidation.issue
  );
  const referenceImageIssueKey = getMediaValidationMessageKey(
    'image',
    referenceImageValidation.issue
  );
  const referenceVideoIssueKey = getMediaValidationMessageKey(
    'video',
    referenceVideoValidation.issue
  );
  const referenceAudioIssueKey = getMediaValidationMessageKey(
    'audio',
    referenceAudioValidation.issue
  );
  const referenceModeNeedsImageOrVideo =
    mode === 'reference-to-video' &&
    imageUrls.length === 0 &&
    videoUrls.length === 0;
  const referenceRequiredMessageKey =
    referenceModeNeedsImageOrVideo && referenceAudioUrlsText.trim()
      ? 'form.reference_required'
      : null;
  const activeValidationMessageKey =
    mode === 'image-to-video'
      ? getFirstValidationMessageKey(firstFrameIssueKey, lastFrameIssueKey)
      : mode === 'reference-to-video'
        ? getFirstValidationMessageKey(
            referenceImageIssueKey,
            referenceVideoIssueKey,
            referenceAudioIssueKey,
            referenceRequiredMessageKey
          )
        : null;

  const normalizeErrorMessage = useCallback(
    (raw?: string, context?: { errorCode?: string | null }) => {
      const descriptor = getVideoGeneratorErrorDescriptor({
        raw,
        errorCode: context?.errorCode,
        mode,
        imageUrl: primaryReferenceUrl,
      });

      if (descriptor.kind === 'raw') {
        return descriptor.message;
      }

      if (descriptor.kind === 'generic') {
        return t('error_generic', { reason: descriptor.reason });
      }

      return t(descriptor.key);
    },
    [mode, primaryReferenceUrl, t]
  );

  const taskMessages = useMemo(
    () => ({
      stillProcessing: t('task_still_processing'),
      noResult: t('error_generic', {
        reason: t('error_no_result'),
      }),
      taskCompleted: t('task_completed'),
      imageGenerated: t('image_generated'),
      videoGenerated: t('video_generated'),
      createTaskFailed: t('create_task_failed'),
    }),
    [t]
  );

  const {
    errorMessage,
    estimatedSeconds,
    generatedMedia,
    isGenerating,
    progress,
    startGeneration,
    taskStatus,
    videoDuration,
  } = useVideoGeneratorTask({
    isVideoMode: true,
    normalizeErrorMessage,
    fetchUserCredits: refreshViewerInfo,
    messages: taskMessages,
  });

  const taskStatusLabel = useMemo(() => {
    switch (taskStatus) {
      case AITaskStatus.PENDING:
        return t('status.pending');
      case AITaskStatus.PROCESSING:
        return t('status.processing');
      case AITaskStatus.SUCCESS:
        return t('status.success');
      case AITaskStatus.FAILED:
        return t('status.failed');
      default:
        return '';
    }
  }, [t, taskStatus]);

  const etaRange = useMemo(() => {
    if (!estimatedSeconds) {
      return null;
    }
    const minSec = Math.max(1, estimatedSeconds * 0.8);
    const maxSec = Math.max(minSec, estimatedSeconds * 1.5);
    return `${formatDuration(minSec)} - ${formatDuration(maxSec)}`;
  }, [estimatedSeconds]);

  const hasBlockingValidationError =
    isPromptTooLong ||
    (mode === 'image-to-video' && !firstImageUrl.trim()) ||
    referenceModeNeedsImageOrVideo ||
    Boolean(activeValidationMessageKey);
  const hasGuestQuotaExhausted =
    isGuestViewer && guestQuotaLimit > 0 && guestQuotaRemaining < costCredits;

  const cardTitle = t('form.panel_title');
  const shouldShowSamplePreview = showSamplePreview ?? !srOnlyTitle;
  const stableSamplePreview = isMounted && shouldShowSamplePreview;
  const sharedControlCount = 2;
  const extraControlCount = mode === 'reference-to-video' ? 4 : 3;
  const shouldShowBuyCreditsCta =
    !isMounted || hasInsufficientCredits || remainingCredits <= 0;
  const handleOpenUpload = (target: UploadTarget) => {
    setUploadTarget(target);
    uploadInputRef.current?.click();
  };

  const handleOpenPricing = useCallback(() => {
    if (hasPricingModal) {
      setIsPricingModalOpen(true);
      return;
    }

    router.push('/pricing');
  }, [hasPricingModal, router]);

  const openPricingModal = useCallback(() => {
    handleOpenPricing();
  }, [handleOpenPricing]);

  const handlePricingModalOpenChange = useCallback((open: boolean) => {
    setIsPricingModalOpen(open);
  }, []);

  const handleUploadMedia = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !uploadTarget) {
        return;
      }

      setIsUploadingMedia(true);

      try {
        const uploaded = await uploadFileWithDirectStorage(file, {
          fallbackRoute: file.type.startsWith('image/')
            ? '/api/storage/upload-image'
            : '/api/storage/upload-media',
        });

        if (uploadTarget === 'first-image') {
          setFirstImageUrl(uploaded.url);
        } else if (uploadTarget === 'last-image') {
          setLastImageUrl(uploaded.url);
        } else if (uploadTarget === 'reference-images') {
          setReferenceImageUrlsText((prev) =>
            appendReferenceMediaUrl(prev, uploaded.url)
          );
        } else if (uploadTarget === 'reference-videos') {
          setReferenceVideoUrlsText((prev) =>
            appendReferenceMediaUrl(prev, uploaded.url)
          );
        } else if (uploadTarget === 'reference-audios') {
          setReferenceAudioUrlsText((prev) =>
            appendReferenceMediaUrl(prev, uploaded.url)
          );
        }

        toast.success(t('form.media_upload_success'));
      } catch (error: any) {
        console.error('Media upload failed:', error);
        toast.error(
          error?.message
            ? `${t('form.media_upload_failed')}: ${error.message}`
            : t('form.media_upload_failed')
        );
      } finally {
        setIsUploadingMedia(false);
        setUploadTarget(null);
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    [t, uploadTarget]
  );

  const handleGenerate = async () => {
    if (!canUseHostedGeneration) {
      toast.error(t('checking_account'));
      return;
    }

    if (isGuestViewer && hasGuestQuotaExhausted) {
      toast.error(t('guest_quota_exhausted'));
      setIsShowSignModal(true);
      return;
    }

    if (!isGuestViewer && remainingCredits < costCredits) {
      toast.error(t('insufficient_credits'));
      openPricingModal();
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      toast.error(t('prompt_required'));
      return;
    }

    if (mode === 'image-to-video' && !firstImageUrl.trim()) {
      toast.error(t('form.first_frame_required'));
      return;
    }

    if (activeValidationMessageKey) {
      toast.error(t(activeValidationMessageKey));
      return;
    }

    if (mode === 'reference-to-video' && referenceModeNeedsImageOrVideo) {
      toast.error(t('form.reference_required'));
      return;
    }

    await startGeneration({
      scene,
      mode,
      provider: DEFAULT_PROVIDER,
      model,
      prompt: trimmedPrompt,
      seed,
      videoDurationSeconds,
      videoResolution,
      videoAspectRatio,
      fast,
      generateAudio,
      webSearch,
      returnLastFrame,
      imageUrls,
      videoUrls,
      audioUrls,
      notifyOnCompletion: isGuestViewer ? false : notifyOnCompletion,
      notifyOnCompletionByDefault: isGuestViewer
        ? false
        : notifyOnCompletionByDefault,
      isGuest: isGuestViewer,
    });
  };

  const handleTranslatePrompt = useCallback(async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    setIsTranslatingPrompt(true);

    try {
      const response = await fetch('/api/ai/translate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          mode,
          locale,
        }),
      });

      const payload = await response.json().catch(() => null);
      const responseMessage =
        typeof payload?.message === 'string' ? payload.message : null;
      const translatedPrompt =
        typeof payload?.data?.translatedPrompt === 'string'
          ? payload.data.translatedPrompt.trim()
          : '';

      if (!response.ok || payload?.code !== 0 || !translatedPrompt) {
        if (
          response.status === 402 ||
          isPromptToolInsufficientCreditsMessage(responseMessage)
        ) {
          toast.error(t('insufficient_credits'));
          openPricingModal();
          return;
        }

        throw new Error(
          responseMessage || 'prompt translation failed'
        );
      }

      void refreshViewerInfo();

      if (promptRef.current.trim() !== trimmedPrompt) {
        toast.info(t('form.translation_stale'));
        return;
      }

      setPrompt(translatedPrompt);
      toast.success(
        translatedPrompt === trimmedPrompt
          ? t('form.translation_no_change')
          : t('form.translation_success')
      );
    } catch (error) {
      console.error('[generator] prompt translation failed', {
        step: 'translate_prompt',
        locale,
        mode,
        promptLength: trimmedPrompt.length,
        message: error instanceof Error ? error.message : 'unknown error',
      });
      toast.error(t('form.translation_failed'));
    } finally {
      setIsTranslatingPrompt(false);
    }
  }, [
    locale,
    mode,
    openPricingModal,
    prompt,
    refreshViewerInfo,
    setIsShowSignModal,
    t,
    user,
  ]);

  const handleRewritePrompt = useCallback(async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    if (!user) {
      setIsShowSignModal(true);
      return;
    }

    setIsRewritingPrompt(true);

    try {
      const response = await fetch('/api/ai/rewrite-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          mode,
          locale,
        }),
      });

      const payload = await response.json().catch(() => null);
      const responseMessage =
        typeof payload?.message === 'string' ? payload.message : null;
      const rewrittenPrompt =
        typeof payload?.data?.rewrittenPrompt === 'string'
          ? payload.data.rewrittenPrompt.trim()
          : '';

      if (!response.ok || payload?.code !== 0 || !rewrittenPrompt) {
        if (
          response.status === 402 ||
          isPromptToolInsufficientCreditsMessage(responseMessage)
        ) {
          toast.error(t('insufficient_credits'));
          openPricingModal();
          return;
        }

        throw new Error(
          responseMessage || 'prompt rewrite failed'
        );
      }

      void refreshViewerInfo();

      if (promptRef.current.trim() !== trimmedPrompt) {
        toast.info(t('form.rewrite_prompt_stale'));
        return;
      }

      if (rewrittenPrompt === trimmedPrompt) {
        toast.info(t('form.rewrite_prompt_no_change'));
        return;
      }

      setPrompt(rewrittenPrompt);
      toast.success(t('form.rewrite_prompt_success'));
    } catch (error) {
      console.error('[generator] prompt rewrite failed', {
        step: 'rewrite_prompt',
        locale,
        mode,
        promptLength: trimmedPrompt.length,
        message: error instanceof Error ? error.message : 'unknown error',
      });
      toast.error(t('form.rewrite_prompt_failed'));
    } finally {
      setIsRewritingPrompt(false);
    }
  }, [
    locale,
    mode,
    openPricingModal,
    prompt,
    refreshViewerInfo,
    setIsShowSignModal,
    t,
    user,
  ]);

  const handleDownloadMedia = async (media: VideoGeneratorPreviewMediaItem) => {
    if (!media.url) {
      return;
    }

    try {
      setDownloadingMediaId(media.id);
      const resp = await fetch(media.url);
      if (!resp.ok) {
        throw new Error(t('download_fetch_failed'));
      }

      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const extensionFromMime =
        media.mimeType?.split('/')?.[1] ||
        (blob.type ? blob.type.split('/')?.[1] : undefined);
      link.href = blobUrl;
      link.download = `${media.id}.${extensionFromMime || 'mp4'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 200);
      toast.success(t('download_success'));
    } catch (error) {
      console.error('Failed to download media:', error);
      toast.error(t('download_failed'));
    } finally {
      setDownloadingMediaId(null);
    }
  };

  const heroAspectRatioOptions = useMemo(
    () =>
      VIDEO_ASPECT_RATIO_OPTIONS.filter((option) => option.value !== 'auto'),
    []
  );
  const canRewritePrompt =
    !!prompt.trim() &&
    !isGenerating &&
    errorMessage === t('error_nsfw_blocked');
  const uploadLabel = t('form.upload_media');
  const optionalText = t('form.optional');

  return (
    <section data-slot="video-workspace" className="py-6 md:py-10">
      <div className="container">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card
              data-slot="video-workspace-form-card"
              aria-label={srOnlyTitle || undefined}
              role={srOnlyTitle ? 'region' : undefined}
              className="border-border/70 bg-card/90 gap-4 rounded-3xl py-5 shadow-sm"
            >
              <CardHeader className="px-5 pt-0 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  {cardTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-1 sm:px-6">
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  accept={
                    uploadTarget === 'reference-videos'
                      ? 'video/*'
                      : uploadTarget === 'reference-audios'
                        ? 'audio/*'
                        : 'image/*'
                  }
                  onChange={handleUploadMedia}
                />

                <Tabs
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as VideoGeneratorMode)
                  }
                >
                  <TabsList className="border-border/60 bg-muted/70 grid h-auto w-full grid-cols-3 gap-1 rounded-2xl border p-1">
                    {GENERATOR_MODE_TABS.map((tabMode) => {
                      const fullLabel = t(`tabs.${tabMode}`);
                      const compactLabel = t(`tabs_short.${tabMode}`);

                      return (
                        <TabsTrigger
                          key={tabMode}
                          value={tabMode}
                          aria-label={fullLabel}
                          className="text-foreground/72 hover:bg-background/40 hover:text-foreground data-[state=active]:bg-background/80 data-[state=active]:text-foreground min-h-10 min-w-0 touch-manipulation rounded-xl px-2 py-2 text-center text-xs leading-tight font-semibold transition-colors data-[state=active]:shadow-none sm:min-h-11 sm:px-3 sm:text-sm"
                        >
                          <span className="sm:hidden">{compactLabel}</span>
                          <span className="hidden sm:inline">{fullLabel}</span>
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>

                {mode === 'image-to-video' ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <GeneratorMediaUrlField
                      id="first-frame-url"
                      label={t('form.first_frame')}
                      value={firstImageUrl}
                      placeholder={t('form.first_frame_placeholder')}
                      helperText={t('form.first_frame_hint')}
                      uploadLabel={uploadLabel}
                      errorText={
                        firstFrameIssueKey ? t(firstFrameIssueKey) : null
                      }
                      isUploading={
                        isUploadingMedia && uploadTarget === 'first-image'
                      }
                      onChange={setFirstImageUrl}
                      onUpload={() => handleOpenUpload('first-image')}
                    />
                    <GeneratorMediaUrlField
                      id="last-frame-url"
                      label={t('form.last_frame')}
                      value={lastImageUrl}
                      placeholder={t('form.last_frame_placeholder')}
                      helperText={t('form.last_frame_hint')}
                      uploadLabel={uploadLabel}
                      optionalText={optionalText}
                      errorText={
                        lastFrameIssueKey ? t(lastFrameIssueKey) : null
                      }
                      isUploading={
                        isUploadingMedia && uploadTarget === 'last-image'
                      }
                      onChange={setLastImageUrl}
                      onUpload={() => handleOpenUpload('last-image')}
                    />
                  </div>
                ) : null}

                {mode === 'reference-to-video' ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <GeneratorMediaUrlField
                        id="reference-images"
                        label={t('form.reference_images')}
                        value={referenceImageUrlsText}
                        placeholder={t('form.reference_images_placeholder')}
                        helperText={t('form.reference_images_hint', {
                          count: imageUrls.length,
                        })}
                        uploadLabel={uploadLabel}
                        errorText={
                          referenceImageIssueKey
                            ? t(referenceImageIssueKey)
                            : null
                        }
                        isUploading={
                          isUploadingMedia &&
                          uploadTarget === 'reference-images'
                        }
                        onChange={setReferenceImageUrlsText}
                        onUpload={() => handleOpenUpload('reference-images')}
                      />
                      <GeneratorMediaUrlField
                        id="reference-videos"
                        label={t('form.reference_videos')}
                        value={referenceVideoUrlsText}
                        placeholder={t('form.reference_videos_placeholder')}
                        helperText={t('form.reference_videos_hint', {
                          count: videoUrls.length,
                        })}
                        uploadLabel={uploadLabel}
                        errorText={
                          referenceVideoIssueKey
                            ? t(referenceVideoIssueKey)
                            : null
                        }
                        isUploading={
                          isUploadingMedia &&
                          uploadTarget === 'reference-videos'
                        }
                        onChange={setReferenceVideoUrlsText}
                        onUpload={() => handleOpenUpload('reference-videos')}
                      />
                    </div>
                    {referenceRequiredMessageKey ? (
                      <p className="text-destructive text-xs">
                        {t(referenceRequiredMessageKey)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <GeneratorPromptField
                  mode={mode}
                  prompt={prompt}
                  maxPromptLength={MAX_PROMPT_LENGTH}
                  isPromptTooLong={isPromptTooLong}
                  isTranslating={isTranslatingPrompt}
                  onPromptChange={setPrompt}
                  onTranslate={handleTranslatePrompt}
                />

                <DurationTimeline
                  label={t('form.duration')}
                  value={videoDurationSeconds}
                  min={MIN_VIDEO_DURATION_SECONDS}
                  max={MAX_VIDEO_DURATION_SECONDS}
                  onValueChange={setVideoDurationSeconds}
                />

                <div
                  data-slot="generator-runtime-controls"
                  className="bg-card/30 space-y-3 rounded-xl border px-4 py-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-left rtl:text-right">
                      <p className="text-sm font-semibold">
                        {t('form.advanced')}
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {t('form.workflow_runtime_hint')}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-muted/60">
                      {t('form.advanced_count', {
                        count: sharedControlCount,
                      })}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <GeneratorSettingRow
                      icon={Zap}
                      label={t('form.fast')}
                      hint={t('form.fast_hint')}
                      checked={fast}
                      onCheckedChange={setFast}
                    />
                    <GeneratorSettingRow
                      icon={Mic2}
                      label={t('form.generate_audio')}
                      hint={t('form.generate_audio_hint')}
                      checked={generateAudio}
                      onCheckedChange={setGenerateAudio}
                    />
                  </div>
                </div>

                <GeneratorChoiceGroup
                  label={t('form.aspect_ratio')}
                  value={videoAspectRatio}
                  options={heroAspectRatioOptions}
                  onChange={setVideoAspectRatio}
                  optionsClassName="flex items-start justify-between gap-1 sm:justify-start sm:gap-4"
                  variant="minimal"
                  renderPreview={(optionValue, active) => (
                    <span
                      className={cn(
                        'block rounded-full bg-current transition-opacity',
                        buildAspectRatioPreviewClassName(optionValue),
                        active ? 'text-primary' : 'text-foreground/16'
                      )}
                    />
                  )}
                />

                <GeneratorChoiceGroup
                  label={t('form.resolution')}
                  value={videoResolution}
                  options={VIDEO_RESOLUTION_OPTIONS}
                  onChange={setVideoResolution}
                  optionsClassName="grid grid-cols-2 gap-1.5"
                />

                <Accordion
                  type="single"
                  collapsible
                  className="bg-card/30 rounded-xl border shadow-sm"
                  data-slot="generator-more-controls"
                >
                  <AccordionItem value="advanced" className="border-none">
                    <AccordionTrigger className="px-4 py-3">
                      <div className="flex flex-1 items-center justify-between gap-3 text-left rtl:text-right">
                        <p className="text-sm font-semibold">
                          {commonActions('more')}
                        </p>
                        <Badge variant="outline" className="bg-muted/60">
                          {t('form.advanced_count', {
                            count: extraControlCount,
                          })}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 px-4 pb-5">
                      <div className="grid gap-3 md:grid-cols-2">
                        <GeneratorSettingRow
                          icon={Search}
                          label={t('form.web_search')}
                          hint={t('form.web_search_hint')}
                          checked={webSearch}
                          onCheckedChange={setWebSearch}
                        />
                        <GeneratorSettingRow
                          icon={Sparkles}
                          label={t('form.return_last_frame')}
                          hint={t('form.return_last_frame_hint')}
                          checked={returnLastFrame}
                          onCheckedChange={setReturnLastFrame}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="seed" className="text-sm font-medium">
                          {t('form.seed')}
                        </Label>
                        <Input
                          id="seed"
                          value={seed}
                          onChange={(event) => setSeed(event.target.value)}
                          placeholder={t('form.seed_placeholder')}
                          className="text-sm"
                        />
                      </div>

                      {mode === 'reference-to-video' ? (
                        <GeneratorMediaUrlField
                          id="reference-audios"
                          label={t('form.reference_audios')}
                          value={referenceAudioUrlsText}
                          placeholder={t('form.reference_audios_placeholder')}
                          helperText={t('form.reference_audios_hint', {
                            count: audioUrls.length,
                          })}
                          uploadLabel={uploadLabel}
                          errorText={
                            referenceAudioIssueKey
                              ? t(referenceAudioIssueKey)
                              : null
                          }
                          isUploading={
                            isUploadingMedia &&
                            uploadTarget === 'reference-audios'
                          }
                          onChange={setReferenceAudioUrlsText}
                          onUpload={() => handleOpenUpload('reference-audios')}
                        />
                      ) : null}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {user ? (
                  <div
                    data-slot="generator-notification-controls"
                    className="bg-card/30 space-y-3 rounded-xl border px-4 py-3 shadow-sm"
                  >
                    <div className="text-left rtl:text-right">
                      <p className="text-sm font-semibold">
                        {t('form.notifications')}
                      </p>
                      <p className="text-muted-foreground text-xs leading-relaxed">
                        {t('form.notifications_hint')}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <GeneratorSettingRow
                        icon={BellRing}
                        label={t('form.notify_on_completion')}
                        hint={t('form.notify_on_completion_hint')}
                        checked={notifyOnCompletion}
                        onCheckedChange={(checked) => {
                          setNotifyOnCompletion(checked);
                          if (!checked) {
                            setNotifyOnCompletionByDefault(false);
                          }
                        }}
                      />
                      <GeneratorSettingRow
                        icon={BellRing}
                        label={t('form.notify_on_completion_by_default')}
                        hint={t('form.notify_on_completion_by_default_hint')}
                        checked={notifyOnCompletionByDefault}
                        onCheckedChange={(checked) => {
                          setNotifyOnCompletionByDefault(checked);
                          if (checked) {
                            setNotifyOnCompletion(true);
                          }
                        }}
                      />
                    </div>
                  </div>
                ) : null}

                {!isMounted ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" />
                    {t('loading')}
                  </Button>
                ) : isCheckSign || (!user && isViewerInfoLoading) ? (
                  <Button className="w-full" disabled size="lg">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" />
                    {t('checking_account')}
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleGenerate}
                    disabled={
                      isGenerating ||
                      !canUseHostedGeneration ||
                      !prompt.trim() ||
                      hasBlockingValidationError
                    }
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" />
                        {t('generating')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                        {t('generate')}
                      </>
                    )}
                  </Button>
                )}

                {!isMounted ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
                    </span>
                    <span>{t('credits_remaining', { credits: 0 })}</span>
                  </div>
                ) : remainingCredits > 0 && !hasInsufficientCredits ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-primary">
                      {t('credits_cost', { credits: costCredits })}
                    </span>
                    <span>
                      {t('credits_remaining', { credits: remainingCredits })}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-primary">
                        {t('credits_cost', { credits: costCredits })}
                      </span>
                      <span>
                        {t('credits_remaining', { credits: remainingCredits })}
                      </span>
                    </div>
                    {shouldShowBuyCreditsCta ? (
                      hasPricingModal ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={openPricingModal}
                        >
                          <CreditCard className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                          {t('buy_credits')}
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          className="w-full"
                          size="lg"
                        >
                          <Link href="/pricing">
                            <CreditCard className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                            {t('buy_credits')}
                          </Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                )}

                {isGenerating && etaRange && (
                  <div className="bg-muted/60 space-y-1 rounded-lg border p-4 text-sm">
                    <p className="font-medium">
                      {t('task_submitted_eta', { eta: etaRange })}
                    </p>
                    {videoDuration && (
                      <p className="text-muted-foreground">
                        {t('video_playback_duration', {
                          duration: formatDuration(videoDuration),
                        })}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      {t('task_submitted_detail')}
                    </p>
                    {notifyOnCompletion ? (
                      <p className="text-muted-foreground">
                        {t('task_completion_notification_scheduled')}
                      </p>
                    ) : null}
                  </div>
                )}

                {isGenerating && (
                  <div className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('progress')}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                    {taskStatusLabel && (
                      <p className="text-muted-foreground text-center text-xs">
                        {taskStatusLabel}
                      </p>
                    )}
                    {user ? (
                      <p className="text-muted-foreground pt-2 text-center text-xs">
                        {t('activity_link_hint')}{' '}
                        <Link
                          href="/activity/ai-tasks"
                          className="text-primary underline hover:no-underline"
                        >
                          {t('activity_link_text')}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>

            <VideoGeneratorPreview
              mode={mode}
              generatedMedia={generatedMedia}
              isGenerating={isGenerating}
              showSamplePreview={stableSamplePreview}
              resultsUseVideoIcon={true}
              errorMessage={errorMessage}
              canRewritePrompt={canRewritePrompt}
              isRewritingPrompt={isRewritingPrompt}
              downloadingMediaId={downloadingMediaId}
              onDownloadMedia={handleDownloadMedia}
              onRewritePrompt={handleRewritePrompt}
            />
          </div>
        </div>
      </div>

      {pricingPayload ? (
        <GeneratorPricingModal
          costCredits={costCredits}
          isLoading={isCheckoutLoading}
          loadingProductId={checkoutProductId}
          onCheckout={startCheckoutFlow}
          onOpenChange={handlePricingModalOpenChange}
          open={isPricingModalOpen}
          pricingPayload={pricingPayload}
          translationNamespace="ai.image.generator"
        />
      ) : null}
      <PaymentModal
        isLoading={isCheckoutLoading}
        pricingItem={pricingItem}
        onCheckout={checkoutWithProvider}
      />
      {embeddedCheckoutSession ? (
        <StripeEmbeddedCheckoutModal
          clientSecret={embeddedCheckoutSession.clientSecret}
          isFinalizing={isEmbeddedCheckoutFinalizing}
          onComplete={finalizeEmbeddedCheckout}
          onOpenChange={(open) => {
            if (!open) {
              closeEmbeddedCheckout();
            }
          }}
          open={isEmbeddedCheckoutOpen}
          publishableKey={stripePublishableKey}
        />
      ) : null}
    </section>
  );
}
