import { getAppName, getAppUrl, getSupportEmail } from '@/shared/lib/brand';
import { SITE_BRAND_LOGO_PATH } from '@/shared/lib/site-visuals';

export function getOrganizationSchema(options?: {
  name?: string;
  url?: string;
  logo?: string;
  email?: string;
  description?: string;
}) {
  const appUrl = getAppUrl();
  const logoUrl = options?.logo?.startsWith('http')
    ? options.logo
    : `${appUrl}${options?.logo || SITE_BRAND_LOGO_PATH}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options?.name || getAppName(),
    url: options?.url || appUrl,
    logo: logoUrl,
    email: options?.email || getSupportEmail(),
    description:
      options?.description ||
      `${getAppName()} is an independent creative workflow site with hosted AI tools and browser-based utilities.`,
  };
}

export function getWebSiteSchema(options?: {
  name?: string;
  url?: string;
  description?: string;
}) {
  const appUrl = getAppUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: options?.name || getAppName(),
    url: options?.url || appUrl,
    description:
      options?.description ||
      `${getAppName()} covers hosted creative workflows, pricing context, browser tools, and support guidance.`,
  };
}

export interface WebPageOptions {
  name: string;
  description: string;
  url: string;
  type?: 'WebPage' | 'AboutPage' | 'ContactPage';
  datePublished?: string;
  dateModified?: string;
  image?: string;
}

export function getWebPageSchema(options: WebPageOptions) {
  const appUrl = getAppUrl();
  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `${appUrl}${options.url}`;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': options.type || 'WebPage',
    name: options.name,
    description: options.description,
    url: fullUrl,
    isPartOf: {
      '@type': 'WebSite',
      name: getAppName(),
      url: appUrl,
    },
  };

  if (options.datePublished) {
    schema.datePublished = options.datePublished;
  }

  if (options.dateModified) {
    schema.dateModified = options.dateModified;
  }

  if (options.image) {
    schema.primaryImageOfPage = {
      '@type': 'ImageObject',
      url: options.image.startsWith('http')
        ? options.image
        : `${appUrl}${options.image}`,
    };
  }

  return schema;
}

export interface WebApplicationOffer {
  name?: string;
  price: string;
  priceCurrency: string;
  url?: string;
  availability?: string;
  category?: string;
  description?: string;
}

export interface WebApplicationOptions {
  name: string;
  description: string;
  url: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: WebApplicationOffer | WebApplicationOffer[];
  featureList?: string[];
  screenshot?: string;
}

export function getWebApplicationSchema(options: WebApplicationOptions) {
  const appUrl = getAppUrl();
  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `${appUrl}${options.url}`;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: options.name,
    description: options.description,
    url: fullUrl,
    applicationCategory: options.applicationCategory || 'MultimediaApplication',
    operatingSystem: options.operatingSystem || 'Any',
  };

  if (options.offers) {
    const buildOffer = (offer: WebApplicationOffer) => ({
      '@type': 'Offer',
      ...(offer.name ? { name: offer.name } : {}),
      price: offer.price,
      priceCurrency: offer.priceCurrency,
      ...(offer.url ? { url: offer.url } : {}),
      ...(offer.availability ? { availability: offer.availability } : {}),
      ...(offer.category ? { category: offer.category } : {}),
      ...(offer.description ? { description: offer.description } : {}),
    });

    schema.offers = Array.isArray(options.offers)
      ? options.offers.map((offer) => buildOffer(offer))
      : buildOffer(options.offers);
  }

  if (options.featureList && options.featureList.length > 0) {
    schema.featureList = options.featureList;
  }

  if (options.screenshot) {
    schema.screenshot = options.screenshot.startsWith('http')
      ? options.screenshot
      : `${appUrl}${options.screenshot}`;
  }

  return schema;
}

export interface ArticleOptions {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified: string;
  author?: { name: string; url?: string };
  publisher?: { name: string; logo: string };
  url: string;
}

export function getArticleSchema(options: ArticleOptions) {
  const appUrl = getAppUrl();
  const fullUrl = options.url.startsWith('http')
    ? options.url
    : `${appUrl}${options.url}`;
  const imageUrl = options.image.startsWith('http')
    ? options.image
    : `${appUrl}${options.image}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: options.headline,
    description: options.description,
    image: imageUrl,
    datePublished: options.datePublished,
    dateModified: options.dateModified,
    author: options.author || {
      '@type': 'Organization',
      name: getAppName(),
    },
    publisher: options.publisher || {
      '@type': 'Organization',
      name: getAppName(),
      logo: {
        '@type': 'ImageObject',
        url: `${appUrl}${SITE_BRAND_LOGO_PATH}`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': fullUrl,
    },
  };
}

export interface ProductOptions {
  name: string;
  description: string;
  image: string;
  sku?: string;
  brand?: string;
  keywords?: string | string[];
  offers: {
    price: string;
    priceCurrency: string;
    availability?: string;
    url?: string;
    priceValidUntil?: string;
    shippingDetails?: Record<string, any>;
    hasMerchantReturnPolicy?: Record<string, any>;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
  reviews?: {
    authorName: string;
    reviewBody: string;
    ratingValue?: number;
    bestRating?: number;
    worstRating?: number;
    datePublished?: string;
  }[];
}

export function getProductSchema(options: ProductOptions) {
  const appUrl = getAppUrl();
  const imageUrl = options.image.startsWith('http')
    ? options.image
    : `${appUrl}${options.image}`;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: options.name,
    description: options.description,
    image: imageUrl,
    brand: {
      '@type': 'Brand',
      name: options.brand || getAppName(),
    },
    offers: {
      '@type': 'Offer',
      price: options.offers.price,
      priceCurrency: options.offers.priceCurrency,
      availability: options.offers.availability || 'https://schema.org/InStock',
      url: options.offers.url || appUrl,
    },
  };

  if (options.sku) {
    schema.sku = options.sku;
  }

  if (options.keywords) {
    schema.keywords = options.keywords;
  }

  if (options.aggregateRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: options.aggregateRating.ratingValue,
      reviewCount: options.aggregateRating.reviewCount,
    };
  }

  if (options.reviews && options.reviews.length > 0) {
    schema.review = options.reviews.map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.authorName,
      },
      reviewBody: review.reviewBody,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.ratingValue || 5,
        bestRating: review.bestRating || 5,
        worstRating: review.worstRating || 1,
      },
      ...(review.datePublished ? { datePublished: review.datePublished } : {}),
    }));
  }

  return schema;
}

export function getFAQPageSchema(options: {
  questions: Array<{ question: string; answer: string }>;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: options.questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
