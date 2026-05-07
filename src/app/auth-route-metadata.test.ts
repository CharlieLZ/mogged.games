import { generateMetadata as generateForgotPasswordMetadata } from '@/app/[locale]/(auth)/forgot-password/page';
import { generateMetadata as generateResetPasswordMetadata } from '@/app/[locale]/(auth)/reset-password/page';
import { generateMetadata as generateSignInMetadata } from '@/app/[locale]/(auth)/sign-in/page';
import { generateMetadata as generateSignUpMetadata } from '@/app/[locale]/(auth)/sign-up/page';
import { describe, expect, it, vi } from 'vitest';

interface MessageTree {
  [key: string]: string | MessageTree;
}

const MESSAGES: Record<string, MessageTree> = {
  common: {
    metadata: {
      title: 'mogged | AI Image Editor & Photo Editor AI',
      description:
        'mogged is an online AI image editor for text-to-image, image-to-image, photo refinement, and browser-based image tools on mogged.games.',
      keywords:
        'image editor ai, ai image editor, photo editor ai, ai photo editor, online image editor, image to image, text to image, mogged.games',
    },
    sign: {
      sign_in_title: 'Sign In',
      sign_in_description: 'Sign in to your account',
      sign_up_title: 'Sign Up',
      sign_up_description: 'Create an account',
    },
  },
  settings: {
    security: {
      reset_password_request: {
        title: 'Reset Password',
        description: 'Send a reset email to the address tied to your account.',
      },
      reset_password_confirm: {
        title: 'Choose a New Password',
        description:
          'Set a new password for your account and get back into your workspace.',
      },
    },
  },
  'settings.security.reset_password_request': {
    title: 'Reset Password',
    description: 'Send a reset email to the address tied to your account.',
  },
  'settings.security.reset_password_confirm': {
    title: 'Choose a New Password',
    description:
      'Set a new password for your account and get back into your workspace.',
  },
  'common.metadata': {
    title: 'mogged | AI Image Editor & Photo Editor AI',
    description:
      'mogged is an online AI image editor for text-to-image, image-to-image, photo refinement, and browser-based image tools on mogged.games.',
    keywords:
      'image editor ai, ai image editor, photo editor ai, ai photo editor, online image editor, image to image, text to image, mogged.games',
  },
};

function getMessageValue(
  namespace: string,
  key: string
): string | MessageTree | undefined {
  return key
    .split('.')
    .reduce<
      string | MessageTree | undefined
    >((result, segment) => (result && typeof result === 'object' ? result[segment] : undefined), MESSAGES[namespace]);
}

vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => {
    const translator = ((key: string) =>
      getMessageValue(namespace, key) || '') as ((key: string) => string) & {
      has: (key: string) => boolean;
    };

    translator.has = (key: string) => Boolean(getMessageValue(namespace, key));

    return translator;
  },
  setRequestLocale: vi.fn(),
}));

vi.mock('@/shared/blocks/sign/sign-in', () => ({
  SignIn: () => null,
}));

vi.mock('@/shared/blocks/sign/sign-up', () => ({
  SignUp: () => null,
}));

vi.mock('@/shared/blocks/settings', () => ({
  RequestPasswordResetCard: () => null,
  ResetPasswordCard: () => null,
}));

vi.mock('@/shared/models/config', () => ({
  getPublicConfigs: async () => ({}),
}));

describe('auth route metadata', () => {
  it('keeps sign-in pages noindex while overriding homepage social metadata', async () => {
    const metadata = await generateSignInMetadata({
      params: Promise.resolve({ locale: 'en' }),
    });

    expect(metadata.title).toBe('Sign In | mogged');
    expect(metadata.description).toBe('Sign in to your account');
    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/sign-in$/),
    });
    expect(metadata.openGraph).toMatchObject({
      url: expect.stringMatching(/\/sign-in$/),
      title: 'Sign In | mogged',
    });
    expect(metadata.twitter).toMatchObject({
      title: 'Sign In | mogged',
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    });
  });

  it('keeps sign-up pages localized while staying noindex', async () => {
    const metadata = await generateSignUpMetadata({
      params: Promise.resolve({ locale: 'de' }),
    });

    expect(metadata.title).toBe('Sign Up | mogged');
    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/de\/sign-up$/),
    });
    expect(metadata.openGraph).toMatchObject({
      locale: 'de_DE',
      url: expect.stringMatching(/\/de\/sign-up$/),
      title: 'Sign Up | mogged',
    });
    expect(metadata.twitter).toMatchObject({
      title: 'Sign Up | mogged',
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('keeps forgot-password pages noindex with auth-specific metadata', async () => {
    const metadata = await generateForgotPasswordMetadata({
      params: Promise.resolve({ locale: 'en' }),
    });

    expect(metadata.title).toBe('Reset Password | mogged');
    expect(metadata.description).toBe(
      'Send a reset email to the address tied to your account.'
    );
    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/forgot-password$/),
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('keeps reset-password pages localized while staying noindex', async () => {
    const metadata = await generateResetPasswordMetadata({
      params: Promise.resolve({ locale: 'de' }),
    });

    expect(metadata.title).toBe('Choose a New Password | mogged');
    expect(metadata.description).toBe(
      'Set a new password for your account and get back into your workspace.'
    );
    expect(metadata.alternates).toMatchObject({
      canonical: expect.stringMatching(/\/de\/reset-password$/),
    });
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
