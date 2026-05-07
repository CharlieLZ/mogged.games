import { cn } from '@/shared/lib/utils';

export type NumberedFaqListItem = {
  question?: string;
  answer?: string;
};

function getVisibleFaqItems(items: NumberedFaqListItem[]) {
  return items
    .map((item) => ({
      question: item.question?.trim() ?? '',
      answer: item.answer?.trim() ?? '',
    }))
    .filter((item) => item.question !== '' && item.answer !== '');
}

export function NumberedFaqList({
  items,
  columns = 2,
  className,
}: {
  items: NumberedFaqListItem[];
  columns?: 1 | 2;
  className?: string;
}) {
  const visibleItems = getVisibleFaqItems(items);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <ol
      data-slot="faq-items"
      data-columns={columns}
      className={cn(
        'm-0 grid w-full list-none grid-cols-1 gap-x-6 gap-y-6 p-0 md:gap-x-10 md:gap-y-8',
        columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1',
        className
      )}
    >
      {visibleItems.map((item, index) => (
        <li key={`${item.question}-${index}`} data-slot="faq-item">
          <article className="flex items-start gap-3 md:gap-4">
            <span
              data-slot="faq-item-index"
              className="border-primary text-primary bg-background flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-[13px] leading-none font-semibold md:h-10 md:w-10"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-foreground text-sm leading-6 font-semibold md:text-[15px] md:leading-6">
                {item.question}
              </h3>
              <p className="text-muted-foreground mt-2 text-[13px] leading-5 md:mt-2.5 md:text-sm md:leading-6">
                {item.answer}
              </p>
            </div>
          </article>
        </li>
      ))}
    </ol>
  );
}
