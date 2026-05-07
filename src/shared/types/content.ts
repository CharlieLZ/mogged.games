import { ReactNode } from 'react';

import type { TOCItemType } from '@/core/docs/toc';

export interface ContentPage {
  id?: string;
  slug?: string;
  title?: string;
  seo_title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  content?: string;
  created_at?: string;
  created_at_iso?: string;
  updated_at?: string;
  updated_at_iso?: string;
  author_name?: string;
  author_role?: string;
  author_image?: string;
  url?: string;
  target?: string;
  body?: ReactNode;
  toc?: TOCItemType[];
}
