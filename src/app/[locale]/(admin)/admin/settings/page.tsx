import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requireAdminAllPermissions } from '@/core/rbac';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  ADMIN_ROUTES,
  getRouteSearchParam,
  type RouteSearchParams,
} from '@/shared/lib/admin-routes';
import { getConfigs, saveConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/services/current-user';
import {
  getSettingGroups,
  getSettings,
  getSettingTabs,
} from '@/shared/services/settings';
import { Crumb } from '@/shared/types/blocks/common';
import { Form as FormType } from '@/shared/types/blocks/form';

type SettingSection = {
  tabName: string;
  tabTitle: string;
  groups: {
    name: string;
    form: FormType;
  }[];
};

export default async function SettingsPage({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<RouteSearchParams>;
}) {
  const { locale } = await paramsPromise;
  const resolvedSearchParams = searchParamsPromise
    ? await searchParamsPromise
    : undefined;
  setRequestLocale(locale);
  const activeTabFromQuery =
    getRouteSearchParam(resolvedSearchParams?.tab) || 'general';

  await requireAdminAllPermissions(
    [PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE],
    locale
  );

  const [configs, settingGroups, settings, t, tabs] = await Promise.all([
    getConfigs(),
    getSettingGroups(),
    getSettings(),
    getTranslations('admin.settings'),
    getSettingTabs(activeTabFromQuery),
  ]);

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: ADMIN_ROUTES.ROOT },
    { title: t('edit.crumbs.settings'), is_active: true },
  ];

  const handleSubmit: NonNullable<FormType['submit']>['handler'] = async (
    data: FormData
  ) => {
    'use server';

    const user = await getUserInfo();

    if (!user) {
      throw new Error('no auth');
    }

    data.forEach((value, name) => {
      configs[name] = value as string;
    });

    await saveConfigs(configs, {
      actorUserId: user.id,
    });

    return {
      status: 'success',
      message: 'Settings updated',
    };
  };

  const sections: SettingSection[] = tabs
    .flatMap((tab) => {
      const groups = settingGroups
        .filter((group) => group.tab === tab.name)
        .map((group) => ({
          name: group.name,
          form: {
            title: group.title,
            description: group.description,
            fields: settings
              .filter((setting) => setting.group === group.name)
              .map((setting) => ({
                name: setting.name,
                title: setting.title,
                type: setting.type as FormType['fields'][number]['type'],
                placeholder: setting.placeholder,
                group: setting.group,
                options: setting.options,
                tip: setting.tip,
                value: setting.value,
                attributes: setting.attributes,
              })),
            passby: {
              provider: group.name,
              tab: group.tab,
            },
            data: configs,
            submit: {
              button: {
                title: t('edit.buttons.submit'),
              },
              handler: handleSubmit,
            },
          },
        }));

      if (!groups.length || !tab.name) {
        return [];
      }

      return [
        {
          tabName: tab.name,
          tabTitle: tab.title || tab.name,
          groups,
        },
      ];
    });

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} tabs={tabs} />

        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.tabName}
              id={section.tabName}
              className="scroll-mt-28"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold uppercase text-primary">
                    {section.tabTitle.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {t(`edit.tabs.${section.tabName}`) || section.tabTitle}
                    </p>
                    <h3 className="text-lg font-semibold leading-tight">
                      {section.tabTitle}
                    </h3>
                  </div>
                </div>
                <a
                  href={`#${section.tabName}`}
                  className="text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  #{section.tabName}
                </a>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {section.groups.map((group) => (
                  <FormCard
                    key={group.name}
                    title={group.form.title}
                    description={group.form.description}
                    form={group.form}
                    className="h-full"
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </Main>
    </>
  );
}
