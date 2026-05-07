// @vitest-environment jsdom

import {
  act,
  createElement,
  type AnchorHTMLAttributes,
  type ComponentProps,
} from 'react';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { GeneratorPricingPayload } from '@/shared/blocks/generator/generator-pricing-payload';
import {
  dispatchImageGeneratorApplyPrompt,
  IMAGE_GENERATOR_APPLY_PROMPT_EVENT,
} from '@/shared/lib/image-generator-prompt-event';

import { ImageWorkspace } from './image-workspace';

const workspaceState = vi.hoisted(() => ({
  user: null as {
    id: string;
    credits?: {
      remainingCredits: number;
    };
    notificationPreferences?: {
      aiTaskCompletionEmailEnabled?: boolean;
    };
  } | null,
  viewerInfo: {
    isGuest: true,
    imageQueueTier: 'guest' as 'guest' | 'free' | 'paid',
    guestQuota: {
      limit: 1000,
      remaining: 1000,
      used: 0,
    },
    quotaTotal: 1000,
    credits: {
      remainingCredits: 0,
    },
  } as {
    isGuest: boolean;
    guestQuota: {
      limit: number;
      remaining: number;
      used: number;
    } | null;
    quotaTotal: number;
    credits: {
      remainingCredits: number;
    };
    imageQueueTier?: 'guest' | 'free' | 'paid';
  } | null,
  isViewerInfoLoading: false,
  isCheckSign: false,
}));

const startGenerationSpy = vi.hoisted(() => vi.fn());
const setIsShowSignModalSpy = vi.hoisted(() => vi.fn());
const routerPushSpy = vi.hoisted(() => vi.fn());
const refreshViewerInfoSpy = vi.hoisted(() => vi.fn());

