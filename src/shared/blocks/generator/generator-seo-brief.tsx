import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import type { GeneratorSeoNarrativeCopy } from '@/shared/lib/ai-video-generator-seo';
import { cn } from '@/shared/lib/utils';

type GeneratorSeoBriefProps = {
  narrative: GeneratorSeoNarrativeCopy;
  className?: string;
};

export function GeneratorSeoBrief({
  narrative,
  className,
}: GeneratorSeoBriefProps) {
  if (narrative.sections.length === 0) {
    return null;
  }

  return (
    <section
      data-slot="generator-seo-brief"
      className={cn('pb-10 pt-6 md:pb-14', className)}
    >
      <div className="mx-auto max-w-6xl px-6">
        {narrative.title ? (
          <div className="mb-5 max-w-3xl">
            <h2 className="text-foreground text-2xl font-semibold md:text-3xl">
              {narrative.title}
            </h2>
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-2">
          {narrative.sections.map((section, index) => (
            <Card
              key={`${section.title}-${index}`}
              className={cn(
                'border-border/70 bg-muted/25 gap-4',
                index === 0 ? 'lg:col-span-2' : undefined
              )}
            >
              <CardHeader className="gap-2">
                <h3 className="text-foreground text-xl font-semibold md:text-2xl">
                  {section.title}
                </h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p
                    key={`${section.title}-paragraph-${paragraphIndex}`}
                    className="text-muted-foreground leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="space-y-2 pl-5">
                    {section.bullets.map((bullet, bulletIndex) => (
                      <li
                        key={`${section.title}-bullet-${bulletIndex}`}
                        className="text-muted-foreground list-disc leading-relaxed"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
