import { Badge } from '@/shared/components/ui/badge';
import { cn } from '@/shared/lib/utils';

import { FreeToolCommonCopy } from './types';

export function LocalNotice({
  common,
  notice,
  className,
}: {
  common: FreeToolCommonCopy;
  notice?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-muted/60 px-4 py-3 text-sm text-muted-foreground md:flex-row md:items-center md:gap-4',
        className
      )}
    >
      <Badge variant="secondary">{common.badge}</Badge>
      <p className="leading-relaxed">{notice || common.local_notice}</p>
    </div>
  );
}

export function TipsList({
  tips,
  title,
  className,
}: {
  tips?: string[];
  title: string;
  className?: string;
}) {
  if (!tips || tips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground',
        className
      )}
    >
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      <ul className="space-y-1 pl-4">
        {tips.map((tip, idx) => (
          <li key={idx} className="list-disc leading-relaxed">
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