const messages: Record<string, string> = {
  'tabs.text-to-image': 'Text to Image',
  'tabs.image-to-image': 'Image to Image',
  'tabs_short.text-to-image': 'Text',
  'tabs_short.image-to-image': 'Image',
  'form.panel_title': 'AI Image Editor',
  'form.prompt': 'Prompt',
  'form.try_example': 'Try Example',
  'form.translate': 'Translate',
  'form.translating': 'Translating...',
  'form.prompt_placeholder': 'Describe the image',
  'form.prompt_too_long': 'Prompt is too long',
  'form.example_loaded': 'Example prompt loaded.',
  'form.copy_prompt': 'Copy prompt',
  'form.copy_failed': 'Copy failed.',
  'form.paste_prompt': 'Paste prompt',
  'form.paste_failed': 'Paste failed.',
  'form.clear_prompt': 'Clear prompt',
  'form.expand_prompt': 'Expand prompt editor',
  'form.collapse_prompt': 'Collapse prompt editor',
  'form.prompt_copied': 'Prompt copied.',
  'form.prompt_pasted': 'Prompt pasted.',
  'form.prompt_cleared': 'Prompt cleared.',
  'form.notifications': 'Task Notifications',
  'form.notifications_hint': 'Email settings for finished tasks.',
  'form.notify_on_completion': 'Email me when this task is ready',
  'form.notify_on_completion_hint':
    'Send me a message when the image is ready.',
  'form.notify_on_completion_by_default': 'Use this for future tasks too',
  'form.notify_on_completion_by_default_hint':
    'Save this as the default for later tasks.',
  'form.optional': 'Optional',
  'form.advanced': 'Generation Controls',
  'form.model': 'Model',
  'form.quick_select': 'Quick Select',
  'form.generation_mode': 'Generation Mode',
  'form.single_edit': 'Single Edit',
  'form.multi_fusion': 'Multi Fusion',
  'form.multi_fusion_hint': 'Blend up to 10 source images.',
  'form.resolution': 'Resolution',
  'form.aspect_ratio': 'Aspect Ratio',
  'form.output_format': 'Output Format',
  'form.web_search': 'Web Search',
  'form.web_search_hint': 'Allow current web context.',
  'form.web_search_guest_hint':
    'Sign in to use web search with account credits.',
  'form.source_image': 'Source Image URL',
  'form.source_images': 'Source Image URLs',
  'form.source_image_placeholder': 'One public source image URL',
  'form.source_images_placeholder': 'Up to {count} public image URLs',
  'form.source_image_hint': 'We accept JPEG, PNG or WEBP formats up to 10MB.',
  'form.source_images_hint':
    'Max {count} images. We accept JPEG, PNG or WEBP formats up to 10MB each.',
  'form.source_image_required':
    'Please provide one source image for image-to-image.',
  'form.upload_media': 'Upload',
  'form.upload_media_with_limit': 'Upload (Max {count})',
  'form.media_upload_success': 'Media uploaded.',
  'form.media_upload_failed': 'Upload failed.',
  'form.image_url_too_many_single': 'Single Edit accepts one source image.',
  'form.image_url_too_many_multi': 'Multi Fusion accepts up to 10 images.',
  'models.badges.new': 'New',
  'models.badges.vip': 'VIP',
  'models.badges.upgrade': 'Upgrade',
  'models.credits_fixed': '{credits} credits',
  'models.credits_by_resolution': '{credits} credits by resolution',
  'models.options.nano_banana.name': 'Nano Banana',
  'models.options.nano_banana.description': 'Fast Nano Banana route.',
  'models.options.nano_banana.details': '1K 5 credits.',
  'models.options.nano_banana_2.name': 'Nano Banana 2',
  'models.options.nano_banana_2.description': 'Latest Nano Banana route.',
  'models.options.nano_banana_2.details': '1K 5 credits.',
  'models.options.gpt_image_2.name': 'GPT Image 2',
  'models.options.gpt_image_2.description': 'GPT image route.',
  'models.options.gpt_image_2.details': '8 credits.',
  'models.options.nano_banana_pro.name': 'Nano Banana Pro',
  'models.options.nano_banana_pro.description': 'VIP Nano Banana route.',
  'models.options.nano_banana_pro.details': '1K 10 credits.',
  'models.options.seedream_4.name': 'SeeDream 4.0',
  'models.options.seedream_4.description': 'SeeDream 4 route.',
  'models.options.seedream_4.details': '3 credits.',
  'models.options.seedream_45.name': 'SeeDream 4.5',
  'models.options.seedream_45.description': 'SeeDream 4.5 route.',
  'models.options.seedream_45.details': '4 credits.',
  'models.options.seedream_5.name': 'SeeDream 5.0',
  'models.options.seedream_5.description': 'SeeDream 5 route.',
  'models.options.seedream_5.details': '4 credits.',
  'models.options.flux_2_pro.name': 'Flux 2 Pro',
  'models.options.flux_2_pro.description': 'Premium Flux 2 Pro route.',
  'models.options.flux_2_pro.details': '12 credits.',
  'models.options.flux_2_flex.name': 'Flux 2 Flex',
  'models.options.flux_2_flex.description': 'Budget Flux 2 route.',
  'models.options.flux_2_flex.details': '6 credits.',
  'models.options.grok_imagine.name': 'Grok Imagine',
  'models.options.grok_imagine.description': 'Grok imagine route.',
  'models.options.grok_imagine.details': '5 credits.',
  'models.options.ideogram_v3.name': 'Ideogram V3',
  'models.options.ideogram_v3.description': 'Ideogram V3 route.',
  'models.options.ideogram_v3.details': '10 credits.',
  'models.options.ideogram_character.name': 'Ideogram Character',
  'models.options.ideogram_character.description': 'Ideogram Character route.',
  'models.options.ideogram_character.details': '8 credits.',
  'models.options.qwen_image.name': 'Qwen Image',
  'models.options.qwen_image.description': 'Qwen image route.',
  'models.options.qwen_image.details': '5 credits.',
  'models.options.z_image.name': 'Z Image',
  'models.options.z_image.description': 'Z-Image route.',
  'models.options.z_image.details': '4 credits.',
  generate: 'Generate Image',
  generating: 'Generating...',
  checking_account: 'Checking Account...',
  free_generations_today: 'Free generations today: {remaining}/{limit}',
  guest_quota_used: 'Used {used}/{limit}',
  guest_quota_exhausted: 'Guest quota exhausted.',
  guest_quota_exhausted_hint: 'Sign in to continue.',
  sign_in_to_generate: 'Sign In to Generate',
  credits_cost: 'Cost {credits} credits',
  credits_remaining: 'Remaining {credits} credits',
  buy_credits: 'Buy Credits',
  queue_notice_free:
    'Free image jobs may wait {min}-{max} min depending on load. Paid users skip this queue.',
  queue_notice_paid:
    'Paid image jobs skip the free queue and start when provider capacity is available.',
  prompt_required: 'Please enter a prompt before generating.',
  progress: 'Progress',
  'status.pending': 'Waiting',
  'status.processing': 'Processing',
  'status.success': 'Success',
  'status.failed': 'Failed',
  'status.canceled': 'Canceled',
  task_still_processing: 'Still processing',
  error_generic: 'Generation failed: {reason}',
  error_no_result: 'No result',
  task_completed: 'Task completed',
  image_generated: 'Image generated',
  video_generated: 'Image generated',
  create_task_failed: 'Create task failed',
  insufficient_credits: 'Insufficient credits.',
  download_fetch_failed: 'Failed to fetch the media file',
  download_success: 'Image downloaded',
  download_failed: 'Failed to download image',
  sample_preview_poster: 'Sample preview image poster',
  sample_preview_item: 'Sample preview item',
  sample_generated_image: 'Sample generated image',
  generated_image: 'Generated image',
  recent_tasks_title: 'Recent Tasks',
  recent_tasks_description: 'Latest generated images with reusable prompts.',
  recent_tasks_count: '({shown}/{total})',
  recent_tasks_empty: 'Recent generated images will appear here.',
  recent_tasks_guest_empty:
    'Generated guest images will appear here on this browser.',
  recent_tasks_copy_prompt: 'Copy prompt',
  recent_tasks_copy_prompt_success: 'Prompt copied.',
  recent_tasks_copy_prompt_failed: 'Could not copy the prompt.',
  recent_tasks_download: 'Download',
  recent_tasks_preview: 'Expand',
  recent_tasks_reprompt: 'Reprompt',
  recent_tasks_regenerate: 'Regenerate',
  recent_tasks_upscale: 'Upscale',
  recent_tasks_delete: 'Delete',
  recent_tasks_deleted: 'Task removed.',
  recent_tasks_delete_failed: 'Failed to remove the task.',
  recent_tasks_delete_confirm: 'Delete this task?',
  recent_tasks_prompt_empty: 'Untitled prompt',
  recent_tasks_loading: 'Loading recent tasks...',
  guest_history_title: 'Local guest history',
  guest_history_notice:
    'Anonymous results are saved only in this browser. They will not sync into your account after sign-in, and clearing browser data or switching devices can remove them. Download anything important.',
  guest_history_empty:
    'Generated guest images will appear here on this browser.',
  guest_history_clear: 'Clear local guest history',
  guest_history_cleared: 'Local guest history cleared',
  guest_history_download: 'Download local guest image',
};

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    let message = messages[key] ?? key;
    if (values) {
      Object.entries(values).forEach(([name, value]) => {
        message = message.replace(`{${name}}`, String(value));
      });
    }
    return message;
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/core/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement('a', { href, ...props }, children),
  useRouter: () => ({
    push: routerPushSpy,
  }),
}));

vi.mock('@/shared/contexts/app', () => ({
  useAppContext: () => ({
    user: workspaceState.user,
    isCheckSign: workspaceState.isCheckSign,
    isShowPaymentModal: false,
    isShowSignModal: false,
    fetchUserCredits: vi.fn(),
    setIsShowSignModal: setIsShowSignModalSpy,
  }),
}));

