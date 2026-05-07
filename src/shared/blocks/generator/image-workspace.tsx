'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BellRing,
  ChevronDown,
  CreditCard,
  Crown,
  ImageIcon,
  Layers2,
  Loader2,
  LogIn,
  Search,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Link, useRouter } from '@/core/i18n/navigation';
import {
  getAIGenerationCostCredits,
  isGuestAllowedAIModel,
  type AIGenerationScene,
} from '@/config/ai-model-registry';
import { KIE_MARKET_PROVIDER } from '@/extensions/ai/kie-market/types';
import { AIMediaType, AITaskStatus } from '@/extensions/ai/types';
import { LazyImage } from '@/shared/blocks/common/lazy-image';
import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import {
  DEFAULT_IMAGE_ASPECT_RATIO,
  DEFAULT_IMAGE_EDIT_MODE,
  DEFAULT_IMAGE_MODEL_KEY,
  DEFAULT_IMAGE_OUTPUT_FORMAT,
  DEFAULT_IMAGE_RESOLUTION,
  canUseImageModelKey,
  getCompatibleImageModelKey,
  getImageModelCredits,
  getImageModelCreditValues,
  getImageModelForMode,
  getImageModelOption,
  IMAGE_ASPECT_RATIO_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  IMAGE_OUTPUT_FORMAT_OPTIONS,
  IMAGE_RESOLUTION_OPTIONS,
  isImageModelI2iOnly,
  isImageModelT2iOnly,
  MAX_MULTI_FUSION_IMAGE_COUNT,
  MAX_SINGLE_EDIT_IMAGE_COUNT,
  normalizeImageModelKeyForAccess,
  QUICK_IMAGE_MODEL_OPTIONS,
  type ImageEditMode,
  type ImageModelAccessTier,
  type ImageModelKey,
  type ImageModelOption,
} from '@/shared/blocks/generator/image-generator-config';
import { getImageGeneratorErrorDescriptor } from '@/shared/blocks/generator/image-generator-error';
import {
  appendImageGeneratorGuestHistory,
  readImageGeneratorGuestHistory,
  writeImageGeneratorGuestHistory,
  type ImageGeneratorGuestHistoryItem,
} from '@/shared/blocks/generator/image-generator-guest-history';
import {
  DEFAULT_IMAGE_GENERATOR_MODE,
  parseImageGeneratorMode,
  type ImageGeneratorMode,
} from '@/shared/blocks/generator/image-generator-mode';
import { ImageModelLogo } from '@/shared/blocks/generator/image-model-logo';
import { ImageTaskHistoryPanel } from '@/shared/blocks/generator/image-task-history-panel';
import { GeneratorPricingModal } from '@/shared/blocks/generator/pricing-modal';
import { GeneratorPromptField } from '@/shared/blocks/generator/prompt-field';
import { useImageGeneratorTask } from '@/shared/blocks/generator/use-image-generator-task';
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
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Progress } from '@/shared/components/ui/progress';
import { Switch } from '@/shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useAppContext } from '@/shared/contexts/app';
import { useViewerInfo } from '@/shared/hooks/use-viewer-info';
import {
  IMAGE_GENERATOR_APPLY_PROMPT_EVENT,
  IMAGE_GENERATOR_WORKSPACE_ID,
  normalizeImageGeneratorApplyPromptDetail,
} from '@/shared/lib/image-generator-prompt-event';
import { isPromptToolInsufficientCreditsMessage } from '@/shared/lib/prompt-tools';
import {
  IMAGE_TASK_HISTORY_LIMIT,
  mapGuestHistoryItemToImageTaskHistoryEntry,
  type ImageTaskHistoryEntry,
  type ImageTaskHistorySnapshot,
} from '@/shared/lib/image-task-history';
import {
  appendReferenceMediaUrl,
  validateReferenceMediaUrlList,
  type ReferenceMediaUrlListIssue,
} from '@/shared/lib/reference-media-url';
import { uploadFileWithDirectStorage } from '@/shared/lib/upload-client';
import { cn } from '@/shared/lib/utils';

interface ImageWorkspaceProps {
  pricingPayload?: GeneratorPricingPayload | null;
  srOnlyTitle?: string;
  defaultMode?: ImageGeneratorMode;
  primaryTabs?: 'workflow' | 'image-edit-mode';
  viewportFit?: 'default' | 'hero';
  showSamplePreview?: boolean;
  initialRecentTasks?: ImageTaskHistorySnapshot | null;
}

const DEFAULT_PROVIDER = KIE_MARKET_PROVIDER;
const IMAGE_GENERATOR_MODE_TABS: readonly ImageGeneratorMode[] = [
  'text-to-image',
  'image-to-image',
];
const IMAGE_EDIT_MODE_TABS: readonly {
  value: ImageEditMode;
  labelKey: 'form.single_edit' | 'form.multi_fusion';
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'single-edit',
    labelKey: 'form.single_edit',
    icon: ImageIcon,
  },
  {
    value: 'multi-fusion',
    labelKey: 'form.multi_fusion',
    icon: Layers2,
  },
];
const MAX_PROMPT_LENGTH = 4000;
const FREE_IMAGE_QUEUE_WAIT_MINUTES = 1;
const FREE_IMAGE_QUEUE_WAIT_MAX_MINUTES = 5;
const HERO_VIEWPORT_FORM_CARD_STYLE: CSSProperties = {
  height: 'clamp(17rem, calc(100dvh - 20rem), 47.5rem)',
};

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0 s';
  }

  const mins = seconds / 60;
  if (mins >= 1) {
    const value = mins >= 10 ? Math.round(mins) : Number(mins.toFixed(1));
    return `${value} min`;
  }

  return `${Math.max(1, Math.round(seconds))} s`;
}

function getMediaValidationMessageKey(
  issue: ReferenceMediaUrlListIssue | null
) {
  if (!issue) {
    return null;
  }

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
    case '3:2':
      return 'h-2.5 w-4';
    case '2:3':
      return 'h-4 w-2.5';
    case '5:4':
      return 'h-3 w-3.75';
    case '4:5':
      return 'h-3.75 w-3';
    case '16:9':
    default:
      return 'h-2 w-5';
  }
}

function getNextImageResolution(value: string) {
  switch (value) {
    case '1K':
      return '2K';
    case '2K':
      return '4K';
    case '4K':
    default:
      return '4K';
  }
}

