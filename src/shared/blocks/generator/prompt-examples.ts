import type { ImageGeneratorMode } from '@/shared/blocks/generator/image-generator-mode';
import type { VideoGeneratorMode } from '@/shared/blocks/generator/video-generator-mode';
import { resolveAppLocale, type AppLocale } from '@/config/locale';

export type GeneratorPromptMode = VideoGeneratorMode | ImageGeneratorMode;

const PROMPT_EXAMPLES: Record<
  AppLocale,
  Record<GeneratorPromptMode, readonly string[]>
> = {
  en: {
    'text-to-video': [
      `A silver horse gallops through falling snow at sunrise, cinematic wide shot, crisp winter air, long-lens compression, dramatic hoof impact, natural motion blur.`,
      `Luxury perfume bottle on black volcanic stone, slow push-in camera, drifting mist, controlled specular highlights, premium commercial lighting, elegant reveal.`,
      `A tiny paper boat crossing a glowing rain puddle at night, macro lens, neon reflections, shallow depth of field, gentle ripples, poetic mood.`,
    ],
    'image-to-video': [
      `Preserve the uploaded subject and composition, then add a smooth forward camera drift, subtle cloth motion, soft hair movement, natural breathing, cinematic realism.`,
      `Keep the first frame identity locked, then animate a powerful takeoff with rising dust, stronger wind response, accelerating camera tilt, and high-energy motion arcs.`,
      `Start from the uploaded still image and transition into a refined hero shot with gentle parallax, floating particles, glossy highlights, and calm premium pacing.`,
    ],
    'reference-to-video': [
      `Blend the uploaded references into one coherent scene, keep the main character identity stable, borrow the strongest motion rhythm from the video references, and match the atmosphere from the image references.`,
      `Use the uploaded image references for color and styling, use the video references for pacing and camera language, keep the result grounded, cinematic, and physically believable.`,
      `Follow the uploaded references for composition, motion, and mood, then generate a polished short sequence with consistent lighting, readable action, and smooth scene continuity.`,
    ],
    'text-to-image': [
      `A luxury skincare bottle on wet black stone, soft studio rim light, restrained reflections, premium editorial composition, clean background, ultra-detailed product texture.`,
      `A futuristic electric motorcycle parked in a rainy neon alley, cinematic perspective, reflective pavement, moody atmosphere, crisp metal surfaces, high-end concept art realism.`,
      `A minimalist dessert plated on brushed steel, top-down composition, diffused daylight, subtle crumbs and glaze detail, premium food photography styling.`,
    ],
    'image-to-image': [
      `Preserve the uploaded subject identity and overall composition, then upgrade the lighting, texture fidelity, and product-polish level for a premium editorial image.`,
      `Keep the uploaded character silhouette and pose, but restyle the scene into a cinematic sci-fi environment with stronger atmosphere, richer contrast, and refined material detail.`,
      `Use the uploaded image as the composition anchor, then turn it into a cleaner commercial hero shot with sharper detail, controlled highlights, and elevated visual finish.`,
    ],
  },
  zh: {
    'text-to-video': [
      `一匹银色骏马在日出时分的落雪中奔跑，电影感广角镜头，寒冷清澈的空气，长焦压缩，马蹄落地有力，自然运动模糊。`,
      `黑色火山石上的奢华香水瓶，镜头缓慢推进，薄雾飘动，受控高光，精品广告级灯光，优雅揭晓。`,
      `一只小纸船在夜晚发光的雨水中前行，微距镜头，霓虹倒影，浅景深，轻柔涟漪，诗意氛围。`,
    ],
    'image-to-video': [
      `保持上传主体和构图不变，然后加入平滑的前推镜头、细微布料摆动、轻柔发丝运动、自然呼吸感和电影级真实质感。`,
      `锁定首帧主体身份，然后做出强劲起飞动作，带起扬尘，更明显的风向反馈，加速抬镜，以及高能量运动轨迹。`,
      `从上传的静帧开始，过渡到精致的主视觉镜头，加入轻微视差、漂浮颗粒、光泽高光与克制高级的节奏。`,
    ],
    'reference-to-video': [
      `把上传的参考融合成一个统一场景，保持主角身份稳定，借用视频参考里最强的动作节奏，并匹配图片参考里的氛围。`,
      `使用上传的图片参考控制配色和风格，使用视频参考控制节奏与镜头语言，让结果保持写实、电影感和物理可信。`,
      `遵循上传参考中的构图、运动和情绪，然后生成一段成片感更强的短视频，保持灯光一致、动作清晰、镜头衔接顺滑。`,
    ],
    'text-to-image': [
      `一瓶高端护肤精华放在带水珠的黑色石面上，柔和棚拍轮廓光，反光克制，构图高级干净，产品材质细节清晰，像高端广告大片。`,
      `一辆未来感电动摩托停在雨后的霓虹小巷里，电影感透视，地面反光明显，氛围浓郁，金属质感锐利，像高质量概念设定图。`,
      `一份极简甜点摆在拉丝金属台面上，俯拍构图，漫射日光，糖浆和碎屑细节自然，整体像精品美食摄影。`,
    ],
    'image-to-image': [
      `保留上传主体身份和整体构图，然后把灯光、纹理清晰度和成片质感整体升级成更像高端商业拍摄的图片。`,
      `保持上传人物的轮廓和姿态不变，但把场景重塑成更有电影感的科幻环境，氛围更强，对比更准，材质更精致。`,
      `把上传图片作为构图锚点，然后把它打磨成更干净的商业主视觉图，细节更锐利，高光更受控，整体完成度更高。`,
    ],
  },
  de: {
    'text-to-video': [
      `Ein silbernes Pferd galoppiert bei Sonnenaufgang durch fallenden Schnee, cineastische Totale, klare Winterluft, Tele-Kompression, kraftvoller Hufaufschlag, natürliche Bewegungsunschärfe.`,
      `Luxus-Parfumflakon auf schwarzem Vulkanstein, langsame Kamerafahrt nach vorn, treibender Nebel, kontrollierte Spitzlichter, hochwertiges Werbelicht, elegante Enthüllung.`,
      `Ein kleines Papierboot fährt nachts durch eine leuchtende Regenpfütze, Makroobjektiv, Neonreflexe, geringe Tiefenschärfe, sanfte Wellen, poetische Stimmung.`,
    ],
    'image-to-video': [
      `Behalte Motiv und Bildaufbau des Uploads bei und ergänze eine sanfte Vorwärtsfahrt der Kamera, dezente Stoffbewegung, leichtes Haarspiel, natürliches Atmen und cineastischen Realismus.`,
      `Fixiere die Identität des ersten Frames und animiere dann einen kraftvollen Start mit aufwirbelndem Staub, stärkerer Windreaktion, beschleunigter Kameraneigung und energiereichen Bewegungsbögen.`,
      `Beginne mit dem hochgeladenen Standbild und entwickle es zu einer veredelten Hauptaufnahme mit leichter Parallaxe, schwebenden Partikeln, glänzenden Highlights und ruhigem Premium-Timing.`,
    ],
    'reference-to-video': [
      `Führe die hochgeladenen Referenzen zu einer stimmigen Szene zusammen, halte die Hauptfigur konsistent, übernimm den stärksten Bewegungsrhythmus aus den Video-Referenzen und die Atmosphäre aus den Bild-Referenzen.`,
      `Nutze die Bild-Referenzen für Farben und Stil, die Video-Referenzen für Tempo und Kamerasprache, und halte das Ergebnis geerdet, cineastisch und physisch glaubwürdig.`,
      `Folge den hochgeladenen Referenzen für Komposition, Bewegung und Stimmung und erzeuge daraus eine polierte kurze Sequenz mit konsistentem Licht, klar lesbarer Action und weichen Übergängen.`,
    ],
    'text-to-image': [
      `Ein luxuriöses Hautpflege-Serum auf nassem schwarzem Stein, weiches Studio-Rimlight, kontrollierte Reflexe, editorialer Premium-Bildaufbau, sauberer Hintergrund und ultrafeine Produkttextur.`,
      `Ein futuristisches Elektromotorrad in einer regennassen Neon-Gasse, cineastische Perspektive, spiegelnder Asphalt, dichte Stimmung, scharfe Metalloberflächen und realistische High-End-Concept-Art.`,
      `Ein minimalistisches Dessert auf gebürstetem Stahl, Top-Down-Komposition, diffuses Tageslicht, feine Krümel- und Glasurdetails und eine hochwertige Food-Fotografie-Anmutung.`,
    ],
    'image-to-image': [
      `Behalte die Identität des hochgeladenen Motivs und die Gesamtkomposition bei und hebe Licht, Materialtreue und den letzten Finish auf das Niveau eines Premium-Editorials.`,
      `Lass Silhouette und Pose der hochgeladenen Figur unverändert, verlagere die Szene aber in eine cineastische Sci-Fi-Umgebung mit dichterer Atmosphäre, stärkerem Kontrast und feineren Materialien.`,
      `Nutze das hochgeladene Bild als Kompositionsanker und verwandle es in ein saubereres kommerzielles Hero-Motiv mit schärferen Details, kontrollierten Highlights und sichtbar höherer Ausführung.`,
    ],
  },
  fr: {
    'text-to-video': [
      `Un cheval argenté galope dans la neige au lever du soleil, plan large cinématographique, air hivernal net, compression téléobjectif, impact puissant des sabots, flou de mouvement naturel.`,
      `Flacon de parfum de luxe sur pierre volcanique noire, lente avancée de caméra, brume flottante, reflets spéculaires maîtrisés, éclairage publicitaire premium, révélation élégante.`,
      `Un petit bateau en papier traverse une flaque lumineuse la nuit, objectif macro, reflets néon, faible profondeur de champ, légères ondulations, ambiance poétique.`,
    ],
    'image-to-video': [
      `Préserve le sujet et la composition envoyés, puis ajoute une douce avancée de caméra, un léger mouvement du tissu, des cheveux subtilement animés, une respiration naturelle et un réalisme cinématographique.`,
      `Garde l’identité de la première image intacte, puis anime un décollage puissant avec poussière montante, réaction au vent plus marquée, inclinaison de caméra accélérée et trajectoires d’énergie dynamiques.`,
      `Pars de l’image fixe envoyée et transforme-la en plan principal raffiné avec légère parallaxe, particules flottantes, reflets brillants et rythme premium apaisé.`,
    ],
    'reference-to-video': [
      `Fusionne les références envoyées dans une scène cohérente, maintiens l’identité du personnage principal, reprends le meilleur rythme de mouvement des références vidéo et l’atmosphère des références image.`,
      `Utilise les références image pour la couleur et le style, les références vidéo pour le rythme et le langage caméra, et garde un résultat crédible, cinématographique et réaliste.`,
      `Suis les références envoyées pour la composition, le mouvement et l’ambiance, puis génère une séquence courte et soignée avec éclairage cohérent, action lisible et continuité fluide.`,
    ],
    'text-to-image': [
      `Un flacon de soin haut de gamme posé sur une pierre noire mouillée, légère lumière de contour studio, reflets maîtrisés, composition éditoriale premium, fond propre et texture produit ultra détaillée.`,
      `Une moto électrique futuriste garée dans une ruelle néon après la pluie, perspective cinématographique, sol réfléchissant, ambiance dense, surfaces métalliques nettes et réalisme de concept art haut de gamme.`,
      `Un dessert minimaliste dressé sur de l’acier brossé, composition en vue du dessus, lumière du jour diffuse, détails subtils de miettes et de glaçage, avec une esthétique de photographie culinaire premium.`,
    ],
    'image-to-image': [
      `Préserve l’identité du sujet envoyé et la composition générale, puis améliore l’éclairage, la fidélité des textures et la finition visuelle pour obtenir une image digne d’un éditorial premium.`,
      `Garde la silhouette et la pose du personnage importé, mais redessine la scène dans un univers de science-fiction plus cinématographique avec une atmosphère plus forte, un contraste plus riche et des matériaux plus raffinés.`,
      `Utilise l’image envoyée comme ancre de composition, puis transforme-la en visuel commercial hero plus propre avec davantage de netteté, des hautes lumières mieux contrôlées et une finition plus aboutie.`,
    ],
  },
  es: {
    'text-to-video': [
      `Un caballo plateado galopa entre nieve al amanecer, plano general cinematográfico, aire invernal nítido, compresión de teleobjetivo, fuerte impacto de cascos y desenfoque de movimiento natural.`,
      `Frasco de perfume de lujo sobre piedra volcánica negra, cámara lenta en avance, niebla flotante, reflejos controlados, iluminación comercial premium y revelación elegante.`,
      `Un pequeño barco de papel cruza un charco luminoso por la noche, lente macro, reflejos neón, poca profundidad de campo, ondas suaves y un tono poético.`,
    ],
    'image-to-video': [
      `Mantén el sujeto y la composición cargados, luego añade un suave avance de cámara, movimiento sutil de tela, ligera animación del cabello, respiración natural y realismo cinematográfico.`,
      `Bloquea la identidad del primer fotograma y luego anima un despegue potente con polvo ascendente, respuesta más fuerte al viento, inclinación acelerada de cámara y arcos de movimiento de alta energía.`,
      `Parte de la imagen fija cargada y conviértela en un plano principal refinado con suave paralaje, partículas flotantes, brillos pulidos y un ritmo premium sereno.`,
    ],
    'reference-to-video': [
      `Combina las referencias cargadas en una sola escena coherente, mantén estable la identidad del personaje principal, toma el ritmo de movimiento más fuerte de los videos de referencia y la atmósfera de las imágenes de referencia.`,
      `Usa las referencias de imagen para color y estilo, las referencias de video para ritmo y lenguaje de cámara, y mantén el resultado creíble, cinematográfico y físicamente verosímil.`,
      `Sigue las referencias cargadas para composición, movimiento y tono, y luego genera una secuencia breve y pulida con iluminación consistente, acción legible y continuidad fluida.`,
    ],
    'text-to-image': [
      `Un frasco de cuidado facial de lujo sobre piedra negra mojada, luz de contorno de estudio suave, reflejos controlados, composición editorial premium, fondo limpio y textura de producto ultra detallada.`,
      `Una motocicleta eléctrica futurista aparcada en un callejón de neón bajo la lluvia, perspectiva cinematográfica, pavimento reflectante, atmósfera intensa, superficies metálicas nítidas y realismo de concept art de alto nivel.`,
      `Un postre minimalista sobre acero cepillado, composición cenital, luz de día difusa, detalles sutiles de migas y glaseado, con una estética propia de fotografía gastronómica premium.`,
    ],
    'image-to-image': [
      `Conserva la identidad del sujeto cargado y la composición general, y luego mejora la iluminación, la fidelidad de las texturas y el acabado visual para llevar la imagen a un nivel editorial premium.`,
      `Mantén intactas la silueta y la pose del personaje cargado, pero rediseña la escena como un entorno de ciencia ficción más cinematográfico, con más atmósfera, contraste más rico y materiales mejor resueltos.`,
      `Usa la imagen cargada como ancla de composición y conviértela en un hero comercial más limpio, con más detalle, brillos controlados y un acabado visual claramente superior.`,
    ],
  },
  ja: {
    'text-to-video': [
      `銀色の馬が夜明けの雪原を駆け抜ける。映画的なワイドショット、澄んだ冬の空気、望遠圧縮、力強い蹄の着地、自然なモーションブラー。`,
      `黒い火山石の上に置かれた高級香水ボトル。ゆっくりしたプッシュイン、漂うミスト、制御されたスペキュラー、プレミアム広告の照明、上品な見せ方。`,
      `夜の光る雨だまりを進む小さな紙の舟。マクロレンズ、ネオン反射、浅い被写界深度、やさしい波紋、詩的なムード。`,
    ],
    'image-to-video': [
      `アップロードした被写体と構図を保ったまま、なめらかな前進カメラ、わずかな布の揺れ、柔らかな髪の動き、自然な呼吸感、シネマティックなリアリズムを加える。`,
      `最初のフレームの人物性を固定したまま、舞い上がる砂ぼこり、強い風の反応、加速するカメラチルト、高エネルギーな動線で力強い飛び立ちを描く。`,
      `アップロードした静止画から始めて、穏やかなパララックス、浮遊粒子、艶のあるハイライト、落ち着いたプレミアムなテンポを持つヒーローショットへ移行する。`,
    ],
    'reference-to-video': [
      `アップロードした参照を一つの整ったシーンにまとめ、主役のアイデンティティを安定させ、動画参照から最も強いモーションのリズムを、画像参照から雰囲気を取り入れる。`,
      `画像参照で色とスタイルを、動画参照でテンポとカメラ言語を決め、結果は地に足の着いたシネマティックで物理的に自然なものにする。`,
      `アップロードした参照の構図、動き、ムードに従いながら、一貫した照明、読みやすいアクション、滑らかなシーン連続性を備えた洗練された短い映像を生成する。`,
    ],
    'text-to-image': [
      `濡れた黒い石の上に置かれた高級スキンケアボトル。柔らかなスタジオの縁光、抑えた反射、洗練されたエディトリアル構図、クリーンな背景、超高精細な商品テクスチャ。`,
      `雨上がりのネオン路地に停められた未来的な電動バイク。映画的な遠近感、反射する路面、濃い空気感、シャープな金属表現、高品質コンセプトアート級のリアリズム。`,
      `ブラッシュドスチールの上に盛りつけたミニマルなデザート。真上からの構図、柔らかな自然光、繊細な crumbs と glaze の描写、上質なフードフォトの雰囲気。`,
    ],
    'image-to-image': [
      `アップロードした被写体のアイデンティティと全体構図を保ったまま、ライティング、質感の忠実度、商品としての仕上がりを引き上げてプレミアムなエディトリアル画像に整える。`,
      `アップロードした人物のシルエットとポーズは維持しつつ、より映画的な SF 環境へ再構成し、空気感、コントラスト、マテリアル表現をさらに洗練させる。`,
      `アップロード画像を構図の軸として使いながら、よりクリーンな商用ヒーローショットへ仕上げ、ディテール、ハイライト制御、完成度を一段上げる。`,
    ],
  },
  it: {
    'text-to-video': [
      `Un cavallo argentato galoppa nella neve all’alba, inquadratura ampia cinematografica, aria invernale nitida, compressione da teleobiettivo, forte impatto degli zoccoli e sfocatura di movimento naturale.`,
      `Flacone di profumo di lusso su pietra vulcanica nera, lento avanzamento di camera, nebbia che scorre, riflessi controllati, illuminazione premium da spot pubblicitario, rivelazione elegante.`,
      `Una piccola barca di carta attraversa una pozzanghera luminosa di notte, lente macro, riflessi al neon, profondità di campo ridotta, increspature delicate, atmosfera poetica.`,
    ],
    'image-to-video': [
      `Mantieni soggetto e composizione caricati, poi aggiungi una morbida avanzata di camera, leggero movimento del tessuto, capelli appena mossi, respiro naturale e realismo cinematografico.`,
      `Blocca l’identità del primo fotogramma e poi anima un decollo potente con polvere in risalita, risposta più forte al vento, tilt di camera accelerato e traiettorie di movimento ad alta energia.`,
      `Parti dall’immagine fissa caricata e trasformala in un’inquadratura principale raffinata con lieve parallasse, particelle sospese, riflessi lucidi e un ritmo premium controllato.`,
    ],
    'reference-to-video': [
      `Fondi i riferimenti caricati in una scena coerente, mantieni stabile l’identità del personaggio principale, prendi il ritmo di movimento più forte dai riferimenti video e l’atmosfera dai riferimenti immagine.`,
      `Usa i riferimenti immagine per colore e stile, i riferimenti video per ritmo e linguaggio di camera, e mantieni il risultato credibile, cinematografico e fisicamente plausibile.`,
      `Segui i riferimenti caricati per composizione, movimento e tono, poi genera una sequenza breve e rifinita con illuminazione coerente, azione leggibile e continuità fluida della scena.`,
    ],
    'text-to-image': [
      `Un flacone skincare di lusso su pietra nera bagnata, morbida luce di contorno da studio, riflessi controllati, composizione editoriale premium, sfondo pulito e texture del prodotto ultra dettagliata.`,
      `Una moto elettrica futuristica parcheggiata in un vicolo al neon sotto la pioggia, prospettiva cinematografica, asfalto riflettente, atmosfera intensa, superfici metalliche nitide e realismo da concept art di fascia alta.`,
      `Un dessert minimalista impiattato su acciaio spazzolato, composizione dall’alto, luce diffusa diurna, dettagli sottili di briciole e glassa, con un’estetica da fotografia food premium.`,
    ],
    'image-to-image': [
      `Mantieni l’identità del soggetto caricato e la composizione generale, poi migliora illuminazione, fedeltà delle texture e finitura visiva fino a ottenere un’immagine da editoriale premium.`,
      `Conserva silhouette e posa del personaggio caricato, ma ricostruisci la scena in un ambiente sci-fi più cinematografico, con atmosfera più ricca, contrasto più deciso e materiali più raffinati.`,
      `Usa l’immagine caricata come ancora compositiva e trasformala in un hero shot commerciale più pulito, con dettagli più nitidi, highlight controllati e una finitura visiva più alta.`,
    ],
  },
  ko: {
    'text-to-video': [
      `은빛 말이 해 뜨는 새벽 눈밭을 질주한다. 영화 같은 와이드 샷, 차갑고 맑은 겨울 공기, 망원 압축, 강한 발굽 충격, 자연스러운 모션 블러.`,
      `검은 화산석 위의 럭셔리 향수병. 천천히 밀고 들어가는 카메라, 떠다니는 안개, 제어된 하이라이트, 프리미엄 광고 조명, 우아한 리빌.`,
      `밤에 빛나는 빗물 웅덩이를 건너는 작은 종이배. 매크로 렌즈, 네온 반사, 얕은 심도, 잔잔한 물결, 시적인 분위기.`,
    ],
    'image-to-video': [
      `업로드한 피사체와 구도를 유지한 채 부드러운 전진 카메라 움직임, 미세한 천의 흔들림, 자연스러운 머리카락 움직임, 호흡감, 영화적인 리얼리즘을 더한다.`,
      `첫 프레임의 정체성을 고정한 뒤, 치솟는 먼지, 더 강한 바람 반응, 가속되는 카메라 틸트, 고에너지 모션 아크로 강렬한 이륙을 만든다.`,
      `업로드한 정지 이미지에서 시작해 가벼운 패럴랙스, 떠다니는 입자, 윤기 있는 하이라이트, 차분한 프리미엄 템포를 지닌 히어로 샷으로 전환한다.`,
    ],
    'reference-to-video': [
      `업로드한 레퍼런스를 하나의 일관된 장면으로 결합하고, 주인공의 정체성을 안정적으로 유지하며, 비디오 레퍼런스에서 가장 강한 모션 리듬을, 이미지 레퍼런스에서 분위기를 가져온다.`,
      `이미지 레퍼런스로 색과 스타일을 정하고, 비디오 레퍼런스로 속도감과 카메라 언어를 정해, 결과가 현실적이고 영화적이며 물리적으로 납득되도록 만든다.`,
      `업로드한 레퍼런스의 구도, 움직임, 무드를 따라가며 일관된 조명, 읽기 쉬운 액션, 부드러운 장면 연결을 갖춘 짧고 다듬어진 시퀀스를 생성한다.`,
    ],
    'text-to-image': [
      `젖은 검은 돌 위에 놓인 럭셔리 스킨케어 보틀, 부드러운 스튜디오 림라이트, 절제된 반사, 프리미엄 에디토리얼 구도, 깔끔한 배경, 초정밀 제품 텍스처.`,
      `비 내린 네온 골목에 세워진 미래형 전기 오토바이, 시네마틱한 원근감, 반사되는 노면, 짙은 분위기, 선명한 금속 표면, 하이엔드 콘셉트 아트 수준의 리얼리즘.`,
      `브러시드 스틸 위에 플레이팅된 미니멀 디저트, 탑다운 구도, 확산된 주광, 섬세한 부스러기와 글레이즈 디테일, 프리미엄 푸드 포토그래피 감성.`,
    ],
    'image-to-image': [
      `업로드한 피사체의 정체성과 전체 구도를 유지한 채 조명, 질감 충실도, 최종 완성도를 끌어올려 프리미엄 에디토리얼 이미지처럼 다듬는다.`,
      `업로드한 캐릭터의 실루엣과 포즈는 유지하되, 장면을 더 영화적인 SF 환경으로 재구성해 분위기, 대비, 재질 표현을 한층 더 정교하게 만든다.`,
      `업로드한 이미지를 구도의 기준점으로 삼아 더 깔끔한 상업용 히어로 샷으로 다듬고, 디테일과 하이라이트 제어, 전체 마감 품질을 끌어올린다.`,
    ],
  },
  ar: {
    'text-to-video': [
      `حصان فضي يركض عبر الثلج المتساقط عند الشروق، لقطة واسعة سينمائية، هواء شتوي نقي، ضغط بعدسة طويلة، وقع حوافر قوي، وضبابية حركة طبيعية.`,
      `زجاجة عطر فاخرة فوق حجر بركاني أسود، حركة كاميرا بطيئة إلى الداخل، ضباب متحرك، لمعان مضبوط، إضاءة إعلانية فاخرة، وكشف أنيق.`,
      `قارب ورقي صغير يعبر بركة مطر متوهجة ليلًا، عدسة ماكرو، انعكاسات نيون، عمق مجال ضحل، تموجات هادئة، وأجواء شاعرية.`,
    ],
    'image-to-video': [
      `حافظ على الموضوع والتكوين المرفوعين، ثم أضف حركة كاميرا أمامية ناعمة، وتموجًا خفيفًا في القماش، وحركة شعر دقيقة، وإحساسًا طبيعيًا بالتنفس، وواقعية سينمائية.`,
      `ثبّت هوية الإطار الأول، ثم حرّك انطلاقة قوية مع غبار متصاعد، واستجابة أقوى للرياح، وميل كاميرا متسارع، ومسارات حركة عالية الطاقة.`,
      `ابدأ من الصورة الثابتة المرفوعة ثم انتقل إلى لقطة رئيسية مصقولة مع بارالاكس خفيف، وجزيئات عائمة، ولمعان أنيق، وإيقاع هادئ بطابع فاخر.`,
    ],
    'reference-to-video': [
      `ادمج المراجع المرفوعة في مشهد واحد متماسك، وحافظ على ثبات هوية الشخصية الرئيسية، واستعِر أقوى إيقاع للحركة من مراجع الفيديو، وطابق الأجواء من مراجع الصور.`,
      `استخدم مراجع الصور للألوان والأسلوب، واستخدم مراجع الفيديو للإيقاع ولغة الكاميرا، مع الحفاظ على نتيجة واقعية وسينمائية وقابلة للتصديق بصريًا.`,
      `اتبع المراجع المرفوعة في التكوين والحركة والمزاج، ثم أنشئ تسلسلًا قصيرًا مصقولًا بإضاءة متسقة، وحركة واضحة، واستمرارية سلسة بين اللقطات.`,
    ],
    'text-to-image': [
      `زجاجة عناية بالبشرة فاخرة فوق حجر أسود مبلل، إضاءة حافة ناعمة داخل الاستوديو، انعكاسات مضبوطة، تكوين تحريري فاخر، خلفية نظيفة، وملمس منتج شديد الدقة.`,
      `دراجة كهربائية مستقبلية متوقفة في زقاق نيون ممطر، منظور سينمائي، أرضية عاكسة، أجواء كثيفة، أسطح معدنية حادة، وواقعية عالية بأسلوب concept art فاخر.`,
      `حلوى بسيطة بتنسيق minimal فوق سطح فولاذي مصقول، تكوين من الأعلى، ضوء نهاري منتشر، تفاصيل دقيقة للفتات والتزجيج، وبإحساس تصوير طعام فاخر.`,
    ],
    'image-to-image': [
      `حافظ على هوية العنصر المرفوع والتكوين العام، ثم حسّن الإضاءة ودقة الخامات ومستوى التشطيب البصري ليصبح الناتج أقرب إلى صورة تحريرية فاخرة.`,
      `أبقِ هيئة الشخصية المرفوعة ووضعيتها كما هي، ثم أعد بناء المشهد داخل بيئة خيال علمي أكثر سينمائية مع أجواء أقوى وتباين أغنى ومواد أكثر صقلًا.`,
      `استخدم الصورة المرفوعة كمرساة للتكوين، ثم حوّلها إلى لقطة hero تجارية أنظف مع تفاصيل أوضح وإضاءات مضبوطة وإنهاء بصري أكثر نضجًا.`,
    ],
  },
};

export function getPromptExamples(mode: GeneratorPromptMode, locale?: string) {
  const resolvedLocale = resolveAppLocale(locale);

  return PROMPT_EXAMPLES[resolvedLocale][mode];
}
