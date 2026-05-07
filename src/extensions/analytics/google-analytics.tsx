import { ReactNode } from 'react';

import { AnalyticsConfigs, AnalyticsProvider } from '.';

/**
 * Google analytics configs
 */
export interface GoogleAnalyticsConfigs extends AnalyticsConfigs {
  gaId?: string; // google analytics id
  adsId?: string; // google ads conversion id
}

/**
 * Google analytics provider
 */
export class GoogleAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'google-analytics';

  configs: GoogleAnalyticsConfigs;

  constructor(configs: GoogleAnalyticsConfigs) {
    this.configs = configs;
  }

  getHeadScripts(): ReactNode {
    const tagIds = Array.from(
      new Set([this.configs.gaId, this.configs.adsId].filter(Boolean))
    ) as string[];
    const primaryTagId = tagIds[0];

    if (!primaryTagId) {
      return null;
    }

    return (
      <>
        {/* Google tag (gtag.js) */}
        <script
          src={`https://www.googletagmanager.com/gtag/js?id=${primaryTagId}`}
          async
        />
        <script
          id={this.name}
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              ${tagIds.map((tagId) => `gtag('config', '${tagId}');`).join('\n')}
            `,
          }}
        />
      </>
    );
  }
}
