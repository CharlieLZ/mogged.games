import { Link } from '@/core/i18n/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { cn } from '@/shared/lib/utils';

export function StatCard({
  title,
  value7,
  value30,
  unit,
  href,
  moreLabel,
  items,
  className,
}: {
  title: string;
  value7: string;
  value30: string;
  unit?: string;
  href?: string;
  moreLabel?: string;
  items?: { title: string; subtitle?: string; time?: string }[];
  className?: string;
}) {
  const content = (
    <Card
      className={cn('hover:border-primary/50 transition-colors', className)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground text-base font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-1 text-2xl font-semibold">
          <span>{value7}</span>
          {unit ? (
            <span className="text-muted-foreground text-sm font-medium">
              {unit}
            </span>
          ) : null}
          <span className="text-muted-foreground text-sm font-medium">
            / 7d
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5">
            30d
          </span>
          <span className="text-foreground font-medium">{value30}</span>
          {unit ? <span className="text-xs">{unit}</span> : null}
        </div>
        {items && items.length > 0 ? (
          <div className="text-muted-foreground mt-2 space-y-1 text-sm">
            {items.map((item, idx) => (
              <div key={idx} className="space-y-0.5 truncate">
                <div className="truncate">
                  <span className="text-foreground font-medium">
                    {item.title}
                  </span>
                  {item.subtitle ? (
                    <span className="text-muted-foreground text-xs">
                      {' '}
                      · {item.subtitle}
                    </span>
                  ) : null}
                </div>
                {item.time ? (
                  <div className="text-muted-foreground text-xs">
                    {item.time}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {href && moreLabel ? (
          <div className="text-primary flex items-center gap-1 text-sm font-medium">
            <span>{moreLabel}</span>
            <span aria-hidden>-&gt;</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
