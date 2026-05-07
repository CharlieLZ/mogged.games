import { setRequestLocale } from 'next-intl/server';

import { resolveAppLocale } from '@/config/locale';
import { Link } from '@/core/i18n/navigation';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { Button } from '@/shared/components/ui/button';
import { ADMIN_ROUTES } from '@/shared/lib/admin-routes';
import { getCommonCopy } from '@/shared/lib/common-copy';

export const dynamic = 'force-dynamic';

const COPY = {
  en: {
    admin: 'Admin',
    description:
      'Your account can enter the admin area, but this section needs extra permission.',
    detail:
      'This usually means your role has admin access but does not include the specific read or write capability required by this page.',
    back: 'Back to overview',
  },
  zh: {
    admin: '管理后台',
    description: '你的账号能进入后台，但这个页面还需要额外权限。',
    detail:
      '一般表示你的角色有后台入口权限，但没有当前页面要求的读写能力。',
    back: '返回后台概览',
  },
  de: {
    admin: 'Admin',
    description:
      'Ihr Konto kann den Admin-Bereich betreten, aber dieser Abschnitt benötigt zusätzliche Berechtigungen.',
    detail:
      'Das bedeutet meist, dass Ihre Rolle Admin-Zugang hat, aber nicht über die konkrete Lese- oder Schreibberechtigung verfügt, die diese Seite verlangt.',
    back: 'Zurück zur Übersicht',
  },
  fr: {
    admin: 'Admin',
    description:
      'Votre compte peut entrer dans l’espace admin, mais cette section demande une autorisation supplémentaire.',
    detail:
      'Cela signifie généralement que votre rôle a accès à l’admin, mais pas à la capacité de lecture ou d’écriture requise par cette page.',
    back: 'Retour à la vue d’ensemble',
  },
  es: {
    admin: 'Admin',
    description:
      'Tu cuenta puede entrar al área administrativa, pero esta sección necesita un permiso adicional.',
    detail:
      'Normalmente esto significa que tu rol tiene acceso al panel admin, pero no incluye la capacidad específica de lectura o escritura que exige esta página.',
    back: 'Volver al resumen',
  },
  ja: {
    admin: '管理',
    description:
      'このアカウントは管理画面に入れますが、このセクションには追加の権限が必要です。',
    detail:
      '通常は、管理画面へのアクセス権はあるものの、このページで必要な読み取りまたは書き込み権限がロールに含まれていない状態です。',
    back: '管理トップへ戻る',
  },
  it: {
    admin: 'Admin',
    description:
      'Il tuo account può entrare nell’area admin, ma questa sezione richiede un’autorizzazione aggiuntiva.',
    detail:
      'Di solito significa che il tuo ruolo ha accesso all’admin, ma non include la capacità specifica di lettura o scrittura richiesta da questa pagina.',
    back: 'Torna alla panoramica',
  },
  ko: {
    admin: '관리',
    description:
      '이 계정은 관리자 영역에 들어갈 수 있지만, 이 섹션에는 추가 권한이 필요합니다.',
    detail:
      '보통은 현재 역할에 관리자 접근 권한은 있지만, 이 페이지가 요구하는 읽기 또는 쓰기 권한이 포함되지 않았다는 뜻입니다.',
    back: '개요로 돌아가기',
  },
  ar: {
    admin: 'الإدارة',
    description:
      'يمكن لحسابك دخول منطقة الإدارة، لكن هذا القسم يحتاج إلى صلاحية إضافية.',
    detail:
      'يعني هذا عادة أن دورك يملك حق دخول لوحة الإدارة، لكنه لا يتضمن صلاحية القراءة أو الكتابة المحددة التي تتطلبها هذه الصفحة.',
    back: 'العودة إلى النظرة العامة',
  },
} as const;

export default async function NoPermissionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const resolvedLocale = resolveAppLocale(locale);
  const common = getCommonCopy(locale);
  const copy = COPY[resolvedLocale];
  const title = common.empty_state.no_permission;

  return (
    <>
      <Header
        crumbs={[
          {
            title: copy.admin,
            url: ADMIN_ROUTES.ROOT,
          },
          {
            title,
            is_active: true,
          },
        ]}
      />
      <Main>
        <MainHeader title={title} description={copy.description} />
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm leading-7 text-muted-foreground">{copy.detail}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={ADMIN_ROUTES.ROOT}>{copy.back}</Link>
              </Button>
            </div>
          </div>
        </section>
      </Main>
    </>
  );
}
