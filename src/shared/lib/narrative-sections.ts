import {
  BenefitReviewItem,
  FAQ,
  FAQCategory,
  FAQItem,
  Landing,
  Section,
  SectionItem,
} from '@/shared/types/blocks/landing';

function compactObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, itemValue]) => itemValue !== undefined)
  ) as T;
}

function normalizeOptionalText(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function hasSectionItemContent(
  item: SectionItem | FAQItem | BenefitReviewItem
) {
  return Boolean(
    normalizeOptionalText(item.title) ||
    normalizeOptionalText(item.description) ||
    normalizeOptionalText(item.badge) ||
    normalizeOptionalText((item as FAQItem).question) ||
    normalizeOptionalText((item as FAQItem).answer) ||
    normalizeOptionalText((item as BenefitReviewItem).role) ||
    normalizeOptionalText((item as BenefitReviewItem).quote) ||
    (item as BenefitReviewItem).video?.src ||
    item.image?.src ||
    item.icon
  );
}

function normalizeSectionItem<T extends SectionItem>(item: T): T {
  return compactObject({
    ...item,
    id: normalizeOptionalText(item.id),
    name: normalizeOptionalText(item.name),
    title: normalizeOptionalText(item.title),
    text: normalizeOptionalText(item.text),
    description: normalizeOptionalText(item.description),
    url: normalizeOptionalText(item.url),
    target: normalizeOptionalText(item.target),
    type: normalizeOptionalText(item.type),
    icon_url: normalizeOptionalText(item.icon_url),
    badge: normalizeOptionalText(item.badge),
    className: normalizeOptionalText(item.className),
    image: item.image?.src
      ? compactObject({
          ...item.image,
          src: item.image.src,
          alt: normalizeOptionalText(item.image.alt),
          className: normalizeOptionalText(item.image.className),
        })
      : item.image,
    children: Array.isArray(item.children)
      ? item.children
          .map((child) => normalizeSectionItem(child))
          .filter((child) => hasSectionItemContent(child))
      : item.children,
    ...(Object.prototype.hasOwnProperty.call(item, 'question')
      ? {
          question: normalizeOptionalText((item as FAQItem).question),
          answer: normalizeOptionalText((item as FAQItem).answer),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(item, 'role')
      ? {
          role: normalizeOptionalText((item as BenefitReviewItem).role),
          quote: normalizeOptionalText((item as BenefitReviewItem).quote),
        }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(item, 'video')
      ? {
          rating:
            typeof (item as BenefitReviewItem).rating === 'number'
              ? Math.max(
                  0,
                  Math.min(5, Math.round((item as BenefitReviewItem).rating!))
                )
              : undefined,
          video: (item as BenefitReviewItem).video?.src
            ? compactObject({
                ...((item as BenefitReviewItem).video as NonNullable<
                  BenefitReviewItem['video']
                >),
                src: (item as BenefitReviewItem).video!.src,
                alt: normalizeOptionalText(
                  (item as BenefitReviewItem).video!.alt
                ),
                className: normalizeOptionalText(
                  (item as BenefitReviewItem).video!.className
                ),
                poster: normalizeOptionalText(
                  (item as BenefitReviewItem).video!.poster
                ),
              })
            : (item as BenefitReviewItem).video,
        }
      : {}),
  }) as T;
}

export function normalizeNarrativeSection<T extends Section | undefined>(
  section: T
): T {
  if (!section) {
    return section;
  }

  const items = Array.isArray(section.items)
    ? section.items
        .map((item) => normalizeSectionItem(item))
        .filter((item) => hasSectionItemContent(item))
    : section.items;

  return compactObject({
    ...section,
    id: normalizeOptionalText(section.id),
    block: normalizeOptionalText(section.block),
    label: normalizeOptionalText(section.label),
    sr_only_title: normalizeOptionalText(section.sr_only_title),
    title: normalizeOptionalText(section.title),
    description: normalizeOptionalText(section.description),
    tip: normalizeOptionalText(section.tip),
    className: normalizeOptionalText(section.className),
    image: section.image?.src
      ? compactObject({
          ...section.image,
          src: section.image.src,
          alt: normalizeOptionalText(section.image.alt),
          className: normalizeOptionalText(section.image.className),
        })
      : section.image,
    image_invert: section.image_invert?.src
      ? compactObject({
          ...section.image_invert,
          src: section.image_invert.src,
          alt: normalizeOptionalText(section.image_invert.alt),
          className: normalizeOptionalText(section.image_invert.className),
        })
      : section.image_invert,
    items,
  }) as T;
}

function normalizeFaqSection(section?: FAQ) {
  const normalizedSection = normalizeNarrativeSection(section);
  const categories = Array.isArray(section?.categories)
    ? section.categories
        .map((category) => normalizeNarrativeSection(category as FAQCategory))
        .filter((category) => {
          const normalizedCategory = category as FAQCategory | undefined;
          return Boolean(
            normalizedCategory?.title ||
            normalizedCategory?.description ||
            (normalizedCategory?.items?.length ?? 0) > 0
          );
        })
    : section?.categories;

  return compactObject({
    ...(normalizedSection ?? {}),
    categories,
  }) as FAQ | undefined;
}

export function normalizeLandingNarrativeSections(page: Landing): Landing {
  return {
    ...page,
    introduce: normalizeNarrativeSection(page.introduce),
    benefits: normalizeNarrativeSection(page.benefits),
    usage: normalizeNarrativeSection(page.usage),
    features: normalizeNarrativeSection(page.features),
    stats: normalizeNarrativeSection(page.stats),
    gallery: normalizeNarrativeSection(page.gallery),
    use_cases: normalizeNarrativeSection(page.use_cases),
    faq: normalizeFaqSection(page.faq),
    cta: normalizeNarrativeSection(page.cta),
  };
}
