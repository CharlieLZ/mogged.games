import { MetadataRoute } from 'next';
import { getSiteSitemap } from '../shared/lib/site-discovery';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSiteSitemap();
}
