import { describe, expect, it } from 'vitest';

import {
  getEmailFromMailto,
  isExternalHref,
  isMailtoHref,
  parseInlineMailtoAnchor,
} from './support-link';

describe('support link helpers', () => {
  it('detects mailto and external href values', () => {
    expect(isMailtoHref('mailto:support@example.com')).toBe(true);
    expect(isMailtoHref('/pricing')).toBe(false);

    expect(isExternalHref('https://example.com')).toBe(true);
    expect(isExternalHref('mailto:support@example.com')).toBe(true);
    expect(isExternalHref('/pricing')).toBe(false);
  });

  it('extracts the email portion from a mailto link', () => {
    expect(getEmailFromMailto('mailto:support@example.com')).toBe(
      'support@example.com'
    );
    expect(
      getEmailFromMailto('mailto:support@example.com?subject=Billing')
    ).toBe('support@example.com');
    expect(getEmailFromMailto('/pricing')).toBe('');
  });

  it('parses inline mailto anchors so the UI can render a richer fallback', () => {
    expect(
      parseInlineMailtoAnchor(
        "Need help? Email <a href='mailto:support@example.com' class='link'>support@example.com</a>."
      )
    ).toEqual({
      before: 'Need help? Email ',
      href: 'mailto:support@example.com',
      email: 'support@example.com',
      label: 'support@example.com',
      after: '.',
    });
  });

  it('returns null when the tip does not contain a mailto anchor', () => {
    expect(parseInlineMailtoAnchor('Need help? Read the FAQ.')).toBeNull();
  });
});
