import 'server-only';

import { readFile } from 'node:fs/promises';
import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from 'pdf-lib';

import { formatBusinessCertificateDisplayDate } from './business-certificate';
import { AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE } from './business-certificate-automation';
import { getBusinessCertificatePdfCopy } from './business-certificate-copy';
import type { BusinessCertificatePayload } from './business-certificate-record';

type PdfColor = ReturnType<typeof rgb>;

type PdfTheme = {
  paper: PdfColor;
  ink: PdfColor;
  primary: PdfColor;
  secondary: PdfColor;
  border: PdfColor;
  muted: PdfColor;
  accent: PdfColor;
};

let cachedThemePromise: Promise<PdfTheme> | null = null;
const THEME_CSS_SOURCE = new URL(
  '../../config/style/theme.css',
  import.meta.url
);

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function parseOklchToken(value?: string | null) {
  const match = value?.match(
    /oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*\)/i
  );

  if (!match) {
    return null;
  }

  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

function oklchToRgb(value?: string | null) {
  const parsed = parseOklchToken(value);
  if (!parsed) {
    return rgb(0, 0, 0);
  }

  const angle = (parsed.h * Math.PI) / 180;
  const a = parsed.c * Math.cos(angle);
  const b = parsed.c * Math.sin(angle);

  const l_ = parsed.l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = parsed.l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = parsed.l - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const linearR = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const linearG = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const linearB = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const convert = (channel: number) => {
    const clamped = clamp01(channel);
    if (clamped <= 0.0031308) {
      return 12.92 * clamped;
    }

    return 1.055 * clamped ** (1 / 2.4) - 0.055;
  };

  return rgb(convert(linearR), convert(linearG), convert(linearB));
}

async function getPdfTheme() {
  if (!cachedThemePromise) {
    cachedThemePromise = (async () => {
      try {
        const css = await readFile(
          /* turbopackIgnore: true */ THEME_CSS_SOURCE,
          'utf8'
        );
        const rootBlock = css.match(/:root\s*{([\s\S]*?)}/)?.[1] || '';
        const getToken = (name: string) =>
          rootBlock.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] || '';

        return {
          paper: oklchToRgb(getToken('--card')),
          ink: oklchToRgb(getToken('--foreground')),
          primary: oklchToRgb(getToken('--primary')),
          secondary: oklchToRgb(getToken('--secondary')),
          border: oklchToRgb(getToken('--border')),
          muted: oklchToRgb(getToken('--muted-foreground')),
          accent: oklchToRgb(getToken('--accent')),
        };
      } catch (error) {
        console.warn('[business-certificate/pdf] failed to read theme tokens', {
          error,
        });

        return {
          paper: rgb(0.99, 0.98, 0.95),
          ink: rgb(0.16, 0.14, 0.12),
          primary: rgb(0.83, 0.51, 0.23),
          secondary: rgb(0.42, 0.52, 0.82),
          border: rgb(0.87, 0.84, 0.78),
          muted: rgb(0.43, 0.41, 0.37),
          accent: rgb(0.45, 0.73, 0.86),
        };
      }
    })();
  }

  return cachedThemePromise;
}

function getCertificateTypography() {
  return { titleSize: 30, holderSize: 30 };
}

function drawLabelValueRow({
  page,
  labelFont,
  valueFont,
  theme,
  x,
  y,
  label,
  value,
  width,
}: {
  page: PDFPage;
  labelFont: PDFFont;
  valueFont: PDFFont;
  theme: PdfTheme;
  x: number;
  y: number;
  label: string;
  value: string;
  width: number;
}) {
  page.drawText(label, {
    x,
    y,
    size: 10,
    font: labelFont,
    color: theme.muted,
  });
  page.drawText(value, {
    x,
    y: y - 16,
    size: 13,
    font: valueFont,
    color: theme.ink,
    maxWidth: width,
    lineHeight: 15,
  });
}

