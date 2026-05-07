import { describe, expect, it } from 'vitest';

import {
  buildAdminHref,
  parseAdminLimit,
  parseAdminPagination,
  resolveAdminSidebar,
} from './admin-routes';

describe('admin routes', () => {
  it('builds stable admin hrefs without empty query noise', () => {
    expect(buildAdminHref('/admin/payments')).toBe('/admin/payments');
    expect(
      buildAdminHref('/admin/payments', {
        type: 'subscription',
        status: '',
        provider: undefined,
      })
    ).toBe('/admin/payments?type=subscription');
  });

  it('parses pagination defensively from string search params', () => {
    expect(
      parseAdminPagination({
        page: '2',
        pageSize: '80',
      })
    ).toEqual({
      page: 2,
      limit: 80,
    });

    expect(
      parseAdminPagination({
        page: ['-3'],
        pageSize: '9999',
      })
    ).toEqual({
      page: 1,
      limit: 100,
    });

    expect(
      parseAdminPagination({
        page: 'abc',
        pageSize: '0',
      })
    ).toEqual({
      page: 1,
      limit: 30,
    });
  });

  it('parses standalone limits defensively from route params', () => {
    expect(parseAdminLimit('50')).toBe(50);
    expect(parseAdminLimit(['0'], { defaultLimit: 20, min: 10, max: 100 })).toBe(
      20
    );
    expect(
      parseAdminLimit('999', { defaultLimit: 20, min: 10, max: 100 })
    ).toBe(100);
  });

  it('drops unknown admin sidebar links but preserves valid and external links', () => {
    const resolved = resolveAdminSidebar(
      {
        main_navs: [
          {
            title: 'System',
            items: [
              {
                title: 'Users',
                url: '/admin/users',
              },
              {
                title: 'Ghost',
                url: '/admin/ghost',
              },
            ],
          },
        ],
        footer: {
          nav: {
            items: [
              {
                title: 'GitHub',
                icon: 'Github',
                url: 'https://old.example.com',
              },
            ],
          },
        },
      },
      {
        repositoryUrl: 'https://github.com/example/repo',
        supportMailto: 'mailto:support@example.com',
      }
    );

    expect(resolved.main_navs?.[0]?.items).toEqual([
      {
        title: 'Users',
        url: '/admin/users',
        children: undefined,
      },
    ]);
    expect(resolved.footer?.nav?.items?.[0]?.url).toBe(
      'https://github.com/example/repo'
    );
  });
});
