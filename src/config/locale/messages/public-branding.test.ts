import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { publicLocaleMessagesPaths, publicSiteLocales } from '@/config/locale';
import enAiImage from '@/config/locale/messages/en/ai/image.json';
import enAiVideo from '@/config/locale/messages/en/ai/video.json';
import enLanding from '@/config/locale/messages/en/landing.json';
import enPricing from '@/config/locale/messages/en/pricing.json';
import zhAiImage from '@/config/locale/messages/zh/ai/image.json';
import zhAiVideo from '@/config/locale/messages/zh/ai/video.json';
import zhLanding from '@/config/locale/messages/zh/landing.json';
import zhPricing from '@/config/locale/messages/zh/pricing.json';
import {
  getAppDomain,
  getInitialCreditsAmount,
  getSupportEmail,
  replaceBrandTokensDeep,
} from '@/shared/lib/brand';
import { getOrganizationSchema, getWebSiteSchema } from '@/shared/lib/schema';
import {
  SITE_BRAND_LOGO_PATH,
  SITE_BRAND_MARK_PATH,
} from '@/shared/lib/site-visuals';

function readLanding(locale: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'src/config/locale/messages',
        locale,
        'landing.json'
      ),
      'utf8'
    )
  );
}

function readLocaleMessage(locale: string, relativeFile: string) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'src/config/locale/messages',
        locale,
        relativeFile
      ),
      'utf8'
    )
  );
}

