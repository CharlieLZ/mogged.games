import type { ComponentType, ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PageHeader } from '@/shared/blocks/common/page-header';
import {
  type FreeToolCommonCopy,
  type FreeToolsIndexCopy,
  ImageColorExtractorTool,
  ImageCompressorTool,
  ImageConverterTool,
  ImageLocalTool,
  type LocalImageToolCopy,
  type LocalImageToolMode,
  LocalNotice,
  TipsList,
  VideoConverterTool,
  VideoThumbnailTool,
  VideoToGifTool,
  VideoTrimmerTool,
} from '@/shared/blocks/tools';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { replaceBrandTokensDeep } from '@/shared/lib/brand';
import {
  type FreeToolCopyKey,
  type FreeToolDefinition,
  type FreeToolPageCopy,
  FREE_TOOL_DEFINITIONS,
  FREE_TOOL_SECTION_ORDER,
  getFreeToolBySlug,
  type StandaloneToolCopyKey,
  type StandaloneToolPageCopy,
} from '@/shared/lib/free-tools-catalog';
import {
  getFreeToolLocalNotice,
  type FreeToolLocalNoticeKey,
} from '@/shared/lib/free-tool-local-notices';
import { getLocalizedPath } from '@/shared/lib/seo';
import { getWebApplicationSchema, getWebPageSchema } from '@/shared/lib/schema';

type LocalImageToolPageOptions = {
  locale: string;
  copyKey: FreeToolCopyKey;
  path: string;
  mode: LocalImageToolMode;
};

type StandaloneToolPageOptions = {
  locale: string;
  copyKey: StandaloneToolCopyKey;
  path: string;
  Tool: ComponentType<any>;
};

const standaloneToolComponents = {
  image_converter: ImageConverterTool,
  image_color_extractor: ImageColorExtractorTool,
  image_compressor: ImageCompressorTool,
  video_converter: VideoConverterTool,
  video_trimmer: VideoTrimmerTool,
  video_to_gif: VideoToGifTool,
  video_thumbnail: VideoThumbnailTool,
} satisfies Record<
  StandaloneToolCopyKey,
  ComponentType<any>
>;

function buildToolSchemas({
  copy,
  path,
}: {
  copy: FreeToolPageCopy;
  path: string;
}) {
  return [
    getWebPageSchema({
      name: copy.title,
      description: copy.description,
      url: path,
    }),
    getWebApplicationSchema({
      name: copy.title,
      description: copy.description,
      url: path,
    }),
  ];
}

async function getFreeToolPageCopy<TCopy extends FreeToolPageCopy>(
  copyKey: FreeToolCopyKey
) {
  const t = await getTranslations('landing');
  const common = replaceBrandTokensDeep(
    t.raw('free_tools.common')
  ) as FreeToolCommonCopy;
  const copy = replaceBrandTokensDeep(t.raw(`free_tools.${copyKey}`)) as TCopy;

  return { common, copy };
}

function renderToolPageFrame({
  common,
  copy,
  path,
  notice,
  children,
}: {
  common: FreeToolCommonCopy;
  copy: FreeToolPageCopy;
  path: string;
  notice?: string;
  children: ReactNode;
}) {
  const schemas = buildToolSchemas({ copy, path });

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <div className="mx-auto max-w-5xl px-6 pb-16">
        <PageHeader
          title={copy.title}
          description={copy.description}
          size="compact"
        />
        <LocalNotice common={common} notice={notice} />
        {children}
        <TipsList tips={copy.tips} title={common.tips_title} className="mt-4" />
      </div>
    </>
  );
}

export async function renderStandaloneToolPage({
  locale,
  copyKey,
  path,
  Tool,
}: StandaloneToolPageOptions) {
  setRequestLocale(locale);

  const { common, copy } =
    await getFreeToolPageCopy<StandaloneToolPageCopy>(copyKey);

  return renderToolPageFrame({
    common,
    copy,
    path,
    notice: getFreeToolLocalNotice(locale, copyKey as FreeToolLocalNoticeKey),
    children: <Tool common={common} copy={copy} />,
  });
}

