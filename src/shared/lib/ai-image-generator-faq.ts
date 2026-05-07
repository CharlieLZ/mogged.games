import type { FAQ as LandingFAQ } from '@/shared/types/blocks/landing';

export type ImageGeneratorFaqLocale =
  | 'en'
  | 'zh'
  | 'de'
  | 'fr'
  | 'es'
  | 'ja'
  | 'it'
  | 'ko'
  | 'ar';

export const ROOT_IMAGE_GENERATOR_FAQ_COPY: Record<
  ImageGeneratorFaqLocale,
  LandingFAQ
> = {
  en: {
    id: 'faq',
    label: 'FAQ',
    title: 'AI Image Generator — Frequently Asked Questions',
    description:
      'Everything about the hosted mogged image generator, KIE model routing, GPT Image 2, Nano Banana Pro, credits, privacy, and image-to-image workflows.',
    categories: [
      {
        title: 'Getting Started',
        items: [
          {
            question: 'What is an AI image generator?',
            answer:
              'An AI image generator turns text prompts, and sometimes a source image, into new images. mogged keeps that workflow in one hosted workspace for text-to-image creation and image-to-image editing.',
          },
          {
            question: 'What is the best free AI image generator online?',
            answer:
              'mogged is built as a practical free-start AI image generator for creators who want prompt generation, source-image refinement, model choice, and clean downloads in one browser workspace.',
          },
          {
            question:
              'Is this AI image generator really free, with no sign up?',
            answer:
              'Guest generation can be available before sign-in when the daily guest quota is open. Signing in unlocks account credits, saved task history, daily credit claims, and upgrade options.',
          },
          {
            question: 'Which image workflows are public right now?',
            answer:
              'One public workspace supports two modes: text-to-image for new concepts and image-to-image for guided edits from a source image.',
          },
          {
            question: 'How can I generate AI images from text prompts?',
            answer:
              'Open the text-to-image tab, write a clear prompt, choose a model and output settings, then generate. Refine lighting, camera angle, subject details, and composition when you want a tighter result.',
          },
          {
            question: 'Can I use image-to-image with a reference?',
            answer:
              'Yes. Use image-to-image when you have a source image or public direct image URL and want the prompt to guide edits, variations, or refinements from that reference.',
          },
          {
            question: 'Do I need design skills to use the AI image generator?',
            answer:
              'No. You can start with plain language. More specific prompts help, but the workspace is designed so beginners can generate images without design software expertise.',
          },
        ],
      },
      {
        title: 'Models, Output, and Control',
        items: [
          {
            question: 'Which upstream model powers the current image route?',
            answer:
              'The current hosted image route uses KIE model routing, with text-to-image and image-to-image optimized separately for prompt-led generation and source-image refinement.',
          },
          {
            question: 'Which AI image generator models are available?',
            answer:
              'The current KIE model routing exposes a model picker with Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5, and SeeDream 5.0 Lite. Availability and credit cost can vary by model and resolution.',
          },
          {
            question: 'Does the AI image generator include GPT Image 2?',
            answer:
              'Yes. The model selector includes GPT Image 2, which many users search for as ChatGPT Image 2. The route is available alongside Nano Banana and SeeDream options.',
          },
          {
            question: 'How long does the AI image generator take?',
            answer:
              'Most tasks are queued and refreshed automatically. Actual time depends on model load, resolution, provider queue health, and whether you are generating from text or refining a source image.',
          },
          {
            question: 'What aspect ratios are supported?',
            answer:
              'The workspace supports common ratios including 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5, and 21:9.',
          },
          {
            question: 'What resolution does the AI image generator output?',
            answer:
              'Current image routes expose 1K, 2K, and 4K output choices when supported by the selected model.',
          },
          {
            question: 'Can this AI image generator create realistic images?',
            answer:
              'Yes. Choose a model that fits realism, then describe lighting, lens feel, material texture, environment, and composition to steer toward photorealistic results.',
          },
          {
            question:
              'What image styles can I create with the AI image generator?',
            answer:
              'You can prompt for realism, anime, 3D art, product renders, editorial concepts, social visuals, packaging directions, and other visual styles supported by the selected model.',
          },
          {
            question: 'Can I control the style of AI generated images?',
            answer:
              'Yes. Style control comes from the model choice, prompt wording, aspect ratio, resolution, and image-to-image reference. Specific art direction usually works better than generic style words.',
          },
          {
            question:
              'How consistent are AI generated images across multiple prompts?',
            answer:
              'Consistency improves when you reuse a stable prompt structure, repeat subject details, keep the same model and aspect ratio, and use image-to-image references for visual continuity.',
          },
          {
            question:
              'Can AI generate product images, logos, or visual designs?',
            answer:
              'Yes. mogged can draft product visuals, mockups, logos, and design assets. Review trademark, brand, and production requirements before using logo or commercial design work publicly.',
          },
          {
            question: 'How does the AI image generator work?',
            answer:
              'The workspace validates your prompt and image inputs, sends the task to the selected KIE-routed model, polls for completion, then returns downloadable image results in the browser.',
          },
        ],
      },
      {
        title: 'Credits, Rights, and Privacy',
        items: [
          {
            question:
              'Are images created with the free AI image generator watermark-free?',
            answer:
              'mogged does not add a visible platform watermark to generated images, so downloads are ready for normal creative review and publishing workflows.',
          },
          {
            question: 'Can I use AI generated images for commercial purposes?',
            answer:
              'Commercial use depends on your plan, the selected model terms, your prompt or reference rights, and local law. For business use, review the terms before publishing or selling outputs.',
          },
          {
            question:
              'Who owns the copyright of images generated by the AI image generator?',
            answer:
              'Rights can vary by plan, provider terms, source material, and region. Treat outputs as yours to use only when your inputs and the applicable terms allow that use.',
          },
          {
            question: 'How do credits work?',
            answer:
              'Each task shows a credit cost before generation. Costs are tied to the selected model and, for some models, the output resolution. Guest quota and account credits are tracked separately.',
          },
          {
            question:
              'Do I get free credits every day to create AI generated images?',
            answer:
              'Signed-in users can claim the daily credit bonus when it is available. The live account UI is the source of truth for the current daily amount and refresh status.',
          },
          {
            question: 'Is my data safe when using the AI image generator?',
            answer:
              'Prompts and uploaded references are processed for the generation task and sent only to the services needed to produce results. Private creations are not turned into public gallery content by default.',
          },
          {
            question: 'Do you store my uploaded references?',
            answer:
              'Uploaded references are handled for the task and may appear in your task context or local guest history. Download important outputs and avoid uploading private material you are not allowed to process.',
          },
        ],
      },
      {
        title: 'Editing, Regeneration, and Upgrades',
        items: [
          {
            question: 'Can I edit images created by the AI image generator?',
            answer:
              'Yes. Use image-to-image with a generated image or source URL, then describe the change you want. Prompt-led edits are the cleanest path for restyling, replacement, and refinement.',
          },
          {
            question: 'Can I regenerate with a refined prompt?',
            answer:
              'Absolutely. Edit the prompt and generate again. Small changes to lighting, composition, subject detail, or adjectives can produce very different results.',
          },
          {
            question: 'What if I don’t like the result?',
            answer:
              'Change one variable at a time: tighten the prompt, switch model, adjust aspect ratio or resolution, or move to image-to-image with the closest result as a reference.',
          },
          {
            question: 'Does the AI image generator work on mobile?',
            answer:
              'Yes. The hosted workspace is responsive, so you can write prompts, upload source images, review results, and download outputs from modern mobile browsers.',
          },
          {
            question: 'How do I upgrade to Pro?',
            answer:
              'Use the pricing or upgrade entry in the workspace when you need more credits, premium model access, or a larger production workflow.',
          },
        ],
      },
    ],
  },
  zh: {
    id: 'faq',
    label: 'FAQ',
    title: 'AI 图片生成器常见问题',
    description:
      '围绕 mogged 托管式图片生成器、KIE 路由、GPT Image 2、Nano Banana Pro、积分、隐私和图生图工作流的常见问题。',
    categories: [
      {
        title: '开始使用',
        items: [
          {
            question: '什么是 AI 图片生成器？',
            answer:
              'AI 图片生成器会把文字提示词，有时也包括源图，转成新的图片。mogged 把文生图和图生图放在同一个托管工作台里。',
          },
          {
            question: '网上最好用的免费 AI 图片生成器是什么？',
            answer:
              'mogged 面向想快速起图、用源图细修、选择不同模型并下载干净结果的创作者，提供一个可免费起步的浏览器图片生成工作台。',
          },
          {
            question: '这个 AI 图片生成器真的可以不登录免费试用吗？',
            answer:
              '当访客每日额度开放时，可以先不登录试用。登录后会解锁账号积分、任务历史、每日积分领取和升级入口。',
          },
          {
            question: '当前公开图片工作台开放了哪些模式？',
            answer:
              '现在只有一个公开工作台，里面包含两个模式：文生图负责从零起稿，图生图负责围绕原图做定向修改。',
          },
          {
            question: '怎么用文字提示词生成 AI 图片？',
            answer:
              '打开文生图标签，写清楚提示词，选择模型和输出设置，然后生成。想让结果更稳，可以继续细化光线、角度、主体细节和构图。',
          },
          {
            question: '图生图可以使用参考图吗？',
            answer:
              '可以。你有源图或公开直链图片 URL 时，用图生图更合适，提示词会围绕参考图做修改、变体或细化。',
          },
          {
            question: '使用 AI 图片生成器需要设计基础吗？',
            answer:
              '不需要。普通语言就能开始。提示词越具体越好，但这个工作台本来就是给没有专业设计软件经验的人用的。',
          },
        ],
      },
      {
        title: '模型、输出和控制',
        items: [
          {
            question: '当前图片链路底层接的是哪类模型？',
            answer:
              '当前托管图片链路走 KIE 路由，文生图和图生图会按各自任务类型分别优化，用来承接提示词生成和基于原图的细化增强。',
          },
          {
            question: '现在有哪些 AI 图片生成模型？',
            answer:
              '当前模型选择器包含 Nano Banana、Nano Banana 2、GPT Image 2、Nano Banana Pro、SeeDream 4.0、SeeDream 4.5 和 SeeDream 5.0 Lite。具体可用性和积分成本会随模型、分辨率变化。',
          },
          {
            question: 'AI 图片生成器包含 GPT Image 2 吗？',
            answer:
              '包含。模型选择器里有 GPT Image 2，很多用户也会把它搜成 ChatGPT Image 2。它和 Nano Banana、SeeDream 系列一起提供。',
          },
          {
            question: 'AI 图片生成通常要多久？',
            answer:
              '任务会进入队列并自动刷新。实际时间取决于模型负载、分辨率、上游队列状态，以及你是文生图还是基于源图细修。',
          },
          {
            question: '支持哪些图片比例？',
            answer:
              '工作台支持常用比例，包括 1:1、4:3、3:4、16:9、9:16、3:2、2:3、5:4、4:5 和 21:9。',
          },
          {
            question: 'AI 图片生成器输出什么分辨率？',
            answer: '当前图片链路在所选模型支持时提供 1K、2K 和 4K 输出选项。',
          },
          {
            question: '这个 AI 图片生成器能生成真实感图片吗？',
            answer:
              '可以。选择适合真实感的模型，并在提示词里写清光线、镜头感、材质、环境和构图，会更容易得到写实结果。',
          },
          {
            question: 'AI 图片生成器可以做哪些风格？',
            answer:
              '可以提示写实、动漫、3D 艺术、产品渲染、编辑类概念图、社媒视觉、包装方向等所选模型支持的风格。',
          },
          {
            question: '我能控制 AI 生成图片的风格吗？',
            answer:
              '能。风格主要由模型、提示词、比例、分辨率和图生图参考图决定。明确的艺术指导通常比泛泛的风格词更有效。',
          },
          {
            question: '多次提示词生成的图片能保持一致吗？',
            answer:
              '复用稳定的提示词结构、重复主体细节、保持同一模型和比例，并用图生图参考图，可以提升系列图片的一致性。',
          },
          {
            question: 'AI 可以生成产品图、Logo 或视觉设计吗？',
            answer:
              '可以。mogged 能起草产品视觉、样机、Logo 和设计素材。公开商用前要检查商标、品牌和生产规范。',
          },
          {
            question: 'AI 图片生成器是怎么工作的？',
            answer:
              '工作台会校验提示词和图片输入，把任务发送到所选 KIE 路由模型，轮询生成状态，完成后在浏览器返回可下载的图片结果。',
          },
        ],
      },
      {
        title: '积分、权利和隐私',
        items: [
          {
            question: '免费 AI 图片生成器生成的图片有水印吗？',
            answer:
              'mogged 不会给生成图片额外加平台可见水印，下载结果可以直接进入正常的创意评审和发布流程。',
          },
          {
            question: 'AI 生成图片可以商用吗？',
            answer:
              '商用取决于你的套餐、所选模型条款、提示词或参考素材权利，以及所在地法律。商业发布前请先确认条款。',
          },
          {
            question: 'AI 图片生成器生成图片的版权归谁？',
            answer:
              '权利会受套餐、上游条款、源素材和地区法律影响。只有当你的输入和相关条款允许时，才应把输出用于对应场景。',
          },
          {
            question: '积分是怎么扣的？',
            answer:
              '每个任务生成前都会显示积分成本。成本和所选模型相关，有些模型还会随输出分辨率变化。访客额度和账号积分分开统计。',
          },
          {
            question: '每天都有免费积分可以生成 AI 图片吗？',
            answer:
              '登录用户在每日奖励开放时可以领取积分。当前每日数量和刷新状态，以账号界面显示为准。',
          },
          {
            question: '使用 AI 图片生成器时我的数据安全吗？',
            answer:
              '提示词和上传参考图只会为了生成任务处理，并发送给完成任务所需的服务。私密作品默认不会变成公开画廊内容。',
          },
          {
            question: '你们会保存我上传的参考图吗？',
            answer:
              '上传参考图会用于当前任务，并可能出现在任务上下文或本地访客历史里。重要结果请及时下载，也不要上传无权处理的私密素材。',
          },
        ],
      },
      {
        title: '编辑、重生成和升级',
        items: [
          {
            question: 'AI 图片生成器生成的图片还能继续编辑吗？',
            answer:
              '可以。把生成图或源图 URL 放进图生图，再描述你想改什么。重塑风格、替换元素和细化细节都更适合走提示词编辑。',
          },
          {
            question: '可以修改提示词后重新生成吗？',
            answer:
              '当然可以。改完提示词再生成即可。光线、构图、主体细节或形容词的小变化，都可能带来明显不同的结果。',
          },
          {
            question: '如果我不喜欢生成结果怎么办？',
            answer:
              '一次只改一个变量：收紧提示词、换模型、调比例或分辨率，或者把最接近的结果作为参考图再走图生图。',
          },
          {
            question: 'AI 图片生成器支持手机使用吗？',
            answer:
              '支持。托管工作台是响应式的，现代手机浏览器可以写提示词、上传源图、查看结果并下载输出。',
          },
          {
            question: '怎么升级到 Pro？',
            answer:
              '当你需要更多积分、高级模型权限或更大的生产工作流时，可以通过工作台里的价格或升级入口购买。',
          },
        ],
      },
    ],
  },
  de: {
    id: 'faq',
    label: 'FAQ',
    title: 'KI-Bildgenerator FAQ',
    description:
      'Antworten zum gehosteten mogged Bildgenerator, KIE-Routing, GPT Image 2, Nano Banana Pro, Credits, Datenschutz und image-to-image Workflows.',
    categories: [
      {
        title: 'Erste Schritte',
        items: [
          {
            question: 'Was ist ein KI-Bildgenerator?',
            answer:
              'Ein KI-Bildgenerator wandelt Textprompts und manchmal ein Ausgangsbild in neue Bilder um. mogged bündelt text-to-image und image-to-image in einem gehosteten Workspace.',
          },
          {
            question: 'Was ist der beste kostenlose KI-Bildgenerator online?',
            answer:
              'mogged ist als praktischer kostenloser Einstieg für Creator gedacht, die Prompt-Generierung, Bildverfeinerung, Modellauswahl und saubere Downloads in einem Browser-Workspace brauchen.',
          },
          {
            question:
              'Ist dieser KI-Bildgenerator wirklich kostenlos und ohne Anmeldung?',
            answer:
              'Gast-Generierung kann vor der Anmeldung verfügbar sein, solange das tägliche Gastkontingent offen ist. Mit Anmeldung erhalten Sie Kontocredits, Verlauf, tägliche Credits und Upgrade-Optionen.',
          },
          {
            question: 'Welche Bild-Workflows sind derzeit öffentlich?',
            answer:
              'Es gibt einen öffentlichen Workspace mit zwei Modi: text-to-image für neue Konzepte und image-to-image für geführte Änderungen ausgehend von einem Quellbild.',
          },
          {
            question: 'Wie erzeuge ich KI-Bilder aus Textprompts?',
            answer:
              'Öffnen Sie text-to-image, schreiben Sie einen klaren Prompt, wählen Sie Modell und Ausgabeoptionen und starten Sie die Generierung. Licht, Kamerawinkel, Details und Komposition helfen bei präziseren Ergebnissen.',
          },
          {
            question: 'Kann ich image-to-image mit einer Referenz nutzen?',
            answer:
              'Ja. Nutzen Sie image-to-image, wenn Sie ein Quellbild oder eine öffentliche direkte Bild-URL haben und der Prompt Änderungen, Varianten oder Verfeinerungen steuern soll.',
          },
          {
            question: 'Brauche ich Designkenntnisse?',
            answer:
              'Nein. Sie können mit normaler Sprache starten. Spezifische Prompts helfen, aber der Workspace ist auch ohne Erfahrung mit Designsoftware nutzbar.',
          },
        ],
      },
      {
        title: 'Modelle, Ausgabe und Steuerung',
        items: [
          {
            question:
              'Welche Modellroute steckt aktuell hinter dem Bild-Workflow?',
            answer:
              'Die aktuelle gehostete Bildroute nutzt KIE-Routing. Text-to-image und image-to-image werden getrennt für Prompt-Erstellung und quellbildgestützte Verfeinerung optimiert.',
          },
          {
            question: 'Welche KI-Bildgenerator-Modelle sind verfügbar?',
            answer:
              'Der aktuelle Modellwähler enthält Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5 und SeeDream 5.0 Lite. Verfügbarkeit und Creditkosten können je nach Modell und Auflösung variieren.',
          },
          {
            question: 'Enthält der KI-Bildgenerator GPT Image 2?',
            answer:
              'Ja. Der Modellwähler enthält GPT Image 2, wonach viele Nutzer auch als ChatGPT Image 2 suchen. Die Route steht neben Nano Banana und SeeDream zur Verfügung.',
          },
          {
            question: 'Wie lange dauert die Bildgenerierung?',
            answer:
              'Die meisten Aufgaben laufen über eine Warteschlange und werden automatisch aktualisiert. Die Dauer hängt von Modelllast, Auflösung, Provider-Warteschlange und Workflow ab.',
          },
          {
            question: 'Welche Seitenverhältnisse werden unterstützt?',
            answer:
              'Der Workspace unterstützt 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5 und 21:9.',
          },
          {
            question: 'Welche Auflösung gibt der KI-Bildgenerator aus?',
            answer:
              'Aktuelle Bildrouten bieten 1K, 2K und 4K, sofern das gewählte Modell diese Ausgabe unterstützt.',
          },
          {
            question: 'Kann der KI-Bildgenerator realistische Bilder erzeugen?',
            answer:
              'Ja. Wählen Sie ein Modell für Realismus und beschreiben Sie Licht, Objektivwirkung, Material, Umgebung und Komposition möglichst konkret.',
          },
          {
            question: 'Welche Bildstile kann ich erstellen?',
            answer:
              'Sie können Realismus, Anime, 3D-Art, Produktrenderings, Editorial-Konzepte, Social Visuals, Packaging-Richtungen und weitere modellgestützte Stile prompten.',
          },
          {
            question: 'Kann ich den Stil generierter Bilder steuern?',
            answer:
              'Ja. Stil entsteht aus Modellwahl, Prompt, Seitenverhältnis, Auflösung und image-to-image Referenz. Konkrete Art Direction funktioniert meist besser als allgemeine Stilwörter.',
          },
          {
            question:
              'Wie konsistent sind KI-Bilder über mehrere Prompts hinweg?',
            answer:
              'Konsistenz steigt, wenn Sie Prompt-Struktur, Motivdetails, Modell und Seitenverhältnis stabil halten und für visuelle Kontinuität image-to-image Referenzen nutzen.',
          },
          {
            question:
              'Kann KI Produktbilder, Logos oder visuelle Designs erzeugen?',
            answer:
              'Ja. mogged kann Produktvisuals, Mockups, Logos und Designassets entwerfen. Prüfen Sie Marken-, Trademark- und Produktionsanforderungen vor öffentlicher Nutzung.',
          },
          {
            question: 'Wie funktioniert der KI-Bildgenerator?',
            answer:
              'Der Workspace prüft Prompt und Bildeingaben, sendet die Aufgabe an das gewählte KIE-geroutete Modell, fragt den Status ab und liefert herunterladbare Bilder im Browser zurück.',
          },
        ],
      },
      {
        title: 'Credits, Rechte und Datenschutz',
        items: [
          {
            question:
              'Sind Bilder aus dem kostenlosen KI-Bildgenerator wasserzeichenfrei?',
            answer:
              'mogged fügt generierten Bildern kein sichtbares Plattform-Wasserzeichen hinzu, sodass Downloads direkt in normale Review- und Veröffentlichungsabläufe passen.',
          },
          {
            question: 'Kann ich KI-generierte Bilder kommerziell nutzen?',
            answer:
              'Kommerzielle Nutzung hängt von Plan, Modellbedingungen, Rechten an Prompt oder Referenzmaterial und lokalem Recht ab. Prüfen Sie vor Veröffentlichung die Bedingungen.',
          },
          {
            question: 'Wem gehört das Copyright der generierten Bilder?',
            answer:
              'Rechte können je nach Plan, Providerbedingungen, Ausgangsmaterial und Region variieren. Nutzen Sie Outputs nur dort, wo Eingaben und Bedingungen diese Nutzung erlauben.',
          },
          {
            question: 'Wie funktionieren Credits?',
            answer:
              'Jede Aufgabe zeigt vor dem Start die Creditkosten. Kosten hängen vom Modell und bei manchen Modellen von der Auflösung ab. Gastkontingent und Kontocredits werden getrennt gezählt.',
          },
          {
            question: 'Bekomme ich täglich kostenlose Credits?',
            answer:
              'Angemeldete Nutzer können den täglichen Creditbonus beanspruchen, wenn er verfügbar ist. Die Kontooberfläche zeigt den aktuellen Betrag und Refresh-Status.',
          },
          {
            question: 'Sind meine Daten sicher?',
            answer:
              'Prompts und Referenzbilder werden für die Aufgabe verarbeitet und nur an die Services gesendet, die für die Ergebnisgenerierung nötig sind. Private Werke werden nicht automatisch öffentlich gemacht.',
          },
          {
            question: 'Speichert ihr meine hochgeladenen Referenzen?',
            answer:
              'Referenzen werden für die Aufgabe verarbeitet und können im Aufgaben-Kontext oder lokalen Gastverlauf erscheinen. Laden Sie wichtige Ergebnisse herunter und laden Sie kein Material hoch, das Sie nicht verarbeiten dürfen.',
          },
        ],
      },
      {
        title: 'Bearbeitung, Regeneration und Upgrade',
        items: [
          {
            question: 'Kann ich generierte Bilder weiter bearbeiten?',
            answer:
              'Ja. Nutzen Sie image-to-image mit einem generierten Bild oder einer Quell-URL und beschreiben Sie die gewünschte Änderung. Prompt-Bearbeitung eignet sich besonders für Restyling, Austausch und Verfeinerung.',
          },
          {
            question: 'Kann ich mit verbessertem Prompt neu generieren?',
            answer:
              'Ja. Bearbeiten Sie den Prompt und generieren Sie erneut. Kleine Änderungen an Licht, Komposition, Motivdetails oder Adjektiven können deutlich andere Ergebnisse erzeugen.',
          },
          {
            question: 'Was mache ich, wenn mir das Ergebnis nicht gefällt?',
            answer:
              'Ändern Sie jeweils nur eine Variable: Prompt präzisieren, Modell wechseln, Seitenverhältnis oder Auflösung anpassen oder das beste Ergebnis als image-to-image Referenz nutzen.',
          },
          {
            question: 'Funktioniert der KI-Bildgenerator auf Mobilgeräten?',
            answer:
              'Ja. Der gehostete Workspace ist responsiv und unterstützt Prompts, Uploads, Ergebnisprüfung und Downloads in modernen mobilen Browsern.',
          },
          {
            question: 'Wie upgrade ich auf Pro?',
            answer:
              'Nutzen Sie den Preis- oder Upgrade-Einstieg im Workspace, wenn Sie mehr Credits, Premium-Modelle oder größere Produktionsabläufe benötigen.',
          },
        ],
      },
    ],
  },
  fr: {
    id: 'faq',
    label: 'FAQ',
    title: "FAQ du générateur d'image IA",
    description:
      "Réponses sur le générateur d'image hébergé mogged, le routage KIE, GPT Image 2, Nano Banana Pro, les crédits, la confidentialité et les workflows image-to-image.",
    categories: [
      {
        title: 'Bien démarrer',
        items: [
          {
            question: "Qu'est-ce qu'un générateur d'image IA ?",
            answer:
              "Un générateur d'image IA transforme des prompts texte, et parfois une image source, en nouvelles images. mogged réunit text-to-image et image-to-image dans un espace hébergé.",
          },
          {
            question:
              "Quel est le meilleur générateur d'image IA gratuit en ligne ?",
            answer:
              'mogged est conçu comme un point de départ gratuit et pratique pour générer par prompt, affiner depuis une image source, choisir un modèle et télécharger des résultats propres dans le navigateur.',
          },
          {
            question:
              "Ce générateur d'image IA est-il vraiment gratuit, sans inscription ?",
            answer:
              "La génération invité peut être disponible avant connexion lorsque le quota quotidien invité est ouvert. La connexion débloque crédits de compte, historique, bonus quotidien et options d'upgrade.",
          },
          {
            question: "Quels workflows d'image sont publics aujourd'hui ?",
            answer:
              'Un seul espace public propose deux modes : text-to-image pour de nouveaux concepts et image-to-image pour des retouches guidées depuis une image source.',
          },
          {
            question:
              'Comment générer des images IA à partir de prompts texte ?',
            answer:
              'Ouvrez text-to-image, écrivez un prompt clair, choisissez un modèle et les réglages de sortie, puis générez. Affinez lumière, angle, détails et composition pour un résultat plus précis.',
          },
          {
            question: 'Puis-je utiliser image-to-image avec une référence ?',
            answer:
              'Oui. Utilisez image-to-image avec une image source ou une URL directe publique lorsque vous voulez guider des retouches, variantes ou affinages depuis cette référence.',
          },
          {
            question: 'Faut-il des compétences en design ?',
            answer:
              "Non. Vous pouvez commencer en langage naturel. Des prompts précis aident, mais l'espace est prévu pour fonctionner sans expertise en logiciel de design.",
          },
        ],
      },
      {
        title: 'Modèles, sortie et contrôle',
        items: [
          {
            question:
              "Quel type de modèle alimente actuellement cette route d'image ?",
            answer:
              "La route d'image hébergée utilise un routage KIE, avec des optimisations séparées pour text-to-image et image-to-image selon la génération par prompt ou l'affinage depuis une image source.",
          },
          {
            question:
              "Quels modèles de génération d'image IA sont disponibles ?",
            answer:
              'Le sélecteur actuel inclut Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5 et SeeDream 5.0 Lite. Disponibilité et coût en crédits peuvent varier selon le modèle et la résolution.',
          },
          {
            question: "Le générateur d'image IA inclut-il GPT Image 2 ?",
            answer:
              'Oui. Le sélecteur inclut GPT Image 2, souvent recherché comme ChatGPT Image 2. Cette route est disponible avec les options Nano Banana et SeeDream.',
          },
          {
            question: "Combien de temps prend la génération d'image IA ?",
            answer:
              'Les tâches passent généralement en file et se rafraîchissent automatiquement. Le délai dépend de la charge du modèle, de la résolution, de la file fournisseur et du type de workflow.',
          },
          {
            question: 'Quels formats sont pris en charge ?',
            answer:
              "L'espace prend en charge 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5 et 21:9.",
          },
          {
            question: "Quelle résolution produit le générateur d'image IA ?",
            answer:
              'Les routes actuelles proposent 1K, 2K et 4K lorsque le modèle sélectionné les prend en charge.',
          },
          {
            question:
              "Ce générateur d'image IA peut-il créer des images réalistes ?",
            answer:
              'Oui. Choisissez un modèle adapté au réalisme et décrivez lumière, objectif, texture, environnement et composition.',
          },
          {
            question: "Quels styles d'image puis-je créer ?",
            answer:
              'Vous pouvez demander réalisme, anime, 3D, rendus produit, concepts éditoriaux, visuels sociaux, pistes packaging et autres styles pris en charge par le modèle.',
          },
          {
            question: 'Puis-je contrôler le style des images générées ?',
            answer:
              'Oui. Le style dépend du modèle, du prompt, du ratio, de la résolution et de la référence image-to-image. Une direction artistique concrète marche mieux que des mots de style génériques.',
          },
          {
            question:
              'Quelle cohérence peut-on obtenir sur plusieurs prompts ?',
            answer:
              'La cohérence augmente si vous gardez la même structure de prompt, les mêmes détails de sujet, le même modèle et le même ratio, puis utilisez image-to-image pour la continuité.',
          },
          {
            question:
              "L'IA peut-elle générer des images produit, logos ou designs visuels ?",
            answer:
              'Oui. mogged peut créer des visuels produit, mockups, logos et assets design. Vérifiez marques, droits et exigences de production avant un usage public.',
          },
          {
            question: "Comment fonctionne le générateur d'image IA ?",
            answer:
              "L'espace valide le prompt et les images, envoie la tâche au modèle routé via KIE, suit l'avancement, puis renvoie des images téléchargeables dans le navigateur.",
          },
        ],
      },
      {
        title: 'Crédits, droits et confidentialité',
        items: [
          {
            question:
              'Les images créées avec le générateur gratuit sont-elles sans filigrane ?',
            answer:
              "mogged n'ajoute pas de filigrane visible de plateforme aux images générées, afin que les téléchargements puissent entrer dans vos flux de revue et publication.",
          },
          {
            question: 'Puis-je utiliser commercialement les images IA ?',
            answer:
              'L’usage commercial dépend de votre plan, des conditions du modèle, des droits sur prompts ou références et de la loi locale. Vérifiez les conditions avant publication ou vente.',
          },
          {
            question: "Qui détient le copyright des images générées par l'IA ?",
            answer:
              'Les droits peuvent varier selon plan, fournisseur, source utilisée et région. Utilisez les sorties seulement lorsque vos entrées et les conditions le permettent.',
          },
          {
            question: 'Comment fonctionnent les crédits ?',
            answer:
              'Chaque tâche affiche son coût avant génération. Le coût dépend du modèle et parfois de la résolution. Quota invité et crédits de compte sont suivis séparément.',
          },
          {
            question:
              'Ai-je des crédits gratuits chaque jour pour générer des images IA ?',
            answer:
              "Les utilisateurs connectés peuvent réclamer le bonus quotidien lorsqu'il est disponible. L'interface du compte fait foi pour le montant et le statut de rafraîchissement.",
          },
          {
            question:
              "Mes données sont-elles en sécurité avec le générateur d'image IA ?",
            answer:
              'Les prompts et références sont traités pour la tâche et envoyés uniquement aux services nécessaires à la génération. Les créations privées ne deviennent pas publiques par défaut.',
          },
          {
            question: 'Stockez-vous mes références téléversées ?',
            answer:
              "Les références servent à la tâche et peuvent apparaître dans le contexte de tâche ou l'historique invité local. Téléchargez les sorties importantes et n'envoyez pas de contenu privé non autorisé.",
          },
        ],
      },
      {
        title: 'Édition, régénération et upgrade',
        items: [
          {
            question: 'Puis-je modifier les images générées ?',
            answer:
              "Oui. Utilisez image-to-image avec une image générée ou une URL source, puis décrivez le changement. C'est le chemin le plus propre pour restyler, remplacer ou affiner.",
          },
          {
            question: 'Puis-je régénérer avec un prompt affiné ?',
            answer:
              'Oui. Modifiez le prompt et relancez. De petites variations sur lumière, composition, sujet ou adjectifs peuvent changer fortement le résultat.',
          },
          {
            question: 'Que faire si le résultat ne me plaît pas ?',
            answer:
              'Changez une variable à la fois : prompt plus précis, autre modèle, ratio ou résolution, ou utilisez le meilleur résultat comme référence image-to-image.',
          },
          {
            question: 'Le générateur fonctionne-t-il sur mobile ?',
            answer:
              'Oui. Le workspace hébergé est responsive et permet prompts, upload, revue des résultats et téléchargement depuis les navigateurs mobiles modernes.',
          },
          {
            question: 'Comment passer à Pro ?',
            answer:
              "Utilisez l'entrée tarifs ou upgrade dans le workspace si vous avez besoin de plus de crédits, de modèles premium ou d'un workflow de production plus large.",
          },
        ],
      },
    ],
  },
  es: {
    id: 'faq',
    label: 'FAQ',
    title: 'FAQ del generador de imágenes IA',
    description:
      'Respuestas sobre el generador de imágenes alojado de mogged, el enrutamiento KIE, GPT Image 2, Nano Banana Pro, créditos, privacidad y flujos image-to-image.',
    categories: [
      {
        title: 'Primeros pasos',
        items: [
          {
            question: '¿Qué es un generador de imágenes IA?',
            answer:
              'Un generador de imágenes IA convierte prompts de texto, y a veces una imagen fuente, en imágenes nuevas. mogged reúne text-to-image e image-to-image en un workspace alojado.',
          },
          {
            question:
              '¿Cuál es el mejor generador de imágenes IA gratis online?',
            answer:
              'mogged está pensado como una entrada gratuita y práctica para crear con prompts, refinar desde imagen fuente, elegir modelos y descargar resultados limpios en el navegador.',
          },
          {
            question:
              '¿Este generador de imágenes IA es gratis y sin registro?',
            answer:
              'La generación como invitado puede estar disponible antes de iniciar sesión cuando el cupo diario está abierto. Al iniciar sesión accedes a créditos, historial, reclamo diario y upgrades.',
          },
          {
            question: '¿Qué workflows de imagen están públicos ahora mismo?',
            answer:
              'Hay un solo workspace público con dos modos: text-to-image para conceptos nuevos e image-to-image para cambios guiados desde una imagen fuente.',
          },
          {
            question: '¿Cómo puedo generar imágenes IA desde prompts de texto?',
            answer:
              'Abre text-to-image, escribe un prompt claro, elige modelo y ajustes de salida, y genera. Afina luz, ángulo, detalles y composición para resultados más precisos.',
          },
          {
            question: '¿Puedo usar image-to-image con una referencia?',
            answer:
              'Sí. Usa image-to-image cuando tengas una imagen fuente o URL directa pública y quieras que el prompt guíe ediciones, variantes o refinamientos.',
          },
          {
            question: '¿Necesito saber diseño?',
            answer:
              'No. Puedes empezar con lenguaje natural. Los prompts específicos ayudan, pero el workspace está diseñado para usarse sin experiencia en software de diseño.',
          },
        ],
      },
      {
        title: 'Modelos, salida y control',
        items: [
          {
            question:
              '¿Qué tipo de modelo impulsa actualmente esta ruta de imagen?',
            answer:
              'La ruta alojada de imagen usa enrutamiento KIE, con optimizaciones separadas para text-to-image e image-to-image según generación por prompt o refinado desde una imagen fuente.',
          },
          {
            question:
              '¿Qué modelos de generador de imágenes IA están disponibles?',
            answer:
              'El selector actual incluye Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5 y SeeDream 5.0 Lite. La disponibilidad y el coste en créditos pueden variar por modelo y resolución.',
          },
          {
            question: '¿El generador incluye GPT Image 2?',
            answer:
              'Sí. El selector incluye GPT Image 2, que muchos usuarios buscan como ChatGPT Image 2. Está disponible junto con Nano Banana y SeeDream.',
          },
          {
            question: '¿Cuánto tarda el generador de imágenes IA?',
            answer:
              'La mayoría de tareas entra en cola y se actualiza automáticamente. El tiempo depende de carga del modelo, resolución, cola del proveedor y tipo de workflow.',
          },
          {
            question: '¿Qué relaciones de aspecto se admiten?',
            answer:
              'El workspace admite 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5 y 21:9.',
          },
          {
            question: '¿Qué resolución entrega el generador?',
            answer:
              'Las rutas actuales ofrecen 1K, 2K y 4K cuando el modelo seleccionado lo admite.',
          },
          {
            question: '¿Puede crear imágenes realistas?',
            answer:
              'Sí. Elige un modelo adecuado para realismo y describe luz, lente, textura, entorno y composición.',
          },
          {
            question: '¿Qué estilos puedo crear?',
            answer:
              'Puedes pedir realismo, anime, arte 3D, renders de producto, conceptos editoriales, visuales sociales, packaging y otros estilos soportados por el modelo.',
          },
          {
            question: '¿Puedo controlar el estilo de las imágenes generadas?',
            answer:
              'Sí. El estilo depende de modelo, prompt, relación de aspecto, resolución y referencia image-to-image. Una dirección artística concreta suele funcionar mejor que palabras genéricas.',
          },
          {
            question:
              '¿Qué tan consistentes son las imágenes en múltiples prompts?',
            answer:
              'La consistencia mejora si reutilizas estructura de prompt, detalles del sujeto, modelo y relación de aspecto, y usas image-to-image para continuidad visual.',
          },
          {
            question:
              '¿La IA puede generar imágenes de producto, logos o diseños?',
            answer:
              'Sí. mogged puede crear visuales de producto, mockups, logos y assets de diseño. Revisa marca, derechos y requisitos de producción antes de usarlos públicamente.',
          },
          {
            question: '¿Cómo funciona el generador de imágenes IA?',
            answer:
              'El workspace valida prompt e imágenes, envía la tarea al modelo enrutado por KIE, consulta el progreso y devuelve imágenes descargables en el navegador.',
          },
        ],
      },
      {
        title: 'Créditos, derechos y privacidad',
        items: [
          {
            question: '¿Las imágenes gratuitas salen sin marca de agua?',
            answer:
              'mogged no añade una marca de agua visible de plataforma a las imágenes generadas, por lo que las descargas sirven para revisión y publicación normales.',
          },
          {
            question: '¿Puedo usar imágenes generadas con IA comercialmente?',
            answer:
              'El uso comercial depende del plan, términos del modelo, derechos de prompts o referencias y leyes locales. Revisa los términos antes de publicar o vender.',
          },
          {
            question: '¿Quién posee el copyright de las imágenes generadas?',
            answer:
              'Los derechos pueden variar por plan, proveedor, material fuente y región. Usa los resultados solo cuando tus entradas y los términos permitan ese uso.',
          },
          {
            question: '¿Cómo funcionan los créditos?',
            answer:
              'Cada tarea muestra el coste antes de generar. El coste depende del modelo y, en algunos casos, de la resolución. El cupo invitado y los créditos de cuenta se contabilizan por separado.',
          },
          {
            question: '¿Recibo créditos gratis cada día?',
            answer:
              'Los usuarios con sesión pueden reclamar el bono diario cuando está disponible. La interfaz de cuenta muestra el importe actual y el estado de actualización.',
          },
          {
            question: '¿Mis datos están seguros?',
            answer:
              'Los prompts y referencias se procesan para la tarea y se envían solo a los servicios necesarios para generar resultados. Las creaciones privadas no se publican por defecto.',
          },
          {
            question: '¿Guardan mis referencias subidas?',
            answer:
              'Las referencias se usan para la tarea y pueden aparecer en el contexto de tarea o historial local de invitado. Descarga resultados importantes y evita subir material privado sin permiso.',
          },
        ],
      },
      {
        title: 'Edición, regeneración y upgrade',
        items: [
          {
            question: '¿Puedo editar imágenes creadas por el generador?',
            answer:
              'Sí. Usa image-to-image con una imagen generada o URL fuente y describe el cambio. Es el camino más limpio para cambiar estilo, reemplazar elementos o refinar.',
          },
          {
            question: '¿Puedo regenerar con un prompt refinado?',
            answer:
              'Sí. Edita el prompt y vuelve a generar. Pequeños cambios en luz, composición, sujeto o adjetivos pueden producir resultados muy distintos.',
          },
          {
            question: '¿Qué pasa si no me gusta el resultado?',
            answer:
              'Cambia una variable cada vez: ajusta el prompt, cambia modelo, modifica relación de aspecto o resolución, o usa el resultado más cercano como referencia image-to-image.',
          },
          {
            question: '¿Funciona en móvil?',
            answer:
              'Sí. El workspace alojado es responsive y permite escribir prompts, subir imágenes, revisar resultados y descargar salidas desde navegadores móviles modernos.',
          },
          {
            question: '¿Cómo actualizo a Pro?',
            answer:
              'Usa la entrada de precios o upgrade del workspace si necesitas más créditos, acceso a modelos premium o un flujo de producción mayor.',
          },
        ],
      },
    ],
  },
  ja: {
    id: 'faq',
    label: 'FAQ',
    title: 'AI画像ジェネレーター FAQ',
    description:
      'mogged のホスト型画像ジェネレーター、KIE ルーティング、GPT Image 2、Nano Banana Pro、クレジット、プライバシー、image-to-image ワークフローに関する回答です。',
    categories: [
      {
        title: 'はじめに',
        items: [
          {
            question: 'AI画像ジェネレーターとは何ですか？',
            answer:
              'AI画像ジェネレーターは、テキストプロンプトやソース画像から新しい画像を作ります。mogged は text-to-image と image-to-image を 1 つのホスト型ワークスペースにまとめています。',
          },
          {
            question:
              'オンラインで使えるおすすめの無料AI画像ジェネレーターは何ですか？',
            answer:
              'mogged は、プロンプト生成、元画像ベースの調整、モデル選択、きれいなダウンロードをブラウザ内で始めたいクリエイター向けの無料スタート可能なワークスペースです。',
          },
          {
            question: '登録なしで本当に無料で使えますか？',
            answer:
              'ゲストの日次枠が有効な場合は、ログイン前に試せます。ログインするとアカウントクレジット、履歴、日次クレジット受け取り、アップグレードが使えます。',
          },
          {
            question: '現在公開されている画像ワークフローは何ですか？',
            answer:
              '公開ワークスペースは 1 つで、text-to-image は新規コンセプト作成、image-to-image は元画像からのガイド付き編集に使います。',
          },
          {
            question: 'テキストプロンプトからAI画像を作るには？',
            answer:
              'text-to-image を開き、明確なプロンプトを書き、モデルと出力設定を選んで生成します。光、角度、被写体詳細、構図を調整すると結果が安定します。',
          },
          {
            question: 'image-to-image で参照画像を使えますか？',
            answer:
              'はい。ソース画像や公開された直接画像URLがある場合、image-to-image で参照画像をもとに編集、バリエーション、微調整ができます。',
          },
          {
            question: 'デザインスキルは必要ですか？',
            answer:
              '不要です。普通の言葉で始められます。具体的なプロンプトは役立ちますが、専門的なデザインソフト経験がなくても使える設計です。',
          },
        ],
      },
      {
        title: 'モデル、出力、コントロール',
        items: [
          {
            question:
              '現在の画像ルートではどの種類のモデルが使われていますか？',
            answer:
              '現在のホスト型画像ルートは KIE ルーティングを使い、text-to-image と image-to-image をそれぞれプロンプト生成と元画像ベースの調整向けに最適化しています。',
          },
          {
            question: '利用できるAI画像生成モデルは何ですか？',
            answer:
              '現在のモデル選択には Nano Banana、Nano Banana 2、GPT Image 2、Nano Banana Pro、SeeDream 4.0、SeeDream 4.5、SeeDream 5.0 Lite があります。利用可否とクレジットコストはモデルと解像度で変わります。',
          },
          {
            question: 'GPT Image 2 は含まれていますか？',
            answer:
              'はい。モデル選択に GPT Image 2 があり、ChatGPT Image 2 と検索されることもあります。Nano Banana や SeeDream と並んで利用できます。',
          },
          {
            question: '生成にはどのくらい時間がかかりますか？',
            answer:
              '多くのタスクはキューに入り自動更新されます。時間はモデル負荷、解像度、プロバイダーキュー、text-to-image か image-to-image かで変わります。',
          },
          {
            question: '対応するアスペクト比は？',
            answer:
              '1:1、4:3、3:4、16:9、9:16、3:2、2:3、5:4、4:5、21:9 に対応しています。',
          },
          {
            question: '出力解像度は？',
            answer:
              '選択したモデルが対応している場合、現在の画像ルートでは 1K、2K、4K を選べます。',
          },
          {
            question: 'リアルな画像を作れますか？',
            answer:
              'はい。リアル表現に合うモデルを選び、光、レンズ感、素材、環境、構図を具体的に書くと写実的な結果に寄せやすくなります。',
          },
          {
            question: 'どんな画像スタイルを作れますか？',
            answer:
              '写実、アニメ、3Dアート、商品レンダー、エディトリアル案、SNSビジュアル、パッケージ方向など、選択モデルが対応するスタイルを指定できます。',
          },
          {
            question: '生成画像のスタイルを制御できますか？',
            answer:
              'はい。モデル、プロンプト、比率、解像度、image-to-image 参照で制御します。一般的なスタイル語より、具体的なアートディレクションが有効です。',
          },
          {
            question: '複数のプロンプトで一貫性は保てますか？',
            answer:
              '同じプロンプト構造、被写体詳細、モデル、比率を使い、image-to-image 参照を加えるとシリーズ感を保ちやすくなります。',
          },
          {
            question: '商品画像、ロゴ、ビジュアルデザインを作れますか？',
            answer:
              'はい。mogged は商品ビジュアル、モックアップ、ロゴ、デザイン素材を下書きできます。公開利用前に商標、ブランド、制作要件を確認してください。',
          },
          {
            question: 'AI画像ジェネレーターはどう動きますか？',
            answer:
              'ワークスペースがプロンプトと画像入力を検証し、選択した KIE ルーティングモデルに送信し、完了をポーリングして、ブラウザにダウンロード可能な画像を返します。',
          },
        ],
      },
      {
        title: 'クレジット、権利、プライバシー',
        items: [
          {
            question: '無料生成の画像にウォーターマークは付きますか？',
            answer:
              'mogged は生成画像にプラットフォームの見えるウォーターマークを追加しません。通常のレビューや公開フローにそのまま進められます。',
          },
          {
            question: 'AI生成画像を商用利用できますか？',
            answer:
              '商用利用はプラン、モデル規約、プロンプトや参照素材の権利、地域の法律に左右されます。公開や販売前に規約を確認してください。',
          },
          {
            question: '生成画像の著作権は誰のものですか？',
            answer:
              '権利はプラン、プロバイダー規約、元素材、地域で変わります。入力内容と規約が許す範囲でのみ利用してください。',
          },
          {
            question: 'クレジットはどう使われますか？',
            answer:
              '各タスクは生成前にコストを表示します。コストはモデルと、場合によっては解像度で変わります。ゲスト枠とアカウントクレジットは別管理です。',
          },
          {
            question: '毎日無料クレジットはもらえますか？',
            answer:
              'ログインユーザーは日次ボーナスが利用可能なときに受け取れます。現在の数量と更新状態はアカウントUIが正です。',
          },
          {
            question: 'データは安全ですか？',
            answer:
              'プロンプトと参照画像は生成タスクのために処理され、結果生成に必要なサービスへ送られます。非公開の作品が自動で公開ギャラリーになることはありません。',
          },
          {
            question: 'アップロードした参照画像は保存されますか？',
            answer:
              '参照画像はタスク処理に使われ、タスク文脈やローカルゲスト履歴に表示される場合があります。重要な出力は保存し、処理権限のない私的素材はアップロードしないでください。',
          },
        ],
      },
      {
        title: '編集、再生成、アップグレード',
        items: [
          {
            question: '生成した画像を編集できますか？',
            answer:
              'はい。生成画像やソースURLを image-to-image に入れて、変更内容を説明します。リスタイル、置き換え、微調整にはプロンプト編集が向いています。',
          },
          {
            question: 'プロンプトを調整して再生成できますか？',
            answer:
              'もちろんです。プロンプトを編集して再生成します。光、構図、被写体詳細、形容詞の小さな変更で結果が大きく変わることがあります。',
          },
          {
            question: '結果が気に入らない場合は？',
            answer:
              '一度に 1 つだけ変えます。プロンプトを絞る、モデルを変える、比率や解像度を調整する、近い結果を image-to-image の参照にする方法があります。',
          },
          {
            question: 'モバイルでも使えますか？',
            answer:
              'はい。ホスト型ワークスペースはレスポンシブで、モバイルブラウザからプロンプト入力、画像アップロード、結果確認、ダウンロードができます。',
          },
          {
            question: 'Pro へアップグレードするには？',
            answer:
              'より多くのクレジット、プレミアムモデル、大きな制作フローが必要な場合は、ワークスペース内の料金またはアップグレード入口を使います。',
          },
        ],
      },
    ],
  },
  it: {
    id: 'faq',
    label: 'FAQ',
    title: 'FAQ del generatore immagini AI',
    description:
      'Risposte sul generatore immagini ospitato di mogged, routing KIE, GPT Image 2, Nano Banana Pro, crediti, privacy e workflow image-to-image.',
    categories: [
      {
        title: 'Per iniziare',
        items: [
          {
            question: "Che cos'e un generatore immagini AI?",
            answer:
              'Un generatore immagini AI trasforma prompt testuali, e a volte un’immagine sorgente, in nuove immagini. mogged riunisce text-to-image e image-to-image in un workspace ospitato.',
          },
          {
            question:
              'Qual e il miglior generatore immagini AI gratuito online?',
            answer:
              'mogged e pensato come punto di partenza gratuito e pratico per generare da prompt, rifinire da immagine sorgente, scegliere modelli e scaricare risultati puliti nel browser.',
          },
          {
            question:
              'Questo generatore immagini AI e davvero gratuito senza registrazione?',
            answer:
              'La generazione ospite puo essere disponibile prima del login quando la quota giornaliera e aperta. Il login abilita crediti account, cronologia, bonus giornaliero e upgrade.',
          },
          {
            question: 'Quali workflow immagine sono pubblici ora?',
            answer:
              'C’e un solo workspace pubblico con due modalità: text-to-image per nuovi concept e image-to-image per modifiche guidate da un’immagine sorgente.',
          },
          {
            question: 'Come genero immagini AI da prompt testuali?',
            answer:
              'Apri text-to-image, scrivi un prompt chiaro, scegli modello e impostazioni di output, poi genera. Luce, angolo, dettagli e composizione aiutano a ottenere risultati più precisi.',
          },
          {
            question: 'Posso usare image-to-image con una reference?',
            answer:
              'Sì. Usa image-to-image quando hai un’immagine sorgente o un URL immagine diretto pubblico e vuoi guidare modifiche, varianti o rifiniture.',
          },
          {
            question: 'Servono competenze di design?',
            answer:
              'No. Puoi iniziare con linguaggio naturale. Prompt più specifici aiutano, ma il workspace è pensato anche senza esperienza con software di design.',
          },
        ],
      },
      {
        title: 'Modelli, output e controllo',
        items: [
          {
            question: 'Quale tipo di modello alimenta oggi la route immagine?',
            answer:
              'La route immagine ospitata usa routing KIE, con ottimizzazioni separate per text-to-image e image-to-image in base a generazione da prompt o rifinitura da immagine sorgente.',
          },
          {
            question:
              'Quali modelli di generazione immagini AI sono disponibili?',
            answer:
              'Il selettore attuale include Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5 e SeeDream 5.0 Lite. Disponibilità e costo crediti possono variare per modello e risoluzione.',
          },
          {
            question: 'Il generatore include GPT Image 2?',
            answer:
              'Sì. Il selettore include GPT Image 2, spesso cercato come ChatGPT Image 2. È disponibile insieme a Nano Banana e SeeDream.',
          },
          {
            question: 'Quanto tempo richiede la generazione?',
            answer:
              'La maggior parte dei task entra in coda e si aggiorna automaticamente. I tempi dipendono da carico modello, risoluzione, coda provider e tipo di workflow.',
          },
          {
            question: 'Quali aspect ratio sono supportati?',
            answer:
              'Il workspace supporta 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5 e 21:9.',
          },
          {
            question: 'Che risoluzione produce il generatore?',
            answer:
              'Le route attuali espongono 1K, 2K e 4K quando supportati dal modello scelto.',
          },
          {
            question: 'Può creare immagini realistiche?',
            answer:
              'Sì. Scegli un modello adatto al realismo e descrivi luce, sensazione lente, texture, ambiente e composizione.',
          },
          {
            question: 'Quali stili posso creare?',
            answer:
              'Puoi chiedere realismo, anime, arte 3D, render prodotto, concept editoriali, visual social, packaging e altri stili supportati dal modello.',
          },
          {
            question: 'Posso controllare lo stile delle immagini generate?',
            answer:
              'Sì. Lo stile dipende da modello, prompt, aspect ratio, risoluzione e reference image-to-image. Una direzione artistica concreta funziona meglio di parole generiche.',
          },
          {
            question: 'Quanto sono consistenti le immagini tra più prompt?',
            answer:
              'La consistenza migliora riusando struttura prompt, dettagli soggetto, modello e aspect ratio, e usando reference image-to-image per continuità visiva.',
          },
          {
            question: 'L’AI può generare immagini prodotto, loghi o design?',
            answer:
              'Sì. mogged può creare visual prodotto, mockup, loghi e asset design. Verifica marchi, diritti e requisiti produttivi prima dell’uso pubblico.',
          },
          {
            question: 'Come funziona il generatore immagini AI?',
            answer:
              'Il workspace valida prompt e immagini, invia il task al modello instradato via KIE, controlla lo stato e restituisce immagini scaricabili nel browser.',
          },
        ],
      },
      {
        title: 'Crediti, diritti e privacy',
        items: [
          {
            question: 'Le immagini gratuite sono senza watermark?',
            answer:
              'mogged non aggiunge un watermark visibile di piattaforma alle immagini generate, quindi i download sono pronti per review e pubblicazione normali.',
          },
          {
            question: 'Posso usare commercialmente le immagini generate?',
            answer:
              'L’uso commerciale dipende da piano, termini del modello, diritti su prompt o reference e leggi locali. Controlla i termini prima di pubblicare o vendere.',
          },
          {
            question: 'Chi possiede il copyright delle immagini generate?',
            answer:
              'I diritti possono variare per piano, termini provider, materiale sorgente e regione. Usa gli output solo quando input e termini lo consentono.',
          },
          {
            question: 'Come funzionano i crediti?',
            answer:
              'Ogni task mostra il costo prima della generazione. Il costo dipende dal modello e, per alcuni modelli, dalla risoluzione. Quota ospite e crediti account sono separati.',
          },
          {
            question: 'Ricevo crediti gratuiti ogni giorno?',
            answer:
              'Gli utenti loggati possono richiedere il bonus giornaliero quando disponibile. L’interfaccia account è la fonte corretta per importo e stato di refresh.',
          },
          {
            question: 'I miei dati sono sicuri?',
            answer:
              'Prompt e reference sono processati per il task e inviati solo ai servizi necessari a produrre risultati. Le creazioni private non diventano pubbliche di default.',
          },
          {
            question: 'Salvate le reference caricate?',
            answer:
              'Le reference sono usate per il task e possono apparire nel contesto task o nella cronologia ospite locale. Scarica gli output importanti e non caricare materiale privato non autorizzato.',
          },
        ],
      },
      {
        title: 'Editing, rigenerazione e upgrade',
        items: [
          {
            question: 'Posso modificare immagini create dal generatore?',
            answer:
              'Sì. Usa image-to-image con un’immagine generata o URL sorgente e descrivi il cambio. È il percorso più pulito per restyling, sostituzioni e rifiniture.',
          },
          {
            question: 'Posso rigenerare con un prompt rifinito?',
            answer:
              'Sì. Modifica il prompt e genera di nuovo. Piccoli cambi a luce, composizione, soggetto o aggettivi possono produrre risultati molto diversi.',
          },
          {
            question: 'Cosa faccio se il risultato non mi piace?',
            answer:
              'Cambia una variabile alla volta: prompt più preciso, altro modello, aspect ratio o risoluzione diversa, oppure usa il risultato più vicino come reference image-to-image.',
          },
          {
            question: 'Funziona su mobile?',
            answer:
              'Sì. Il workspace ospitato è responsive e supporta prompt, upload, revisione risultati e download dai browser mobili moderni.',
          },
          {
            question: 'Come passo a Pro?',
            answer:
              'Usa l’ingresso prezzi o upgrade nel workspace se ti servono più crediti, modelli premium o un workflow produttivo più ampio.',
          },
        ],
      },
    ],
  },
  ko: {
    id: 'faq',
    label: 'FAQ',
    title: 'AI 이미지 생성기 FAQ',
    description:
      'mogged 호스팅 이미지 생성기, KIE 모델 라우팅, GPT Image 2, Nano Banana Pro, 크레딧, 개인정보, image-to-image 워크플로에 대한 답변입니다.',
    categories: [
      {
        title: '시작하기',
        items: [
          {
            question: 'AI 이미지 생성기란 무엇인가요?',
            answer:
              'AI 이미지 생성기는 텍스트 프롬프트와 때로는 원본 이미지를 새 이미지로 바꿉니다. mogged는 text-to-image와 image-to-image를 하나의 호스팅 워크스페이스에 모았습니다.',
          },
          {
            question:
              '온라인에서 가장 좋은 무료 AI 이미지 생성기는 무엇인가요?',
            answer:
              'mogged는 프롬프트 생성, 원본 이미지 보정, 모델 선택, 깔끔한 다운로드를 브라우저에서 시작할 수 있는 실용적인 무료 시작형 워크스페이스입니다.',
          },
          {
            question: '가입 없이 정말 무료로 사용할 수 있나요?',
            answer:
              '일일 게스트 한도가 열려 있으면 로그인 전에도 생성할 수 있습니다. 로그인하면 계정 크레딧, 작업 기록, 일일 크레딧 받기, 업그레이드가 열립니다.',
          },
          {
            question: '현재 공개된 이미지 워크플로는 무엇인가요?',
            answer:
              '현재 공개 워크스페이스는 하나이며, 새 콘셉트용 text-to-image와 원본 기반 가이드 편집용 image-to-image 두 모드를 제공합니다.',
          },
          {
            question: '텍스트 프롬프트로 AI 이미지를 어떻게 만드나요?',
            answer:
              'text-to-image 탭을 열고 명확한 프롬프트를 작성한 뒤 모델과 출력 설정을 선택해 생성합니다. 조명, 각도, 피사체 디테일, 구도를 다듬으면 결과가 더 정확해집니다.',
          },
          {
            question: 'image-to-image에서 참고 이미지를 쓸 수 있나요?',
            answer:
              '네. 원본 이미지나 공개 직접 이미지 URL이 있을 때 image-to-image를 사용하면 프롬프트로 편집, 변형, 보정을 가이드할 수 있습니다.',
          },
          {
            question: '디자인 실력이 필요하나요?',
            answer:
              '아니요. 일반 문장으로 시작할 수 있습니다. 구체적인 프롬프트가 도움이 되지만, 디자인 소프트웨어 경험 없이도 쓰도록 설계되었습니다.',
          },
        ],
      },
      {
        title: '모델, 출력, 제어',
        items: [
          {
            question: '현재 이미지 경로는 어떤 모델을 사용하나요?',
            answer:
              '현재 호스팅 이미지 경로는 KIE 모델 라우팅을 사용하며 text-to-image와 image-to-image를 각각 프롬프트 생성과 원본 이미지 보정에 맞게 최적화합니다.',
          },
          {
            question: '어떤 AI 이미지 생성 모델을 사용할 수 있나요?',
            answer:
              '현재 모델 선택기에는 Nano Banana, Nano Banana 2, GPT Image 2, Nano Banana Pro, SeeDream 4.0, SeeDream 4.5, SeeDream 5.0 Lite가 있습니다. 사용 가능 여부와 크레딧 비용은 모델과 해상도에 따라 달라질 수 있습니다.',
          },
          {
            question: 'AI 이미지 생성기에 GPT Image 2가 포함되어 있나요?',
            answer:
              '네. 모델 선택기에 GPT Image 2가 있으며, 많은 사용자가 ChatGPT Image 2로 검색하기도 합니다. Nano Banana와 SeeDream 옵션과 함께 사용할 수 있습니다.',
          },
          {
            question: '생성에는 얼마나 걸리나요?',
            answer:
              '대부분의 작업은 대기열에 들어가고 자동으로 새로고침됩니다. 시간은 모델 부하, 해상도, 공급자 대기열, 워크플로 종류에 따라 달라집니다.',
          },
          {
            question: '지원되는 화면비는 무엇인가요?',
            answer:
              '워크스페이스는 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 5:4, 4:5, 21:9를 지원합니다.',
          },
          {
            question: '출력 해상도는 무엇인가요?',
            answer:
              '선택한 모델이 지원하는 경우 현재 이미지 경로는 1K, 2K, 4K 출력을 제공합니다.',
          },
          {
            question: '사실적인 이미지를 만들 수 있나요?',
            answer:
              '네. 리얼리즘에 맞는 모델을 고르고 조명, 렌즈 느낌, 재질, 환경, 구도를 구체적으로 쓰면 사실적인 결과에 가까워집니다.',
          },
          {
            question: '어떤 이미지 스타일을 만들 수 있나요?',
            answer:
              '리얼리즘, 애니메이션, 3D 아트, 제품 렌더, 에디토리얼 콘셉트, 소셜 비주얼, 패키징 방향 등 선택 모델이 지원하는 스타일을 요청할 수 있습니다.',
          },
          {
            question: 'AI 생성 이미지의 스타일을 제어할 수 있나요?',
            answer:
              '네. 스타일은 모델, 프롬프트, 화면비, 해상도, image-to-image 참조로 제어합니다. 일반적인 스타일 단어보다 구체적인 아트 디렉션이 더 잘 작동합니다.',
          },
          {
            question: '여러 프롬프트에서 이미지 일관성은 어느 정도인가요?',
            answer:
              '프롬프트 구조, 피사체 디테일, 모델, 화면비를 유지하고 image-to-image 참조를 사용하면 시리즈의 시각적 일관성이 좋아집니다.',
          },
          {
            question: '제품 이미지, 로고, 시각 디자인도 만들 수 있나요?',
            answer:
              '네. mogged는 제품 비주얼, 목업, 로고, 디자인 에셋 초안을 만들 수 있습니다. 공개 사용 전 상표, 브랜드, 제작 요구사항을 확인하세요.',
          },
          {
            question: 'AI 이미지 생성기는 어떻게 작동하나요?',
            answer:
              '워크스페이스가 프롬프트와 이미지 입력을 검증하고 선택한 KIE 라우팅 모델에 작업을 보내며, 완료 상태를 확인한 뒤 브라우저에서 다운로드 가능한 이미지를 반환합니다.',
          },
        ],
      },
      {
        title: '크레딧, 권리, 개인정보',
        items: [
          {
            question: '무료 생성 이미지에 워터마크가 있나요?',
            answer:
              'mogged는 생성 이미지에 보이는 플랫폼 워터마크를 추가하지 않습니다. 다운로드 결과를 일반적인 검토와 게시 흐름에 바로 사용할 수 있습니다.',
          },
          {
            question: 'AI 생성 이미지를 상업적으로 사용할 수 있나요?',
            answer:
              '상업적 사용은 플랜, 선택 모델 약관, 프롬프트 또는 참조 자료 권리, 지역 법률에 따라 달라집니다. 공개나 판매 전 약관을 확인하세요.',
          },
          {
            question: '생성 이미지의 저작권은 누구에게 있나요?',
            answer:
              '권리는 플랜, 공급자 약관, 원본 자료, 지역에 따라 달라질 수 있습니다. 입력과 약관이 허용하는 범위에서만 결과물을 사용하세요.',
          },
          {
            question: '크레딧은 어떻게 작동하나요?',
            answer:
              '각 작업은 생성 전에 크레딧 비용을 보여줍니다. 비용은 모델과 일부 모델의 해상도에 따라 달라집니다. 게스트 한도와 계정 크레딧은 별도로 추적됩니다.',
          },
          {
            question: '매일 무료 크레딧을 받을 수 있나요?',
            answer:
              '로그인 사용자는 일일 보너스가 가능할 때 받을 수 있습니다. 현재 수량과 새로고침 상태는 계정 UI가 기준입니다.',
          },
          {
            question: '데이터는 안전한가요?',
            answer:
              '프롬프트와 참조 이미지는 작업 생성을 위해 처리되며 결과 생성에 필요한 서비스로만 전송됩니다. 비공개 생성물이 기본적으로 공개 갤러리가 되지는 않습니다.',
          },
          {
            question: '업로드한 참조 이미지를 저장하나요?',
            answer:
              '참조 이미지는 작업에 사용되며 작업 맥락이나 로컬 게스트 기록에 나타날 수 있습니다. 중요한 출력은 다운로드하고, 처리 권한이 없는 개인 자료는 업로드하지 마세요.',
          },
        ],
      },
      {
        title: '편집, 재생성, 업그레이드',
        items: [
          {
            question: '생성한 이미지를 다시 편집할 수 있나요?',
            answer:
              '네. 생성 이미지나 원본 URL을 image-to-image에 넣고 원하는 변경을 설명하세요. 스타일 변경, 요소 교체, 세부 보정에는 프롬프트 기반 편집이 가장 깔끔합니다.',
          },
          {
            question: '프롬프트를 다듬어 다시 생성할 수 있나요?',
            answer:
              '물론입니다. 프롬프트를 수정하고 다시 생성하세요. 조명, 구도, 피사체 디테일, 형용사의 작은 변화도 다른 결과를 만들 수 있습니다.',
          },
          {
            question: '결과가 마음에 들지 않으면 어떻게 하나요?',
            answer:
              '한 번에 하나만 바꾸세요. 프롬프트를 좁히거나, 모델을 바꾸거나, 화면비와 해상도를 조정하거나, 가장 가까운 결과를 image-to-image 참조로 사용하세요.',
          },
          {
            question: '모바일에서도 작동하나요?',
            answer:
              '네. 호스팅 워크스페이스는 반응형이며 최신 모바일 브라우저에서 프롬프트 작성, 이미지 업로드, 결과 확인, 다운로드가 가능합니다.',
          },
          {
            question: 'Pro로 업그레이드하려면 어떻게 하나요?',
            answer:
              '더 많은 크레딧, 프리미엄 모델, 더 큰 제작 워크플로가 필요하면 워크스페이스의 가격 또는 업그레이드入口를 사용하세요.',
          },
        ],
      },
    ],
  },
  ar: {
    id: 'faq',
    label: 'FAQ',
    title: 'الأسئلة الشائعة لمولد الصور بالذكاء الاصطناعي',
    description:
      'إجابات حول مولد الصور المستضاف في mogged، وتوجيه KIE، و GPT Image 2، و Nano Banana Pro، والأرصدة، والخصوصية، ومسارات image-to-image.',
    categories: [
      {
        title: 'البدء',
        items: [
          {
            question: 'ما هو مولد الصور بالذكاء الاصطناعي؟',
            answer:
              'مولد الصور بالذكاء الاصطناعي يحول المطالبات النصية، وأحيانًا صورة مصدر، إلى صور جديدة. يجمع mogged بين text-to-image و image-to-image في مساحة عمل مستضافة واحدة.',
          },
          {
            question: 'ما أفضل مولد صور مجاني بالذكاء الاصطناعي على الإنترنت؟',
            answer:
              'mogged مصمم كبداية مجانية وعملية لمن يريد إنشاء الصور من المطالبات، تحسين صورة مصدر، اختيار نموذج، وتنزيل نتائج نظيفة من المتصفح.',
          },
          {
            question: 'هل هذا المولد مجاني فعلًا بدون تسجيل؟',
            answer:
              'قد تكون تجربة الضيف متاحة قبل تسجيل الدخول عندما تكون الحصة اليومية مفتوحة. تسجيل الدخول يفتح أرصدة الحساب، سجل المهام، المكافأة اليومية، وخيارات الترقية.',
          },
          {
            question: 'ما هي مسارات الصور العامة المتاحة الآن؟',
            answer:
              'توجد مساحة عامة واحدة بوضعين: text-to-image للأفكار الجديدة و image-to-image للتعديلات الموجهة من صورة مصدر.',
          },
          {
            question: 'كيف أنشئ صورًا بالذكاء الاصطناعي من النص؟',
            answer:
              'افتح تبويب text-to-image، اكتب مطالبة واضحة، اختر النموذج وإعدادات الإخراج، ثم أنشئ. تحسين الإضاءة والزاوية والتفاصيل والتكوين يعطي نتائج أدق.',
          },
          {
            question: 'هل يمكن استخدام image-to-image مع صورة مرجعية؟',
            answer:
              'نعم. استخدم image-to-image عندما لديك صورة مصدر أو رابط صورة مباشر عام وتريد أن توجه المطالبة التعديلات أو النسخ أو التحسينات.',
          },
          {
            question: 'هل أحتاج إلى خبرة تصميم؟',
            answer:
              'لا. يمكنك البدء بلغة عادية. المطالبات المحددة تساعد، لكن مساحة العمل مصممة لمن لا يملك خبرة ببرامج التصميم.',
          },
        ],
      },
      {
        title: 'النماذج والإخراج والتحكم',
        items: [
          {
            question: 'ما نوع النموذج الذي يشغل مسار الصور الحالي؟',
            answer:
              'يعتمد مسار الصور المستضاف على توجيه KIE، مع تحسين منفصل لكل من text-to-image و image-to-image بحسب إنشاء الصورة من مطالبة أو تحسينها من صورة مصدر.',
          },
          {
            question: 'ما نماذج توليد الصور المتاحة؟',
            answer:
              'يتضمن محدد النماذج الحالي Nano Banana و Nano Banana 2 و GPT Image 2 و Nano Banana Pro و SeeDream 4.0 و SeeDream 4.5 و SeeDream 5.0 Lite. قد تختلف الإتاحة وتكلفة الأرصدة حسب النموذج والدقة.',
          },
          {
            question: 'هل يتضمن المولد GPT Image 2؟',
            answer:
              'نعم. يتضمن محدد النماذج GPT Image 2، والذي يبحث عنه بعض المستخدمين باسم ChatGPT Image 2. وهو متاح بجانب Nano Banana و SeeDream.',
          },
          {
            question: 'كم يستغرق توليد الصورة؟',
            answer:
              'تدخل معظم المهام في قائمة انتظار ويتم تحديثها تلقائيًا. يعتمد الوقت على حمل النموذج والدقة وحالة قائمة المزود ونوع المسار.',
          },
          {
            question: 'ما نسب العرض إلى الارتفاع المدعومة؟',
            answer:
              'تدعم مساحة العمل 1:1 و 4:3 و 3:4 و 16:9 و 9:16 و 3:2 و 2:3 و 5:4 و 4:5 و 21:9.',
          },
          {
            question: 'ما دقة الإخراج؟',
            answer:
              'تعرض مسارات الصور الحالية خيارات 1K و 2K و 4K عندما يدعمها النموذج المختار.',
          },
          {
            question: 'هل يمكن إنشاء صور واقعية؟',
            answer:
              'نعم. اختر نموذجًا مناسبًا للواقعية واكتب تفاصيل الإضاءة والعدسة والمواد والبيئة والتكوين.',
          },
          {
            question: 'ما أنماط الصور التي يمكن إنشاؤها؟',
            answer:
              'يمكنك طلب الواقعية، الأنمي، فن ثلاثي الأبعاد، صور المنتجات، مفاهيم تحريرية، مرئيات اجتماعية، اتجاهات تغليف، وأنماطًا أخرى يدعمها النموذج.',
          },
          {
            question: 'هل يمكنني التحكم في نمط الصور المولدة؟',
            answer:
              'نعم. يعتمد النمط على النموذج والمطالبة والنسبة والدقة ومرجع image-to-image. التوجيه الفني المحدد أفضل من كلمات نمط عامة.',
          },
          {
            question: 'ما مدى اتساق الصور عبر مطالبات متعددة؟',
            answer:
              'يزداد الاتساق عند إعادة استخدام بنية مطالبة ثابتة، وتفاصيل موضوع متكررة، ونفس النموذج والنسبة، مع استخدام مراجع image-to-image للاستمرارية.',
          },
          {
            question: 'هل يمكن للذكاء الاصطناعي إنشاء صور منتجات أو شعارات؟',
            answer:
              'نعم. يمكن لـ mogged إنشاء مرئيات منتجات ونماذج وشعارات وأصول تصميم. تحقق من العلامات التجارية والحقوق ومتطلبات الإنتاج قبل الاستخدام العام.',
          },
          {
            question: 'كيف يعمل مولد الصور؟',
            answer:
              'تتحقق مساحة العمل من المطالبة ومدخلات الصور، ترسل المهمة إلى نموذج موجه عبر KIE، تتابع حالة الإكمال، ثم تعيد صورًا قابلة للتنزيل في المتصفح.',
          },
        ],
      },
      {
        title: 'الأرصدة والحقوق والخصوصية',
        items: [
          {
            question: 'هل الصور المجانية بلا علامة مائية؟',
            answer:
              'لا يضيف mogged علامة مائية مرئية خاصة بالمنصة إلى الصور المولدة، لذلك تكون التنزيلات جاهزة للمراجعة والنشر المعتادين.',
          },
          {
            question: 'هل يمكن استخدام الصور المولدة تجاريًا؟',
            answer:
              'يعتمد الاستخدام التجاري على الخطة وشروط النموذج وحقوق المطالبات أو المراجع والقانون المحلي. راجع الشروط قبل النشر أو البيع.',
          },
          {
            question: 'من يملك حقوق الصور المولدة؟',
            answer:
              'قد تختلف الحقوق حسب الخطة وشروط المزود والمواد المصدرية والمنطقة. استخدم النتائج فقط عندما تسمح مدخلاتك والشروط بذلك.',
          },
          {
            question: 'كيف تعمل الأرصدة؟',
            answer:
              'تعرض كل مهمة تكلفة الأرصدة قبل التوليد. ترتبط التكلفة بالنموذج وأحيانًا بالدقة. تتم متابعة حصة الضيف وأرصدة الحساب بشكل منفصل.',
          },
          {
            question: 'هل أحصل على أرصدة مجانية يوميًا؟',
            answer:
              'يمكن للمستخدمين المسجلين المطالبة بالمكافأة اليومية عندما تكون متاحة. واجهة الحساب هي مصدر الحقيقة للمبلغ الحالي وحالة التحديث.',
          },
          {
            question: 'هل بياناتي آمنة؟',
            answer:
              'تتم معالجة المطالبات والمراجع للمهمة فقط، وترسل إلى الخدمات اللازمة لإنتاج النتائج. لا تتحول الإبداعات الخاصة إلى معرض عام افتراضيًا.',
          },
          {
            question: 'هل تخزنون الصور المرجعية التي أرفعها؟',
            answer:
              'تستخدم المراجع للمهمة وقد تظهر في سياق المهمة أو سجل الضيف المحلي. نزّل النتائج المهمة وتجنب رفع مواد خاصة لا تملك حق معالجتها.',
          },
        ],
      },
      {
        title: 'التحرير وإعادة التوليد والترقية',
        items: [
          {
            question: 'هل يمكنني تعديل الصور التي أنشأها المولد؟',
            answer:
              'نعم. استخدم image-to-image مع صورة مولدة أو رابط مصدر، ثم صف التغيير المطلوب. التحرير بالمطالبة مناسب لتغيير النمط أو استبدال العناصر أو التحسين.',
          },
          {
            question: 'هل يمكنني إعادة التوليد بمطالبة محسنة؟',
            answer:
              'بالتأكيد. عدل المطالبة وأنشئ مرة أخرى. تغييرات صغيرة في الإضاءة أو التكوين أو تفاصيل الموضوع قد تعطي نتائج مختلفة جدًا.',
          },
          {
            question: 'ماذا لو لم تعجبني النتيجة؟',
            answer:
              'غيّر متغيرًا واحدًا في كل مرة: شدد المطالبة، بدّل النموذج، عدل النسبة أو الدقة، أو استخدم أقرب نتيجة كمرجع image-to-image.',
          },
          {
            question: 'هل يعمل المولد على الهاتف؟',
            answer:
              'نعم. مساحة العمل المستضافة متجاوبة وتدعم كتابة المطالبات ورفع الصور ومراجعة النتائج وتنزيلها من متصفحات الهاتف الحديثة.',
          },
          {
            question: 'كيف أترقى إلى Pro؟',
            answer:
              'استخدم مدخل الأسعار أو الترقية في مساحة العمل عندما تحتاج إلى أرصدة أكثر أو نماذج مميزة أو سير إنتاج أكبر.',
          },
        ],
      },
    ],
  },
};
