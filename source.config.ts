import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

export const pages = defineDocs({
  dir: 'content/pages',
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // Use defaultLanguage for unknown language codes
      defaultLanguage: 'plaintext',
    },
  },
});
