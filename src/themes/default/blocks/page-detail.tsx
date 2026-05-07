import { CalendarIcon } from 'lucide-react';

import { resolveAppLocale, type AppLocale } from '@/config/locale';
import { MarkdownPreview } from '@/shared/blocks/common/markdown-preview';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { cn } from '@/shared/lib/utils';
import { type ContentPage } from '@/shared/types/content';

import '@/config/style/docs.css';

const pageDetailLabelsByLocale: Record<
  AppLocale,
  { created: string; updated: string }
> = {
  en: {
    created: 'Published',
    updated: 'Updated',
  },
  zh: {
    created: '发布于',
    updated: '最近更新',
  },
  de: {
    created: 'Veröffentlicht',
    updated: 'Aktualisiert',
  },
  fr: {
    created: 'Publié',
    updated: 'Mis à jour',
  },
  es: {
    created: 'Publicado',
    updated: 'Actualizado',
  },
  ja: {
    created: '公開日',
    updated: '更新日',
  },
  it: {
    created: 'Pubblicato',
    updated: 'Aggiornato',
  },
  ko: {
    created: '게시일',
    updated: '업데이트',
  },
  ar: {
    created: 'نُشر في',
    updated: 'آخر تحديث',
  },
};

function getPageLocale(url?: string): AppLocale {
  const firstSegment = url?.split('/').filter(Boolean)[0];

  return resolveAppLocale(firstSegment);
}

function getPageDetailLabels(url?: string) {
  return pageDetailLabelsByLocale[getPageLocale(url)];
}

export async function PageDetail({ page }: { page: ContentPage }) {
  const labels = getPageDetailLabels(page.url);

  return (
    <section id={page.id}>
      <div className="pt-[var(--landing-page-top-space-mobile)] pb-8 md:pt-[var(--landing-page-top-space)] md:pb-10">
        <div className="mx-auto w-full max-w-4xl px-6 md:px-8">
          <div className="text-center">
            <h1
              className={cn(
                'mx-auto mb-2 w-full md:max-w-4xl',
                publicPageTypography.pageHeaderTitle
              )}
            >
              {page.title}
            </h1>
            <div
              className={cn(
                'text-muted-foreground mb-5 flex items-center justify-center gap-4',
                publicPageTypography.pageHeaderDescription
              )}
            >
              {page.description}
            </div>
            {(page.created_at || page.updated_at) && (
              <div className="text-muted-foreground mb-5 flex flex-wrap items-center justify-center gap-3 text-sm">
                {page.created_at ? (
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                    <CalendarIcon className="size-4" />
                    <span>{labels.created}</span>
                    <span>{page.created_at}</span>
                  </div>
                ) : null}
                {page.updated_at ? (
                  <div className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                    <CalendarIcon className="size-4" />
                    <span>{labels.updated}</span>
                    <span>{page.updated_at}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="ring-foreground/5 relative mt-4 rounded-lg border border-transparent px-4 shadow ring-1 md:mt-5 md:px-8">
            <div>
              {page.body ? (
                <div className="docs text-foreground text-md my-8 space-y-4 font-normal *:leading-relaxed">
                  {page.body}
                </div>
              ) : (
                <>
                  {page.content && (
                    <div className="text-muted-foreground my-8 space-y-4 text-base *:leading-relaxed">
                      <MarkdownPreview content={page.content} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
