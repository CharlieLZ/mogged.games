import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const adFiles = [
  'docs/ads/0414/supporting-materials/00_landing_page_matrix.csv',
  'docs/ads/0414/03_keyword_brand_clicks.csv',
  'docs/ads/0414/05_rsa_brand_clicks.csv',
];
const rsaFile = 'docs/ads/0414/05_rsa_brand_clicks.csv';

describe('ads branding copy', () => {
  it('keeps legacy Seedance campaign identifiers out of exported ad assets', () => {
    const existingFiles = adFiles.filter((file) =>
      fs.existsSync(path.join(process.cwd(), file))
    );

    for (const file of existingFiles) {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');

      expect(content).not.toContain('brand_clicks_seedance');
      expect(content).not.toContain('seedance');
    }
  });

  it('keeps mogged as the public brand while allowing Seedance 2.0 in RSA workflow copy', () => {
    if (!fs.existsSync(path.join(process.cwd(), rsaFile))) {
      return;
    }

    const content = fs.readFileSync(path.join(process.cwd(), rsaFile), 'utf8');

    expect(content).toContain('mogged');
    expect(content).toContain('mogged.games');
    expect(content).toContain('Seedance 2.0');
  });
});
