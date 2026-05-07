const publicPageHeaderTitle =
  'text-foreground text-center text-2xl leading-8 font-semibold tracking-tight md:text-[1.75rem] md:leading-9 lg:text-3xl lg:leading-10 lg:whitespace-nowrap';

const publicPageHeaderDescription =
  'text-muted-foreground mx-auto max-w-6xl text-sm leading-6 lg:whitespace-nowrap';

export const publicPageTypography = {
  eyebrow: 'text-xs leading-4 font-semibold tracking-[0.14em] uppercase',
  heroTitle:
    'text-center text-[2.25rem] leading-[2.75rem] font-semibold tracking-tight text-balance whitespace-pre-line sm:text-[2.8125rem] sm:leading-[3.25rem] lg:text-[3.5625rem] lg:leading-[4rem]',
  heroDescription:
    'text-muted-foreground mx-auto mt-4 max-w-4xl text-base leading-7 text-pretty',
  sectionTitle:
    'mt-2.5 text-2xl leading-8 font-semibold tracking-tight md:mt-3 md:text-[1.75rem] md:leading-9 lg:text-3xl lg:leading-10',
  sectionHeading:
    'text-2xl leading-8 font-semibold tracking-tight md:text-[1.75rem] md:leading-9 lg:text-3xl lg:leading-10',
  sectionDescription:
    'mt-3 text-sm leading-6 md:mt-4 md:text-base md:leading-7',
  caseTitle:
    'text-[1.375rem] leading-7 font-semibold tracking-tight text-balance md:text-[1.75rem] md:leading-9',
  cardTitle: 'text-base leading-6 font-semibold tracking-tight text-balance',
  cardDescription: 'text-sm leading-6',
  compactCardDescription: 'text-xs leading-5 md:text-sm md:leading-6',
  pageHeaderTitle: publicPageHeaderTitle,
  pageHeaderDescription: publicPageHeaderDescription,
  generatorHeaderContent: 'mx-auto max-w-6xl text-center',
  generatorHeaderTitle: publicPageHeaderTitle,
  generatorHeaderDescription: publicPageHeaderDescription,
  finalCtaTitle:
    'mt-5 max-w-4xl text-[2rem] leading-[2.5rem] font-semibold tracking-normal text-balance sm:text-[2.5rem] sm:leading-[3rem] lg:text-[3rem] lg:leading-[3.5rem]',
  finalCtaDescription:
    'mt-5 max-w-3xl text-sm leading-6 md:text-base md:leading-7',
  statValue:
    'text-[2rem] leading-[2.5rem] font-bold md:text-[2.8125rem] md:leading-[3.25rem]',
} as const;

export const publicPageMedia = {
  featureImageWrap: 'mx-auto w-full max-w-[30rem] flex-shrink-0 md:mx-0',
  galleryCard: 'w-[min(84vw,400px)]',
  comparisonFrame:
    'relative aspect-[4/3] min-h-[15rem] sm:min-h-[17rem] lg:min-h-[18rem]',
  comparisonDialogFrame: 'relative aspect-[4/3] min-h-[15rem] sm:min-h-[18rem]',
  comparisonDialogContent:
    'max-w-[min(94vw,72rem)] sm:max-w-[min(94vw,72rem)]',
  comparisonDialogLandscapeFrame: 'mx-auto w-full max-w-[min(90vw,100vh)]',
  comparisonDialogSquareFrame: 'mx-auto w-full max-w-[min(88vw,72vh)]',
  comparisonPanel: 'max-w-6xl',
  gptComparisonPanel: 'max-w-5xl',
  videoShowcaseCard: 'w-[min(88vw,24rem)]',
  useCaseCard: 'max-w-[23rem] lg:max-w-none',
  useCaseGrid:
    'mx-auto grid max-w-[54rem] gap-3.5 lg:grid-cols-[minmax(0,22.75rem)_minmax(0,23.75rem)] lg:items-start lg:justify-center lg:gap-4',
  useCasePairedGrid: 'mx-auto max-w-[54rem] space-y-3.5',
  useCasePairedColumns:
    'grid gap-3.5 lg:grid-cols-[minmax(0,22.75rem)_minmax(0,23.75rem)] lg:justify-center lg:gap-4',
  useCaseVideoLandscape:
    'aspect-[16/10] w-full max-w-[21.75rem] lg:max-w-[22.5rem]',
  useCaseVideoPortrait: 'aspect-[9/16] h-[18rem] sm:h-[19rem] lg:h-[21rem]',
  samplePreviewFrame:
    'relative mx-auto aspect-[4/5] w-full max-w-[36rem] overflow-hidden rounded-lg border',
  samplePreviewPortraitVideo: 'mx-auto aspect-[9/16] max-w-[18rem]',
  toolPreviewFrame:
    'relative aspect-[4/3] min-h-[15rem] w-full overflow-hidden',
} as const;
