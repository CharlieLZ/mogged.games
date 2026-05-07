// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import type { Pricing, PricingPageCopy } from '@/shared/types/blocks/pricing';

import { DEFAULT_VIDEO_DURATION_SECONDS } from './video-generator-config';
import { VideoWorkspace } from './video-workspace';

const previewSpy = vi.hoisted(() => vi.fn());
const getAIGenerationCostCreditsSpy = vi.hoisted(() => vi.fn(() => 50));
const searchParamState = vi.hoisted(() => ({
  imageUrl: null as string | null,
  mode: null as string | null,
}));
const routerPushSpy = vi.hoisted(() => vi.fn());
const appContextState = vi.hoisted(() => ({
  isShowPaymentModal: false,
  isShowSignModal: false,
  user: null as {
    credits?: {
      remainingCredits?: number;
    };
    notificationPreferences?: {
      aiTaskCompletionEmailEnabled?: boolean;
    };
  } | null,
  configs: {} as Record<string, string>,
  setIsShowSignModal: vi.fn(),
}));
const viewerInfoState = vi.hoisted(() => ({
  isLoading: false,
  refreshViewerInfo: vi.fn(),
  viewerInfo: {
    id: 'guest_1',
    isGuest: true,
    quotaTotal: 100,
    credits: {
      remainingCredits: 100,
    },
  } as {
    id: string;
    isGuest: boolean;
    quotaTotal: number;
    credits: {
      remainingCredits: number;
    };
  } | null,
}));
const taskHookState = vi.hoisted(() => ({
  errorMessage: null as string | null,
  estimatedSeconds: null as number | null,
  generatedMedia: [] as unknown[],
  isGenerating: false,
  progress: 0,
  startGeneration: vi.fn(),
  taskStatus: null as string | null,
  videoDuration: null as number | null,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'zh',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === 'mode') {
        return searchParamState.mode;
      }
      if (key === 'imageUrl') {
        return searchParamState.imageUrl;
      }
      return null;
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
  useRouter: () => ({
    push: routerPushSpy,
  }),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    user: appContextState.user,
    configs: appContextState.configs,
    isCheckSign: false,
    isShowPaymentModal: appContextState.isShowPaymentModal,
    isShowSignModal: appContextState.isShowSignModal,
    setIsShowSignModal: appContextState.setIsShowSignModal,
    fetchUserCredits: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-viewer-info', () => ({
  useViewerInfo: () => ({
    viewerInfo: viewerInfoState.viewerInfo,
    isLoading: viewerInfoState.isLoading,
    refreshViewerInfo: viewerInfoState.refreshViewerInfo,
  }),
}));

vi.mock('@/config/ai-model-registry', () => ({
  getAIGenerationCostCredits: getAIGenerationCostCreditsSpy,
  getRequestedModelForScene: () => 'imageeditorai-1.0',
}));

vi.mock('@/shared/lib/upload-client', () => ({
  uploadFileWithDirectStorage: vi.fn(),
}));

vi.mock('@/shared/hooks/use-media-query', () => ({
  useMediaQuery: () => true,
}));

vi.mock('@/shared/blocks/generator/use-video-generator-task', () => ({
  useVideoGeneratorTask: () => ({
    errorMessage: taskHookState.errorMessage,
    estimatedSeconds: taskHookState.estimatedSeconds,
    generatedMedia: taskHookState.generatedMedia,
    isGenerating: taskHookState.isGenerating,
    progress: taskHookState.progress,
    startGeneration: taskHookState.startGeneration,
    taskStatus: taskHookState.taskStatus,
    videoDuration: taskHookState.videoDuration,
  }),
}));

vi.mock('@/shared/blocks/generator/video-generator-preview', () => ({
  VideoGeneratorPreview: (props: Record<string, unknown>) => {
    previewSpy(props);
    return createElement(
      'div',
      { 'data-slot': 'video-generator-preview' },
      props.errorMessage
        ? createElement(
            'div',
            { 'data-slot': 'preview-error' },
            props.errorMessage as string
          )
        : null,
      props.canRewritePrompt && typeof props.onRewritePrompt === 'function'
        ? createElement(
            'button',
            {
              type: 'button',
              onClick: () =>
                void (props.onRewritePrompt as () => Promise<void> | void)(),
            },
            String(
              props.isRewritingPrompt
                ? 'form.rewriting_prompt'
                : 'form.rewrite_prompt'
            )
          )
        : null
    );
  },
}));

