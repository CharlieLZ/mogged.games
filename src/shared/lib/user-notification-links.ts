export function getActivityNotificationsPath() {
  return '/activity/notifications';
}

export function buildActivityNotificationsPageHref(page: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  return `${getActivityNotificationsPath()}?${params.toString()}`;
}
