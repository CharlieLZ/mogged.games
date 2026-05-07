// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ContactSupportDialog } from './contact-support-dialog';

const fetchApiJsonMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    (
      ({
        menu_title: 'Contact Support',
        badge_eyebrow: 'Enterprise',
        badge_title: 'Get in Touch',
        title: 'Contact Us',
        description: "Let's discuss your custom requirements",
        mailto_subject: 'mogged support request',
        email_label: 'Email Address',
        message_label: 'Message',
        message_placeholder: 'Tell us about your project...',
        submit: 'Send Message',
        sending: 'Sending...',
        direct_title: 'Email Us',
        direct_label: 'Or email directly',
        success: 'Message sent. We will reply by email.',
        validation_error: 'Please enter at least 10 characters.',
        error: 'Could not send your message. Email us directly.',
        trust_reply: '24h Reply',
        trust_dedicated: 'Dedicated',
        trust_secure: 'Secure',
      }) as Record<string, string>
    )[key] ?? key,
}));

vi.mock('@/shared/lib/api/client', () => ({
  fetchApiJson: fetchApiJsonMock,
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock('@/shared/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    createElement('button', props, children),
}));

vi.mock('@/shared/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-root' }, children),
  DialogTrigger: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-trigger' }, children),
  DialogContent: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-content' }, children),
  DialogHeader: ({ children }: { children: React.ReactNode }) =>
    createElement('div', { 'data-slot': 'dialog-header' }, children),
  DialogTitle: ({ children }: { children: React.ReactNode }) =>
    createElement('h2', null, children),
  DialogDescription: ({ children }: { children: React.ReactNode }) =>
    createElement('p', null, children),
}));

vi.mock('@/shared/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    createElement('input', props),
}));

vi.mock('@/shared/components/ui/label', () => ({
  Label: ({
    children,
    ...props
  }: React.LabelHTMLAttributes<HTMLLabelElement>) =>
    createElement('label', props, children),
}));

vi.mock('@/shared/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) =>
    createElement('textarea', props),
}));

async function renderDialog() {
  const container = document.createElement('div');
  const root = createRoot(container);

  await act(async () => {
    root.render(
      createElement(ContactSupportDialog, {
        user: {
          id: 'user-1',
          email: 'casey@example.com',
          name: 'Casey',
        },
        supportEmail: 'support@mogged.games',
        trigger: createElement('button', null, 'Contact Support'),
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

function setNativeTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value'
  )?.set;
  valueSetter?.call(textarea, value);
}

describe('ContactSupportDialog', () => {
  beforeEach(() => {
    fetchApiJsonMock.mockReset();
    fetchApiJsonMock.mockResolvedValue({
      code: 0,
      message: 'ok',
      data: { accepted: true },
    });
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      'contact-request-id'
    );
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT;
  });

  it('shows the signed-in email as read-only and sends the message to the API', async () => {
    const rendered = await renderDialog();
    const emailInput = rendered.container.querySelector(
      'input[name="email"]'
    ) as HTMLInputElement;
    const textarea = rendered.container.querySelector(
      'textarea[name="message"]'
    ) as HTMLTextAreaElement;
    const form = rendered.container.querySelector('form') as HTMLFormElement;

    expect(emailInput.value).toBe('casey@example.com');
    expect(emailInput.readOnly).toBe(true);

    await act(async () => {
      setNativeTextareaValue(
        textarea,
        'I need a custom team plan for image editing.'
      );
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => {
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
    });

    expect(fetchApiJsonMock).toHaveBeenCalledWith('/api/support/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: 'contact-request-id',
        message: 'I need a custom team plan for image editing.',
      }),
    });
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Message sent. We will reply by email.'
    );

    await rendered.unmount();
  });
});
