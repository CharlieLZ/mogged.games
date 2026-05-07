import { describe, expect, it } from 'vitest';

import { findUnsafeSingleQuotedFrontmatterValues } from './content-frontmatter-quote-safety';

describe('content frontmatter quote safety', () => {
  it('flags single-quoted YAML values that contain unescaped apostrophes', () => {
    const source = `---
title: 'mogged Conditions d'utilisation | Espace de travail'
description: "Safe because this one uses double quotes"
keywords: 'safe keywords'
---
`;

    expect(findUnsafeSingleQuotedFrontmatterValues(source)).toEqual([
      {
        key: 'title',
        line: 2,
        value: "mogged Conditions d'utilisation | Espace de travail",
      },
    ]);
  });

  it('accepts double-quoted YAML values and escaped single quotes', () => {
    const source = `---
title: "mogged Conditions d'utilisation | Espace de travail"
description: 'Politique d''utilisation acceptable'
keywords: 'workflow vidéo IA'
---
`;

    expect(findUnsafeSingleQuotedFrontmatterValues(source)).toEqual([]);
  });
});