describe('public branding copy', () => {
  const liveLocaleMentionMatchers = {
    english: /English|Englisch|anglais|inglés|英語|inglese|영어|بالإنجليزية/i,
    chinese:
      /Chinese|Chinesisch|chinois|chino|中文|中国語|cinese|중국어|الصينية/i,
    german: /German|Deutsch|allemand|alemán|ドイツ語|tedesco|독일어|الألمانية/i,
    french:
      /French|Französisch|français|francés|フランス語|francese|프랑스어|الفرنسية/i,
    spanish:
      /Spanish|Spanisch|espagnol|español|スペイン語|spagnolo|스페인어|الإسبانية/i,
    japanese:
      /Japanese|Japanisch|japonais|japonés|日本語|giapponese|일본어|اليابانية/i,
    italian:
      /Italian|Italienisch|italien|italiano|イタリア語|이탈리아어|الإيطالية/i,
    korean: /Korean|Koreanisch|coréen|coreano|韓国語|한국어|الكورية/i,
    arabic: /Arabic|Arabisch|arabe|árabe|アラビア語|arabo|아랍어|العربية/i,
  } as const;

  it('keeps localized landing copy on mogged and mogged.games', () => {
    const appDomain = getAppDomain();
    const enCopy = replaceBrandTokensDeep(enLanding);
    const zhCopy = replaceBrandTokensDeep(zhLanding);

    const renderedEn = JSON.stringify(enCopy);
    const renderedZh = JSON.stringify(zhCopy);

    expect(renderedEn).toContain('mogged');
    expect(renderedEn).toContain(appDomain);
    expect(enCopy.hero.title).toBe('Mogged \u2014 The Ultimate 1v1 Face Rating Arena');
    expect(enCopy.hero.description).toBe(
      'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?'
    );
    expect(
      enCopy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['Home', '/'],
      ['Leaderboard', '/leaderboard'],
      ['Pricing', '/pricing'],
    ]);
    expect(enCopy.hero.tip).toContain(
      'jump into 1v1 face rating battles'
    );
    expect(enCopy.hero.tip).not.toContain('Seedance');

    expect(renderedZh).toContain('mogged');
    expect(renderedZh).toContain(appDomain);
    expect(zhCopy.hero.title).toBe('Mogged \u2014 The Ultimate 1v1 Face Rating Arena');
    expect(zhCopy.hero.description).toBe(
      'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?'
    );
    expect(
      zhCopy.header.nav.items.map((item) => [item.title, item.url || ''])
    ).toEqual([
      ['Home', '/'],
      ['Leaderboard', '/leaderboard'],
      ['Pricing', '/pricing'],
    ]);
    expect(zhCopy.hero.tip).toContain(
      'jump into 1v1 face rating battles'
    );
    expect(zhCopy.hero.tip).not.toContain('Seedance');
  });

  it('keeps the public locale switcher available on the English landing page', () => {
    const englishLanding = readLanding('en');

    expect(englishLanding.header.show_locale).toBe(true);
    expect(Object.keys(liveLocaleMentionMatchers)).toHaveLength(
      publicSiteLocales.length
    );
  });

  it('keeps live locale hero copy aligned with the supported image workflows', () => {
    const expectations = {
      de: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      fr: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      es: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      ja: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      it: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      ko: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
      ar: {
        description:
          'Get rated by AI in real-time 1v1 mog battles. Climb the leaderboard from Molecule to Slayer. Do you mog or get mogged?',
        tip: 'jump into 1v1 face rating battles',
      },
    } as const;

    const localizedPublicSiteLocales = publicSiteLocales.filter(
      (
        locale
      ): locale is Exclude<(typeof publicSiteLocales)[number], 'en' | 'zh'> =>
        !['en', 'zh'].includes(locale)
    );

    for (const locale of localizedPublicSiteLocales) {
      const copy = replaceBrandTokensDeep(readLanding(locale));
      expect(copy.hero.description).toBe(expectations[locale].description);
      expect(copy.hero.tip).toContain(expectations[locale].tip);
    }
  });

  it('keeps every public locale navigation aligned with mog battle arena ownership', () => {
    for (const locale of publicSiteLocales) {
      const copy = replaceBrandTokensDeep(readLanding(locale));
      const navItems = copy.header.nav.items.map(
        (item: { title: string; url?: string }) => [item.title, item.url || '']
      );

      expect(navItems[0], `${locale}:home-nav`).toEqual([
        'Home',
        '/',
      ]);
      expect(navItems[1], `${locale}:leaderboard-nav`).toEqual([
        'Leaderboard',
        '/leaderboard',
      ]);
      expect(navItems).toHaveLength(3);
    }
  });

  it('keeps pricing copy centered on mogged without old domain residue', () => {
    const appDomain = getAppDomain();
    const enCopy = replaceBrandTokensDeep(enPricing);
    const zhCopy = replaceBrandTokensDeep(zhPricing);

    for (const pricing of [enPricing, zhPricing]) {
      const copy = replaceBrandTokensDeep(pricing);
      const rendered = JSON.stringify(copy);

      expect(rendered).toContain('mogged');
      expect(rendered).toContain(appDomain);
      expect(rendered).not.toContain('Luma');
      expect(copy.seo_sections.schema.webpage_name).toContain(
        'mogged'
      );
    }

    expect(enCopy.metadata.title).toBe(
      'mogged Pricing | AI Image Credits, Plans, Billing'
    );
    expect(enCopy.metadata.description).toBe(
      `Compare mogged pricing, image credits, plans, and billing for image generation, image editing, and team delivery on ${appDomain}.`
    );
    expect(enCopy.seo_sections.schema.webpage_description).toBe(
      `AI image pricing, credits, plans, subscriptions, and billing rules for mogged on ${appDomain}.`
    );

    expect(zhCopy.metadata.title).toBe(
      'mogged 定价｜AI 图片积分、套餐与计费'
    );
    expect(zhCopy.metadata.description).toBe(
      `对比 ${appDomain} 上 mogged 的价格、AI 图片积分、套餐和计费规则，选择适合图片生成、图片编辑和团队交付的方案。`
    );
    expect(zhCopy.seo_sections.schema.webpage_description).toBe(
      `${appDomain} 上 mogged 的 AI 图片价格、积分、套餐、订阅和计费规则说明。`
    );
  });

  it('keeps pricing FAQ copy aligned with the public image workflows', () => {
    const copy = replaceBrandTokensDeep(enPricing);

    expect(JSON.stringify(copy.faq.categories[1].items[1] ?? {})).not.toContain(
      'image and video modes'
    );
    expect(copy.faq.categories[1].items[1]?.answer).toContain('text-to-image');
    expect(copy.faq.categories[1].items[1]?.answer).toContain('image-to-image');
    expect(copy.faq.categories[1].items[1]?.answer).not.toContain('-to-video');
  });

  it('keeps pricing workflow answers aligned in every live public locale', () => {
    for (const locale of publicSiteLocales) {
      const copy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'pricing.json')
      ) as typeof enPricing;
      const workflowItem = copy.faq.categories[1].items[1];

      expect(workflowItem?.answer).not.toContain('-to-video');
    }
  });

  it('explains credit expiry and delayed failed-task refunds in every live public locale', () => {
    const expectations = {
      en: {
        question:
          'When do credits expire, and what happens if a failed task is refunded after that window?',
        answer:
          'Credit expiry depends on the source: paid plan credits follow the validity shown on the plan, while free signup or daily claim credits can use shorter reward windows. If a task fails, we restore usable credits, and when the original credits had an expiry window the refund keeps the remaining validity that was left when those credits were spent.',
      },
      zh: {
        question:
          '积分什么时候过期？如果失败任务在那个期限之后才退款，会怎样处理？',
        answer:
          '积分的过期时间取决于来源：付费套餐积分按套餐展示的有效期执行，注册送积分或每日领取奖励积分可能采用更短的奖励有效期。任务失败后我们会退回可用积分；如果原积分有有效期，退款会保留这笔积分在实际扣费时还剩下的有效时长。',
      },
      de: {
        question:
          'Wann verfallen Credits, und was passiert, wenn eine fehlgeschlagene Aufgabe erst nach diesem Zeitraum erstattet wird?',
        answer:
          'Der Ablauf hängt von der Quelle ab: Credits aus bezahlten Plänen folgen der beim Plan angegebenen Gültigkeit, während kostenlose Startguthaben oder tägliche Bonus-Credits kürzere Aktionsfenster haben können. Wenn eine Aufgabe fehlschlägt, stellen wir nutzbare Credits wieder her; hatten die ursprünglichen Credits ein Ablaufdatum, behält die Erstattung genau die Restgültigkeit, die zum Zeitpunkt des Verbrauchs noch übrig war.',
      },
      fr: {
        question:
          'Quand les crédits expirent-ils, et que se passe-t-il si une tâche échouée est remboursée après ce délai ?',
        answer:
          "L'expiration dépend de la source : les crédits d'un plan payant suivent la durée affichée sur le plan, tandis que les crédits gratuits d'inscription ou de bonus quotidien peuvent avoir une durée plus courte. Si une tâche échoue, nous recréditons un solde utilisable ; lorsque les crédits d'origine avaient une date d'expiration, le remboursement conserve la durée restante qu'il leur restait au moment où ils ont été dépensés.",
      },
      es: {
        question:
          '¿Cuándo vencen los créditos y qué pasa si una tarea fallida se reembolsa después de ese plazo?',
        answer:
          'El vencimiento depende del origen: los créditos de planes de pago siguen la vigencia mostrada en el plan, mientras que los créditos gratis de registro o de bonus diario pueden tener ventanas más cortas. Si una tarea falla, restauramos créditos utilizables; cuando los créditos originales tenían vencimiento, el reembolso conserva el tiempo de vigencia que aún quedaba en el momento en que se gastaron.',
      },
      ja: {
        question:
          'クレジットはいつ失効し、その期限を過ぎてから失敗タスクが返金された場合はどうなりますか？',
        answer:
          '失効タイミングは付与元で変わり、購入したプランのクレジットはプラン表示の有効期間に従い、無料登録特典やデイリー受け取り分はより短い期限になることがあります。タスクが失敗した場合は使えるクレジットを戻し、元のクレジットに有効期限があったときは、そのクレジットを消費した時点で残っていた有効時間を引き継いで返金します。',
      },
      it: {
        question:
          'Quando scadono i crediti e cosa succede se un task fallito viene rimborsato dopo quella finestra?',
        answer:
          'La scadenza dipende dalla fonte: i crediti dei piani a pagamento seguono la validità mostrata nel piano, mentre i crediti gratuiti di benvenuto o del bonus giornaliero possono avere finestre più corte. Se un task fallisce, ripristiniamo crediti utilizzabili; quando i crediti originali avevano una scadenza, il rimborso conserva il tempo di validità che restava nel momento in cui quei crediti sono stati spesi.',
      },
      ko: {
        question:
          '크레딧은 언제 만료되고, 그 기간이 지난 뒤 실패한 작업이 환불되면 어떻게 되나요?',
        answer:
          '만료 시점은 출처에 따라 달라서, 유료 플랜 크레딧은 플랜에 표시된 유효기간을 따르고 무료 가입 크레딧이나 일일 보상 크레딧은 더 짧은 보상 기간을 가질 수 있습니다. 작업이 실패하면 다시 쓸 수 있는 크레딧을 복구하며, 원래 크레딧에 만료 기한이 있었다면 환불 시점에는 그 크레딧을 사용했을 때 남아 있던 유효기간만 그대로 이어집니다.',
      },
      ar: {
        question:
          'متى تنتهي صلاحية الأرصدة، وماذا يحدث إذا تم رد مهمة فاشلة بعد تلك المدة؟',
        answer:
          'يعتمد انتهاء الصلاحية على المصدر: فأرصدة الخطط المدفوعة تتبع مدة الصلاحية المعروضة في الخطة، بينما قد تكون لأرصدة التسجيل المجانية أو مكافآت المطالبة اليومية مدد أقصر. إذا فشلت مهمة ما فنحن نعيد أرصدة قابلة للاستخدام، وإذا كانت الأرصدة الأصلية لها مدة انتهاء فإن الرصيد المسترد يحتفظ بالمدة المتبقية التي كانت قائمة عند لحظة إنفاق تلك الأرصدة.',
      },
    } as const;

    for (const locale of publicSiteLocales) {
      const copy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'pricing.json')
      ) as typeof enPricing;
      const expiryItem = copy.faq.categories[1].items[2];

      expect(expiryItem?.question).toBe(expectations[locale].question);
      expect(expiryItem?.answer).toBe(expectations[locale].answer);
      expect(
        expiryItem?.answer,
        `${locale}:pricing-expiry-answer`
      ).not.toContain('-to-video');
    }
  });

  it('keeps pricing page and shared modal copy image-first without video mentions', () => {
    const bannedVideoTerms =
      /video|vídeo|vidéo|動画|비디오|فيديو|视频|videoprojekte|videotools/i;

    for (const locale of publicSiteLocales) {
      const pricingCopy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'pricing.json')
      );
      const commonCopy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'common.json')
      ) as {
        payment: Record<string, unknown>;
        sign: Record<string, unknown>;
      };

      expect(JSON.stringify(pricingCopy), `${locale}:pricing.json`).not.toMatch(
        bannedVideoTerms
      );
      expect(
        JSON.stringify(commonCopy.sign),
        `${locale}:common.sign`
      ).not.toMatch(bannedVideoTerms);
      expect(
        JSON.stringify(commonCopy.payment),
        `${locale}:common.payment`
      ).not.toMatch(bannedVideoTerms);
    }
  });

  it('uses the updated pricing header copy in both locales', () => {
    const enCopy = replaceBrandTokensDeep(enPricing);
    const zhCopy = replaceBrandTokensDeep(zhPricing);
    const initialCreditsAmount = getInitialCreditsAmount();

    expect(enCopy.pricing.title).toBe('mogged Pricing');
    expect(enCopy.pricing.description).toContain(
      `${initialCreditsAmount} credits`
    );
    expect(enCopy.metadata.description).toContain('pricing');

    expect(zhCopy.pricing.title).toBe('mogged 定价');
    expect(zhCopy.pricing.description).toContain(
      `${initialCreditsAmount} 积分`
    );
    expect(zhCopy.metadata.description).toContain('价格');
    expect(enCopy.page.metric_cost_per_100_credits).toBe(
      'Cost per 100 credits'
    );
    expect(enCopy.page.snapshot_credit_cost).not.toContain('{{credits}}');
    expect(zhCopy.page.metric_cost_per_100_credits).toBe('每 100 积分成本');
    expect(zhCopy.page.snapshot_credit_cost).not.toContain('{{credits}}');
  });

  it('keeps pricing refund promises aligned with the refund policy', () => {
    const bannedRefundGuaranteeTerms =
      /7-day|7 days|7\s*天|7\s*日|7-Tage|7 jours|7 días|7日間|7일|7 أيام|money-back guarantee|退款保障|Geld-zurück-Garantie|garantie de remboursement|garantía de reembolso|返金保証|환불 보장|ضمان استرداد/i;

    for (const locale of publicSiteLocales) {
      const copy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'pricing.json')
      ) as typeof enPricing;
      const rendered = JSON.stringify(copy);

      expect(rendered, `${locale}:pricing.json`).not.toMatch(
        bannedRefundGuaranteeTerms
      );
      expect(copy.pricing.description, `${locale}:pricing.description`).toMatch(
        /refund|退款|Rückerstattung|remboursement|reembolso|rimborso|rimborsi|返金|환불|استرداد/i
      );
    }
  });

  it('keeps AI video generator copy centered on its generator keyword without Seedance spillover', () => {
    for (const aiVideo of [enAiVideo, zhAiVideo]) {
      const copy = replaceBrandTokensDeep(aiVideo);
      const rendered = JSON.stringify(copy);

      expect(rendered).toContain('mogged');
      expect(rendered).toContain('AI');
      expect(rendered).not.toMatch(/volcengine|kie/i);
      expect(copy.metadata.title).not.toMatch(/seedance/i);
      expect(copy.metadata.description).not.toMatch(/seedance/i);
    }

    const enCopy = replaceBrandTokensDeep(enAiVideo);
    const zhCopy = replaceBrandTokensDeep(zhAiVideo);

    expect(enCopy.metadata.title).toBe(
      'AI Video Generator | Text, Image & Ref - mogged'
    );
    expect(enCopy.page.title).toBe('AI Video Generator Workspace');
    expect(enCopy.generator.title).toBe('AI Video Generator Workspace');
    expect(enCopy.metadata.description).toBe(
      `Generate AI videos with mogged using text-to-video, image-to-video, and reference-to-video workflows for concept drafts and shot control.`
    );
    expect(zhCopy.page.title).toBe('AI 视频生成器工作台');
    expect(zhCopy.generator.title).toBe('AI 视频生成器工作台');
    expect(zhCopy.metadata.description).toBe(
      `在 ${getAppDomain()} 使用 mogged，通过文生视频、图生视频和参考生视频工作流生成概念草稿并控制镜头。`
    );
  });

  it('keeps AI image generator copy centered on mogged without video-route spillover', () => {
    for (const aiImage of [enAiImage, zhAiImage]) {
      const copy = replaceBrandTokensDeep(aiImage);
      const rendered = JSON.stringify(copy);

      expect(rendered).toContain('mogged');
      expect(rendered).not.toMatch(/seedance/i);
      expect(rendered).not.toContain('reference-to-video');
    }

    const enCopy = replaceBrandTokensDeep(enAiImage);
    const zhCopy = replaceBrandTokensDeep(zhAiImage);

    expect(enCopy.metadata.description).toContain('text-to-image');
    expect(enCopy.metadata.description).toContain('image-to-image');
    expect(enCopy.metadata.title).toBe(
      'AI Image Generator | mogged Online Workspace'
    );
    expect(enCopy.page.title).toBe('AI Image Generator Free Online');
    expect(enCopy.generator.title).toBe('AI Image Generator Free Online');
    expect(enCopy.metadata.keywords).toContain('ai image generator');
    expect(enCopy.metadata.keywords).toContain('ai image generator');
    expect(enCopy.metadata.keywords).toContain('ai image editor');
    expect(enCopy.metadata.description).not.toContain('reference-to-video');

    expect(zhCopy.metadata.description).toContain('文生图');
    expect(zhCopy.metadata.description).toContain('图生图');
    expect(zhCopy.metadata.title).toBe(
      'AI 图片生成器｜mogged 在线图片工作台'
    );
    expect(zhCopy.page.title).toBe('免费在线 AI 图片生成器');
    expect(zhCopy.metadata.description).not.toContain('参考生视频');
  });

  it('keeps crawlable certificate copy centered on mogged', () => {
    for (const locale of publicSiteLocales) {
      const certificateCopy = JSON.stringify(
        readLocaleMessage(locale, 'certificate.json')
      );

      expect(certificateCopy).toContain('mogged');
    }
  });

  it('keeps core public seo copy driven by brand tokens instead of hardcoded domains', () => {
    const localizedLandingRaw = publicSiteLocales.map((locale) =>
      readLocaleMessage(locale, 'landing.json')
    );
    const rawGeneratorCopies = [enAiVideo, zhAiVideo];

    for (const copy of localizedLandingRaw) {
      const raw = JSON.stringify(copy);

      expect(raw).toContain('{{app_domain}}');
      expect(raw).toContain('mogged.games');
    }

    for (const copy of rawGeneratorCopies) {
      const raw = JSON.stringify(copy);

      expect(raw).not.toContain('mogged.games');
      expect(raw).toContain('{{app_domain}}');
    }
  });

  it('keeps generator metadata descriptions descriptive enough for public search snippets', () => {
    const enCopy = replaceBrandTokensDeep(enAiVideo);
    const zhCopy = replaceBrandTokensDeep(zhAiVideo);

    expect(enCopy.metadata.description.length).toBeGreaterThanOrEqual(120);
    expect(enCopy.metadata.description).toContain('text-to-video');
    expect(enCopy.metadata.description).toContain('reference-to-video');

    expect(zhCopy.metadata.description).toContain('文生视频');
    expect(zhCopy.metadata.description).toContain('参考生视频');
    expect(zhCopy.metadata.description).toContain(getAppDomain());
  });

  it('keeps homepage and tool metadata within practical title and description ranges', () => {
    const enLandingCopy = replaceBrandTokensDeep(enLanding);
    const zhLandingCopy = replaceBrandTokensDeep(zhLanding);

    expect(enLandingCopy.metadata.description.length).toBeLessThanOrEqual(170);
    expect(
      enLandingCopy.free_tools.image_converter.metadata.title.length
    ).toBeLessThanOrEqual(60);
    expect(
      enLandingCopy.free_tools.image_compressor.metadata.title.length
    ).toBeLessThanOrEqual(60);
    expect(
      enLandingCopy.free_tools.video_converter.metadata.title.length
    ).toBeLessThanOrEqual(60);
    expect(
      enLandingCopy.free_tools.video_thumbnail.metadata.title.length
    ).toBeLessThanOrEqual(60);
    expect(enLandingCopy.free_tools.image_converter.metadata.title).toBe(
      'Free Image Converter | PNG, JPG, WEBP - mogged'
    );
    expect(enLandingCopy.free_tools.image_compressor.metadata.title).toBe(
      'Free Image Compressor | Reduce Image Size - mogged'
    );
    expect(enLandingCopy.free_tools.video_converter.metadata.title).toBe(
      'Free Video Converter | MP4, WEBM, MOV - mogged'
    );
    expect(enLandingCopy.free_tools.video_to_gif.metadata.title).toBe(
      'Free Video to GIF Converter Online | mogged'
    );
    expect(enLandingCopy.free_tools.video_thumbnail.metadata.title).toBe(
      'Free Video Thumbnail Maker | Frame Capture - mogged'
    );
    expect(enLandingCopy.free_tools.image_converter.title).toBe(
      'Free Image Converter'
    );
    expect(enLandingCopy.free_tools.video_converter.title).toBe(
      'Free Video Converter'
    );
    expect(zhLandingCopy.free_tools.image_converter.title).toBe(
      'Free Image Converter'
    );
    expect(zhLandingCopy.free_tools.video_thumbnail.title).toBe(
      'Free Video Thumbnail Maker'
    );
    expect(zhLandingCopy.metadata.description).toContain('1v1 face rating');
  });

  it('keeps yearly savings messaging aligned between the landing banner and pricing toggle', () => {
    const enLandingCopy = replaceBrandTokensDeep(enLanding);
    const zhLandingCopy = replaceBrandTokensDeep(zhLanding);
    const enPricingCopy = replaceBrandTokensDeep(enPricing);
    const zhPricingCopy = replaceBrandTokensDeep(zhPricing);

    const enYearlyGroup = enPricingCopy.pricing.groups.find(
      (group: { name?: string }) => group.name === 'yearly'
    );
    const zhYearlyGroup = zhPricingCopy.pricing.groups.find(
      (group: { name?: string }) => group.name === 'yearly'
    );

    expect(enLandingCopy.promo_banner.highlight).toContain('Join the Arena');
    expect(enLandingCopy.promo_banner.mobile_highlight).toContain(
      'Join the Arena'
    );
    expect(enYearlyGroup?.label).toContain('41%');
    expect(enLandingCopy.promo_banner.highlight).not.toContain('50%');

    expect(zhLandingCopy.promo_banner.highlight).toContain('Join the Arena');
    expect(zhLandingCopy.promo_banner.mobile_highlight).toContain(
      'Join the Arena'
    );
    expect(zhYearlyGroup?.label).toContain('41%');
    expect(zhLandingCopy.promo_banner.mobile_highlight).not.toContain('5 折');
  });

  it('does not show expired April 30 launch dates in public promo copy', () => {
    const expiredApril30 =
      /Apr 30|April 30|30 Apr|30 avr|30 de abr|30 abr|4月30日|4월 30일|30 أبريل/i;

    for (const locale of publicSiteLocales) {
      const landingCopy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'landing.json')
      );

      expect(
        JSON.stringify(landingCopy.promo_banner),
        `${locale}:landing.promo_banner`
      ).not.toMatch(expiredApril30);
    }
  });

  it('keeps the public footer focused on mogged arena and about links', () => {
    const arenaUrls = ['/', '/leaderboard', '/pricing'];
    const toolUrls = [
      '/free-tools/image-converter',
      '/free-tools/image-compressor',
      '/free-tools/video-converter',
      '/free-tools/video-to-gif',
    ];

    for (const locale of publicSiteLocales) {
      const copy = replaceBrandTokensDeep(
        readLocaleMessage(locale, 'landing.json')
      );
      const footer = copy.footer;
      const arenaSection = footer.nav.items[0];
      const toolsSection = footer.nav.items[1];
      const aboutSection = footer.nav.items[2];
      const arenaLinks = arenaSection.children.map(
        (item: { url?: string }) => item.url
      );
      const toolLinks = toolsSection.children.map(
        (item: { url?: string }) => item.url
      );
      const aboutUrls = aboutSection.children.map(
        (item: { url?: string }) => item.url
      );
      const footerText = JSON.stringify(footer);

      expect(arenaLinks, `${locale}:footer.arena`).toEqual(arenaUrls);
      expect(toolLinks, `${locale}:footer.tools`).toEqual(toolUrls);
      expect(footerText, `${locale}:footer.noWorkspace`).not.toContain(
        'Workspace'
      );
      expect(footerText, `${locale}:footer.noImageGenerator`).not.toContain(
        '/ai-image-generator'
      );
      expect(aboutSection.title, `${locale}:footer.about.title`).toBe('About');
      expect(aboutSection.children[0].title, `${locale}:footer.about.link`).toBe(
        'Our Mission'
      );
      expect(aboutUrls, `${locale}:footer.about`).toEqual([
        '/mission',
        `mailto:${getSupportEmail()}`,
      ]);
    }
  });

  it('keeps default schema descriptions aligned with the public brand', () => {
    const organization = JSON.stringify(getOrganizationSchema());
    const website = JSON.stringify(getWebSiteSchema());

    expect(organization).toContain('mogged');
    expect(organization).toContain(SITE_BRAND_LOGO_PATH);
    expect(organization).not.toContain('/opengraph-image');
    expect(website).toContain('mogged');
  });

  it('keeps locale brand blocks sourced from the shared visual asset token', () => {
    for (const locale of publicSiteLocales) {
      const landing = readLanding(locale);
      const adminSidebar = readLocaleMessage(locale, 'admin/sidebar.json');

      expect(landing.header.brand.logo.src).toBe('{{brand_mark_src}}');
      expect(landing.footer.brand.logo.src).toBe('{{brand_mark_src}}');
      expect(adminSidebar.header.brand.logo.src).toBe('{{brand_mark_src}}');

      const renderedLanding = replaceBrandTokensDeep(landing);
      const renderedAdminSidebar = replaceBrandTokensDeep(adminSidebar);

      expect(renderedLanding.header.brand.logo.src).toBe(SITE_BRAND_MARK_PATH);
      expect(renderedLanding.footer.brand.logo.src).toBe(SITE_BRAND_MARK_PATH);
      expect(renderedAdminSidebar.header.brand.logo.src).toBe(
        SITE_BRAND_MARK_PATH
      );
    }
  });

  it('does not expose the retired public ai/image locale namespace in public message bundles', () => {
    expect(publicLocaleMessagesPaths).not.toContain('ai/image');
  });

  it('keeps package keywords centered on the mog battle product boundary', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      keywords?: string[];
    };

    expect(packageJson.keywords).toEqual(expect.any(Array));
    expect(packageJson.keywords).toContain('mogged');
    expect(packageJson.keywords).toContain('mog battle');
    expect(packageJson.keywords).toContain('face rating game');
    expect(packageJson.keywords).toContain('ELO ranking');
    expect(packageJson.keywords).not.toContain('AI video workflow');
  });
});