vi.mock('@/shared/blocks/payment/payment-modal', () => ({
  PaymentModal: () => createElement('div', { 'data-slot': 'payment-modal' }),
}));

const pricingPageCopy: PricingPageCopy = {
  current_plan: 'Current Plan',
  currency_selector: 'Currency',
  processing: 'Processing',
  snapshot_title: 'Plan Snapshot',
  snapshot_credits: 'Credits',
  snapshot_credits_total_suffix: 'total',
  snapshot_credits_monthly_suffix: '/ mo',
  snapshot_generation_speed: 'Generation speed',
  snapshot_text_to_image: '1K image generation',
  snapshot_image_edit: '2K image edit',
  snapshot_credit_cost: '{credits} credits',
  metric_cost_per_100_credits: 'Cost per 100 credits',
  speed_standard: 'Standard',
  speed_priority: 'Priority',
  speed_fastest: 'Fastest',
};

const generatorPricing: Pricing = {
  id: 'pricing',
  title: 'Simple, Transparent Pricing',
  description:
    'Start free, then choose a hosted plan without leaving the generator.',
  groups: [{ name: 'yearly', title: 'Annually', is_featured: true }],
  items: [
    {
      product_id: 'try-yearly',
      title: 'Try',
      label: 'Start Small',
      description: 'Billed $348 yearly',
      currency: 'USD',
      amount: 34800,
      price: '$29',
      original_price: '$87',
      interval: 'year',
      display_credits: 500,
      display_credits_interval: 'month',
      credits: 6000,
      features_title: '',
      features: [
        'Text-to-image and image-to-image workflows',
        'Prompt-led generation and source-image edits',
        'High-resolution image exports',
      ],
      button: { title: 'Get Started', url: '/pricing' },
      group: 'yearly',
      tip: '500 Credits / month on annual billing',
    },
    {
      product_id: 'pro-yearly',
      title: 'Pro',
      label: 'Regular Use',
      description: 'Billed $1,188 yearly',
      currency: 'USD',
      amount: 118800,
      price: '$99',
      original_price: '$297',
      interval: 'year',
      display_credits: 2000,
      display_credits_interval: 'month',
      credits: 24000,
      features_title: '',
      features: [
        'Text-to-image and image-to-image workflows',
        'Prompt-led generation and source-image edits',
        'Skip the free queue on hosted image jobs',
      ],
      button: { title: 'Get Started', url: '/pricing' },
      group: 'yearly',
      tip: '2,000 Credits / month on annual billing',
      is_featured: true,
    },
  ],
};

const generatorPricingPayload: GeneratorPricingPayload = {
  pricing: {
    title: generatorPricing.title,
    description: generatorPricing.description,
    groups: generatorPricing.groups,
    items: generatorPricing.items,
  },
  pageCopy: {
    current_plan: pricingPageCopy.current_plan,
    currency_selector: pricingPageCopy.currency_selector,
    processing: pricingPageCopy.processing,
    snapshot_title: pricingPageCopy.snapshot_title,
    snapshot_credits: pricingPageCopy.snapshot_credits,
    snapshot_credits_total_suffix:
      pricingPageCopy.snapshot_credits_total_suffix,
    snapshot_credits_monthly_suffix:
      pricingPageCopy.snapshot_credits_monthly_suffix,
    snapshot_generation_speed: pricingPageCopy.snapshot_generation_speed,
    snapshot_text_to_image: pricingPageCopy.snapshot_text_to_image,
    snapshot_image_edit: pricingPageCopy.snapshot_image_edit,
    snapshot_credit_cost: pricingPageCopy.snapshot_credit_cost,
    speed_standard: pricingPageCopy.speed_standard,
    speed_priority: pricingPageCopy.speed_priority,
    speed_fastest: pricingPageCopy.speed_fastest,
  },
};