export async function renderLocalImageToolPage({
  locale,
  copyKey,
  path,
  mode,
}: LocalImageToolPageOptions) {
  setRequestLocale(locale);

  const { common, copy } = await getFreeToolPageCopy<LocalImageToolCopy>(
    copyKey
  );

  return renderToolPageFrame({
    common,
    copy,
    path,
    notice: getFreeToolLocalNotice(locale, copyKey as FreeToolLocalNoticeKey),
    children: <ImageLocalTool common={common} copy={copy} mode={mode} />,
  });
}

function buildIndexSections({
  copy,
  toolCopies,
}: {
  copy: FreeToolsIndexCopy;
  toolCopies: Partial<Record<FreeToolCopyKey, FreeToolPageCopy>>;
}) {
  return FREE_TOOL_SECTION_ORDER.map((sectionKey, index) => {
    const section = copy.sections[index];
    const translatedItems = new Map(
      (section?.items || []).map((item) => [item.url, item])
    );
    const items = FREE_TOOL_DEFINITIONS.filter(
      (tool) => tool.section === sectionKey
    ).map((tool) => {
      const translatedItem = translatedItems.get(tool.path);

      if (translatedItem) {
        return translatedItem;
      }

      const toolCopy = toolCopies[tool.copyKey];

      return {
        title: toolCopy?.title || tool.slug,
        description: toolCopy?.description || '',
        url: tool.path,
      };
    });

    return {
      title: section?.title || sectionKey,
      description: section?.description || '',
      items,
    };
  }).filter((section) => section.items.length > 0);
}

function renderToolCard({
  item,
  locale,
}: {
  item: { title: string; description: string; url: string };
  locale: string;
}) {
  return (
    <Link
      key={item.url}
      href={getLocalizedPath(item.url, locale)}
      className="block h-full"
    >
      <Card className="hover:bg-muted/50 h-full transition-colors">
        <CardHeader>
          <CardTitle className="text-base">{item.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {item.description}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export async function renderFreeToolsIndexPage(locale: string) {
  setRequestLocale(locale);

  const t = await getTranslations('landing');
  const copy = replaceBrandTokensDeep(
    t.raw('free_tools.index')
  ) as FreeToolsIndexCopy;
  const toolCopies = Object.fromEntries(
    FREE_TOOL_DEFINITIONS.map((tool) => [
      tool.copyKey,
      replaceBrandTokensDeep(
        t.raw(`free_tools.${tool.copyKey}`)
      ) as FreeToolPageCopy,
    ])
  ) as Partial<Record<FreeToolCopyKey, FreeToolPageCopy>>;
  const sections = buildIndexSections({ copy, toolCopies });
  const webPageSchema = getWebPageSchema({
    name: copy.title,
    description: copy.description,
    url: '/free-tools',
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-16">
        <PageHeader
          title={copy.title}
          description={copy.description}
          size="compact"
        />
        <div className="grid gap-6">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div className="max-w-3xl">
                <h2 className="text-foreground text-xl font-semibold">
                  {section.title}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {section.description}
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => renderToolCard({ item, locale }))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

export async function renderFreeToolPage({
  locale,
  slug,
}: {
  locale: string;
  slug: string;
}) {
  const tool = getFreeToolBySlug(slug);

  if (!tool) {
    notFound();
  }

  return renderResolvedFreeToolPage({ locale, tool });
}

async function renderResolvedFreeToolPage({
  locale,
  tool,
}: {
  locale: string;
  tool: FreeToolDefinition;
}) {
  if (tool.kind === 'local-image') {
    return renderLocalImageToolPage({
      locale,
      copyKey: tool.copyKey,
      path: tool.path,
      mode: tool.mode,
    });
  }

  const Tool = standaloneToolComponents[tool.copyKey as StandaloneToolCopyKey];

  return renderStandaloneToolPage({
    locale,
    copyKey: tool.copyKey as StandaloneToolCopyKey,
    path: tool.path,
    Tool,
  });
}
