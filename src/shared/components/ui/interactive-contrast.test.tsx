import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

describe('interactive contrast classes', () => {
  it('keeps disabled buttons readable on muted surfaces', () => {
    const html = renderToStaticMarkup(<Button disabled>Generate</Button>);

    expect(html).toContain('disabled:bg-muted');
    expect(html).toContain('disabled:text-foreground/65');
    expect(html).not.toContain('disabled:text-muted-foreground');
  });

  it('keeps disabled outline buttons readable and bordered', () => {
    const html = renderToStaticMarkup(
      <Button variant="outline" disabled>
        Buy credits
      </Button>
    );

    expect(html).toContain('disabled:bg-muted/80');
    expect(html).toContain('disabled:border-border/80');
    expect(html).toContain('disabled:text-foreground/65');
  });

  it('uses stronger inactive tab text on muted tab rails', () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="text">
        <TabsList>
          <TabsTrigger value="text">Text</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    expect(html).toContain('text-foreground/72');
    expect(html).not.toContain('text-muted-foreground');
  });
});
