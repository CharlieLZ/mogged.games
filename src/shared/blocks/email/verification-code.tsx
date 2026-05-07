import { getCommonCopy } from '@/shared/lib/common-copy';

export function VerificationCode({
  code,
  locale,
}: {
  code: string;
  locale?: string | null;
}) {
  const copy = getCommonCopy(locale).verification_code_email;

  return (
    <div>
      <h1>{copy.title}</h1>
      <p style={{ color: 'red' }}>
        {copy.message.replace('{code}', code)}
      </p>
    </div>
  );
}
