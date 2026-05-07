import {
  getLocaleBcp47,
  getLocaleDirection,
  resolveAppLocale,
  type AppLocale,
} from '@/config/locale';
import { getAppDomain, getAppName, getSupportEmail } from '@/shared/lib/brand';

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;

export type AITaskCompletionEmailOptions = {
  locale?: string | null;
  scene?: string | null;
  prompt?: string | null;
  taskUrl: string;
  activityUrl: string;
  primaryDownloadUrl?: string | null;
};

type CompletionCopy = {
  locale: AppLocale;
  localeTag: string;
  dir: 'ltr' | 'rtl';
  subject: (appName: string, firstName: string) => string;
  title: string;
  greeting: (firstName: string) => string;
  intro: (appName: string) => string;
  promptLabel: string;
  workflowLabel: string;
  taskButton: string;
  downloadButton: string;
  activityButton: string;
  primaryDownloadHint: string;
  noPrompt: string;
  footer: (appName: string, domain: string, supportEmail: string) => string;
  workflowLabels: Record<string, string>;
};

const COPY: Record<AppLocale, Omit<CompletionCopy, 'locale' | 'localeTag' | 'dir'>> = {
  en: {
    subject: (appName, firstName) =>
      `${firstName}, your ${appName} task is ready`,
    title: 'Your task is ready',
    greeting: (firstName) => `Hi ${firstName},`,
    intro: (appName) =>
      `${appName} finished your render. Open the task page to review the output, or jump straight to the first download below.`,
    promptLabel: 'Prompt',
    workflowLabel: 'Workflow',
    taskButton: 'Open task',
    downloadButton: 'Download first result',
    activityButton: 'Open task history',
    primaryDownloadHint: 'Direct download link',
    noPrompt: 'No prompt was stored for this task.',
    footer: (appName, domain, supportEmail) =>
      `This email was sent because you asked ${appName} to notify you when a task finished at ${domain}. Questions? ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'Text to Video',
      'image-to-video': 'Image to Video',
      'reference-to-video': 'Reference to Video',
    },
  },
  zh: {
    subject: (appName, firstName) => `${firstName}，你的 ${appName} 任务已完成`,
    title: '你的任务已经好了',
    greeting: (firstName) => `${firstName}，你好：`,
    intro: (appName) =>
      `${appName} 已经把这次任务跑完了。你可以直接打开任务页看结果，也可以直接点下面的下载按钮拿第一个成品。`,
    promptLabel: '提示词',
    workflowLabel: '工作流',
    taskButton: '打开任务页',
    downloadButton: '下载第一个结果',
    activityButton: '打开任务记录',
    primaryDownloadHint: '直达下载链接',
    noPrompt: '这条任务没有保存提示词。',
    footer: (appName, domain, supportEmail) =>
      `这封邮件发给你，是因为你让 ${appName} 在 ${domain} 的任务完成后通知你。有问题可以联系 ${supportEmail}。`,
    workflowLabels: {
      'text-to-video': '文生视频',
      'image-to-video': '图生视频',
      'reference-to-video': '参考生视频',
    },
  },
  de: {
    subject: (appName, firstName) =>
      `${firstName}, dein ${appName}-Task ist fertig`,
    title: 'Dein Task ist fertig',
    greeting: (firstName) => `Hallo ${firstName},`,
    intro: (appName) =>
      `${appName} hat deinen Render abgeschlossen. Oeffne die Task-Seite oder lade direkt das erste Ergebnis herunter.`,
    promptLabel: 'Prompt',
    workflowLabel: 'Workflow',
    taskButton: 'Task oeffnen',
    downloadButton: 'Erstes Ergebnis laden',
    activityButton: 'Task-Verlauf oeffnen',
    primaryDownloadHint: 'Direkter Download-Link',
    noPrompt: 'Fuer diesen Task wurde kein Prompt gespeichert.',
    footer: (appName, domain, supportEmail) =>
      `Diese E-Mail wurde gesendet, weil du ${appName} gebeten hast, dich bei einem fertigen Task auf ${domain} zu benachrichtigen. Fragen? ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'Text zu Video',
      'image-to-video': 'Bild zu Video',
      'reference-to-video': 'Referenz zu Video',
    },
  },
  fr: {
    subject: (appName, firstName) =>
      `${firstName}, votre tache ${appName} est prete`,
    title: 'Votre tache est prete',
    greeting: (firstName) => `Bonjour ${firstName},`,
    intro: (appName) =>
      `${appName} a termine votre rendu. Ouvrez la page de la tache ou telechargez directement le premier resultat.`,
    promptLabel: 'Prompt',
    workflowLabel: 'Workflow',
    taskButton: 'Ouvrir la tache',
    downloadButton: 'Telecharger le premier resultat',
    activityButton: `Ouvrir l'historique`,
    primaryDownloadHint: 'Lien de telechargement direct',
    noPrompt: `Aucun prompt n'a ete enregistre pour cette tache.`,
    footer: (appName, domain, supportEmail) =>
      `Cet e-mail a ete envoye parce que vous avez demande a ${appName} de vous prevenir quand une tache est terminee sur ${domain}. Questions ? ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'Texte vers video',
      'image-to-video': 'Image vers video',
      'reference-to-video': 'Reference vers video',
    },
  },
  es: {
    subject: (appName, firstName) =>
      `${firstName}, tu tarea de ${appName} ya esta lista`,
    title: 'Tu tarea ya esta lista',
    greeting: (firstName) => `Hola ${firstName},`,
    intro: (appName) =>
      `${appName} termino tu render. Abre la pagina de la tarea o descarga directamente el primer resultado.`,
    promptLabel: 'Prompt',
    workflowLabel: 'Workflow',
    taskButton: 'Abrir tarea',
    downloadButton: 'Descargar primer resultado',
    activityButton: 'Abrir historial',
    primaryDownloadHint: 'Enlace de descarga directa',
    noPrompt: 'No se guardo un prompt para esta tarea.',
    footer: (appName, domain, supportEmail) =>
      `Este correo se envio porque pediste a ${appName} que te avisara cuando una tarea terminara en ${domain}. Preguntas: ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'Texto a video',
      'image-to-video': 'Imagen a video',
      'reference-to-video': 'Referencia a video',
    },
  },
  ja: {
    subject: (appName, firstName) =>
      `${firstName}さん、${appName} のタスクが完了しました`,
    title: 'タスクが完了しました',
    greeting: (firstName) => `${firstName}さん、こんにちは。`,
    intro: (appName) =>
      `${appName} でこのレンダリングが完了しました。タスクページを開くか、下のボタンから最初の結果を直接ダウンロードできます。`,
    promptLabel: 'プロンプト',
    workflowLabel: 'ワークフロー',
    taskButton: 'タスクを開く',
    downloadButton: '最初の結果をダウンロード',
    activityButton: 'タスク履歴を開く',
    primaryDownloadHint: '直接ダウンロードリンク',
    noPrompt: 'このタスクには保存されたプロンプトがありません。',
    footer: (appName, domain, supportEmail) =>
      `このメールは、${domain} の ${appName} でタスク完了通知を希望したため送信されました。お問い合わせ: ${supportEmail}。`,
    workflowLabels: {
      'text-to-video': 'テキストから動画',
      'image-to-video': '画像から動画',
      'reference-to-video': '参照から動画',
    },
  },
  it: {
    subject: (appName, firstName) =>
      `${firstName}, il tuo task ${appName} e pronto`,
    title: 'Il tuo task e pronto',
    greeting: (firstName) => `Ciao ${firstName},`,
    intro: (appName) =>
      `${appName} ha completato il render. Apri la pagina del task oppure scarica subito il primo risultato.`,
    promptLabel: 'Prompt',
    workflowLabel: 'Workflow',
    taskButton: 'Apri task',
    downloadButton: 'Scarica il primo risultato',
    activityButton: 'Apri cronologia task',
    primaryDownloadHint: 'Link diretto al download',
    noPrompt: 'Nessun prompt salvato per questo task.',
    footer: (appName, domain, supportEmail) =>
      `Questa email e stata inviata perche hai chiesto a ${appName} di avvisarti quando un task fosse finito su ${domain}. Domande? ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'Testo in video',
      'image-to-video': 'Immagine in video',
      'reference-to-video': 'Riferimento in video',
    },
  },
  ko: {
    subject: (appName, firstName) =>
      `${firstName}님, ${appName} 작업이 완료되었습니다`,
    title: '작업이 완료되었습니다',
    greeting: (firstName) => `${firstName}님, 안녕하세요.`,
    intro: (appName) =>
      `${appName} 에서 이번 렌더링이 끝났습니다. 작업 페이지를 열거나 아래 버튼으로 첫 결과를 바로 다운로드하세요.`,
    promptLabel: '프롬프트',
    workflowLabel: '워크플로',
    taskButton: '작업 열기',
    downloadButton: '첫 결과 다운로드',
    activityButton: '작업 기록 열기',
    primaryDownloadHint: '직접 다운로드 링크',
    noPrompt: '이 작업에는 저장된 프롬프트가 없습니다.',
    footer: (appName, domain, supportEmail) =>
      `이 메일은 ${domain} 의 ${appName} 에서 작업 완료 알림을 요청했기 때문에 발송되었습니다. 문의: ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': '텍스트 투 비디오',
      'image-to-video': '이미지 투 비디오',
      'reference-to-video': '레퍼런스 투 비디오',
    },
  },
  ar: {
    subject: (appName, firstName) =>
      `${firstName}، مهمتك في ${appName} جاهزة`,
    title: 'مهمتك جاهزة',
    greeting: (firstName) => `مرحبا ${firstName}،`,
    intro: (appName) =>
      `اكمل ${appName} عملية الرندر. افتح صفحة المهمة او نزّل اول نتيجة مباشرة من الزر بالاسفل.`,
    promptLabel: 'الوصف',
    workflowLabel: 'سير العمل',
    taskButton: 'افتح المهمة',
    downloadButton: 'نزّل اول نتيجة',
    activityButton: 'افتح سجل المهام',
    primaryDownloadHint: 'رابط تنزيل مباشر',
    noPrompt: 'لا يوجد وصف محفوظ لهذه المهمة.',
    footer: (appName, domain, supportEmail) =>
      `تم ارسال هذا البريد لانك طلبت من ${appName} اشعارك عند اكتمال المهمة على ${domain}. للاستفسار: ${supportEmail}.`,
    workflowLabels: {
      'text-to-video': 'نص إلى فيديو',
      'image-to-video': 'صورة إلى فيديو',
      'reference-to-video': 'مرجع إلى فيديو',
    },
  },
};

