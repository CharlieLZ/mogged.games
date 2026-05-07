import { describe, expect, it } from 'vitest';

import {
  getDefaultTabName,
  getMatchedHashTabName,
  isRouteTab,
  matchesRouteTab,
} from './tabs';

describe('shared Tabs helpers', () => {
  it('prefers the active tab when choosing a default tab name', () => {
    expect(
      getDefaultTabName([
        { name: 'all', title: 'All', is_active: false },
        { name: 'image', title: 'Image', is_active: true },
      ])
    ).toBe('image');

    expect(
      getDefaultTabName([{ name: 'all', title: 'All', is_active: false }])
    ).toBe('all');
  });

  it('treats both query routes and plain routes as route tabs', () => {
    expect(isRouteTab({ name: 'image', title: 'Image', url: '/activity/ai-tasks?type=image' })).toBe(true);
    expect(isRouteTab({ name: 'payments', title: 'Payments', url: '/settings/payments' })).toBe(true);
    expect(isRouteTab({ name: 'all', title: 'All', url: '#all' })).toBe(false);
  });

  it('matches localized route tabs by pathname and search params', () => {
    expect(
      matchesRouteTab(
        {
          name: 'image',
          title: 'Image',
          url: '/activity/ai-tasks?type=image',
        },
        '/zh/activity/ai-tasks',
        'type=image'
      )
    ).toBe(true);

    expect(
      matchesRouteTab(
        {
          name: 'all',
          title: 'All',
          url: '/activity/ai-tasks',
        },
        '/activity/ai-tasks',
        'type=image'
      )
    ).toBe(false);
  });

  it('only matches hashes against in-page tabs', () => {
    expect(
      getMatchedHashTabName(
        [
          { name: 'all', title: 'All', url: '/activity/ai-tasks' },
          { name: 'pending', title: 'Pending', url: '#pending' },
          { name: 'done', title: 'Done', url: '#done' },
        ],
        '#pending'
      )
    ).toBe('pending');

    expect(
      getMatchedHashTabName(
        [
          { name: 'all', title: 'All', url: '/activity/ai-tasks' },
          { name: 'image', title: 'Image', url: '/activity/ai-tasks?type=image' },
        ],
        '#all'
      )
    ).toBe('');
  });
});