vi.mock('@/shared/hooks/use-viewer-info', () => ({
  useViewerInfo: () => ({
    viewerInfo: workspaceState.viewerInfo,
    isLoading: workspaceState.isViewerInfoLoading,
    refreshViewerInfo: refreshViewerInfoSpy,
  }),
}));

vi.mock('@/shared/blocks/payment/use-pricing-checkout', () => ({
  usePricingCheckout: () => ({
    checkoutWithProvider: vi.fn(),
    closeEmbeddedCheckout: vi.fn(),
    embeddedCheckoutSession: null,
    finalizeEmbeddedCheckout: vi.fn(),
    isEmbeddedCheckoutFinalizing: false,
    isEmbeddedCheckoutOpen: false,
    isLoading: false,
    pricingItem: null,
    productId: null,
    startCheckoutFlow: vi.fn(),
    stripePublishableKey: '',
  }),
}));

vi.mock('@/shared/blocks/generator/use-image-generator-task', () => ({
  useImageGeneratorTask: () => ({
    errorMessage: null,
    estimatedSeconds: null,
    generatedMedia: [],
    generatedMediaIsGuest: false,
    isGenerating: false,
    progress: 0,
    startGeneration: startGenerationSpy,
    taskStatus: null,
  }),
}));

vi.mock('@/shared/blocks/generator/video-generator-preview', () => ({
  VideoGeneratorPreview: () => createElement('div', { 'data-slot': 'preview' }),
}));

vi.mock('@/shared/blocks/generator/pricing-modal', () => ({
  GeneratorPricingModal: ({ open }: { open?: boolean }) =>
    open
      ? createElement(
          'div',
          { 'data-slot': 'generator-pricing-modal' },
          'Pricing Modal'
        )
      : null,
}));

vi.mock('@/shared/blocks/payment/payment-modal', () => ({
  PaymentModal: () => null,
}));

vi.mock('@/shared/blocks/payment/stripe-embedded-checkout-modal', () => ({
  StripeEmbeddedCheckoutModal: () => null,
}));

function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  valueSetter?.call(textarea, value);
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

async function renderImageWorkspace(
  props?: Partial<ComponentProps<typeof ImageWorkspace>>
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(createElement(ImageWorkspace, props));
  });
  await flushAsyncWork();

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

function getGenerateButton(container: HTMLElement) {
  const button = Array.from(container.querySelectorAll('button')).find((item) =>
    item.textContent?.includes('Generate Image')
  );

  if (!button) {
    throw new Error('Generate button was not rendered.');
  }

  return button as HTMLButtonElement;
}

function findButtonByTextContent(container: ParentNode, ...parts: string[]) {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    parts.every((part) => button.textContent?.includes(part))
  );
}

const generatorPricingPayload = {
  pricing: {
    title: 'Simple, Transparent Pricing',
    description: 'Choose a plan and keep creating.',
    groups: [],
    items: [
      {
        currency: 'USD',
        amount: 1900,
        interval: 'month',
        product_id: 'pro-monthly',
      },
    ],
  },
  pageCopy: {
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
    speed_standard: 'Standard',
    speed_priority: 'Priority',
    speed_fastest: 'Fastest',
  },
} as GeneratorPricingPayload;

