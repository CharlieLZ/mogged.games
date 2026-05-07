import { NumberedFaqList } from '@/shared/blocks/numbered-faq-list';
import { getFaqItems } from '@/shared/lib/faq';
import { publicPageTypography } from '@/shared/lib/public-page-sizing';
import { parseInlineMailtoAnchor } from '@/shared/lib/support-link';
import { cn } from '@/shared/lib/utils';
import { FAQ as FAQType } from '@/shared/types/blocks/landing';

import { SectionIntro } from './section-intro';

export function FAQ({
  faq,
  className,
  columns = 2,
}: {
  faq: FAQType;
  className?: string;
  columns?: 1 | 2;
}) {
  const parsedTip = parseInlineMailtoAnchor(faq.tip);
  const items = getFaqItems(faq);

  return (
    <section id={faq.id} className={cn('py-10 md:py-16', className)}>
      <div
        className={cn(
          'mx-auto max-w-full px-4 md:px-8',
          columns === 2 ? 'md:max-w-6xl' : 'md:max-w-3xl'
        )}
      >
        <SectionIntro
          label={faq.label}
          title={faq.title}
          description={faq.description}
          className="max-w-2xl"
        />

        <div className="mx-auto mt-8 max-w-full md:mt-10">
          <NumberedFaqList items={items} columns={columns} />

          {parsedTip ? (
            <p
              className={cn(
                'text-muted-foreground mt-5',
                publicPageTypography.cardDescription
              )}
            >
              {parsedTip.before ? (
                <span dangerouslySetInnerHTML={{ __html: parsedTip.before }} />
              ) : null}
              <a
                href={`mailto:${parsedTip.email}`}
                className="text-primary font-medium hover:underline"
              >
                {parsedTip.label}
              </a>
              {parsedTip.after ? (
                <span dangerouslySetInnerHTML={{ __html: parsedTip.after }} />
              ) : null}
            </p>
          ) : (
            <p
              className={cn(
                'text-muted-foreground mt-5',
                publicPageTypography.cardDescription
              )}
              dangerouslySetInnerHTML={{ __html: faq.tip ?? '' }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