async function renderVideoWorkspace(
  props: Partial<Parameters<typeof VideoWorkspace>[0]> = {}
) {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(VideoWorkspace, {
        pricingPayload: generatorPricingPayload,
        ...props,
      })
    );
  });

  return {
    container,
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('VideoWorkspace', () => {
  beforeEach(() => {
    previewSpy.mockClear();
    getAIGenerationCostCreditsSpy.mockClear();
    routerPushSpy.mockReset();
    searchParamState.imageUrl = null;
    searchParamState.mode = null;
    appContextState.isShowPaymentModal = false;
    appContextState.isShowSignModal = false;
    appContextState.user = null;
    appContextState.configs = {};
    appContextState.setIsShowSignModal.mockReset();
    viewerInfoState.isLoading = false;
    viewerInfoState.refreshViewerInfo.mockReset();
    viewerInfoState.viewerInfo = {
      id: 'guest_1',
      isGuest: true,
      quotaTotal: 100,
      credits: {
        remainingCredits: 100,
      },
    };
    taskHookState.errorMessage = null;
    taskHookState.estimatedSeconds = null;
    taskHookState.generatedMedia = [];
    taskHookState.isGenerating = false;
    taskHookState.progress = 0;
    taskHookState.startGeneration.mockReset();
    taskHookState.taskStatus = null;
    taskHookState.videoDuration = null;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('fetch', vi.fn());
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    vi.unstubAllGlobals();
  });

  it('uses the sr-only title as a labeled region without adding another heading', async () => {
    const rendered = await renderVideoWorkspace({
      srOnlyTitle: 'mogged video workspace',
    });
    const formCard = rendered.container.querySelector(
      '[data-slot="video-workspace-form-card"]'
    );

    expect(formCard?.getAttribute('role')).toBe('region');
    expect(formCard?.getAttribute('aria-label')).toBe(
      'mogged video workspace'
    );
    expect(
      Array.from(rendered.container.querySelectorAll('h2, h3')).some(
        (item) => item.textContent === 'mogged video workspace'
      )
    ).toBe(false);

    await rendered.unmount();
  });

  it('renders the shared video generator with fast and sound visible before opening extra controls', async () => {
    const rendered = await renderVideoWorkspace();
    const moreTrigger = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('more'));
    const aspectRatioButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('16:9'));
    const aspectRatioOptions = aspectRatioButton?.parentElement;
    const generateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('generate'));
    const tabList = rendered.container.querySelector('[role="tablist"]');
    const activeTab = rendered.container.querySelector(
      '[role="tab"][data-state="active"]'
    );
    const aspectRatioPreview = aspectRatioButton?.querySelector('span');

    expect(rendered.container.querySelector('#video-prompt')).not.toBeNull();
    expect(rendered.container.textContent).toContain('form.prompt');
    expect(
      rendered.container.querySelector('input[type="range"]')
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain(
      `${DEFAULT_VIDEO_DURATION_SECONDS}s`
    );
    expect(getAIGenerationCostCreditsSpy).toHaveBeenCalledWith(
      'text-to-video',
      {
        durationSeconds: DEFAULT_VIDEO_DURATION_SECONDS,
        resolution: '720p',
        fast: true,
        webSearch: false,
        hasVideoInput: false,
      }
    );
    expect(rendered.container.textContent).toContain('form.advanced');
    expect(rendered.container.textContent).toContain('form.fast');
    expect(rendered.container.textContent).toContain('form.generate_audio');
    expect(rendered.container.textContent).not.toContain('form.web_search');
    expect(rendered.container.textContent).not.toContain(
      'form.return_last_frame'
    );
    expect(moreTrigger).toBeDefined();
    expect(tabList?.getAttribute('data-variant')).toBeNull();
    expect(tabList?.className).toContain('grid-cols-3');
    expect(tabList?.className).not.toContain('grid-cols-1');
    expect(tabList?.className).toContain('bg-muted/70');
    expect(tabList?.className).toContain('text-foreground/72');
    expect(activeTab?.getAttribute('data-variant')).toBeNull();
    expect(activeTab?.className).toContain(
      'data-[state=active]:bg-background/80'
    );
    expect(activeTab?.className).toContain('text-foreground/72');
    expect(activeTab?.className).not.toContain('text-muted-foreground');
    expect(aspectRatioOptions?.className).toContain('justify-between');
    expect(aspectRatioOptions?.className).not.toContain('flex-wrap');
    expect(aspectRatioButton?.className).toContain('gap-0');
    expect(aspectRatioButton?.className).toContain('flex-1');
    expect(aspectRatioButton?.className).toContain('min-w-0');
    expect(aspectRatioPreview?.className).toContain('bg-current');
    expect(aspectRatioPreview?.className).toContain('rounded-full');
    expect(generateButton?.innerHTML).toContain('rtl:mr-0 rtl:ml-2');

    await act(async () => {
      moreTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(rendered.container.textContent).toContain('form.web_search');
    expect(rendered.container.textContent).toContain('form.fast');
    expect(rendered.container.textContent).toContain('form.return_last_frame');
    expect(rendered.container.innerHTML).toContain('text-left rtl:text-right');

    await rendered.unmount();
  });

  it('keeps the last-frame return toggle visible regardless of runtime config noise', async () => {
    appContextState.configs = {};

    const rendered = await renderVideoWorkspace();
    const moreTrigger = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('more'));

    await act(async () => {
      moreTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(rendered.container.textContent).toContain('form.return_last_frame');

    await rendered.unmount();
  });

  it('keeps fast and sound in the shared generation controls section without duplicating sound in extra controls', async () => {
    const rendered = await renderVideoWorkspace();
    const runtimeControls = rendered.container.querySelector(
      '[data-slot="generator-runtime-controls"]'
    );
    const moreControls = rendered.container.querySelector(
      '[data-slot="generator-more-controls"]'
    );
    const moreTrigger = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('more'));

    expect(runtimeControls?.textContent).toContain('form.fast');
    expect(runtimeControls?.textContent).toContain('form.generate_audio');
    expect(runtimeControls?.textContent).not.toContain('form.web_search');
    expect(moreControls?.textContent).not.toContain('form.generate_audio');

    await act(async () => {
      moreTrigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(moreControls?.textContent).toContain('form.web_search');
    expect(moreControls?.textContent).toContain('form.return_last_frame');
    expect(moreControls?.textContent).not.toContain('form.generate_audio');

    await rendered.unmount();
  });

  it('defers sample preview until after client mount so SSR stays stable', () => {
    renderToString(createElement(VideoWorkspace));

    expect(previewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        showSamplePreview: false,
      })
    );
  });

  it('renders first and last frame url fields with upload actions in image-to-video mode', async () => {
    searchParamState.mode = 'image-to-video';

    const rendered = await renderVideoWorkspace();
    const uploadButtons = Array.from(
      rendered.container.querySelectorAll('button')
    ).filter((button) => button.textContent?.includes('form.upload_media'));

    expect(rendered.container.querySelector('#first-frame-url')).not.toBeNull();
    expect(rendered.container.querySelector('#last-frame-url')).not.toBeNull();
    expect(uploadButtons).toHaveLength(2);

    await rendered.unmount();
  });

  it('prefills the first frame url from the imageUrl query param in image-to-video mode', async () => {
    searchParamState.mode = 'image-to-video';
    searchParamState.imageUrl =
      'https://pub-08cd42c8c170417f9a6b61ed628eed2e.r2.dev/reference.webp';

    const rendered = await renderVideoWorkspace();
    const firstFrameInput = rendered.container.querySelector(
      '#first-frame-url'
    ) as HTMLInputElement | null;

    expect(firstFrameInput?.value).toBe(searchParamState.imageUrl);

    await rendered.unmount();
  });

  it('defaults completion-notification switches from the saved user preference when submitting a task', async () => {
    appContextState.user = {
      credits: { remainingCredits: 500 },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };

    const rendered = await renderVideoWorkspace();
    const tryExampleButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('form.try_example'));
    const generateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('generate'));

    await act(async () => {
      tryExampleButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(taskHookState.startGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.any(String),
        notifyOnCompletion: true,
        notifyOnCompletionByDefault: true,
      })
    );

    await rendered.unmount();
  });

  it('shows inline guidance when a reference video url is not a direct public file', async () => {
    searchParamState.mode = 'reference-to-video';

    const rendered = await renderVideoWorkspace();
    const referenceVideos = rendered.container.querySelector(
      '#reference-videos'
    ) as HTMLTextAreaElement | null;

    expect(referenceVideos).not.toBeNull();

    await act(async () => {
      if (!referenceVideos) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(
        referenceVideos,
        'https://drive.google.com/file/d/abc/view'
      );
      referenceVideos.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(rendered.container.textContent).toContain(
      'form.video_url_cloud_drive'
    );

    await rendered.unmount();
  });

  it('includes reference video input in cost estimation once a direct video url is provided', async () => {
    searchParamState.mode = 'reference-to-video';

    const rendered = await renderVideoWorkspace();
    const referenceVideos = rendered.container.querySelector(
      '#reference-videos'
    ) as HTMLTextAreaElement | null;

    expect(referenceVideos).not.toBeNull();

    await act(async () => {
      if (!referenceVideos) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(referenceVideos, 'https://example.com/reference.mp4');
      referenceVideos.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(getAIGenerationCostCreditsSpy).toHaveBeenLastCalledWith(
      'reference-to-video',
      {
        durationSeconds: DEFAULT_VIDEO_DURATION_SECONDS,
        resolution: '720p',
        fast: true,
        webSearch: false,
        hasVideoInput: true,
      }
    );

    await rendered.unmount();
  });

  it('loads a local example prompt and translates the current prompt to english', async () => {
    appContextState.user = {
      credits: {
        remainingCredits: 100,
      },
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            translatedPrompt:
              'A silver horse gallops through falling snow at sunrise, cinematic wide shot.',
            model: 'openai/gpt-5-mini',
            requestId: 'gen_123',
            targetLanguage: 'en',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const rendered = await renderVideoWorkspace();
    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    const tryExampleButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('form.try_example'));
    const translateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('form.translate'));

    expect(tryExampleButton).toBeDefined();
    expect(translateButton).toBeDefined();

    await act(async () => {
      tryExampleButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(promptTextarea?.value).not.toBe('');

    await act(async () => {
      if (!promptTextarea) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(promptTextarea, '一匹银色的马在清晨飘雪中狂奔');
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      translateButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/translate-prompt',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(promptTextarea?.value).toBe(
      'A silver horse gallops through falling snow at sunrise, cinematic wide shot.'
    );
    expect(viewerInfoState.refreshViewerInfo).toHaveBeenCalledTimes(1);

    await rendered.unmount();
  });

  it('rewrites the prompt from the safety failure call-to-action', async () => {
    appContextState.user = {
      credits: {
        remainingCredits: 100,
      },
    };
    taskHookState.errorMessage = 'error_nsfw_blocked';
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            rewrittenPrompt:
              'A playful animated character grants a wish, turns away, and lands the beat with silly slapstick comedy, safe-for-all-audiences framing, no explicit details.',
            model: 'openai/gpt-5-mini',
            requestId: 'rewrite_123',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    );

    const rendered = await renderVideoWorkspace();
    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;

    await act(async () => {
      if (!promptTextarea) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(
        promptTextarea,
        'character saying "your wish is granted", next scene she turns around and farts in your face multiple times'
      );
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    const rewriteButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('form.rewrite_prompt'));

    expect(previewSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({
        canRewritePrompt: true,
        errorMessage: 'error_nsfw_blocked',
      })
    );
    expect(rewriteButton).toBeDefined();

    await act(async () => {
      rewriteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/rewrite-prompt',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(promptTextarea?.value).toBe(
      'A playful animated character grants a wish, turns away, and lands the beat with silly slapstick comedy, safe-for-all-audiences framing, no explicit details.'
    );
    expect(viewerInfoState.refreshViewerInfo).toHaveBeenCalledTimes(1);

    await rendered.unmount();
  });

  it('opens an inline pricing modal from the buy credits call-to-action', async () => {
    viewerInfoState.viewerInfo = {
      id: 'guest_1',
      isGuest: true,
      quotaTotal: 100,
      credits: {
        remainingCredits: 0,
      },
    };

    const rendered = await renderVideoWorkspace();
    const buyCreditsButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('buy_credits'));

    expect(
      document.querySelector('[data-slot="generator-pricing-modal"]')
    ).toBeNull();

    await act(async () => {
      buyCreditsButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(
      document.querySelector('[data-slot="generator-pricing-modal"]')
    ).not.toBeNull();
    expect(document.body.textContent).toContain('Simple, Transparent Pricing');
    expect(document.body.textContent).toContain('Try');
    expect(document.body.textContent).toContain('Pro');

    await rendered.unmount();
  });

  it('opens the pricing modal when the current job costs more credits than the user has left', async () => {
    appContextState.user = {
      credits: {
        remainingCredits: 10,
      },
    };

    const rendered = await renderVideoWorkspace();
    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    const generateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('generate'));

    await act(async () => {
      if (!promptTextarea) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(
        promptTextarea,
        'A product launch teaser with a slow cinematic push-in.'
      );
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(
      document.querySelector('[data-slot="generator-pricing-modal"]')
    ).not.toBeNull();
    expect(document.body.textContent).toContain('Simple, Transparent Pricing');
    expect(appContextState.setIsShowSignModal).not.toHaveBeenCalled();

    await rendered.unmount();
  });

  it('does not auto-open the pricing modal while the visitor waits', async () => {
    vi.useFakeTimers();

    const rendered = await renderVideoWorkspace();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(
      document.querySelector('[data-slot="generator-pricing-modal"]')
    ).toBeNull();

    await rendered.unmount();
    vi.useRealTimers();
  });
});
