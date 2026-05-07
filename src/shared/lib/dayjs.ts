import dayjs from 'dayjs';

import 'dayjs/locale/ar';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/zh-cn';

import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

import { getLocaleDayjsCode } from '@/config/locale';

dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export const getDayjs = (value?: dayjs.ConfigType, locale?: string) => {
  const targetLocale = getLocaleDayjsCode(locale);
  return dayjs(value).locale(targetLocale);
};

export default dayjs;