async function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  await act(async () => {
    setNativeTextareaValue(textarea, value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('ImageWorkspace validation', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    workspaceState.user = null;
    workspaceState.viewerInfo = {
      isGuest: true,
      imageQueueTier: 'guest',
      guestQuota: {
        limit: 1000,
        remaining: 1000,
        used: 0,
      },
      quotaTotal: 1000,
      credits: {
        remainingCredits: 0,
      },
    };
    workspaceState.isViewerInfoLoading = false;
    workspaceState.isCheckSign = false;
    startGenerationSpy.mockReset();
    setIsShowSignModalSpy.mockReset();
    routerPushSpy.mockReset();
    refreshViewerInfoSpy.mockReset();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          code: 0,
          data: {
            items: [],
            total: 0,
          },
        })
      )
    );
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true)
    );
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis.navigator, 'clipboard');
  });

  it('disables text-to-image generation until a prompt is entered', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(getGenerateButton(rendered.container).disabled).toBe(true);
    expect(rendered.container.textContent).toContain(
      'Please enter a prompt before generating.'
    );

    await rendered.unmount();
  });

  it('includes the sample preview in the server render when there is no history yet', () => {
    const html = renderToString(
      createElement(ImageWorkspace, {
        defaultMode: 'text-to-image',
        initialRecentTasks: {
          items: [],
          total: 0,
        },
      } as never)
    );

    expect(html).toContain('data-slot="preview"');
  });

  it('omits the redundant visible panel title header', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(
      Array.from(rendered.container.querySelectorAll('h2, h3')).some(
        (item) => item.textContent === 'AI Image Editor'
      )
    ).toBe(false);

    await rendered.unmount();
  });

  it('uses the sr-only title as a region label instead of rendering another heading', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      srOnlyTitle: 'mogged workspace',
    });
    const formCard = rendered.container.querySelector(
      '[data-slot="image-workspace-form-card"]'
    );

    expect(formCard?.getAttribute('role')).toBe('region');
    expect(formCard?.getAttribute('aria-label')).toBe(
      'mogged workspace'
    );
    expect(
      Array.from(rendered.container.querySelectorAll('h2, h3')).some(
        (item) => item.textContent === 'mogged workspace'
      )
    ).toBe(false);

    await rendered.unmount();
  });

  it('allows image-to-image generation with a source image and no prompt', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const sourceImageInput = rendered.container.querySelector(
      '#generator-source-image'
    ) as HTMLTextAreaElement | null;

    expect(sourceImageInput).not.toBeNull();
    await changeTextarea(
      sourceImageInput!,
      'https://cdn.example.com/source.png'
    );

    const generateButton = getGenerateButton(rendered.container);
    expect(generateButton.disabled).toBe(false);

    await act(async () => {
      generateButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(startGenerationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'image-to-image',
        prompt: '',
        imageUrls: ['https://cdn.example.com/source.png'],
        webSearch: false,
        isGuest: true,
      })
    );

    await rendered.unmount();
  });

  it('uses browser guest quota before account credits for signed-in image users', async () => {
    workspaceState.user = {
      id: 'user-free-quota',
      credits: {
        remainingCredits: 0,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'free',
      guestQuota: {
        limit: 100,
        remaining: 100,
        used: 0,
      },
      quotaTotal: 100,
      credits: {
        remainingCredits: 0,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const guestAllowedModelButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('GPT Image 2'))
      .at(-1);
    expect(guestAllowedModelButton).not.toBeUndefined();

    await act(async () => {
      guestAllowedModelButton!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;

    expect(promptTextarea).not.toBeNull();
    await changeTextarea(promptTextarea!, 'A clean product photo');

    const generateButton = getGenerateButton(rendered.container);
    expect(generateButton.disabled).toBe(false);
    expect(rendered.container.textContent).toContain(
      'Free generations today: 100/100'
    );
    expect(rendered.container.textContent).not.toContain(
      'Remaining 0 credits'
    );

    await act(async () => {
      generateButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(startGenerationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A clean product photo',
        isGuest: true,
        notifyOnCompletion: false,
        notifyOnCompletionByDefault: false,
      })
    );

    await rendered.unmount();
  });

  it('keeps purchased credits separate while browser guest quota is still available', async () => {
    workspaceState.user = {
      id: 'user-paid-free-quota',
      credits: {
        remainingCredits: 120,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'paid',
      guestQuota: {
        limit: 100,
        remaining: 100,
        used: 0,
      },
      quotaTotal: 100,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const guestAllowedModelButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('GPT Image 2'))
      .at(-1);
    expect(guestAllowedModelButton).not.toBeUndefined();

    await act(async () => {
      guestAllowedModelButton!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;

    expect(promptTextarea).not.toBeNull();
    await changeTextarea(promptTextarea!, 'A clean product photo');

    const generateButton = getGenerateButton(rendered.container);
    expect(generateButton.disabled).toBe(false);
    expect(rendered.container.textContent).toContain(
      'Free generations today: 100/100'
    );
    expect(rendered.container.textContent).toContain(
      'Free image jobs may wait 1-5 min depending on load. Paid users skip this queue.'
    );
    expect(rendered.container.textContent).not.toContain(
      'Paid image jobs skip the free queue and start when provider capacity is available.'
    );

    await act(async () => {
      generateButton.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });

    expect(startGenerationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A clean product photo',
        isGuest: true,
        notifyOnCompletion: false,
        notifyOnCompletionByDefault: false,
      })
    );

    await rendered.unmount();
  });

  it('treats the image-to-image source image as required, not optional', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });

    expect(rendered.container.textContent).not.toContain(
      'Please provide one source image for image-to-image.'
    );
    expect(rendered.container.textContent).toContain(
      'We accept JPEG, PNG or WEBP formats up to 10MB.'
    );
    const sourcePanel = rendered.container.querySelector(
      '[data-slot="source-image-panel"]'
    );
    expect(sourcePanel?.textContent).toContain('Source Image');
    const sourceTextarea = sourcePanel?.querySelector(
      '#generator-source-image'
    ) as HTMLTextAreaElement | null;
    expect(sourceTextarea?.placeholder).toContain('source image URL');
    expect(
      rendered.container.querySelector('#generator-source-image')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('uses stronger contrast layers for the form card, source upload panel, and prompt panel', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const formCard = rendered.container.querySelector(
      '[data-slot="image-workspace-form-card"]'
    );
    const sourceSurface = rendered.container.querySelector(
      '[data-slot="source-image-surface"]'
    );
    const promptPanel = rendered.container.querySelector(
      '[data-slot="image-workspace-prompt-panel"]'
    );
    const promptSurface = rendered.container.querySelector(
      '[data-slot="generator-prompt-surface"]'
    );
    const sourceTextarea = rendered.container.querySelector(
      '#generator-source-image'
    );

    expect(formCard?.className).toContain('bg-card');
    expect(formCard?.className).toContain(
      'shadow-[0_24px_60px_-36px_rgba(15,23,42,0.22)]'
    );
    expect(formCard?.className).not.toContain('bg-white');
    expect(sourceSurface?.className).toContain('bg-background/96');
    expect(sourceSurface?.className).toContain('shadow-sm');
    expect(promptPanel?.className).toContain('bg-background/96');
    expect(promptPanel?.className).toContain('shadow-sm');
    expect(promptSurface?.className).toContain('bg-card/72');
    expect(sourceTextarea?.className).toContain('bg-card');

    await rendered.unmount();
  });

  it('applies gallery prompt events to the workspace prompt and reference image', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent(IMAGE_GENERATOR_APPLY_PROMPT_EVENT, {
          detail: {
            prompt:
              'Create a studio product image with controlled reflections.',
            mode: 'image-to-image',
            sourceImageUrl: 'https://cdn.example.com/reference.png',
          },
        })
      );
    });
    await flushAsyncWork();

    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    const sourceTextarea = rendered.container.querySelector(
      '#generator-source-image'
    ) as HTMLTextAreaElement | null;

    expect(promptTextarea?.value).toBe(
      'Create a studio product image with controlled reflections.'
    );
    expect(sourceTextarea?.value).toBe('https://cdn.example.com/reference.png');

    await rendered.unmount();
  });

  it('places image edit mode directly after the workflow tabs', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const text = rendered.container.textContent || '';

    expect(text.indexOf('Generation Mode')).toBeGreaterThan(
      text.indexOf('Image to Image')
    );
    expect(text.indexOf('Generation Mode')).toBeLessThan(text.indexOf('Model'));
    expect(text.indexOf('Single Edit')).toBeGreaterThan(
      text.indexOf('Generation Mode')
    );
    const modeRow = rendered.container.querySelector(
      '[data-slot="image-edit-mode-row"]'
    );
    const activeModeButton = Array.from(
      modeRow?.querySelectorAll('button') ?? []
    ).find((button) => button.textContent?.includes('Single Edit'));

    expect(modeRow?.className).toContain('flex');
    expect(activeModeButton?.className).toContain('bg-card');
    expect(activeModeButton?.className).not.toContain(
      'text-primary-foreground'
    );

    await rendered.unmount();
  });

  it('can use image edit modes as the primary homepage tabs without showing workflow tabs', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
      primaryTabs: 'image-edit-mode',
    });
    const primaryTabs = rendered.container.querySelector(
      '[data-slot="image-workspace-primary-tabs"]'
    );

    expect(primaryTabs).not.toBeNull();
    expect(primaryTabs?.getAttribute('data-variant')).toBeNull();
    expect(primaryTabs?.className).toContain('bg-muted/50');
    expect(primaryTabs?.className).toContain('rounded-2xl');
    expect(primaryTabs?.textContent).toContain('Single Edit');
    expect(primaryTabs?.textContent).toContain('Multi Fusion');
    expect(primaryTabs?.textContent).not.toContain('Text to Image');
    expect(primaryTabs?.textContent).not.toContain('Image to Image');
    expect(rendered.container.textContent).not.toContain('Generation Mode');
    expect(
      rendered.container.querySelector('[data-slot="image-edit-mode-row"]')
    ).toBeNull();
    expect(
      rendered.container.querySelector('[data-slot="source-image-panel"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('shows the multi fusion upload count limit in the upload affordance and helper copy', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const modeRow = rendered.container.querySelector(
      '[data-slot="image-edit-mode-row"]'
    );
    const multiFusionButton = Array.from(
      modeRow?.querySelectorAll('button') ?? []
    ).find((button) => button.textContent?.includes('Multi Fusion'));

    try {
      expect(multiFusionButton).not.toBeUndefined();

      await act(async () => {
        multiFusionButton?.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true })
        );
      });
      await flushAsyncWork();

      const sourcePanel = rendered.container.querySelector(
        '[data-slot="source-image-panel"]'
      );

      expect(sourcePanel?.textContent).toContain('Source Image URLs');
      expect(sourcePanel?.textContent).toContain('Upload (Max 10)');
      expect(sourcePanel?.textContent).toContain(
        'Max 10 images. We accept JPEG, PNG or WEBP formats up to 10MB each.'
      );
    } finally {
      await rendered.unmount();
    }
  });

  it('uses a viewport-limited hero form card so the primary generate action stays in the first viewport', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
      primaryTabs: 'image-edit-mode',
      viewportFit: 'hero',
    });
    const formCard = rendered.container.querySelector(
      '[data-slot="image-workspace-form-card"]'
    );
    const cardContent = rendered.container.querySelector(
      '[data-slot="image-workspace-form-card-content"]'
    );
    const scrollRegion = rendered.container.querySelector(
      '[data-slot="image-workspace-form-scroll"]'
    );
    const actionFooter = rendered.container.querySelector(
      '[data-slot="image-workspace-action-footer"]'
    );

    expect(formCard?.className).not.toContain('h-[clamp(');
    expect(formCard?.className).not.toContain('lg:min-h-[640px]');
    expect(cardContent?.className).toContain('h-full');
    expect(cardContent?.className).toContain('min-h-0');
    expect(cardContent?.className).not.toContain('min-h-[640px]');
    expect(scrollRegion?.className).toContain('overflow-y-auto');
    expect(actionFooter?.className).toContain('shrink-0');
    expect(actionFooter?.className).toContain('border-t');
    expect(actionFooter?.compareDocumentPosition(scrollRegion as Node)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );

    await rendered.unmount();
  });

  it('places the source image upload panel before the prompt editor', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const text = rendered.container.textContent || '';

    expect(text.indexOf('Upload')).toBeLessThan(text.indexOf('Prompt'));

    await rendered.unmount();
  });

  it('applies showcase prompt events to the image generator form', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    await act(async () => {
      expect(
        dispatchImageGeneratorApplyPrompt({
          mode: 'image-to-image',
          prompt: 'Create a premium product campaign with glass reflections.',
          sourceImageUrl: 'https://cdn.example.com/source.webp',
        })
      ).toBe(true);
    });
    await flushAsyncWork();

    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    const sourceImageTextarea = rendered.container.querySelector(
      '#generator-source-image'
    ) as HTMLTextAreaElement | null;

    expect(promptTextarea?.value).toBe(
      'Create a premium product campaign with glass reflections.'
    );
    expect(sourceImageTextarea?.value).toBe(
      'https://cdn.example.com/source.webp'
    );
    expect(getGenerateButton(rendered.container).disabled).toBe(false);

    await rendered.unmount();
  });

  it('refreshes viewer info after translating the prompt in place', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 20,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'free',
      guestQuota: {
        limit: 0,
        remaining: 0,
        used: 0,
      },
      quotaTotal: 0,
      credits: {
        remainingCredits: 20,
      },
    };
    vi.mocked(fetch).mockImplementation(
      async (input: string | URL | Request) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        if (url === '/api/ai/translate-prompt') {
          return new Response(
            JSON.stringify({
              code: 0,
              message: 'ok',
              data: {
                translatedPrompt:
                  'Editorial portrait with warm sunlight and clean skin texture.',
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
          );
        }

        return Response.json({
          code: 0,
          data: {
            items: [],
            total: 0,
          },
        });
      }
    );

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    const translateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('Translate'));

    await act(async () => {
      if (!promptTextarea) {
        return;
      }

      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;

      valueSetter?.call(promptTextarea, '暖阳下的人像写真，皮肤质感干净');
      promptTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      translateButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(promptTextarea?.value).toBe(
      'Editorial portrait with warm sunlight and clean skin texture.'
    );
    expect(refreshViewerInfoSpy).toHaveBeenCalledTimes(1);

    await rendered.unmount();
  });

  it('uses a non-VIP model and disables VIP quick-select options for anonymous guests', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(rendered.container.textContent).toContain('GPT Image 2');
    expect(rendered.container.textContent).not.toContain('Nano Banana 2');

    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) => button.disabled && button.textContent?.includes('Nano Banana')
    );
    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(vipQuickSelectButton).not.toBeUndefined();
    expect(vipQuickSelectButton!.className).toContain('text-foreground/72');
    expect(vipQuickSelectButton!.className).toContain('bg-card/55');
    expect(vipQuickSelectButton!.className).not.toContain('bg-muted/60');
    expect(vipQuickSelectButton!.className).not.toContain('opacity-55');
    expect(vipQuickSelectButton!.className).toContain(
      '[&_span]:cursor-not-allowed'
    );
    expect(vipQuickSelectButton!.className).toContain(
      '[&_svg]:cursor-not-allowed'
    );
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).toContain('shadow-sm');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('uses a non-VIP model and disables VIP quick-select options for free users', async () => {
    workspaceState.user = {
      id: 'user-free',
      credits: {
        remainingCredits: 42,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'free',
      guestQuota: null,
      quotaTotal: 0,
      credits: {
        remainingCredits: 42,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(rendered.container.textContent).toContain('GPT Image 2');
    expect(rendered.container.textContent).not.toContain('Nano Banana 2');

    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) => button.disabled && button.textContent?.includes('Nano Banana')
    );
    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(vipQuickSelectButton).not.toBeUndefined();
    expect(vipQuickSelectButton!.className).toContain('text-foreground/72');
    expect(vipQuickSelectButton!.className).toContain('bg-card/55');
    expect(vipQuickSelectButton!.className).toContain(
      '[&_span]:cursor-not-allowed'
    );
    expect(vipQuickSelectButton!.className).toContain(
      '[&_svg]:cursor-not-allowed'
    );
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).toContain('shadow-sm');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('keeps the VIP dropdown badge active while the model option stays disabled for free users', async () => {
    workspaceState.user = {
      id: 'user-free',
      credits: {
        remainingCredits: 42,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'free',
      guestQuota: null,
      quotaTotal: 0,
      credits: {
        remainingCredits: 42,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'GPT Image 2',
      'GPT image route.'
    );

    expect(modelTrigger).not.toBeUndefined();

    await act(async () => {
      modelTrigger?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushAsyncWork();

    const vipDropdownButton = findButtonByTextContent(
      document.body,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );
    const vipDropdownBadge = Array.from(
      vipDropdownButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(vipDropdownButton?.disabled).toBe(true);
    expect(vipDropdownButton?.className).toContain('[&_span]:cursor-not-allowed');
    expect(vipDropdownButton?.className).toContain('[&_svg]:cursor-not-allowed');
    expect(
      vipDropdownButton?.closest('div[role="option"]')?.className
    ).toContain('text-foreground/72');
    expect(vipDropdownBadge?.className).toContain('bg-destructive');
    expect(vipDropdownBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('renders the VIP quick-select badge like the New corner badge', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 120,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'paid',
      guestQuota: {
        limit: 0,
        remaining: 0,
        used: 0,
      },
      quotaTotal: 0,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent?.includes('Nano Banana') &&
        !button.textContent?.includes('Nano Banana 2')
    );

    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));
    const newQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((button) => button.textContent?.includes('GPT Image 2'));
    const newBadge = Array.from(
      newQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('New'));

    expect(vipBadge).not.toBeNull();
    expect(newBadge).not.toBeNull();
    expect(vipBadge?.textContent).toContain('VIP');
    expect(vipBadge?.parentElement?.className).toContain('absolute');
    expect(vipBadge?.parentElement?.className).toContain('-top-2');
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).toContain('shadow-sm');
    expect(newBadge?.className).toContain('bg-destructive');
    expect(newBadge?.className).toContain('shadow-sm');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('keeps VIP quick-select badges active while a signed-in viewer access snapshot is loading', async () => {
    workspaceState.user = {
      id: 'user-loading',
      credits: {
        remainingCredits: 120,
      },
    };
    workspaceState.viewerInfo = null;
    workspaceState.isViewerInfoLoading = true;

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );
    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent?.includes('Nano Banana') &&
        !button.textContent?.includes('Nano Banana 2')
    );
    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(modelTrigger).not.toBeUndefined();
    expect(vipQuickSelectButton?.disabled).toBe(false);
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('keeps VIP quick-select badges active while auth is still checking on refresh', async () => {
    workspaceState.user = null;
    workspaceState.viewerInfo = null;
    workspaceState.isViewerInfoLoading = true;
    workspaceState.isCheckSign = true;

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );
    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent?.includes('Nano Banana') &&
        !button.textContent?.includes('Nano Banana 2')
    );
    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(modelTrigger).not.toBeUndefined();
    expect(vipQuickSelectButton?.disabled).toBe(false);
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('keeps VIP quick-select badges active when a signed-in viewer access snapshot is unavailable', async () => {
    workspaceState.user = {
      id: 'user-missing-viewer',
      credits: {
        remainingCredits: 120,
      },
    };
    workspaceState.viewerInfo = null;
    workspaceState.isViewerInfoLoading = false;

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );
    const vipQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent?.includes('Nano Banana') &&
        !button.textContent?.includes('Nano Banana 2')
    );
    const vipBadge = Array.from(
      vipQuickSelectButton?.querySelectorAll('[data-slot="badge"]') ?? []
    ).find((badge) => badge.textContent?.includes('VIP'));

    expect(modelTrigger).not.toBeUndefined();
    expect(vipQuickSelectButton?.disabled).toBe(false);
    expect(vipBadge?.className).toContain('bg-destructive');
    expect(vipBadge?.className).not.toContain('bg-muted/80');

    await rendered.unmount();
  });

  it('uses readable disabled styling for the primary generate button', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });
    const generateButton = getGenerateButton(rendered.container);

    expect(generateButton.disabled).toBe(true);
    expect(generateButton.className).toContain('disabled:bg-muted');
    expect(generateButton.className).toContain('disabled:text-foreground/65');
    expect(generateButton.className).not.toContain(
      'disabled:text-muted-foreground'
    );
    expect(generateButton.className).toContain('disabled:opacity-100');

    await rendered.unmount();
  });

  it('renders the right-side sample preview when there is no generation history', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      initialRecentTasks: {
        items: [],
        total: 0,
      },
    } as never);

    expect(
      rendered.container.querySelector('[data-slot="preview"]')
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain(
      'Generated guest images will appear here on this browser.'
    );

    await rendered.unmount();
  });

  it('keeps the preview and recent task panel visible while viewer history is loading', async () => {
    workspaceState.viewerInfo = null;
    workspaceState.isViewerInfoLoading = true;

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      initialRecentTasks: {
        items: [],
        total: 0,
      },
    } as never);

    expect(
      rendered.container.querySelector('[data-slot="preview"]')
    ).not.toBeNull();
    expect(rendered.container.textContent).toContain('Recent Tasks');
    expect(rendered.container.textContent).toContain('Loading recent tasks...');

    await rendered.unmount();
  });

  it('uses stronger surface contrast for model selection controls', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'GPT Image 2',
      'GPT image route.'
    );

    expect(modelTrigger?.className).toContain('bg-card/95');
    expect(modelTrigger?.className).not.toContain('bg-card/65');
    expect(modelTrigger?.innerHTML).toContain('text-muted-foreground');

    const selectedQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('GPT Image 2'))
      .at(-1);
    const inactiveQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('SeeDream 5.0'))
      .at(-1);

    expect(selectedQuickSelectButton?.className).toContain('bg-primary/10');
    expect(selectedQuickSelectButton?.className).toContain('text-foreground');
    expect(inactiveQuickSelectButton?.className).toContain('bg-card/90');
    expect(inactiveQuickSelectButton?.className).toContain('text-foreground');
    expect(inactiveQuickSelectButton?.className).not.toContain('bg-card/45');

    await rendered.unmount();
  });

  it('renders model company logos in the trigger, quick select, and dropdown options', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'GPT Image 2',
      'GPT image route.'
    );
    const seeDreamQuickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('SeeDream 5.0'))
      .at(-1);

    expect(
      modelTrigger?.querySelector('[data-model-brand="openai"]')
    ).not.toBeNull();
    expect(
      seeDreamQuickSelectButton?.querySelector('[data-model-brand="bytedance"]')
    ).not.toBeNull();

    await act(async () => {
      modelTrigger?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushAsyncWork();

    const nanoBananaButton = findButtonByTextContent(
      document.body,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );
    const fluxButton = findButtonByTextContent(
      document.body,
      'Flux 2 Pro',
      'Premium Flux 2 Pro route.'
    );

    expect(
      nanoBananaButton?.querySelector('[data-model-brand="google"]')
    ).not.toBeNull();
    expect(
      fluxButton?.querySelector('[data-model-brand="flux"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('routes VIP dropdown upgrade buttons to pricing when the inline modal is unavailable', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'GPT Image 2',
      'GPT image route.'
    );

    expect(modelTrigger).not.toBeUndefined();

    await act(async () => {
      modelTrigger?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushAsyncWork();

    const upgradeButton = Array.from(
      document.body.querySelectorAll('button')
    ).find((button) => button.textContent === 'Upgrade');
    const vipDropdownButton = findButtonByTextContent(
      document.body,
      'Nano Banana 2',
      'Latest Nano Banana route.'
    );

    expect(upgradeButton).not.toBeUndefined();
    expect(upgradeButton?.disabled).toBe(false);
    expect(upgradeButton?.className).toContain('bg-primary');
    expect(upgradeButton?.className).toContain('text-primary-foreground');
    expect(
      vipDropdownButton?.closest('div[role="option"]')?.className
    ).toContain('bg-transparent');
    expect(
      vipDropdownButton?.closest('div[role="option"]')?.className
    ).not.toContain('bg-muted/60');

    await act(async () => {
      upgradeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(routerPushSpy).toHaveBeenCalledWith('/pricing');
    expect(
      document.body.querySelector('[data-slot="generator-pricing-modal"]')
    ).toBeNull();

    await rendered.unmount();
  });

  it('opens the inline pricing modal from VIP dropdown upgrade buttons when pricing is available', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      pricingPayload: generatorPricingPayload,
    });
    const modelTrigger = findButtonByTextContent(
      rendered.container,
      'GPT Image 2',
      'GPT image route.'
    );

    expect(modelTrigger).not.toBeUndefined();

    await act(async () => {
      modelTrigger?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushAsyncWork();

    const upgradeButton = Array.from(
      document.body.querySelectorAll('button')
    ).find((button) => button.textContent === 'Upgrade');

    expect(upgradeButton).not.toBeUndefined();

    await act(async () => {
      upgradeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(routerPushSpy).not.toHaveBeenCalled();
    expect(
      document.body.querySelector('[data-slot="generator-pricing-modal"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('renders compact quick-select model pills', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const quickSelectButton = Array.from(
      rendered.container.querySelectorAll('button')
    )
      .filter((button) => button.textContent?.includes('GPT Image 2'))
      .at(-1);

    expect(quickSelectButton?.className).toContain('rounded-full');
    expect(quickSelectButton?.className).toContain('min-h-8');

    await rendered.unmount();
  });

  it('shows web search as a signed-in account feature for guests', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });
    const advancedButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((item) => item.textContent?.includes('Generation Controls'));

    expect(advancedButton).not.toBeUndefined();

    const switchButton = rendered.container.querySelector(
      '[data-slot="switch"]'
    ) as HTMLButtonElement | null;

    expect(rendered.container.textContent).toContain(
      'Sign in to use web search with account credits.'
    );
    expect(switchButton?.disabled).toBe(true);

    await rendered.unmount();
  });

  it('renders recent signed-in tasks with prompt copy and action buttons', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 120,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      guestQuota: {
        limit: 0,
        remaining: 0,
        used: 0,
      },
      quotaTotal: 0,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      initialRecentTasks: {
        total: 1,
        items: [
          {
            id: 'task-1',
            createdAt: '2026-04-29T11:29:21.000Z',
            status: 'success',
            mode: 'text-to-image',
            prompt: 'Sunlit portrait with denim jacket',
            media: [
              {
                id: 'task-1-media-1',
                url: 'https://cdn.example.com/generated.png',
                type: 'image',
                mimeType: 'image/png',
              },
            ],
            sourceImageUrls: [],
            imageEditMode: 'single-edit',
            imageResolution: '1K',
            imageAspectRatio: '1:1',
            imageOutputFormat: 'png',
            modelKey: 'gpt-image-2',
          },
        ],
      },
    } as never);

    expect(rendered.container.textContent).toContain('Recent Tasks');
    expect(rendered.container.textContent).toContain(
      'Sunlit portrait with denim jacket'
    );
    expect(rendered.container.textContent).toContain('Reprompt');
    expect(rendered.container.textContent).toContain('Regenerate');
    expect(rendered.container.textContent).toContain('Upscale');
    expect(
      rendered.container.querySelector('[data-slot="recent-task-prompt-copy"]')
    ).not.toBeNull();

    await rendered.unmount();
  });

  it('shows the free queue notice for guest and free image viewers', async () => {
    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(rendered.container.textContent).toContain(
      'Free image jobs may wait 1-5 min depending on load. Paid users skip this queue.'
    );

    await rendered.unmount();
  });

  it('shows the paid queue notice for paid image viewers', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 120,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      imageQueueTier: 'paid',
      guestQuota: null,
      quotaTotal: 0,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
    });

    expect(rendered.container.textContent).toContain(
      'Paid image jobs skip the free queue and start when provider capacity is available.'
    );

    await rendered.unmount();
  });

  it('reuses a recent task snapshot for reprompt and regenerate', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 120,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      guestQuota: {
        limit: 0,
        remaining: 0,
        used: 0,
      },
      quotaTotal: 0,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'text-to-image',
      initialRecentTasks: {
        total: 1,
        items: [
          {
            id: 'task-2',
            createdAt: '2026-04-29T11:29:21.000Z',
            status: 'success',
            mode: 'image-to-image',
            prompt: 'Editorial portrait with warm sunlight',
            media: [
              {
                id: 'task-2-media-1',
                url: 'https://cdn.example.com/generated.png',
                type: 'image',
                mimeType: 'image/png',
              },
            ],
            sourceImageUrls: ['https://cdn.example.com/source.png'],
            imageEditMode: 'single-edit',
            imageResolution: '2K',
            imageAspectRatio: '4:3',
            imageOutputFormat: 'png',
            modelKey: 'gpt-image-2',
          },
        ],
      },
    } as never);

    const repromptButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((item) => item.textContent?.includes('Reprompt'));
    const regenerateButton = Array.from(
      rendered.container.querySelectorAll('button')
    ).find((item) => item.textContent?.includes('Regenerate'));

    await act(async () => {
      repromptButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });

    const promptTextarea = rendered.container.querySelector(
      '#video-prompt'
    ) as HTMLTextAreaElement | null;
    expect(promptTextarea?.value).toBe('Editorial portrait with warm sunlight');

    await act(async () => {
      regenerateButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      );
    });
    await flushAsyncWork();

    expect(startGenerationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'image-to-image',
        prompt: 'Editorial portrait with warm sunlight',
        imageUrls: ['https://cdn.example.com/source.png'],
        imageResolution: '2K',
        imageAspectRatio: '4:3',
        imageOutputFormat: 'png',
      })
    );

    await rendered.unmount();
  });

  it('switches to text-to-image when a t2i-only model is selected in image-to-image mode', async () => {
    workspaceState.user = {
      id: 'user-1',
      credits: {
        remainingCredits: 120,
      },
      notificationPreferences: {
        aiTaskCompletionEmailEnabled: true,
      },
    };
    workspaceState.viewerInfo = {
      isGuest: false,
      guestQuota: {
        limit: 0,
        remaining: 0,
        used: 0,
      },
      quotaTotal: 0,
      credits: {
        remainingCredits: 120,
      },
    };

    const rendered = await renderImageWorkspace({
      defaultMode: 'image-to-image',
    });

    const modelTrigger = Array.from(
      rendered.container.querySelectorAll('button')
    ).find(
      (button) =>
        button.textContent?.includes('Nano Banana 2') ||
        button.textContent?.includes('GPT Image 2')
    );

    expect(modelTrigger).not.toBeUndefined();

    await act(async () => {
      modelTrigger?.dispatchEvent(
        new MouseEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      );
    });
    await flushAsyncWork();

    const zImageButton = Array.from(
      document.body.querySelectorAll('div[role="option"] button')
    ).find((el) => el.textContent?.includes('Z Image'));

    if (zImageButton) {
      await act(async () => {
        zImageButton.dispatchEvent(
          new MouseEvent('click', { bubbles: true, cancelable: true })
        );
      });
      await flushAsyncWork();
    }

    const activeTab = rendered.container.querySelector(
      '[role="tab"][data-state="active"]'
    );
    expect(activeTab?.textContent).toContain('Text');

    await rendered.unmount();
  });
});
