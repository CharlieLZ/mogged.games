import { useLocale } from 'next-intl';
import { getDayjs } from '@/shared/lib/dayjs';

export function Time({
  value,
  placeholder,
  metadata,
  className,
}: {
  value: string | Date;
  placeholder?: string;
  metadata?: Record<string, any>;
  className?: string;
}) {
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  let locale = useLocale();
  if (locale === 'zh') {
    locale = 'zh-cn';
  }

  const date = getDayjs(value, locale);

  return (
    <div className={className}>
      {metadata?.format
        ? date.format(metadata?.format)
        : date.fromNow()}
    </div>
  );
}