export async function renderBusinessCertificatePdf(
  payload: BusinessCertificatePayload
) {
  const pdfDoc = await PDFDocument.create();

  const page = pdfDoc.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const theme = await getPdfTheme();
  const documentLocale = AUTOMATED_BUSINESS_CERTIFICATE_DOCUMENT_LOCALE;
  const copy = getBusinessCertificatePdfCopy(documentLocale);
  const typography = getCertificateTypography();
  const titleFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: theme.paper,
  });

  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: theme.border,
    borderWidth: 1.25,
  });

  page.drawRectangle({
    x: 38,
    y: 38,
    width: width - 76,
    height: height - 76,
    borderColor: theme.border,
    borderWidth: 0.75,
  });

  page.drawRectangle({
    x: 0,
    y: height - 86,
    width,
    height: 86,
    color: theme.primary,
  });

  page.drawRectangle({
    x: width - 144,
    y: height - 86,
    width: 144,
    height: 86,
    color: theme.secondary,
  });

  page.drawRectangle({
    x: 54,
    y: height - 160,
    width: width - 108,
    height: 1.5,
    color: theme.border,
  });

  page.drawText(payload.issuerName, {
    x: 58,
    y: height - 48,
    size: 14,
    font: bodyFont,
    color: theme.paper,
  });

  page.drawText(copy.title, {
    x: 58,
    y: height - 122,
    size: typography.titleSize,
    font: titleFont,
    color: theme.ink,
  });

  page.drawText(copy.subtitle, {
    x: 60,
    y: height - 146,
    size: 12,
    font: bodyFont,
    color: theme.muted,
  });

  page.drawEllipse({
    x: width - 96,
    y: height - 118,
    xScale: 44,
    yScale: 44,
    color: theme.paper,
    borderColor: theme.border,
    borderWidth: 1,
  });

  page.drawText(
    payload.currentState === 'expired' ? copy.badgeExpired : copy.badgeVerified,
    {
      x: width - 131,
      y: height - 122,
      size: 11,
      font: bodyFont,
      color:
        payload.currentState === 'expired' ? theme.secondary : theme.primary,
    }
  );

  page.drawText(payload.certificateId, {
    x: 58,
    y: height - 198,
    size: 11,
    font: monoFont,
    color: theme.secondary,
  });

  page.drawText(payload.holderName, {
    x: 58,
    y: height - 260,
    size: typography.holderSize,
    font: titleFont,
    color: theme.ink,
    maxWidth: width - 240,
  });

  page.drawText(copy.holderLabel, {
    x: 60,
    y: height - 228,
    size: 11,
    font: bodyFont,
    color: theme.muted,
  });

  const leftColumnX = 58;
  const rightColumnX = 430;
  const fieldWidth = 300;
  const rightFieldWidth = 250;
  const baseY = height - 326;
  const rowGap = 64;

  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: bodyFont,
    theme,
    x: leftColumnX,
    y: baseY,
    label: copy.planLabel,
    value: payload.planName,
    width: fieldWidth,
  });
  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: bodyFont,
    theme,
    x: leftColumnX,
    y: baseY - rowGap,
    label: copy.emailLabel,
    value: payload.maskedEmail,
    width: fieldWidth,
  });
  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: monoFont,
    theme,
    x: leftColumnX,
    y: baseY - rowGap * 2,
    label: copy.subscriptionLabel,
    value: payload.subscriptionReference,
    width: fieldWidth,
  });

  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: bodyFont,
    theme,
    x: rightColumnX,
    y: baseY,
    label: copy.issuedLabel,
    value: formatBusinessCertificateDisplayDate(payload.issuedOn, documentLocale),
    width: rightFieldWidth,
  });
  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: bodyFont,
    theme,
    x: rightColumnX,
    y: baseY - rowGap,
    label: copy.validFromLabel,
    value: formatBusinessCertificateDisplayDate(
      payload.validFrom,
      documentLocale
    ),
    width: rightFieldWidth,
  });
  drawLabelValueRow({
    page,
    labelFont: bodyFont,
    valueFont: bodyFont,
    theme,
    x: rightColumnX,
    y: baseY - rowGap * 2,
    label: copy.validUntilLabel,
    value: formatBusinessCertificateDisplayDate(
      payload.validUntil,
      documentLocale
    ),
    width: rightFieldWidth,
  });

  page.drawRectangle({
    x: 58,
    y: 120,
    width: width - 116,
    height: 62,
    color: theme.primary,
    opacity: 0.06,
    borderColor: theme.border,
    borderWidth: 0.75,
  });

  page.drawText(copy.rightsNote, {
    x: 76,
    y: 160,
    size: 11,
    font: bodyFont,
    color: theme.ink,
    maxWidth: width - 156,
    lineHeight: 14,
  });

  page.drawText(copy.verificationLabel, {
    x: 58,
    y: 84,
    size: 10,
    font: bodyFont,
    color: theme.muted,
  });
  page.drawText(payload.verificationUrl, {
    x: 58,
    y: 64,
    size: 10,
    font: monoFont,
    color: theme.secondary,
    maxWidth: width - 116,
  });

  page.drawText(payload.issuerDomain, {
    x: width - 176,
    y: 42,
    size: 10,
    font: bodyFont,
    color: theme.muted,
  });

  return pdfDoc.save();
}