function getFirstName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return 'there';
  }

  return trimmed.split(/\s+/)[0] || trimmed;
}

function getCopy(locale?: string | null): CompletionCopy {
  const resolvedLocale = resolveAppLocale(locale) || 'en';

  return {
    locale: resolvedLocale,
    localeTag: getLocaleBcp47(resolvedLocale),
    dir: getLocaleDirection(resolvedLocale),
    ...COPY[resolvedLocale],
  };
}

function escapeHtml(value?: string | null) {
  return (value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function summarizePrompt(prompt?: string | null) {
  const trimmed = prompt?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.length > 320 ? `${trimmed.slice(0, 317)}...` : trimmed;
}

function resolveWorkflowLabel(copy: CompletionCopy, scene?: string | null) {
  return copy.workflowLabels[scene || ''] || scene || '-';
}

export function getAITaskCompletionEmailSubject(
  name: string,
  options: AITaskCompletionEmailOptions
) {
  const copy = getCopy(options.locale);
  return copy.subject(getAppName(), getFirstName(name));
}

export function getAITaskCompletionEmailHtml(
  name: string,
  options: AITaskCompletionEmailOptions
) {
  const copy = getCopy(options.locale);
  const appName = getAppName();
  const supportEmail = getSupportEmail();
  const workflowLabel = resolveWorkflowLabel(copy, options.scene);
  const prompt = summarizePrompt(options.prompt);

  return `<!doctype html>
<html lang="${copy.localeTag}" dir="${copy.dir}">
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:${FONT};color:#1c1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e7e5e4;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 16px;">
                <p style="margin:0 0 8px;font-size:14px;color:#78716c;">${escapeHtml(copy.greeting(getFirstName(name)))}</p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;">${escapeHtml(copy.title)}</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#44403c;">${escapeHtml(copy.intro(appName))}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e5e4;border-radius:14px;background:#fafaf9;">
                  <tr>
                    <td style="padding:18px 18px 14px;">
                      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.02em;text-transform:uppercase;color:#78716c;">${escapeHtml(copy.workflowLabel)}</p>
                      <p style="margin:0 0 14px;font-size:16px;font-weight:600;color:#1c1917;">${escapeHtml(workflowLabel)}</p>
                      <p style="margin:0 0 8px;font-size:12px;letter-spacing:.02em;text-transform:uppercase;color:#78716c;">${escapeHtml(copy.promptLabel)}</p>
                      <p style="margin:0;font-size:14px;line-height:1.7;color:#292524;">${escapeHtml(prompt || copy.noPrompt)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0;">
                  <tr>
                    <td style="padding:0 12px 12px 0;">
                      <a href="${escapeHtml(options.taskUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:600;">${escapeHtml(copy.taskButton)}</a>
                    </td>
                    ${
                      options.primaryDownloadUrl
                        ? `<td style="padding:0 0 12px;">
                      <a href="${escapeHtml(options.primaryDownloadUrl)}" style="display:inline-block;background:#f5f5f4;color:#1f2937;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:600;border:1px solid #d6d3d1;">${escapeHtml(copy.downloadButton)}</a>
                    </td>`
                        : ''
                    }
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 26px;">
                <p style="margin:0 0 8px;font-size:13px;color:#57534e;"><a href="${escapeHtml(options.activityUrl)}" style="color:#1c1917;">${escapeHtml(copy.activityButton)}</a></p>
                ${
                  options.primaryDownloadUrl
                    ? `<p style="margin:0;font-size:13px;color:#57534e;">${escapeHtml(copy.primaryDownloadHint)}: <a href="${escapeHtml(options.primaryDownloadUrl)}" style="color:#1c1917;">${escapeHtml(options.primaryDownloadUrl)}</a></p>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e7e5e4;background:#fafaf9;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">${escapeHtml(copy.footer(appName, getAppDomain(), supportEmail))}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getAITaskCompletionEmailText(
  name: string,
  options: AITaskCompletionEmailOptions
) {
  const copy = getCopy(options.locale);
  const appName = getAppName();
  const prompt = summarizePrompt(options.prompt);

  return [
    copy.greeting(getFirstName(name)),
    '',
    copy.intro(appName),
    '',
    `${copy.workflowLabel}: ${resolveWorkflowLabel(copy, options.scene)}`,
    `${copy.promptLabel}: ${prompt || copy.noPrompt}`,
    '',
    `${copy.taskButton}: ${options.taskUrl}`,
    options.primaryDownloadUrl
      ? `${copy.downloadButton}: ${options.primaryDownloadUrl}`
      : null,
    `${copy.activityButton}: ${options.activityUrl}`,
    '',
    copy.footer(appName, getAppDomain(), getSupportEmail()),
  ]
    .filter(Boolean)
    .join('\n');
}