function GeneratorSettingRow({
  icon: Icon,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="border-border/40 bg-card/90 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-xl border px-3 py-2">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="text-foreground/65 h-3.5 w-3.5" />
          <span>{label}</span>
        </div>
        {hint ? (
          <p className="text-foreground/72 text-xs leading-5">{hint}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
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
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  optionsClassName: string;
  renderPreview?: (optionValue: string, active: boolean) => ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">{label}</p>
      <div className={optionsClassName}>
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
                active
                  ? 'border-primary/50 bg-primary/10 text-foreground min-h-9 rounded-xl border px-1.5 py-1.5 shadow-sm'
                  : 'border-border/40 bg-card/90 text-muted-foreground hover:bg-muted/55 hover:text-foreground min-h-9 rounded-xl border px-1.5 py-1.5'
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

function getModelCreditLabel({
  option,
  resolution,
  t,
}: {
  option: ImageModelOption;
  resolution: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const values = getImageModelCreditValues(option.key);
  const uniqueValues = Array.from(new Set(values));

  if (uniqueValues.length <= 1) {
    return t('models.credits_fixed', {
      credits: getImageModelCredits(option.key, resolution),
    });
  }

  return t('models.credits_by_resolution', {
    credits: values.join('/'),
  });
}

const IMAGE_MODEL_UPGRADE_BUTTON_CLASS_NAME =
  'h-7 rounded-md border-primary/75 bg-primary px-2 text-primary-foreground [background-image:none] shadow-sm shadow-primary/20 enabled:hover:bg-primary/92 enabled:hover:shadow-md enabled:hover:shadow-primary/25';
const DISABLED_MODEL_CURSOR_CLASS_NAME =
  'cursor-not-allowed [&_span]:cursor-not-allowed [&_svg]:cursor-not-allowed';

function getImageModelStatusBadgeVariant(): 'destructive' {
  return 'destructive';
}

function getImageModelStatusBadgeClassName({
  compact = false,
}: {
  compact?: boolean;
} = {}) {
  return cn(
    compact ? 'min-h-5 rounded-full px-1.5 text-xs leading-none' : 'rounded-full',
    'shadow-sm'
  );
}

function ImageModelBadges({
  option,
  onUpgrade,
  showUpgrade = true,
  t,
}: {
  option: ImageModelOption;
  onUpgrade?: () => void;
  showUpgrade?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {option.isNew ? (
        <Badge
          variant={getImageModelStatusBadgeVariant()}
          className={getImageModelStatusBadgeClassName()}
        >
          {t('models.badges.new')}
        </Badge>
      ) : null}
      {option.isVip ? (
        <Badge
          variant={getImageModelStatusBadgeVariant()}
          className={getImageModelStatusBadgeClassName()}
        >
          <Crown className="h-3 w-3" />
          {t('models.badges.vip')}
        </Badge>
      ) : null}
      {option.isVip && showUpgrade ? (
        <Button
          type="button"
          size="sm"
          className={IMAGE_MODEL_UPGRADE_BUTTON_CLASS_NAME}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onUpgrade?.();
          }}
        >
          {t('models.badges.upgrade')}
        </Button>
      ) : null}
    </span>
  );
}

function ImageModelCornerBadges({
  option,
  t,
}: {
  option: ImageModelOption;
  t: ReturnType<typeof useTranslations>;
}) {
  const displaysNew = option.isNew;
  const displaysVip = option.isVip;

  if (!displaysNew && !displaysVip) {
    return null;
  }

  return (
    <span className="rtl:-right-auto pointer-events-none absolute -top-2 -right-1.5 flex items-center gap-1 rtl:-left-1.5">
      {displaysNew ? (
        <Badge
          variant={getImageModelStatusBadgeVariant()}
          className={getImageModelStatusBadgeClassName({
            compact: true,
          })}
        >
          {t('models.badges.new')}
        </Badge>
      ) : null}
      {displaysVip ? (
        <Badge
          variant={getImageModelStatusBadgeVariant()}
          className={getImageModelStatusBadgeClassName({
            compact: true,
          })}
        >
          {t('models.badges.vip')}
        </Badge>
      ) : null}
    </span>
  );
}

function ImageModelSelector({
  value,
  resolution,
  viewerTier,
  onChange,
  onUpgrade,
  t,
}: {
  value: ImageModelKey;
  resolution: string;
  viewerTier: ImageModelAccessTier | null;
  onChange: (value: ImageModelKey) => void;
  onUpgrade: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const selectedOption = getImageModelOption(value);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">{t('form.model')}</p>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="border-border/40 bg-card/95 hover:bg-muted/50 h-auto w-full justify-between rounded-2xl px-3 py-2.5 text-left rtl:text-right"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <span className="text-primary bg-background border-border/40 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border">
                <ImageModelLogo brand={selectedOption.brand} />
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                  {t(`models.options.${selectedOption.translationKey}.name`)}
                  <ImageModelBadges
                    option={selectedOption}
                    onUpgrade={onUpgrade}
                    showUpgrade={false}
                    t={t}
                  />
                </span>
                <span className="text-muted-foreground block text-xs leading-5">
                  {t(
                    `models.options.${selectedOption.translationKey}.description`
                  )}
                </span>
              </span>
            </span>
            <ChevronDown className="text-foreground/60 h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="border-border/40 w-[var(--radix-dropdown-menu-trigger-width)] min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-x-visible rounded-2xl p-2 shadow-sm"
        >
          <div className="max-h-[22rem] space-y-1 overflow-y-auto">
            {IMAGE_MODEL_OPTIONS.map((option) => {
              const active = option.key === value;
              const disabled = !canUseImageModelKey(option.key, viewerTier);
              const stateClass = disabled
                ? 'border-border/45 bg-transparent text-foreground/72 cursor-not-allowed'
                : active
                  ? 'border-primary/50 bg-primary/5 text-foreground cursor-pointer'
                  : 'border-transparent text-foreground/85 cursor-pointer hover:bg-accent/40 hover:text-accent-foreground hover:border-border/60';

              return (
                <div
                  key={option.key}
                  role="option"
                  aria-selected={active}
                  className={cn(
                    'focus-within:ring-ring grid w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors focus-within:ring-2 rtl:text-right',
                    stateClass
                  )}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    aria-disabled={disabled}
                    onClick={() => {
                      if (disabled) {
                        return;
                      }
                      onChange(option.key);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'flex min-w-0 items-start gap-2.5 text-left focus:outline-none rtl:text-right',
                      disabled ? DISABLED_MODEL_CURSOR_CLASS_NAME : ''
                    )}
                  >
                    <span
                      className={cn(
                        'text-primary bg-background border-border/40 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border',
                        disabled
                          ? 'border-border/30 bg-background/70 opacity-85'
                          : ''
                      )}
                    >
                      <ImageModelLogo brand={option.brand} />
                    </span>
                    <span className="min-w-0 space-y-0.5">
                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        {t(`models.options.${option.translationKey}.name`)}
                        <ImageModelBadges
                          option={option}
                          onUpgrade={onUpgrade}
                          showUpgrade={false}
                          t={t}
                        />
                      </span>
                      <span
                        className={cn(
                          'line-clamp-2 block text-xs leading-5',
                          disabled
                            ? 'text-foreground/58'
                            : 'text-muted-foreground'
                        )}
                      >
                        {t(
                          `models.options.${option.translationKey}.description`
                        )}
                      </span>
                    </span>
                  </button>
                  <span className="flex w-24 shrink-0 flex-col items-end gap-1.5 rtl:items-start">
                    <span
                      className={cn(
                        'max-w-full truncate text-xs font-semibold',
                        disabled ? 'text-foreground/78' : 'text-foreground'
                      )}
                      title={getModelCreditLabel({ option, resolution, t })}
                    >
                      {getModelCreditLabel({ option, resolution, t })}
                    </span>
                    {disabled && option.isVip ? (
                      <Button
                        type="button"
                        size="sm"
                        className={IMAGE_MODEL_UPGRADE_BUTTON_CLASS_NAME}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsOpen(false);
                          onUpgrade();
                        }}
                      >
                        {t('models.badges.upgrade')}
                      </Button>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ImageModelQuickSelect({
  value,
  onChange,
  viewerTier,
  t,
}: {
  value: ImageModelKey;
  onChange: (value: ImageModelKey) => void;
  viewerTier: ImageModelAccessTier | null;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">{t('form.quick_select')}</p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {QUICK_IMAGE_MODEL_OPTIONS.map((option) => {
          const active = option.key === value;
          const disabled = !canUseImageModelKey(option.key, viewerTier);

          return (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  onChange(option.key);
                }
              }}
              className={cn(
                'border-border/40 bg-card/90 text-foreground/85 hover:bg-accent/40 hover:text-accent-foreground relative flex min-h-8 max-w-[9.5rem] items-center gap-1.5 rounded-full border px-2 py-1 text-left text-xs transition-colors rtl:text-right',
                active ? 'border-primary/50 bg-primary/10 text-foreground' : '',
                disabled
                  ? `border-border/30 bg-card/55 text-foreground/72 hover:bg-card/55 hover:text-foreground/72 ${DISABLED_MODEL_CURSOR_CLASS_NAME}`
                  : ''
              )}
            >
              <ImageModelCornerBadges option={option} t={t} />
              <span
                className={cn(
                  'text-primary bg-background border-border/40 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border [&_svg]:h-3.5 [&_svg]:w-3.5',
                  disabled ? 'border-border/30 bg-background/70 opacity-85' : ''
                )}
              >
                <ImageModelLogo brand={option.brand} />
              </span>
              <span className="min-w-0">
                <span className="block truncate leading-tight font-semibold">
                  {t(`models.options.${option.translationKey}.name`)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ImageWorkspace({
  pricingPayload,
  srOnlyTitle,
  defaultMode = DEFAULT_IMAGE_GENERATOR_MODE,
  primaryTabs = 'workflow',
  viewportFit = 'default',
  showSamplePreview,
  initialRecentTasks,
}: ImageWorkspaceProps) {
  const locale = useLocale();
  const t = useTranslations('ai.image.generator');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isCheckSign, fetchUserCredits, setIsShowSignModal } =
    useAppContext();
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

  const usesImageEditModePrimaryTabs = primaryTabs === 'image-edit-mode';
  const usesHeroViewportFit = viewportFit === 'hero';
  const effectiveDefaultMode: ImageGeneratorMode = usesImageEditModePrimaryTabs
    ? 'image-to-image'
    : defaultMode;
  const [mode, setMode] = useState<ImageGeneratorMode>(effectiveDefaultMode);
  const [selectedImageModelKey, setSelectedImageModelKey] =
    useState<ImageModelKey>(DEFAULT_IMAGE_MODEL_KEY);
  const [imageEditMode, setImageEditMode] = useState<ImageEditMode>(
    DEFAULT_IMAGE_EDIT_MODE
  );
  const [prompt, setPrompt] = useState('');
  const [imageResolution, setImageResolution] = useState(
    DEFAULT_IMAGE_RESOLUTION
  );
  const [imageAspectRatio, setImageAspectRatio] = useState(
    DEFAULT_IMAGE_ASPECT_RATIO
  );
  const [imageOutputFormat, setImageOutputFormat] = useState(
    DEFAULT_IMAGE_OUTPUT_FORMAT
  );
  const [sourceImageUrl, setSourceImageUrl] = useState('');
  const [webSearch, setWebSearch] = useState(false);
  const [downloadingMediaId, setDownloadingMediaId] = useState<string | null>(
    null
  );
  const [guestHistoryItems, setGuestHistoryItems] = useState<
    ImageGeneratorGuestHistoryItem[]
  >([]);
  const [recentTaskSnapshot, setRecentTaskSnapshot] =
    useState<ImageTaskHistorySnapshot>(
      initialRecentTasks || {
        items: [],
        total: 0,
      }
    );
  const [isMounted, setIsMounted] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isRecentTasksLoading, setIsRecentTasksLoading] = useState(false);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [isTranslatingPrompt, setIsTranslatingPrompt] = useState(false);
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
  const storedGuestMediaIdsRef = useRef<Set<string>>(new Set());
  const wasGeneratingRef = useRef(false);
  const recentTasksAbortRef = useRef<AbortController | null>(null);
  const deleteAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setIsMounted(true);

    return () => {
      recentTasksAbortRef.current?.abort();
      deleteAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
    if (!initialRecentTasks) {
      return;
    }

    setRecentTaskSnapshot(initialRecentTasks);
  }, [initialRecentTasks]);

  useEffect(() => {
    const enabled =
      user?.notificationPreferences?.aiTaskCompletionEmailEnabled === true;
    setNotifyOnCompletion(enabled);
    setNotifyOnCompletionByDefault(enabled);
  }, [user?.id, user?.notificationPreferences?.aiTaskCompletionEmailEnabled]);

  useEffect(() => {
    if (usesImageEditModePrimaryTabs) {
      setMode('image-to-image');
      return;
    }

    const modeParam = searchParams.get('mode');
    if (modeParam) {
      setMode(parseImageGeneratorMode(modeParam, defaultMode));
    }
  }, [defaultMode, searchParams, usesImageEditModePrimaryTabs]);

  useEffect(() => {
    const handleApplyPrompt = (event: Event) => {
      const detail = normalizeImageGeneratorApplyPromptDetail(
        (event as CustomEvent<unknown>).detail
      );

      if (!detail) {
        console.warn('[generator/image-workspace] prompt event ignored', {
          step: 'apply_prompt_event',
        });
        return;
      }

      if (detail.mode) {
        setMode(parseImageGeneratorMode(detail.mode, defaultMode));
      }

      setPrompt(detail.prompt);

      if (detail.sourceImageUrl) {
        setSourceImageUrl(detail.sourceImageUrl);
      } else if (detail.mode === 'text-to-image') {
        setSourceImageUrl('');
      }

      const scrollWorkspaceIntoView = () => {
        const workspace = document.getElementById(IMAGE_GENERATOR_WORKSPACE_ID);

        if (typeof workspace?.scrollIntoView !== 'function') {
          return;
        }

        workspace.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      };

      if (typeof window.requestAnimationFrame === 'function') {
        window.requestAnimationFrame(scrollWorkspaceIntoView);
      } else {
        window.setTimeout(scrollWorkspaceIntoView, 0);
      }
    };

    window.addEventListener(
      IMAGE_GENERATOR_APPLY_PROMPT_EVENT,
      handleApplyPrompt
    );

    return () => {
      window.removeEventListener(
        IMAGE_GENERATOR_APPLY_PROMPT_EVENT,
        handleApplyPrompt
      );
    };
  }, [defaultMode]);

  const scene = useMemo<AIGenerationScene>(
    () => (mode === 'image-to-image' ? 'image-to-image' : 'text-to-image'),
    [mode]
  );
  const promptLength = prompt.trim().length;
  const isPromptRequired = mode === 'text-to-image';
  const hasMissingRequiredPrompt = isPromptRequired && promptLength === 0;
  const isPromptTooLong = promptLength > MAX_PROMPT_LENGTH;
  const isGuestViewer = !user && viewerInfo?.isGuest === true;
  const imageModelAccessTier: ImageModelAccessTier | null = isCheckSign
    ? null
    : user
      ? (viewerInfo?.imageQueueTier ?? null)
      : 'guest';
  const hasResolvedViewerAccessTier = imageModelAccessTier !== null;
  const effectiveImageModelKey =
    normalizeImageModelKeyForAccess(
      selectedImageModelKey,
      imageModelAccessTier
    );
  const model = useMemo(
    () => getImageModelForMode(effectiveImageModelKey, mode),
    [mode, effectiveImageModelKey]
  );

  useEffect(() => {
    if (!hasResolvedViewerAccessTier) {
      return;
    }

    const normalizedKey = normalizeImageModelKeyForAccess(
      selectedImageModelKey,
      imageModelAccessTier
    );
    if (normalizedKey !== selectedImageModelKey) {
      setSelectedImageModelKey(normalizedKey);
    }
  }, [
    hasResolvedViewerAccessTier,
    imageModelAccessTier,
    selectedImageModelKey,
  ]);

  useEffect(() => {
    setSelectedImageModelKey((currentValue) =>
      getCompatibleImageModelKey(currentValue, mode)
    );
  }, [mode]);

  const guestQuota = viewerInfo?.guestQuota ?? null;
  const guestQuotaLimit = guestQuota?.limit ?? viewerInfo?.quotaTotal ?? 0;
  const guestQuotaRemaining = guestQuota?.remaining ?? 0;
  const guestQuotaUsed =
    guestQuota?.used ?? Math.max(0, guestQuotaLimit - guestQuotaRemaining);
  const imageQueueTier =
    viewerInfo?.imageQueueTier ?? (isGuestViewer ? 'guest' : null);
  const effectiveImageResolution = imageResolution;
  const remainingCredits =
    user?.credits?.remainingCredits ??
    viewerInfo?.credits?.remainingCredits ??
    0;
  const canUseHostedGeneration = Boolean(user || isGuestViewer);

  const maxSourceImageCount =
    imageEditMode === 'multi-fusion'
      ? MAX_MULTI_FUSION_IMAGE_COUNT
      : MAX_SINGLE_EDIT_IMAGE_COUNT;
  const sourceImageValidation = useMemo(
    () =>
      validateReferenceMediaUrlList(
        sourceImageUrl,
        'image',
        maxSourceImageCount
      ),
    [maxSourceImageCount, sourceImageUrl]
  );
  const sourceImageIssueKey =
    sourceImageValidation.issue?.code === 'too_many'
      ? imageEditMode === 'multi-fusion'
        ? 'form.image_url_too_many_multi'
        : 'form.image_url_too_many_single'
      : getMediaValidationMessageKey(sourceImageValidation.issue);
  const imageUrls = useMemo(
    () => (mode === 'image-to-image' ? sourceImageValidation.items : []),
    [mode, sourceImageValidation]
  );
  const costCredits = getAIGenerationCostCredits(scene, {
    resolution: effectiveImageResolution,
    model,
  });
  const canUseGuestQuotaForCurrentImage =
    Boolean(guestQuota) &&
    guestQuotaLimit > 0 &&
    guestQuotaRemaining >= costCredits &&
    !webSearch &&
    isGuestAllowedAIModel({
      provider: DEFAULT_PROVIDER,
      mediaType: AIMediaType.IMAGE,
      model,
      scene,
    });
  const generationUsesGuestQuota =
    isGuestViewer || canUseGuestQuotaForCurrentImage;
  const effectiveWebSearch = generationUsesGuestQuota ? false : webSearch;
  const effectiveImageQueueTier = generationUsesGuestQuota
    ? 'guest'
    : imageQueueTier;
  const hasPricingModal = Boolean(pricingPayload?.pricing.items?.length);
  const hasInsufficientCredits =
    Boolean(user) &&
    !generationUsesGuestQuota &&
    remainingCredits < costCredits;
  const hasGuestQuotaExhausted =
    isGuestViewer && guestQuotaLimit > 0 && guestQuotaRemaining < costCredits;
  const blockingValidationMessageKey = hasMissingRequiredPrompt
    ? 'prompt_required'
    : isPromptTooLong
      ? 'form.prompt_too_long'
      : sourceImageIssueKey ||
        (mode === 'image-to-image' && imageUrls.length === 0
          ? 'form.source_image_required'
          : null);
  const hasBlockingValidationError = Boolean(blockingValidationMessageKey);
  const shouldShowBlockingValidationMessage =
    Boolean(blockingValidationMessageKey) &&
    blockingValidationMessageKey !== 'form.source_image_required';
  const shouldShowSamplePreview = showSamplePreview ?? !srOnlyTitle;
  const stableSamplePreview = shouldShowSamplePreview;
  const shouldShowGuestLocalHistory = isGuestViewer && isMounted;
  const guestHistoryEntries = useMemo(
    () =>
      guestHistoryItems.map((item) =>
        mapGuestHistoryItemToImageTaskHistoryEntry(item)
      ),
    [guestHistoryItems]
  );
  const recentTaskEntries = user
    ? recentTaskSnapshot.items
    : shouldShowGuestLocalHistory
      ? guestHistoryEntries
      : [];
  const recentTaskTotal = user
    ? recentTaskSnapshot.total
    : shouldShowGuestLocalHistory
      ? guestHistoryEntries.length
      : 0;
  const shouldShowViewerHistoryLoading =
    !user &&
    isMounted &&
    !isGuestViewer &&
    (isViewerInfoLoading || isCheckSign);
  const shouldShowRecentTasksPanel =
    Boolean(user) ||
    shouldShowGuestLocalHistory ||
    shouldShowViewerHistoryLoading;
  const isRecentTasksPanelLoading =
    isRecentTasksLoading || shouldShowViewerHistoryLoading;
  const hasNoRecentTaskHistory =
    !isRecentTasksPanelLoading && recentTaskTotal === 0;
  const pendingRecentTaskIds = useMemo(
    () =>
      recentTaskSnapshot.items
        .filter(
          (item) => item.status === 'pending' || item.status === 'processing'
        )
        .map((item) => item.id),
    [recentTaskSnapshot.items]
  );

  const normalizeErrorMessage = useCallback(
    (raw?: string, context?: { errorCode?: string | null }) => {
      const descriptor = getImageGeneratorErrorDescriptor({
        raw,
        errorCode: context?.errorCode,
        mode,
        imageUrl: sourceImageUrl.trim(),
      });

      if (descriptor.kind === 'raw') {
        return descriptor.message;
      }

      if (descriptor.kind === 'generic') {
        return t('error_generic', { reason: descriptor.reason });
      }

      return t(descriptor.key);
    },
    [mode, sourceImageUrl, t]
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

  useEffect(() => {
    if (!isGuestViewer) {
      return;
    }

    if (webSearch) {
      setWebSearch(false);
    }
  }, [isGuestViewer, webSearch]);

  const refreshGenerationEntitlement = useCallback(async () => {
    if (user) {
      await fetchUserCredits();
    }

    return refreshViewerInfo();
  }, [fetchUserCredits, refreshViewerInfo, user]);

  const {
    errorMessage,
    estimatedSeconds,
    generatedMedia,
    generatedMediaIsGuest,
    isGenerating,
    progress,
    startGeneration,
    taskStatus,
  } = useImageGeneratorTask({
    normalizeErrorMessage,
    fetchUserCredits: refreshGenerationEntitlement,
    messages: taskMessages,
  });
  const shouldShowPreviewPanel =
    generatedMedia.length > 0 ||
    isGenerating ||
    (stableSamplePreview &&
      (hasNoRecentTaskHistory || shouldShowViewerHistoryLoading));

  const refreshRecentTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        return;
      }

      recentTasksAbortRef.current?.abort();
      const controller = new AbortController();
      recentTasksAbortRef.current = controller;

      if (!options?.silent) {
        setIsRecentTasksLoading(true);
      }

      try {
        const response = await fetch('/api/user/ai-tasks/recent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            limit: IMAGE_TASK_HISTORY_LIMIT,
          }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.code !== 0 || !payload?.data) {
          throw new Error(
            typeof payload?.message === 'string'
              ? payload.message
              : 'recent task refresh failed'
          );
        }

        setRecentTaskSnapshot({
          items: Array.isArray(payload.data.items) ? payload.data.items : [],
          total:
            typeof payload.data.total === 'number'
              ? payload.data.total
              : Array.isArray(payload.data.items)
                ? payload.data.items.length
                : 0,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error(
          '[generator/image-workspace] recent task refresh failed',
          {
            step: 'refresh_recent_tasks',
            userId: user.id,
            error,
          }
        );
      } finally {
        if (!options?.silent) {
          setIsRecentTasksLoading(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    if (!shouldShowGuestLocalHistory || typeof window === 'undefined') {
      return;
    }

    try {
      const items = readImageGeneratorGuestHistory(window.localStorage);
      setGuestHistoryItems(items);
      storedGuestMediaIdsRef.current = new Set(items.map((item) => item.id));
    } catch (error) {
      console.error('[generator/image-workspace] guest history read failed', {
        step: 'read_guest_history',
        error,
      });
    }
  }, [shouldShowGuestLocalHistory]);

  useEffect(() => {
    if (
      !shouldShowGuestLocalHistory ||
      !generatedMediaIsGuest ||
      isGenerating ||
      generatedMedia.length === 0 ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const newMedia = generatedMedia.filter(
      (item) =>
        item.type === 'image' &&
        !item.isSample &&
        item.url &&
        !storedGuestMediaIdsRef.current.has(item.id)
    );
    if (newMedia.length === 0) {
      return;
    }

    setGuestHistoryItems((currentItems) => {
      const nextItems = appendImageGeneratorGuestHistory(
        currentItems,
        newMedia,
        {
          mode,
          prompt: promptRef.current.trim(),
          imageEditMode,
          imageResolution: effectiveImageResolution,
          imageAspectRatio,
          imageOutputFormat,
          sourceImageUrls: imageUrls,
        }
      );

      try {
        writeImageGeneratorGuestHistory(window.localStorage, nextItems);
        storedGuestMediaIdsRef.current = new Set(
          nextItems.map((item) => item.id)
        );
      } catch (error) {
        console.error(
          '[generator/image-workspace] guest history write failed',
          {
            step: 'write_guest_history',
            mediaIds: newMedia.map((item) => item.id),
            error,
          }
        );
      }

      return nextItems;
    });
  }, [
    generatedMedia,
    generatedMediaIsGuest,
    imageAspectRatio,
    imageEditMode,
    imageOutputFormat,
    imageUrls,
    isGenerating,
    mode,
    effectiveImageResolution,
    shouldShowGuestLocalHistory,
  ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (initialRecentTasks) {
      return;
    }

    void refreshRecentTasks();
  }, [initialRecentTasks, refreshRecentTasks, user]);

  useEffect(() => {
    if (!user || pendingRecentTaskIds.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshPendingTasks = async () => {
      try {
        const response = await fetch('/api/user/ai-tasks/batch-refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskIds: pendingRecentTaskIds.slice(0, 20),
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`batch refresh failed: ${response.status}`);
        }

        if (!cancelled) {
          await refreshRecentTasks({ silent: true });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          return;
        }
        console.error(
          '[generator/image-workspace] pending recent task refresh failed',
          {
            step: 'refresh_pending_recent_tasks',
            taskIds: pendingRecentTaskIds,
            error,
          }
        );
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshPendingTasks();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pendingRecentTaskIds, refreshRecentTasks, user]);

  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating && user) {
      void refreshRecentTasks({ silent: true });
    }

    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, refreshRecentTasks, user]);

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

    const minSec = Math.max(1, estimatedSeconds * 0.75);
    const maxSec = Math.max(minSec, estimatedSeconds * 1.4);
    return `${formatDuration(minSec)} - ${formatDuration(maxSec)}`;
  }, [estimatedSeconds]);

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

  const queueNoticeText = useMemo(() => {
    if (!effectiveImageQueueTier) {
      return null;
    }

    if (effectiveImageQueueTier === 'paid') {
      return t('queue_notice_paid');
    }

    return t('queue_notice_free', {
      min: FREE_IMAGE_QUEUE_WAIT_MINUTES,
      max: FREE_IMAGE_QUEUE_WAIT_MAX_MINUTES,
    });
  }, [effectiveImageQueueTier, t]);

  const handlePricingModalOpenChange = useCallback((open: boolean) => {
    setIsPricingModalOpen(open);
  }, []);

  const handleImageEditModeChange = useCallback((nextMode: ImageEditMode) => {
    setImageEditMode(nextMode);

    if (nextMode === 'single-edit') {
      setSourceImageUrl((currentValue) => {
        const firstUrl = validateReferenceMediaUrlList(
          currentValue,
          'image',
          MAX_MULTI_FUSION_IMAGE_COUNT
        ).items[0];

        return firstUrl || currentValue;
      });
    }
  }, []);

  const handleImageModelChange = useCallback(
    (nextModelKey: ImageModelKey) => {
      if (!canUseImageModelKey(nextModelKey, imageModelAccessTier)) {
        return;
      }

      setSelectedImageModelKey(nextModelKey);

      if (isImageModelT2iOnly(nextModelKey) && mode === 'image-to-image') {
        setMode('text-to-image');
      } else if (
        isImageModelI2iOnly(nextModelKey) &&
        mode === 'text-to-image'
      ) {
        setMode('image-to-image');
      }
    },
    [imageModelAccessTier, mode]
  );

  const uploadMediaFile = useCallback(
    async (file: File) => {
      if (isUploadingMedia) {
        return;
      }

      setIsUploadingMedia(true);

      try {
        const uploaded = await uploadFileWithDirectStorage(file, {
          fallbackRoute: '/api/storage/upload-image',
        });

        setSourceImageUrl((current) =>
          imageEditMode === 'multi-fusion'
            ? appendReferenceMediaUrl(current, uploaded.url)
            : uploaded.url
        );
        toast.success(t('form.media_upload_success'));
      } catch (error: any) {
        console.error('[generator/image-workspace] media upload failed', {
          step: 'upload_media',
          mode,
          imageEditMode,
          error,
        });
        toast.error(
          error?.message
            ? `${t('form.media_upload_failed')}: ${error.message}`
            : t('form.media_upload_failed')
        );
      } finally {
        setIsUploadingMedia(false);
      }
    },
    [imageEditMode, isUploadingMedia, mode, t]
  );

  const handleUploadMedia = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      try {
        await uploadMediaFile(file);
      } finally {
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    [uploadMediaFile]
  );

  const handleDropMediaFiles = useCallback(
    (files: FileList) => {
      const file = files[0];
      if (!file) {
        return;
      }

      void uploadMediaFile(file);
    },
    [uploadMediaFile]
  );

  const executeGeneration = useCallback(
    async (input: {
      scene: AIGenerationScene;
      mode: ImageGeneratorMode;
      model: string;
      prompt: string;
      imageEditMode: ImageEditMode;
      imageResolution: string;
      imageAspectRatio: string;
      imageOutputFormat: string;
      webSearch: boolean;
      imageUrls: string[];
      costCredits: number;
    }) => {
      if (!canUseHostedGeneration) {
        toast.error(t('checking_account'));
        return;
      }

      if (
        generationUsesGuestQuota &&
        guestQuotaLimit > 0 &&
        guestQuotaRemaining < input.costCredits
      ) {
        toast.error(t('guest_quota_exhausted'));
        if (isGuestViewer) {
          setIsShowSignModal(true);
        } else {
          openPricingModal();
        }
        return;
      }

      if (!generationUsesGuestQuota && remainingCredits < input.costCredits) {
        toast.error(t('insufficient_credits'));
        openPricingModal();
        return;
      }

      if (input.mode === 'text-to-image' && input.prompt.trim().length === 0) {
        toast.error(t('prompt_required'));
        return;
      }

      if (input.mode === 'image-to-image' && input.imageUrls.length === 0) {
        toast.error(t('form.source_image_required'));
        return;
      }

      await startGeneration({
        scene: input.scene,
        mode: input.mode,
        provider: DEFAULT_PROVIDER,
        model: input.model,
        prompt: input.prompt.trim(),
        imageEditMode: input.imageEditMode,
        imageResolution: input.imageResolution,
        imageAspectRatio: input.imageAspectRatio,
        imageOutputFormat: input.imageOutputFormat,
        webSearch: input.webSearch,
        imageUrls: input.imageUrls,
        notifyOnCompletion: generationUsesGuestQuota
          ? false
          : notifyOnCompletion,
        notifyOnCompletionByDefault: generationUsesGuestQuota
          ? false
          : notifyOnCompletionByDefault,
        isGuest: generationUsesGuestQuota,
      });

      if (user) {
        void refreshRecentTasks({ silent: true });
      }
    },
    [
      canUseHostedGeneration,
      guestQuotaLimit,
      guestQuotaRemaining,
      generationUsesGuestQuota,
      hasPricingModal,
      isGuestViewer,
      notifyOnCompletion,
      notifyOnCompletionByDefault,
      openPricingModal,
      refreshRecentTasks,
      remainingCredits,
      setIsShowSignModal,
      startGeneration,
      t,
      user,
    ]
  );

  const handleGenerate = useCallback(async () => {
    if (hasMissingRequiredPrompt) {
      toast.error(t('prompt_required'));
      return;
    }

    if (sourceImageIssueKey) {
      toast.error(t(sourceImageIssueKey));
      return;
    }

    if (mode === 'image-to-image' && imageUrls.length === 0) {
      toast.error(t('form.source_image_required'));
      return;
    }

    await executeGeneration({
      scene,
      mode,
      model,
      prompt,
      imageEditMode,
      imageResolution: effectiveImageResolution,
      imageAspectRatio,
      imageOutputFormat,
      webSearch: effectiveWebSearch,
      imageUrls,
      costCredits,
    });
  }, [
    costCredits,
    effectiveImageResolution,
    effectiveWebSearch,
    executeGeneration,
    imageAspectRatio,
    imageEditMode,
    imageOutputFormat,
    imageUrls,
    mode,
    model,
    prompt,
    scene,
    sourceImageIssueKey,
    t,
    hasMissingRequiredPrompt,
  ]);

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
      console.error('[generator/image-workspace] prompt translation failed', {
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

  const handleDownloadMedia = useCallback(
    async (media: VideoGeneratorPreviewMediaItem) => {
      if (!media.url) {
        return;
      }

      try {
        setDownloadingMediaId(media.id);
        const resp = await fetch(media.url, {
          signal: AbortSignal.timeout(60000),
        });
        if (!resp.ok) {
          throw new Error(t('download_fetch_failed'));
        }

        const blob = await resp.blob();
        const extensionFromMime =
          media.mimeType?.split('/')?.[1] ||
          (blob.type ? blob.type.split('/')?.[1] : undefined);
        const blobUrl = URL.createObjectURL(blob);

        try {
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `${media.id}.${extensionFromMime || 'png'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(t('download_success'));
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } catch (error) {
        console.error('[generator/image-workspace] download failed', {
          step: 'download_media',
          mediaId: media.id,
          error,
        });
        toast.error(t('download_failed'));
      } finally {
        setDownloadingMediaId(null);
      }
    },
    [t]
  );

  const handleCopyRecentTaskPrompt = useCallback(
    async (entry: ImageTaskHistoryEntry) => {
      const promptToCopy = entry.prompt.trim();
      if (!promptToCopy) {
        toast.error(t('recent_tasks_copy_prompt_failed'));
        return;
      }

      try {
        if (
          typeof navigator === 'undefined' ||
          !navigator.clipboard?.writeText
        ) {
          throw new Error('clipboard write unavailable');
        }

        await navigator.clipboard.writeText(promptToCopy);
        toast.success(t('recent_tasks_copy_prompt_success'));
      } catch (error) {
        console.error(
          '[generator/image-workspace] copy recent task prompt failed',
          {
            step: 'copy_recent_task_prompt',
            taskId: entry.id,
            error,
          }
        );
        toast.error(t('recent_tasks_copy_prompt_failed'));
      }
    },
    [t]
  );

  const handleDownloadRecentTask = useCallback(
    (entry: ImageTaskHistoryEntry) => {
      const primaryMedia = entry.media[0];
      if (!primaryMedia) {
        return;
      }

      void handleDownloadMedia(primaryMedia);
    },
    [handleDownloadMedia]
  );

  const applyRecentTaskToForm = useCallback(
    (
      entry: ImageTaskHistoryEntry,
      options?: {
        mode?: ImageGeneratorMode;
        sourceImageUrls?: string[];
        imageEditMode?: ImageEditMode;
        imageResolution?: string;
      }
    ) => {
      const nextMode = options?.mode || entry.mode;
      const nextSourceImageUrls =
        options?.sourceImageUrls || entry.sourceImageUrls;
      const nextImageEditMode = options?.imageEditMode || entry.imageEditMode;
      const nextImageResolution =
        options?.imageResolution || entry.imageResolution;
      const nextModelKey = normalizeImageModelKeyForAccess(
        entry.modelKey || selectedImageModelKey,
        imageModelAccessTier
      );

      setMode(nextMode);
      setPrompt(entry.prompt);
      setImageEditMode(nextImageEditMode);
      setImageResolution(nextImageResolution);
      setImageAspectRatio(entry.imageAspectRatio);
      setImageOutputFormat(entry.imageOutputFormat);
      setSourceImageUrl(nextSourceImageUrls.join('\n'));
      setSelectedImageModelKey(nextModelKey);

      return {
        nextMode,
        nextSourceImageUrls,
        nextImageEditMode,
        nextImageResolution,
        nextModelKey,
      };
    },
    [imageModelAccessTier, selectedImageModelKey]
  );

  const runRecentTask = useCallback(
    async (entry: ImageTaskHistoryEntry, variant: 'regenerate' | 'upscale') => {
      const fallbackSourceImageUrls =
        entry.sourceImageUrls.length > 0
          ? entry.sourceImageUrls
          : entry.mode === 'image-to-image' && entry.media[0]?.url
            ? [entry.media[0].url]
            : [];
      const sourceFromResultImage =
        entry.media[0]?.type === 'image' && entry.media[0].url
          ? [entry.media[0].url]
          : fallbackSourceImageUrls;
      const nextMode = variant === 'upscale' ? 'image-to-image' : entry.mode;
      const nextImageEditMode =
        variant === 'upscale' ? 'single-edit' : entry.imageEditMode;
      const nextImageResolution =
        variant === 'upscale'
          ? getNextImageResolution(entry.imageResolution)
          : entry.imageResolution;
      const preparedSourceImageUrls =
        nextMode === 'image-to-image'
          ? variant === 'upscale'
            ? sourceFromResultImage
            : fallbackSourceImageUrls
          : [];
      const maxSourceImageCount =
        nextImageEditMode === 'multi-fusion'
          ? MAX_MULTI_FUSION_IMAGE_COUNT
          : MAX_SINGLE_EDIT_IMAGE_COUNT;
      const preparedSourceImageValue = preparedSourceImageUrls.join('\n');
      const preparedSourceValidation = validateReferenceMediaUrlList(
        preparedSourceImageValue,
        'image',
        maxSourceImageCount
      );
      const preparedSourceIssueKey =
        preparedSourceValidation.issue?.code === 'too_many'
          ? nextImageEditMode === 'multi-fusion'
            ? 'form.image_url_too_many_multi'
            : 'form.image_url_too_many_single'
          : getMediaValidationMessageKey(preparedSourceValidation.issue);

      if (preparedSourceIssueKey) {
        toast.error(t(preparedSourceIssueKey));
        return;
      }

      if (
        nextMode === 'image-to-image' &&
        preparedSourceValidation.items.length === 0
      ) {
        toast.error(t('form.source_image_required'));
        return;
      }

      const applied = applyRecentTaskToForm(entry, {
        mode: nextMode,
        sourceImageUrls: preparedSourceValidation.items,
        imageEditMode: nextImageEditMode,
        imageResolution: nextImageResolution,
      });
      const nextScene =
        nextMode === 'image-to-image' ? 'image-to-image' : 'text-to-image';
      const nextModel = getImageModelForMode(applied.nextModelKey, nextMode);
      const nextCostCredits = getAIGenerationCostCredits(nextScene, {
        resolution: nextImageResolution,
        model: nextModel,
      });

      await executeGeneration({
        scene: nextScene,
        mode: nextMode,
        model: nextModel,
        prompt: entry.prompt,
        imageEditMode: applied.nextImageEditMode,
        imageResolution: applied.nextImageResolution,
        imageAspectRatio: entry.imageAspectRatio,
        imageOutputFormat: entry.imageOutputFormat,
        webSearch: false,
        imageUrls: preparedSourceValidation.items,
        costCredits: nextCostCredits,
      });
    },
    [applyRecentTaskToForm, executeGeneration, t]
  );

  const handleRepromptRecentTask = useCallback(
    (entry: ImageTaskHistoryEntry) => {
      const fallbackSourceImageUrls =
        entry.sourceImageUrls.length > 0
          ? entry.sourceImageUrls
          : entry.mode === 'image-to-image' && entry.media[0]?.url
            ? [entry.media[0].url]
            : [];

      applyRecentTaskToForm(entry, {
        sourceImageUrls: fallbackSourceImageUrls,
      });
    },
    [applyRecentTaskToForm]
  );

  const handleDeleteRecentTask = useCallback(
    async (entry: ImageTaskHistoryEntry) => {
      if (
        typeof window !== 'undefined' &&
        typeof window.confirm === 'function' &&
        !window.confirm(t('recent_tasks_delete_confirm'))
      ) {
        return;
      }

      setDeletingTaskId(entry.id);

      if (entry.isGuest) {
        try {
          setGuestHistoryItems((currentItems) => {
            const nextItems = currentItems.filter(
              (item) => item.id !== entry.id
            );

            if (typeof window !== 'undefined') {
              writeImageGeneratorGuestHistory(window.localStorage, nextItems);
            }

            storedGuestMediaIdsRef.current = new Set(
              nextItems.map((item) => item.id)
            );
            return nextItems;
          });
          toast.success(t('recent_tasks_deleted'));
        } catch (error) {
          console.error(
            '[generator/image-workspace] delete guest recent task failed',
            {
              step: 'delete_guest_recent_task',
              taskId: entry.id,
              error,
            }
          );
          toast.error(t('recent_tasks_delete_failed'));
        } finally {
          setDeletingTaskId(null);
        }

        return;
      }

      deleteAbortRef.current?.abort();
      const controller = new AbortController();
      deleteAbortRef.current = controller;

      try {
        const response = await fetch('/api/user/ai-tasks/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taskId: entry.id,
          }),
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || payload?.code !== 0) {
          throw new Error(
            typeof payload?.message === 'string'
              ? payload.message
              : 'delete recent task failed'
          );
        }

        setRecentTaskSnapshot((current) => ({
          items: current.items.filter((item) => item.id !== entry.id),
          total: Math.max(0, current.total - 1),
        }));
        toast.success(t('recent_tasks_deleted'));
        await refreshRecentTasks({ silent: true });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error(
          '[generator/image-workspace] delete account recent task failed',
          {
            step: 'delete_account_recent_task',
            taskId: entry.id,
            error,
          }
        );
        toast.error(t('recent_tasks_delete_failed'));
      } finally {
        setDeletingTaskId(null);
      }
    },
    [refreshRecentTasks, t]
  );

  const multiFusionImageCountValues = {
    count: MAX_MULTI_FUSION_IMAGE_COUNT,
  };
  const uploadLabel =
    imageEditMode === 'multi-fusion'
      ? t('form.upload_media_with_limit', multiFusionImageCountValues)
      : t('form.upload_media');
  const uploadHint =
    imageEditMode === 'multi-fusion'
      ? t('form.source_images_hint', multiFusionImageCountValues)
      : t('form.source_image_hint');
  const sourceImageLabel =
    imageEditMode === 'multi-fusion'
      ? t('form.source_images')
      : t('form.source_image');
  const sourceImagePlaceholder =
    imageEditMode === 'multi-fusion'
      ? t('form.source_images_placeholder', multiFusionImageCountValues)
      : t('form.source_image_placeholder');
  const sourceImageRows = 2;
  const promptOptionalText = t('form.optional');
  const shouldShowBuyCreditsCta =
    Boolean(user) &&
    !generationUsesGuestQuota &&
    (hasInsufficientCredits || remainingCredits <= 0);
  const shouldShowGuestSignInCta = isGuestViewer && hasGuestQuotaExhausted;
  const imageEditModeControl =
    mode === 'image-to-image' && !usesImageEditModePrimaryTabs ? (
      <div data-slot="image-edit-mode-row" className="flex items-center gap-2">
        <p className="text-xs font-semibold whitespace-nowrap">
          {t('form.generation_mode')}
        </p>
        <div className="bg-muted/50 border-border/40 flex flex-1 gap-1 rounded-2xl border p-1">
          {IMAGE_EDIT_MODE_TABS.map((option) => {
            const active = imageEditMode === option.value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleImageEditModeChange(option.value)}
                className={cn(
                  'flex min-h-8 flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1.5 text-xs font-semibold transition-[background-color,border-color,color,box-shadow]',
                  active
                    ? 'border-primary/50 bg-card text-foreground hover:bg-card/90 border-2 shadow-sm'
                    : 'text-foreground/72 hover:border-border/40 hover:bg-muted/60 hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(option.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;
  const primaryTabsControl = usesImageEditModePrimaryTabs ? (
    <Tabs
      value={imageEditMode}
      onValueChange={(value) =>
        handleImageEditModeChange(value as ImageEditMode)
      }
    >
      <TabsList
        data-slot="image-workspace-primary-tabs"
        aria-label={t('form.generation_mode')}
        className="border-border/40 bg-muted/50 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border p-1"
      >
        {IMAGE_EDIT_MODE_TABS.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:ring-primary/30 rounded-xl px-2 py-1.5 text-xs font-semibold data-[state=active]:shadow-sm data-[state=active]:ring-1 sm:text-sm"
          >
            {t(option.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  ) : (
    <Tabs
      value={mode}
      onValueChange={(value) => setMode(value as ImageGeneratorMode)}
    >
      <TabsList
        data-slot="image-workspace-primary-tabs"
        className="border-border/40 bg-muted/50 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border p-1"
      >
        {IMAGE_GENERATOR_MODE_TABS.map((tabMode) => {
          const fullLabel = t(`tabs.${tabMode}`);
          const compactLabel = t(`tabs_short.${tabMode}`);

          return (
            <TabsTrigger
              key={tabMode}
              value={tabMode}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:ring-primary/30 rounded-xl px-2 py-1.5 text-xs data-[state=active]:shadow-sm data-[state=active]:ring-1 sm:text-sm"
            >
              <span className="hidden sm:inline">{fullLabel}</span>
              <span className="sm:hidden">{compactLabel}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );

  return (
    <section
      id={IMAGE_GENERATOR_WORKSPACE_ID}
      data-slot="image-workspace"
      className={cn(
        'scroll-mt-4',
        usesHeroViewportFit ? 'py-0' : 'py-1 md:py-2'
      )}
    >
      <div className="container">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-start">
            <Card
              data-slot="image-workspace-form-card"
              aria-label={srOnlyTitle || undefined}
              role={srOnlyTitle ? 'region' : undefined}
              style={
                usesHeroViewportFit ? HERO_VIEWPORT_FORM_CARD_STYLE : undefined
              }
              className={cn(
                'border-border/55 bg-card gap-0 overflow-hidden rounded-2xl py-0 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.22)] lg:sticky lg:top-3',
                usesHeroViewportFit
                  ? undefined
                  : 'lg:h-[min(760px,calc(100dvh-6rem))] lg:min-h-[640px]'
              )}
            >
              <CardContent
                data-slot="image-workspace-form-card-content"
                className={cn(
                  'flex flex-col px-0 pb-0',
                  usesHeroViewportFit
                    ? 'h-full min-h-0'
                    : 'min-h-[640px] lg:h-full lg:min-h-0'
                )}
              >
                <input
                  ref={uploadInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUploadMedia}
                />

                <div
                  data-slot="image-workspace-form-scroll"
                  className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 py-2.5 sm:px-4"
                >
                  {primaryTabsControl}

                  {imageEditModeControl}

                  <ImageModelSelector
                    value={effectiveImageModelKey}
                    resolution={effectiveImageResolution}
                    viewerTier={imageModelAccessTier}
                    onChange={handleImageModelChange}
                    onUpgrade={openPricingModal}
                    t={t}
                  />

                  <ImageModelQuickSelect
                    value={effectiveImageModelKey}
                    onChange={handleImageModelChange}
                    viewerTier={imageModelAccessTier}
                    t={t}
                  />

                  {mode === 'image-to-image' ? (
                    <div data-slot="source-image-panel" className="space-y-1.5">
                      <p className="text-xs font-semibold whitespace-nowrap">
                        {sourceImageLabel}
                      </p>

                      <div
                        data-slot="source-image-surface"
                        className="border-border/45 bg-background/96 rounded-2xl border p-3 shadow-sm"
                      >
                        <div
                          className={cn(
                            'rounded-2xl border px-3 py-3 shadow-xs transition-colors',
                            sourceImageIssueKey
                              ? 'border-destructive/25 bg-destructive/5'
                              : imageUrls.length > 0
                                ? 'border-primary/20 bg-primary/8'
                                : 'border-border/35 bg-card/92'
                          )}
                        >
                          {imageUrls.length > 0 ? (
                            <div className="grid w-full grid-cols-3 gap-2">
                              {imageUrls.slice(0, 3).map((url) => (
                                <div
                                  key={url}
                                  className="bg-card h-18 overflow-hidden rounded-xl"
                                >
                                  <LazyImage
                                    src={url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="flex cursor-pointer flex-col items-center gap-2 py-1"
                              onClick={() => {
                                if (!isUploadingMedia) {
                                  uploadInputRef.current?.click();
                                }
                              }}
                              onDragOver={(event) => {
                                if (!isUploadingMedia) {
                                  event.preventDefault();
                                }
                              }}
                              onDrop={(event) => {
                                if (
                                  !isUploadingMedia &&
                                  event.dataTransfer.files.length > 0
                                ) {
                                  event.preventDefault();
                                  handleDropMediaFiles(
                                    event.dataTransfer.files
                                  );
                                }
                              }}
                            >
                              <span className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-xl">
                                <Upload className="h-4 w-4" />
                              </span>
                              <span className="text-foreground text-sm font-semibold">
                                {uploadLabel}
                              </span>
                              <span className="text-foreground/65 text-center text-xs leading-5">
                                {uploadHint}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 py-2">
                          <span className="bg-border h-px flex-1" />
                          <span className="text-foreground/40 text-xs font-medium tracking-wider uppercase">
                            or
                          </span>
                          <span className="bg-border h-px flex-1" />
                        </div>

                        <textarea
                          id="generator-source-image"
                          value={sourceImageUrl}
                          rows={sourceImageRows}
                          aria-invalid={sourceImageIssueKey ? 'true' : 'false'}
                          onChange={(event) =>
                            setSourceImageUrl(event.target.value)
                          }
                          placeholder={sourceImagePlaceholder}
                          className={cn(
                            'border-input placeholder:text-muted-foreground/70 bg-card focus-visible:ring-ring/20 flex min-h-16 w-full rounded-xl border px-3 py-2 text-xs shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none',
                            sourceImageIssueKey
                              ? 'border-destructive/60 focus-visible:ring-destructive/20'
                              : undefined
                          )}
                        />

                        {sourceImageIssueKey ? (
                          <p className="text-destructive pt-1 text-xs leading-5">
                            {t(sourceImageIssueKey)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div
                    data-slot="image-workspace-prompt-panel"
                    className="border-border/45 bg-background/96 rounded-2xl border p-3 shadow-sm"
                  >
                    <GeneratorPromptField
                      mode={mode}
                      prompt={prompt}
                      maxPromptLength={MAX_PROMPT_LENGTH}
                      isPromptTooLong={isPromptTooLong}
                      isTranslating={isTranslatingPrompt}
                      onPromptChange={setPrompt}
                      onTranslate={handleTranslatePrompt}
                      translationNamespace="ai.image.generator"
                      compact
                      optionalText={
                        isPromptRequired ? undefined : promptOptionalText
                      }
                    />
                  </div>

                  <Accordion
                    type="single"
                    collapsible
                    defaultValue="advanced"
                    className="w-full"
                  >
                    <AccordionItem value="advanced" className="border-b-0">
                      <AccordionTrigger className="py-2.5 text-xs font-semibold hover:no-underline">
                        {t('form.advanced')}
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-1 pb-2">
                        <GeneratorChoiceGroup
                          label={t('form.resolution')}
                          value={effectiveImageResolution}
                          options={IMAGE_RESOLUTION_OPTIONS}
                          onChange={setImageResolution}
                          optionsClassName="grid grid-cols-3 gap-2"
                        />

                        <GeneratorChoiceGroup
                          label={t('form.aspect_ratio')}
                          value={imageAspectRatio}
                          options={IMAGE_ASPECT_RATIO_OPTIONS}
                          onChange={setImageAspectRatio}
                          optionsClassName="grid grid-cols-2 gap-2 sm:grid-cols-5"
                          renderPreview={(optionValue, active) => (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center rounded border',
                                active
                                  ? 'border-primary/50 bg-primary/10 text-primary'
                                  : 'border-border/50 bg-muted/40'
                              )}
                            >
                              <span
                                className={cn(
                                  'rounded border',
                                  buildAspectRatioPreviewClassName(optionValue),
                                  active
                                    ? 'border-primary bg-primary/15'
                                    : 'border-border bg-background'
                                )}
                              />
                            </span>
                          )}
                        />

                        <GeneratorChoiceGroup
                          label={t('form.output_format')}
                          value={imageOutputFormat}
                          options={IMAGE_OUTPUT_FORMAT_OPTIONS}
                          onChange={setImageOutputFormat}
                          optionsClassName="grid grid-cols-2 gap-2"
                        />

                        <GeneratorSettingRow
                          icon={Search}
                          label={t('form.web_search')}
                          hint={
                            isGuestViewer
                              ? t('form.web_search_guest_hint')
                              : t('form.web_search_hint')
                          }
                          checked={effectiveWebSearch}
                          onCheckedChange={setWebSearch}
                          disabled={isGuestViewer}
                        />

                        {user ? (
                          <div className="border-border/40 space-y-2 rounded-xl border p-3">
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold">
                                {t('form.notifications')}
                              </p>
                              <p className="text-muted-foreground text-xs leading-5">
                                {t('form.notifications_hint')}
                              </p>
                            </div>
                            <GeneratorSettingRow
                              icon={BellRing}
                              label={t('form.notify_on_completion')}
                              hint={t('form.notify_on_completion_hint')}
                              checked={notifyOnCompletion}
                              onCheckedChange={setNotifyOnCompletion}
                            />
                            <GeneratorSettingRow
                              icon={BellRing}
                              label={t('form.notify_on_completion_by_default')}
                              hint={t(
                                'form.notify_on_completion_by_default_hint'
                              )}
                              checked={notifyOnCompletionByDefault}
                              onCheckedChange={setNotifyOnCompletionByDefault}
                            />
                          </div>
                        ) : null}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {errorMessage ? (
                    <div className="border-destructive/30 bg-destructive/10 rounded-xl border px-3 py-2 text-xs">
                      <p className="text-destructive">{errorMessage}</p>
                    </div>
                  ) : null}

                  {shouldShowBlockingValidationMessage &&
                  blockingValidationMessageKey ? (
                    <p className="text-foreground/72 text-xs">
                      {t(blockingValidationMessageKey)}
                    </p>
                  ) : null}
                </div>

                <div
                  data-slot="image-workspace-action-footer"
                  className="border-border/45 bg-card shrink-0 space-y-2 border-t px-3 py-2.5 sm:px-4"
                >
                  {!isMounted ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-foreground font-medium">
                        {t('credits_cost', { credits: costCredits })}
                      </span>
                      <span>{t('credits_remaining', { credits: 0 })}</span>
                    </div>
                  ) : isCheckSign || (!user && isViewerInfoLoading) ? (
                    <div className="text-foreground/72 text-sm">
                      {t('checking_account')}
                    </div>
                  ) : generationUsesGuestQuota ? (
                    <div className="grid gap-1 text-xs sm:grid-cols-2 sm:text-sm">
                      <span className="text-foreground font-medium">
                        {t('free_generations_today', {
                          remaining: guestQuotaRemaining,
                          limit: guestQuotaLimit,
                        })}
                      </span>
                      <span className="text-foreground/72 sm:text-right rtl:sm:text-left">
                        {t('guest_quota_used', {
                          used: guestQuotaUsed,
                          limit: guestQuotaLimit,
                        })}
                      </span>
                    </div>
                  ) : (
                    <div className="grid gap-1 text-xs sm:grid-cols-2 sm:text-sm">
                      <span className="text-foreground font-medium">
                        {t('credits_cost', { credits: costCredits })}
                      </span>
                      <span className="text-foreground/72 sm:text-right rtl:sm:text-left">
                        {t('credits_remaining', {
                          credits: remainingCredits,
                        })}
                      </span>
                    </div>
                  )}

                  {queueNoticeText ? (
                    <div className="bg-muted/60 border-border/40 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs sm:text-sm">
                      {effectiveImageQueueTier === 'paid' ? (
                        <Crown
                          aria-hidden="true"
                          className="text-primary mt-0.5 h-4 w-4 shrink-0"
                        />
                      ) : (
                        <Sparkles
                          aria-hidden="true"
                          className="text-primary mt-0.5 h-4 w-4 shrink-0"
                        />
                      )}
                      <p className="text-foreground/80 leading-5">
                        {queueNoticeText}
                      </p>
                    </div>
                  ) : null}

                  <Button
                    className="shadow-primary/20 disabled:bg-muted disabled:text-foreground/65 h-12 w-full text-base font-semibold shadow-sm disabled:opacity-100"
                    size="lg"
                    disabled={
                      isGenerating ||
                      !canUseHostedGeneration ||
                      hasGuestQuotaExhausted ||
                      hasBlockingValidationError
                    }
                    onClick={() => void handleGenerate()}
                  >
                    {isGenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:mr-0 rtl:ml-2" />
                    ) : null}
                    {isGenerating ? t('generating') : t('generate')}
                  </Button>

                  {shouldShowGuestSignInCta ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      size="sm"
                      onClick={() => setIsShowSignModal(true)}
                    >
                      <LogIn className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                      {t('sign_in_to_generate')}
                    </Button>
                  ) : null}

                  {shouldShowBuyCreditsCta ? (
                    hasPricingModal ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        size="sm"
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
                        size="sm"
                      >
                        <Link href="/pricing">
                          <CreditCard className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                          {t('buy_credits')}
                        </Link>
                      </Button>
                    )
                  ) : null}

                  {isGenerating && etaRange ? (
                    <div className="bg-muted/60 border-border/40 space-y-1 rounded-xl border p-3 text-sm">
                      <p className="font-medium">
                        {t('task_submitted_eta', { eta: etaRange })}
                      </p>
                      <p className="text-muted-foreground">
                        {t('task_submitted_detail')}
                      </p>
                      {notifyOnCompletion ? (
                        <p className="text-muted-foreground">
                          {t('task_completion_notification_scheduled')}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {isGenerating ? (
                    <div className="border-border/40 space-y-2 rounded-xl border p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>{t('progress')}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                      {taskStatusLabel ? (
                        <p className="text-muted-foreground text-center text-xs">
                          {taskStatusLabel}
                        </p>
                      ) : null}
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
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4 lg:space-y-6">
              {shouldShowPreviewPanel ? (
                <VideoGeneratorPreview
                  mode={mode}
                  generatedMedia={generatedMedia}
                  isGenerating={isGenerating}
                  showSamplePreview={stableSamplePreview}
                  resultsUseVideoIcon={false}
                  errorMessage={errorMessage}
                  downloadingMediaId={downloadingMediaId}
                  onDownloadMedia={handleDownloadMedia}
                  translationNamespace="ai.image.generator"
                />
              ) : null}

              {shouldShowRecentTasksPanel ? (
                <ImageTaskHistoryPanel
                  entries={recentTaskEntries}
                  total={recentTaskTotal}
                  isGuestHistory={!user}
                  isLoading={isRecentTasksPanelLoading}
                  deletingTaskId={deletingTaskId}
                  downloadingMediaId={downloadingMediaId}
                  onCopyPrompt={handleCopyRecentTaskPrompt}
                  onDownload={handleDownloadRecentTask}
                  onReprompt={handleRepromptRecentTask}
                  onRegenerate={(entry) =>
                    void runRecentTask(entry, 'regenerate')
                  }
                  onUpscale={(entry) => void runRecentTask(entry, 'upscale')}
                  onDelete={(entry) => void handleDeleteRecentTask(entry)}
                />
              ) : null}
            </div>
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
