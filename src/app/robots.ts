import { MetadataRoute } from 'next';

import { getSiteRobotsConfig } from '../shared/lib/site-discovery';

export default function robots(): MetadataRoute.Robots {
  return getSiteRobotsConfig();
}
