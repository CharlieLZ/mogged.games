import { describe, expect, it } from 'vitest';

import { parseContentFrontmatter } from './content-frontmatter';

describe('content frontmatter', () => {
  it('parses the public content page frontmatter fields we rely on for SEO', () => {
    const source = `---
title: Example Episode
seo_title: Example Episode | mogged
description: 'A public content page with a colon: still parsed correctly.'
created_at: 2026-03-24
updated_at: 2026-03-25
image: /imgs/example.jpg
author_name: mogged Editorial Team
---

# Example Episode
`;

    expect(parseContentFrontmatter(source)).toEqual({
      title: 'Example Episode',
      seo_title: 'Example Episode | mogged',
      description: 'A public content page with a colon: still parsed correctly.',
      created_at: '2026-03-24',
      updated_at: '2026-03-25',
      image: '/imgs/example.jpg',
      author_name: 'mogged Editorial Team',
    });
  });
});
