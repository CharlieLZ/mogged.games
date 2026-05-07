import { IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL } from '@/shared/lib/imageeditorai-media';

export type NanoImageGalleryCategory =
  | 'Anime & Illustration'
  | 'Collage & Story'
  | 'Creative Concept'
  | 'Fashion & Editorial'
  | 'Fine Art & Poster'
  | 'Photo Restoration'
  | 'Portrait & Avatar'
  | 'Product & Commercial';

export type NanoImageGalleryItem = {
  id: string;
  title: string;
  category: NanoImageGalleryCategory;
  image: string;
  prompt: string;
};

function nanoGalleryImage(fileName: string) {
  return `${IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL}/${encodeURIComponent(fileName)}`;
}

export const NANO_IMAGE_GALLERY_ITEMS = [
  {
    id: 'hyper-realistic-underwater-portrait',
    title: 'Hyper-realistic Underwater Portrait',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage(
      'Hyper-realistic underwater portrait, left half of face .webp'
    ),
    prompt:
      'Hyper-realistic, ultra-detailed close-up portrait showing onlythe left half of my face submerged in water, one eye in sharp focus, positioned on the far left of the frame, light rays creating caustic patterns on the skin, suspended water droplets and bubbles adding depth, cinematic lightingwith soft shadows and sharp highlights, photorealistic textures including skin pores wet lips, eyelashes, and subtle subsurface scattering, surreaand dreamlike atmosphere, shallow depth of field, underwater macro perspective. 3:4 aspect ratio',
  },
  {
    id: 'k-fashion-editorial-portrait',
    title: 'K-Fashion Editorial Portrait',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'K-Fashion Editorial Portrait with Braids and Glasses .webp'
    ),
    prompt:
      'Using the exact facial features from the attached image \nCreate an hyperrealistic and high quality close-up portrait of a styling young woman,  her dark thick long hair styled in twin high artistic braids that falls over her ears, few loose trendils clipped using a different style matte brown statement hair clips ,with few loose strands falls across and frames her face, wearing a drawstring halter top, a thick-frame  brown cat-eye eyeglasses slightly lowered, soft hazel nut eyes, glossy red pouty lips, peached dewy blush and soft warm tone eyeshadows with a little bit shimmers and glitters on her cheeks and under her eyes, artistic brown eyeliner, natural dewy skin, head slightly tilted, relaxed and confident gaze hand-on-cheek pose, minimalistic background, warm beige and brown tones, bright and harsh illumination coming from the camera highlighting the texture of her figure, soft studio background lighting, K-fashion editorial aesthetic, Seoul street style influence, hyper-detailed face texture, cinematic tone, 85mm lens photography, Vogue Korea vibe, stylish and modern mood --ar 2:3 --v 6 --style raw --q 2 --s 250',
  },
  {
    id: 'editorial-3x3-character-study',
    title: 'Editorial 3x3 Character Study',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Editorial 3x3 Photo Grid- Intimate Character Study .webp'
    ),
    prompt:
      'Editorial 3x3 photo grid in a clean soft beige studio. Character (matches reference 100%) wearing lightweight dark navy shirt, ivory trousers, barefoot for raw simplicity. Lighting: large diffused key light directly front-right, silver reflector left, subtle rim from top. Shots to include: 1. extreme close-up of lips + cheekbone with blurred hand partially covering (85mm, f/1.8, razor-thin DOF); 2. tight crop on eyes looking into lens with reflection of light strip visible (85mm, f/2.0); 3. black & white close portrait resting chin on fist, face filling frame (50mm, f/2.2); 4. over-shoulder shot, blurred foreground fabric curtain framing half face (85mm, f/2.0); 5. very close frontal with hands overlapping face, light streak across eyes (50mm, f/2.5); 6. tight angled portrait showing hair falling into eyes, soft-focus background (85mm, f/2.2); 7. crop of hands touching jawline, eyes cropped out (50mm, f/3.2, detail-focused); 8. half-body seated sideways on low cube, head turned sharply away, blurred foreground (35mm, f/ 4.5); 9. intense close-up of profile with single tear-like water droplet, cinematic light slice across (85mm, f/ 1.9). Angles: mostly tight headshots with slight high/low tilts, maintaining variation. Capture RAW, professional muted grade, smooth tonal contrast, subtle cinematic grain. Mood: intimate, introspective, character-led editorial minimalism with delicate use of fabric as prop.',
  },
  {
    id: 'ukiyo-e-modern-tokyo',
    title: 'Ukiyo-e Modern Tokyo Woodblock Print',
    category: 'Anime & Illustration',
    image: nanoGalleryImage('Ukiyo-e Modern Tokyo Woodblock Print .webp'),
    prompt:
      'A Japanese Edo-period Ukiyo-e woodblock print (浮世絵 木版画). The overall feeling is a surreal collaboration between masters like Hokusai and Hiroshige, reimagining modern technology through an ancient lens.\n\n**The Scene:** {argument name="现代场景" default="繁忙的涩谷十字路口"}\n\n**Edo Transformation Logic:**\nCharacters wear Edo-era kimono but perform modern actions. All technology is transformed into surreal Edo equivalents:\n* **Smartphones** are glowing, illustrated paper scrolls being read intently.\n* **Metro stations/Trains** are giant articulated wooden centipede carriages shuffling through crowds.\n* **Skyscrapers** are reimagined as endless, towering wooden pagodas reaching into dramatic clouds.\n* **Robots/Mecha** appear as giant, armored woodblock golems.\n\nThe composition uses a flattened perspective with large, bold, hand-carved ink outlines (太い墨線). The background features heavily stylized Ukiyo-e wave patterns and dramatic, swirling clouds, with a distant Mt. Fuji visible on the horizon.\n\nThe image must look like a physical print, not a digital painting.\n* **Texture:** Strong visible wood grain texture (木目) and rough paper fibers throughout the piece.\n* **Printing Imperfections:** Pigment bleeding is evident. Crucially, simulate hand-pressed plates with slight **color misalignment (版ズレ)** for authenticity.\n* **Color Palette:** Strictly limited to traditional mineral pigments. Dominant use of Prussian blue (浮世絵ブルー), vermilion red, and muted yellow ochre.\n* **Lighting:** Soft, flat, shadow-free lighting with no digital gradients.\n\n* **Aspect Ratio:** 3:4 vertical poster.\n* **Extras:** Include vertical Japanese calligraphy describing the scene and a traditional red artist seal stamp (落款) in a corner.',
  },
  {
    id: 'futuristic-fashion-editorial',
    title: 'Futuristic Fashion Editorial',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Futuristic Fashion Editorial with Sky-Blue Background .webp'
    ),
    prompt:
      '{\n  "type": "image_generation_prompt",\n  "style": "fashion editorial x futuristic",\n  "identity_preservation": {\n    "use_uploaded_image": true,\n    "alter_face": false,\n    "notes": "Use the same face and hairstyle from the uploaded photo. Do not change facial features or facial expression."\n  },\n  "subject": {\n    "gender": "female",\n    "pose": {\n      "position": "seated",\n      "posture": "elegant and relaxed",\n      "expression": "unchanged from the reference image"\n    }\n  },\n  "wardrobe": {\n    "top": "oversized white sweatshirt",\n    "bottoms": "cloudy blue oversized combat jeans",\n    "footwear": "cloudy blue neutral sneakers or Nike sneakers",\n    "socks": "white ribbed socks"\n  },\n  "environment": {\n    "setting": "studio",\n    "background": {\n      "color": "muted sky-blue tone",\n      "style": "clean, minimalist"\n    }\n  },\n  "lighting": {\n    "type": "soft cinematic glow",\n    "effects": [\n      "highlights skin texture",\n      "enhances fabric textures"\n    ]\n  },\n  "composition": {\n    "style": "editorial",\n    "focus": "model-centered with balanced framing"\n  },\n  "quality": {\n    "realism": "photorealistic",\n    "detail_level": "high detail in skin and fabric"\n  },\n  "output_goal": "Create a futuristic fashion editorial image of a woman seated with a relaxed posture in a sky-blue studio environment, preserving her exact facial identity and expression from the reference photo."\n}',
  },
  {
    id: 'pop-art-comic-book-portrait',
    title: '1960s Pop Art Comic Book Portrait',
    category: 'Anime & Illustration',
    image: nanoGalleryImage('1960s Pop Art Comic Book Portrait .webp'),
    prompt:
      'A portrait of the subject rendered in a 1960s comic book pop art style, featuring thick black outlines, saturated blocks of primary colors, and dense halftone dot shading. Facial features should be expressive, stylized, and slightly exaggerated, like a frozen moment from a dramatic panel. The overall composition should be bold and impactful, brimming with pop art energy and vintage print charm. The image should be full-bleed, with no borders.',
  },
  {
    id: 'vogue-cover-fashion-portrait',
    title: 'Vogue Cover Fashion Portrait',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Vogue Cover Fashion Portrait with Playful Duck-Face .webp'
    ),
    prompt:
      'Create a realistic Vogue magazine cover–style fashion portrait using the uploaded face as the original face reference (100% face identity preservation).\n\nA young elegant woman posing confidently, maintaining her original facial features and natural beauty. She is winking with her left eye and making a playful duck-face expression. Both hands are raised, forming a love/heart gesture near her face.\n\nShe is surrounded by multiple DSLR cameras and smartphones held around her, as if paparazzi and photographers are capturing her from all directions. Some phones show her live image on their screens.\n\nAppearance & styling: flawless glowing skin, natural makeup with glossy pink lips, soft blush, subtle highlights. Light brown hair styled in a low, neat updo with a few loose strands.\n\nOutfit & accessories: elegant minimalist beige-white strapless evening dress, Louis Vuitton necklace, diamond ring, luxury fashion jewelry.\n\nPhotography style: close-up to half-body fashion portrait, Vogue editorial aesthetic, cinematic professional studio lighting, soft HDR background, shallow depth of field, realistic skin texture, ultra-detailed, 8K quality.\n\nCamera & lens look: professional DSLR look, 85mm lens feel, f/1.8 aperture, crisp focus with smooth background bokeh.\n\nComposition: Vogue magazine layout with large bold logo at the top, editorial fashion cover framing, clean and elegant design.\n\nMood & vibe: playful yet luxurious, high-fashion beauty editorial, realistic, not AI-looking, photographed by a professional fashion photographer.',
  },
  {
    id: 'lionel-messi-action-figure',
    title: 'Lionel Messi Action Figure',
    category: 'Product & Commercial',
    image: nanoGalleryImage('Lionel Messi Action Figure with World Cup .jpeg'),
    prompt:
      "Create a toy of the person in the photo. Let it be an\naction figure. Next to the figure, there should be the toy's\nequipment like a football and football boot and world cup. Also,\non top of the box, write 'LIONEL MESSI and underneath it,\n'GOAT'.Visualize this in a realistic way.",
  },
  {
    id: 'vintage-polaroid-photos',
    title: 'Vintage Polaroid Photo Set',
    category: 'Collage & Story',
    image: nanoGalleryImage(
      'Vintage Polaroid Photos of an Asian Woman on a Blanket .jpg'
    ),
    prompt:
      '{\n  "prompt": {\n    "subject": {\n      "description": "A collection of five vintage Polaroid instant photographs featuring the same young Asian woman, arranged casually on a textured surface.Use the face without any change",\n      "appearance": {\n        "hair": "Wavy, black hair.",\n        "skin": "smooth and fair skin.",\n        "makeup": "Natural, dewy makeup with defined brows and neutral lip color.",\n        "clothing": "Black tank top.",\n        "accessories": "Gold pendant necklaces."\n      },\n      "poses": [\n        {\n          "photo": "Top left",\n          "description": "Winking, sticking out tongue, making a peace sign."\n        },\n        {\n          "photo": "Top right",\n          "description": "Blowing a kiss."\n        },\n        {\n          "photo": "Center",\n          "description": "Looking off-camera, hand on cheek."\n        },\n        {\n          "photo": "Bottom left",\n          "description": "Making a kissy face, peace sign."\n        },\n        {\n          "photo": "Bottom right",\n          "description": "Laughing broadly, head tilted."\n        }\n      ]\n    },\n    "environment": {\n      "surface": "Thick, cream-colored knit wool blanket with a textured stitch pattern.",\n      "details": "Several red lipstick kiss marks imprinted directly onto the blanket fabric.",\n      "arrangement": "The five Polaroid prints are scattered naturally, overlapping slightly."\n    },\n    "lighting": {\n      "type": "Soft, overhead ambient light, likely natural daylight, illuminating the entire scene.",\n      "photo_lighting": "Direct studio flash within the Polaroid photos, creating a bright, slightly overexposed look with soft shadows."\n    },\n    "mood": "Playful, casual, nostalgic, warm, and personal.",\n    "camera_details": {\n      "style": "Ultra Photorealistic overhead photograph.",\n      "focus": "Sharp focus on the Polaroid prints and the textures of the blanket.",\n      "perspective": "Top-down view.",\n      "film_type": "Vintage Polaroid instant film with classic white borders and slight wear." Ratio 3.4\n    }\n  }\n}',
  },
  {
    id: 'cinematic-triptych-confrontation',
    title: 'Cinematic Triptych Confrontation',
    category: 'Collage & Story',
    image: nanoGalleryImage("Cinematic Triptych- Woman's Confrontation .jpg"),
    prompt:
      'A real-life woman is presented in a vertical triptych collage composition, depicting three consecutive moments (a calm stance, a direct confrontation, and a startled reaction). Each panel deliberately uses left–right offset positioning to create a coherent visual narrative flow.\n\nThe image is shot in a photorealistic, cinematic live-action style, high resolution with subtle natural grain, true contrast, hard natural daylight, a clear blue sky, and deep depth of field consistent with real lens behavior. The scene takes place in an open outdoor environment.\n\nThe subject wears a cowboy hat, a short-sleeve button-up shirt, and a brownish-red long skirt. Her makeup is retro-inspired, with distinct red lipstick and clearly defined eye makeup.\n\nTop panel:\nThe subject is positioned toward the right, leaving open sky on the left. She stands with arms crossed, looking toward the lower-left with a surprised expression.\nMiddle panel:\nThe subject is positioned toward the left, aiming a firearm with the barrel angled toward the lower-right. Her expression is focused and sharp, and the shot is taken from a slightly top-down angle. In this panel, both the subject and the weapon intentionally break through the top and bottom panel borders, overlapping the frame lines to create a clear layered effect. The middle panel serves as the primary visual focal point.\n\nBottom panel:\nThe subject is positioned in the lower-right corner, leaving more negative space on the left. She raises both hands defensively, her eyes naturally widened in surprise, looking toward the upper-left. The subject intentionally breaks the panel frame and overlaps the border lines, forming a distinct layered composition.\nThe image maintains a 2:3 aspect ratio and a photorealistic live-action style, explicitly avoiding illustration or comic aesthetics.',
  },
  {
    id: 'luxury-perfume-campaign',
    title: 'Luxury Perfume Campaign',
    category: 'Product & Commercial',
    image: nanoGalleryImage('Luxury Perfume Product Campaign Image .webp'),
    prompt:
      'Ultra high-end luxury perfume campaign image for a world-class prestige fragrance. Premium rectangular perfume bottle with perfectly balanced proportions, refined, substantial, and timeless. Thick heavy crystal-clear glass with softly rounded edges, visible weight, optical depth. Minimal ivory or warm off-white label centered on bottle with ultra-clean modern sans-serif typography. Champagne-gold or pale-gold brushed metal cylinder cap with precise machining. Three scent-related visual elements based on scent_profile (Floral): structural material forms, botanical or organic references, and atmospheric sensory effects. Elements positioned close to and partially embracing the bottle. Rich noble scent-matched tonal gradient background with depth and luminosity. Museum-quality studio lighting with controlled warm key light, soft sculpting fill, and precise rim light. Perfect premium glass refraction and reflections. Moderate depth of field with razor sharp bottle and label. 3:4 aspect ratio, ultra high detail photorealistic luxury commercial retouching.',
  },
  {
    id: 'professional-dslr-restoration',
    title: 'Professional DSLR Photo Restoration',
    category: 'Photo Restoration',
    image: nanoGalleryImage(
      'Professional DSLR Quality Photo Restoration .webp'
    ),
    prompt:
      'Restore this old photo into professional portrait of DLSR - quality colour and detail, using an advanced upscaling algorithm comparable to the results from canon EOS R6 II. Ensure the restored the image looks natural, retains exact facial features, has great clarity.',
  },
  {
    id: 'cinematic-street-portrait',
    title: 'Cinematic Street Portrait',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage('Cinematic Street Portrait with Motion Blur .png'),
    prompt:
      'Cinematic street photography capturing a moment in motion with a crowd blur effect. Overhead portrait of me standing still on a crosswalk, wearing a white button-up shirt, black oversized jacket, and olive green cargo pants. Motion-blurred crowd rushes past. Moody city lighting, 35mm film aesthetic, shallow depth of field, sharp focus on my portrait, showcasing an artistic and timeless style.',
  },
  {
    id: 'christmas-box-challenge',
    title: 'Christmas Box Challenge Collage',
    category: 'Collage & Story',
    image: nanoGalleryImage('Christmas Box Challenge Photo Collage .jpg'),
    prompt:
      'Use the face without any  change. A high-quality 2x2 creative photo collage of a young woman with long wavy black hair , posing inside cardboard boxes for a Christmas-themed challenge. She wears a cream, red, and green Fair Isle knit sweater.\nLayout & Interaction (Crucial):The right side features a continuous action across two panels. Red wine is poured from the top-right panel and flows vertically down into the bottom-right panel.\nPanel Details:\n\nTop Left: She blows artificial snow from her palms towards the camera.\nBottom Left: She holds glowing fairy lights and a red bauble, smiling warmly.\nTop Right: She leans on the box edge, holding a wine bottle, pouring red wine downwards so the liquid stream exits the bottom of this frame.\nBottom Right: She is positioned below, holding a wine glass that catches the stream of wine pouring down from the panel above. She is looking up, watching the wine flow into her glass.\n\nStyle: Creative box challenge photography, seamless cross-panel interaction, festive mood, soft studio lighting, ultra-realistic textures.',
  },
  {
    id: 'winter-poster-multi-panel',
    title: 'Winter Poster Multi-Panel Collage',
    category: 'Collage & Story',
    image: nanoGalleryImage(
      'Winter Poster-Style Multi-Panel Collage with iPhone .jpg'
    ),
    prompt:
      '{\n  "image_generation_request": {\n    "meta_protocols": {\n      "reference_adherence": {\n        "instruction": "Use the provided photo as a strict face reference.",\n        "tolerance": "Zero deviation",\n        "parameters": "Preserve facial proportions, skin texture, expression, and identity with 100% accuracy.",\n        "stylization_constraint": "Do not stylize or alter facial features."\n      },\n      "format_style": "Editorial winter poster–style multi-panel collage",\n      "aesthetic_quality": "Spontaneous iPhone photography (candid, cozy, realistic)",\n      "global_textures": "Soft snowfall, subtle analog grain, slight handheld imperfections"\n    },\n    "consistent_elements": {\n      "subject_wardrobe": {\n        "coat": "Short faux-fur coat",\n        "legwear": "Black tights",\n        "footwear": "Classic UGG boots",\n        "style_notes": "Simple, cozy, unmistakably winter"\n      },\n      "primary_device": {\n        "model": "iPhone 17 Pro Max",\n        "color": "Silver",\n        "usage": "Held by subject in relevant frames"\n      },\n      "color_palette": [\n        "Warm ambers",\n        "Soft reds",\n        "Pine greens",\n        "Muted winter greys"\n      ]\n    },\n    "layout_configuration": {\n      "panel_1_top_left": {\n        "scene_type": "Reflective shop-window shot at dusk",\n        "lighting_and_atmosphere": "Faint Christmas lights, garlands, frosted glass edges, warm highlights on fur",\n        "subject_action": "Holding phone partially covering face",\n        "optical_effects": "Passing silhouettes, layered reflections, gentle ghosting, natural glass curvature distortion"\n      },\n      "panel_2_top_right": {\n        "scene_type": "Ultra-wide street portrait (snowy sidewalk/Christmas market)",\n        "camera_angle": "Close, downward-angled",\n        "subject_pose": "Leaning forward casually, hands in coat pockets",\n        "visibility_check": "Black tights and UGG boots clearly visible",\n        "motion_dynamics": "Falling snow with slight motion blur",\n        "lens_characteristics": "Subtle perspective warping to reinforce handheld unstaged feel"\n      },\n      "panel_3_bottom_right": {\n        "scene_type": "Intimate overhead selfie",\n        "lighting": "Warm street or café lighting",\n        "props": {\n          "held_item": "Takeaway holiday drink (coffee or mulled wine)",\n          "accessories": "Wired earphones visible"\n        },\n        "texture_focus": "Sharply detailed fur texture and winter fabrics",\n        "mood": "Nostalgic holiday atmosphere enhanced by soft grain"\n      }\n    },\n    "graphic_overlay": {\n      "element": "Minimal Apple Music–style mini player",\n      "content": "Popular Christmas song (e.g., \'Last Christmas\' or \'All I Want for Christmas Is You\')",\n      "style": "Rendered flat and clean, no shadows",\n      "position": "Floating across the center of the collage"\n    }\n  }\n}',
  },
  {
    id: 'neo-chinese-jade-mountain',
    title: 'Neo-Chinese Jade Mountain Range',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage('Neo-Chinese Jade Mountain Range .jpg'),
    prompt:
      'A vertical 3D masterpiece art "The Peaks", Neo-Chinese style. The landscape is a towering mountain range composed of millions of HIGH-FREQUENCY, razor-thin SEDIMENTARY LAYERS. The texture mimics "eroded sandstone strata" or "glacial erosion patterns", creating an incredibly dense, rhythmic, striated look. NOT round noodles, NOT tubes. These are SHARP, thin, stacked sheets of material. Material: Translucent white jade (Subsurface Scattering) with a matte finish. It looks hard but lets light penetrate softly. Deep gorges hold pooled gradients of cyan and mineral green. The scale is massive, emphasized by microscopic pine trees on the ridge edges. Soft volumetric lighting, ethereal atmosphere, 8k, Octane render, ultra-detailed texture.',
  },
  {
    id: 'chibi-miniatures-doodle-effects',
    title: 'Chibi Miniatures with Doodle Effects',
    category: 'Anime & Illustration',
    image: nanoGalleryImage('Chibi Miniatures with Doodle Effects .png'),
    prompt:
      'Surrounding the realistic main subject are multiple cute, 3D-style chibi miniatures of the same person, with identical facial features, hairstyle, body proportions, and outfit. \nThe chibi figures are naturally distributed around the subject, interacting playfully with her or nearby elements in a charming, non-intrusive way.\n\nOverlay the image with vibrant, hand-drawn doodle effects: soft white outlines around the subject, playful sparkles, doodle hearts, tiny flowers, smiley icons, and floating white handwritten phrases like "shine", "bright day", and "happy".\n\nThe style seamlessly blends hyper-realistic photography with colorful, soft cartoon illustrations.\nKeep the original face, body shape, and proportions of the main subject unchanged.',
  },
  {
    id: 'business-portrait-navy-suit',
    title: 'Business Portrait in Navy Suit',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage(
      'Business Portrait in Navy Suit with Cinematic Lighting .png'
    ),
    prompt:
      "Create a picture of business woman/man of the uploaded person wearing a deep navy blue slim-fit suit with a crisp white shirt and patterned tie, positioned against a smooth monochromatic navy background. Soft cinematic side lighting, dramatic shadows, wide-angle framing, full body shot.\nDo not change the person's face, keep 100% same.",
  },
  {
    id: 'high-contrast-classroom-portrait',
    title: 'High-Contrast Classroom Portrait',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage(
      'High-Contrast Classroom Portrait with Sunlight .png'
    ),
    prompt:
      "Create a high-contrast black and white portrait in a quiet classroom.Use uploaded image as reference. Person leans casually on a wooden school chair, legs crossed, wearing the person's own outfit. calm neutral expression. The person left arm rests on the desk, right hand drops casually to the side. Behind the person, an off-white classroom wall with visible wear, pinned papers, photos, and sticky notes in a grid. One page clearly shows the printed word “Silence”, positioned above head. Sunlight enters sharply from the right, casting a triangular beam of light on the wall and her shadow. The contrast is dramatic, cinematic, and natural, with a warm late-afternoon tone",
  },
  {
    id: 'monochromatic-ink-portrait',
    title: 'Monochromatic Ink Portrait',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage(
      'Monochromatic Ink Portrait with Splatter Accents .png'
    ),
    prompt:
      'Transform the input photo into a refined monochromatic ink portrait on a pure white background. Clean side profile facing left, preserving exact facial identity and proportions. Soft charcoal-gray ink with subtle tonal variation, controlled splatter accents, delicate watercolor diffusion, and faint mist-like dispersion along the edges.',
  },
  {
    id: 'miniature-man-in-bathtub',
    title: 'Miniature Man in Bathtub',
    category: 'Creative Concept',
    image: nanoGalleryImage('Miniature Man in Bathtub Held by Giant Hand .png'),
    prompt:
      'Use the attached reference image for the face.\nA miniature man (use the face from the reference photo) is soaking in a small, white, rectangular bathtub with sharp, pointed corners, filled with water and plenty of soap suds. He appears surprised with a tense expression, holding his knees with both hands. His hair is styled exactly as in the reference photo. His body is folded narrowly to fit the bathtub, with his knees bent and his feet together.\nThe bathtub is held by a large hand from below, gripping the outside with curved fingers while the palm supports it.\nThe perspective is a top view with the bathtub in a vertical position, showing almost the entire body from head to toe, and clearly showing the hands holding the tub. The background is a plain dark gray, with dramatic lighting that brings out the realistic details of the skin, soap suds, and hand texture.\nAspect ratio: 3:4',
  },
  {
    id: 'cinematic-70s-lounge-portrait',
    title: 'Cinematic 70s Lounge Portrait',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage(
      'Cinematic Portrait in 70s Lounge with Whiskey and Gun .png'
    ),
    prompt:
      'Create a cinematic portrait of the same person as in the uploaded image, sitting confidently in an elegant vintage pantene green armchair inside a luxurious 70s-inspired lounge. He is wearing a perfectly tailored dark blue three-piece suit, and brown dress shoes. A glass of whiskey rests in his right hand. His expression is thoughtful and composed, exuding power and mystery. The lighting is moody and cinematic, with a mix of cool blue and warm golden tones. On a dark wooden table beside him are a whiskey bottle, an PPK/s Stainless Walnut, illuminated by soft neon reflections. The atmosphere feels like a stylish movie scene or luxury magazine cover — elegant, atlhetic, sheereded, muscular, masculine, and modern-retro. The background is softly blurred, emphasizing the subject’s face and fashion.\n\nUse the attached image and maintain 100% face consistency.',
  },
  {
    id: 'anime-movie-poster',
    title: "Anime Movie Poster: Paramecium-chan's Great Adventure",
    category: 'Anime & Illustration',
    image: nanoGalleryImage(
      "Anime Movie Poster- Paramecium-chan's Great Adventure .jpg"
    ),
    prompt:
      'Create an anime movie poster like a hero cut of this character. Touch tangle, long perspective into the background, low-angle view emphasizing the face. Use the character name as "{argument name="character name" default="Paramecium"}", the movie title as "{argument name="movie title" default="The Great Adventure of Paramecium-chan"}", and the subtitle as "{argument name="subtitle" default="The Secret of the Great Magic Kasseiodei"}".',
  },
  {
    id: 'knight-mecha-girl-figure',
    title: 'Knight Mecha Girl 1:7 Scale Figure',
    category: 'Product & Commercial',
    image: nanoGalleryImage('Knight Mecha Girl 1:7 Scale Figure .jpg'),
    prompt:
      'KNIGHT MECHA GIRL\nNo.203 Umbra Directive\n\n1/7スケールフィギュア',
  },
  {
    id: 'trendy-lifestyle-bridge-photo',
    title: 'Trendy Lifestyle Bridge Photo',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Trendy Lifestyle Photo on Modern White Bridge .jpg'
    ),
    prompt:
      'A trendy aesthetic lifestyle photo of a young woman standing outdoors on a modern white bridge with elegant architectural details, use reference image face and preserve identity strictly, do not change facial features, proportions, skin tone, or expression, maintain exact likeness.\nOutfit: soft satin pink dress with a silky texture, slightly reflective fabric, elegant and fitted style, paired with a loose white shirt falling off the shoulders.\nPose: relaxed and confident pose, leaning slightly against the railing, natural body posture, soft expression.\nEnvironment: clean white bridge with decorative railings, soft evening sky, warm ambient lighting, subtle city buildings and greenery in the background, string lights above creating a cozy aesthetic vibe.\nLighting: soft golden hour lighting mixed with cool evening tones, smooth skin highlights, natural shadows, cinematic color grading.\nCamera: slightly angled eye-level shot, 50mm lens, shallow depth of field, sharp focus on subject, background softly blurred (bokeh).\nStyle: ultra realistic, Instagram aesthetic, soft luxury vibe, clean composition, high-end lifestyle photography.\nQuality: 8k, HDR, photorealistic, high detail, natural skin texture, sharp focus.',
  },
  {
    id: 'basketball-court-squat-portrait',
    title: 'Basketball Court Lifestyle Portrait',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage('Young Woman Squatting on Basketball Court .jpg'),
    prompt:
      '{\n  "image_generation_prompt": {\n    "subject": {\n      "description": "Young woman squatting on an outdoor basketball court holding a basketball close to her face, Use uploaded reference image, keep identity exact",\n      "identity_lock": "STRICT — Use uploaded reference image, keep identity exact. Preserve facial features, skin tone, eyes, and proportions. Do not alter identity.",\n      "pose": {\n        "body_position": "deep squat position with heels raised slightly",\n        "legs": "knees bent fully, feet close together",\n        "torso": "upright with slight forward lean",\n        "arms": "one hand holding basketball near cheek, other arm relaxed near knee",\n        "head_position": "tilted slightly toward ball",\n        "expression": "soft confident gaze toward camera with slightly parted lips"\n      }\n    },\n    "face_details": {\n      "instruction": "Use uploaded reference image, keep identity exact",\n      "expression": "confident, relaxed, slightly playful",\n      "skin": "realistic texture with visible pores and natural glow from sunlight",\n      "eyes": "sharp with warm sunlight reflections",\n      "imperfections": "natural asymmetry and skin variation"\n    },\n    "hair": {\n      "instruction": "Preserve hairstyle exactly",\n      "style": "long straight hair falling over shoulders",\n      "details": "natural movement, slight wind or softness"\n    },\n    "makeup": {\n      "style": "natural glam",\n      "skin_finish": "warm sunlit glow",\n      "eyes": "light eyeliner and mascara",\n      "lips": "natural glossy tone",\n      "imperfection": "slightly imperfect blending for realism"\n    },\n    "clothing": {\n      "outfit": "white fitted crop top and orange athletic shorts",\n      "footwear": "clear high-heeled shoes with socks",\n      "accessories": "bracelets and glasses",\n      "details": "natural fabric folds, slight stretch"\n    },\n    "environment": {\n      "setting": "outdoor basketball court",\n      "surface": "reddish court with white curved line markings",\n      "props": "basketball with visible branding",\n      "background": "trees, fence posts, and soft blurred park environment"\n    },\n    "lighting": {\n      "type": "golden hour sunlight",\n      "style": "warm directional light from side",\n      "effect": "strong warm highlights and soft long shadows",\n      "shadows": "soft elongated shadows on ground",\n      "imperfections": "slight overexposure on highlights"\n    },\n    "camera": {\n      "type": "digital camera",\n      "lens": "50mm",\n      "angle": "slightly low angle at subject level",\n      "distance": "medium full-body framing",\n      "focus": "sharp on subject with soft background blur",\n      "imperfections": "slight lens softness, natural grain"\n    },\n    "composition": {\n      "style": "lifestyle editorial",\n      "framing": "full body centered composition",\n      "balance": "subject centered with leading court l"\n    }\n  }\n}',
  },
  {
    id: 'rose-blackpink-sunset-beach',
    title: 'Rosé Sunset Beach Portrait',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage('Rosé (BLACKPINK) Sunset Beach Portrait .jpg'),
    prompt:
      '{\n  "raw_prompt": "A high-resolution portrait of Rosé (BLACKPINK) at a beach during sunset. She has long, strawberry blonde hair with blunt bangs, styled in a ponytail. She wears a soft pastel pink crochet two-piece set consisting of a strapless bandeau top and a matching high-waisted skirt. She is adorned with large, gold floral statement earrings. She stands with her back to the camera, looking over her shoulder with a soft, cinematic gaze. The background features a white-clothed table on a sandy beach, a wooden chair, and the ocean under a warm, golden hour sky. Shot on 35mm lens, soft natural lighting, warm color grading. --ar 9:16",\n  "aspect_ratio": "9:16",\n  "subjects": [\n    {\n      "name": "{argument name=\\"subject name\\" default=\\"Rosé (BLACKPINK)\\"}",\n      "physical_features": "Long strawberry blonde hair with bangs in a ponytail, fair skin, soft elegant makeup with winged eyeliner.",\n      "outfit": {\n        "bottom": "Pastel pink crochet knit form-fitting midi skirt.",\n        "top": "Pastel pink crochet knit strapless bandeau top.",\n        "accessories": "Oversized metallic gold triple-flower drop earrings."\n      },\n      "pose_and_expression": "Standing with back to camera, torso turned 45 degrees, head turned back to look directly at the lens; calm and sophisticated expression."\n    }\n  ],\n  "environment": "Outdoor luxury beach dining setup at sunset, white linen table, wicker chair, driftwood, calm sea, and orange-hued sky.",\n  "photography_and_lighting": {\n    "camera_style": "35mm professional photography, cinematic depth of field.",\n    "lighting": "Golden hour backlight, soft diffused glow on skin.",\n    "color_grading": "Warm tones, high saturation in oranges and golds, soft shadows."\n  }\n}',
  },
  {
    id: 'coquette-bedroom-portrait',
    title: 'Coquette Bedroom Portrait',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage('Coquette Aesthetic Bedroom Portrait .jpg'),
    prompt:
      '{\n  "image_prompt": {\n    "subject": {\n      "appearance": "Young woman with long wavy reddish-brown hair styled half-up, half-down with a silver star hair clip. She has light freckles, soft natural makeup, and is smiling warmly at the camera.",\n      "pose": "Squatting gracefully on a small, gold geometric wire stool. Her body is angled slightly to the side, but her face is turned towards the viewer."\n    },\n    "wardrobe": {\n      "top": "White satin corset-style camisole with thin straps and lace trim.",\n      "bottom": "Light grey pleated mini skirt with a thin pink stripe detail near the hem.",\n      "hosiery": "Sheer white thigh-high stockings with wide lace tops.",\n      "socks": "Thick, ribbed white slouch socks layered over the ankles.",\n      "shoes": "Chunky white platform sneakers.",\n      "accessories": "Pink strappy leg garter with small pearls and a gold bell worn on the right thigh."\n    },\n    "environment": {\n      "setting": "A bright, cozy pastel pink bedroom.",\n      "decor": "Walls decorated with cute pastel posters including Hello Kitty. A wooden dresser in the background draped with warm white fairy lights. A fluffy white rug on the floor.",\n      "background_elements": "A white-framed floor mirror reflecting fairy lights, and a neatly arranged row of colorful high heels (pink, magenta, white) on the floor in the background."\n    },\n    "lighting_and_style": {\n      "lighting": "Bright, natural daytime sunlight streaming into the room, creating a soft, airy atmosphere with gentle, luminous shadows.",\n      "aesthetic": "Photorealistic, coquette, soft girl aesthetic, highly detailed, vibrant pastel color palette."\n    },\n    "full_composite_prompt": "A photorealistic portrait of a young woman with long wavy reddish-brown hair styled half-up with a star clip, smiling at the camera. She is squatting on a small gold geometric wire stool. She is wearing a white satin lace-trim corset top, a light grey pleated mini skirt with pink trim, a pink leg garter with pearls, sheer white lace-top thigh-high stockings, chunky white ribbed slouch socks, and thick white platform sneakers. The setting is a bright pastel pink bedroom decorated with Hello Kitty posters, a wooden dresser with fairy lights, a fluffy white floor rug, and a row of high heels on the floor. Bright natural sunlight, airy atmosphere, coquette aesthetic, 8k resolution, highly detailed."\n  }\n}',
  },
  {
    id: 'luxury-tennis-editorial',
    title: 'Luxury Tennis Editorial 2x2 Grid',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Luxury Tennis Editorial 2x2 Grid with Elegant Woman .jpg'
    ),
    prompt:
      '{\n  "generation_request": {\n    "meta_data": {\n      "tool": "NanoBanana Pro",\n      "task_type": "luxury_tennis_editorial_2x2_grid",\n      "language": "en",\n      "priority": "highest",\n      "version": "v1.0_BLUE_GREEN_TENNIS_2X2_EDITORIAL"\n    },\n\n    "input": {\n      "mode": "image_to_image",\n      "multi_reference": true,\n      "reference_image_usage": "very_high",\n      "preserve_identity": true,\n      "notes": " Create a photoreal 2x2 luxury tennis editorial collage featuring the elegant woman across all four panels. Keep facial identity highly consistent. Include blue and green outfit variations inspired by premium tennis fashion. Each panel must have a distinct pose, strong composition, and fashion-campaign energy."\n    },\n\n    "output_settings": {\n      "aspect_ratio": "4:5",\n      "orientation": "portrait",\n      "resolution_target": "ultra_high_res",\n      "num_images": 1,\n\n      "layout": {\n        "type": "grid",\n        "rows": 2,\n        "cols": 2,\n        "gutter": "thin",\n        "outer_border": "none",\n        "panel_consistency": "maximum_identity_lock"\n      },\n\n      "render_style": "luxury_sport_fashion_editorial",\n      "sharpness": "editorial_crisp",\n      "grain": "subtle_film",\n      "dynamic_range": "sunlit_clean_contrast",\n      "color_grade": "fresh_soft_summer"\n    },\n\n    "subject": {\n      "identity": " elegant athletic woman in all four panels",\n      "hair": "long softly styled hair or sleek sporty ponytail depending on pose, polished and feminine",\n      "makeup": "clean glowing skin, soft bronzed contour, glossy natural lips, refined sporty beauty look",\n      "body": "lean athletic feminine proportions, elegant posture, natural anatomy"\n    },\n\n    "outfit_direction": {\n      "panel_1": "soft pastel blue luxury tennis dress, fitted bodice, subtle pleated skirt, refined premium fabric",\n      "panel_2": "fresh matcha green tennis set with fitted top and pleated mini skirt, modern and sculpted",\n      "panel_3": "icy aqua blue sleeveless tennis look, elegant waist definition, elevated sporty chic styling",\n      "panel_4": "light sage green premium tennis dress or coordinated set, feminine and polished"\n    },\n\n    "accessories": {\n      "shoes": "clean luxury white tennis shoes",\n      "jewelry": "minimal delicate jewelry only",\n      "optional_items": "one panel may include elegant sunglasses or a cap, but not all panels",\n      "racket": "premium tennis racket included naturally in selected poses",\n      "ball": "tennis ball used in one or two panels only"\n    },\n\n    "scene": {\n      "environment": "luxury outdoor tennis court under clean natural sunlight",\n      "court_style": "editorial clay or pastel-toned court aesthetic with premium resort-club atmosphere",\n      "background": "minimal and elegant, with soft greenery, clean lines, and no visual clutter",\n      "mood": "fresh, stylish, sporty, feminine, expensive, summer editorial"\n    },\n\n    "panel_direction"',
  },
  {
    id: 'japanese-four-panel-manga',
    title: 'Japanese 4-Panel Manga',
    category: 'Anime & Illustration',
    image: nanoGalleryImage(
      'Japanese 4-Panel Manga- Hero and Outlaw in Alleyway .jpg'
    ),
    prompt:
      'Format: Japanese 4-panel manga, 4 vertical tiers, grayscale, seinen manga, exaggerated expressions.\nSetting: Fantasy world, slum alleyway, dim atmosphere, cobblestones and dirty walls, trash and barrels are placed around.\n\n[Character Settings]\n・Rough Man: Outlaw who failed as an adventurer, scarred face, stubble, shabby leather gear, ugly man with a bad attitude.\n・Female Hero: Beautiful woman, well-defined features, dignified eyes, clean light armor or hero-style gear, strong-willed expression.\n\n[Panel 1]\nComposition: Alleyway, the rough man pushes the female hero against the wall (kabedon).\nThe man standing on the right is smirking, the female hero cornered against the wall on the left has a frustrated expression.\nDialogue:\nRough Man: "Well, well, look how docile the Hero-sama has become."\nFemale Hero: "Ugh... you scum..."\n\n[Panel 2]\nComposition: Still in the kabedon pose, slightly zoomed in, the man on the right has a confident smile, the female hero glares back.\nDialogue:\nRough Man: "You\'re quite the eccentric Hero-sama... to fall for an ugly guy like me."\nFemale Hero: "Stop implying that I\'m a pervert!"\n\n[Panel 3]\nComposition: Female Hero\'s serious face, extreme close-up, front view.\nDialogue:\nFemale Hero: "Your appearance and personality are trash, but your \'stuff\' is superb. You should be aware of your own capabilities."\nThe female hero gives a thumbs-up with a serious face.\n\n[Panel 4]\nComposition: Upper body of the man, looking away, face red, confused and flustered. He is fidgeting with his hand on his head.\nBackground is the alleyway. Onomatopoeia effects like "Doki Doki" (heartbeat).\nDialogue:\nRough Man: "Eh, ah, yes... thank you very much..."',
  },
  {
    id: 'surreal-oversized-head-interior',
    title: 'Surreal Oversized Head Interior',
    category: 'Creative Concept',
    image: nanoGalleryImage(
      'Surreal Interior with Oversized Head and Figure .jpg'
    ),
    prompt:
      'Surreal conceptual scene with scale distortion, minimalist modern interior with soft natural light, wooden floor and clean geometric wall shapes, subject sitting casually with legs apart on top of an oversized realistic human head placed on the floor, wearing casual outfit ({argument name="outfit description" default="green oversized sweater, beige pants, white sneakers"}), using exact face and identity from reference image for both body and oversized head, head highly detailed and realistic with glasses and skin texture, body slightly cropped at neck creating surreal effect, subject pointing forward confidently, balanced composition, soft shadows, neutral color palette, clean aesthetic, ultra-realistic textures, conceptual art photography style, shot on Fujifilm GFX100, 50mm lens, f/2.8, high detail, modern art vibe',
  },
  {
    id: 'instagram-beauty-carousel',
    title: 'Instagram Beauty Carousel Grid',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Instagram Beauty Carousel Grid with Consistent Model .jpg'
    ),
    prompt:
      'Create a hyper-realistic 4x3 Instagram beauty carousel grid featuring the same woman across twelve panels with very strong facial consistency. The overall result should feel like a viral beauty and style carousel post from a top beauty influencer: fresh, addictive, stylish, feminine, photoreal, and instantly eye-catching. Every panel should feel like a different saved-worthy selfie moment, with curated hair, outfit, angle, and expression changes. The whole grid must look cohesive, luxurious, trendy, and socially viral. The subject must be the same woman in all twelve panels with strict face consistency, same bone structure, same lips, same nose, same eyes, same proportions. Beauty style: fresh soft glam, glossy lips, luminous realistic skin, subtle blush, defined lashes, expressive eyes, clean beauty finish. Hair variations include: pink sleek bob, long dark glossy waves, honey blonde blowout, copper shoulder-length cut, soft brunette layers, sleek black straight hair, curtain bangs with long brunette hair, short blunt bob, loose soft waves, half-up glossy style, high ponytail with face-framing strands, messy chic bun with soft tendrils. Outfit variations include: white ribbed tank top, striped fitted camisole, black minimal cami, soft beige knitwear, off-shoulder cream top, simple black dress, light grey fitted tee, minimal lounge top, soft pink knit top, casual chic crop top, open button-down shirt over cami, sleek neutral slip-style top. Environment: soft neutral indoor setting with clean walls, subtle depth, natural lifestyle background, minimal distractions. Mood: viral, fresh, trendy, feminine, stylish, playful, saved-worthy, high-engagement beauty dump. Panel priority: panel_1 strongest viral opening image, panel_2 soft pout selfie, panel_3 playful side glance, panel_4 serious cool-girl stare, panel_5 hero center beauty shot, panel_6 hand near lips flirtatious, panel_7 angled mirror-like selfie, panel_8 soft smile warm, panel_9 close crop dramatic hair, panel_10 neutral clean-girl pose, panel_11 slightly messy candid, panel_12 final polished selfie. Poses: head tilt, chin slightly raised, camera angled from above, camera angled slightly below, hand touching hair, hand near cheek, hand near lips, close-up crop, soft shoulder turn, straight-on beauty angle, slightly off-center, mirror-style posture. Expressions: soft smile, glossy pout, neutral gaze, serious stare, playful expression, side glance, relaxed candid look, confident beauty face. Camera: premium smartphone front-camera realism, iPhone-like beauty selfie look, close-up and medium-close framing, handheld selfie angles with natural variation, sharp focus on eyes, lips, skin texture, and hair detail. Lighting: natural window light mixed with soft ambient indoor light, flattering, realistic, bright but soft, natural skin texture with visible pores, realistic highlights, no plastic smoothing. Aspect ratio 4:5 portrait, ultra high resolution, 4x3 grid layout with thin gutter, no outer border, maximum identity lock. Render style: viral Instagram beauty editorial, ultra skin detail, very subtle grain, soft but crisp dynamic range, clean warm luxury beauty color grade. Must have: 4x3 grid, same woman in all panels, maximum identity preservation, different hair colors and lengths, different outfits, different selfie angles, different facial expressions, fresh glam aesthetic, realistic smartphone selfie style, photoreal quality, no text. Negative prompt: identity drift, different person, same hairstyle repeated, same outfit repeated, duplicate selfie angles, blurry face, warped facial features, asymmetrical eyes, bad anatomy, extra fingers, deformed hands, plastic skin, over-retouched look, studio photography, DSLR editorial instead of selfie, cartoon, logo, watermark, text.',
  },
  {
    id: 'inner-monologue-depression-patient',
    title: 'Inner Monologue Sketch Portrait',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage('Inner Monologue of a Depression Patient .jpg'),
    prompt:
      'This is the inner monologue expression of a depression patient, who repeatedly says "{argument name="monologue" default="Everything is alright"}". The image should be presented in a {argument name="style" default="rough sketch style"}.',
  },
  {
    id: 'emma-myers-winter-fantasy',
    title: 'Winter Fantasy Editorial with Snowman',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Emma Myers in Winter Fantasy Editorial with Snowman .jpg'
    ),
    prompt:
      '{\n  “meta”: {\n    “quality”: “ultra-photorealistic, raw style, 8k, highly detailed skin and fabric textures”,\n    “camera”: “iPhone 15 Pro Max, professionally lit studio setup”,\n    “lighting”: “bright, even studio illumination, high-fashion editorial standard, soft winter shadows, subtle glisten on snow”,\n    “style”: “Winter Fantasy Editorial, Snow Queen aesthetic, specific subject preservation”,\n    “aspect_ratio”: “9:16”\n  },\n  “scene”: {\n    “location”: “A minimalist, seamless white studio environment. The floor is covered in realistic, scattered patches of fresh white snow and solid ice blocks. Delicate, frosted tree branches hang gracefully from above.”,\n    “atmosphere”: “Ethereal, fantasy-laden, sophisticated, with a sense of playful innocence and winter serenity.”\n  },\n“subject”: {\n    “gender”: “female”,\n    “name”: “Emma Myers”,\n    “body”: {\n      “type”: “Naturally slender and elegant figure, in a graceful crouching pose, body angled towards a snowman.”\n    },\n    “face”: {\n      “features”: “Emma Myers’s distinct facial structure, natural brunette hair styled in a sophisticated updo. Her eyes are closed as she leans against the snowman.”,\n      “expression”: “A soft, serene expression of affection, cheek pressed gently against the snowman’s face.”\n    },\n    “outfit”: {\n      “description”: “A white, sparkling strapless bustier top paired with a layered white tulle ballet tutu mini-skirt. The fabric features fine crystalline shimmer.”,\n      “fit”: “Tailored, delicate, and high-fashion.”,\n      “accessory”: “An intricate snowflake-themed hairpiece with a long, sheer tulle veil flowing behind.”\n    },\n“footwear”: {\n      “description”: “High-heeled d’orsay sandals made of completely transparent PVC. The upper features embedded, intricate white lace-like embellishments. The bare skin of her ankles and feet is fully visible through the clear material, with the transparent PVC resting directly against the skin.”,\n      “fit”: “Sleek and delicate, emphasizing the bare skin within the transparent structure.”\n    },\n“pose”: “Crouching on the floor, body angled toward the snowman. The right leg is bent, and the left leg is slightly forward with both feet flat. Her right arm is wrapped affectionately around the snowman, head tilted up to press her cheek against it.”\n  },\n  “composition”: “Full-body vertical medium-shot, perfectly centering the subject and the snowman. The snowman is highly detailed with a carrot nose, coal eyes, coal buttons, twig arms, and a defined mouth. Background elements like snow patches and hanging branches are clear and in sharp focus. High contrast between the white textures and the subject.”\n}',
  },
  {
    id: 'miniature-artist-fingernail',
    title: 'Miniature Artist Painting on Giant Fingernail',
    category: 'Creative Concept',
    image: nanoGalleryImage(
      'Miniature Artist Painting on Giant Fingernail .jpg'
    ),
    prompt:
      '{\n  "title": "Miniature Artist Painting on Giant Fingernail",\n  "style": "Ultra-realistic, macro photography",\n  "aspect_ratio": "9:16",\n  "scene": {\n    "description": "A close-up of a tiny young artist sitting on a chair, painting a highly detailed portrait on the underside of a giant human thumbnail resting on a wooden table.",\n    "scale_contrast": "Artist is miniature, fingernail is gigantic"\n  },\n  "subject": {\n    "artist": {\n      "pose": "Seated on a chair",\n      "action": "Painting with a thin brush",\n      "props": ["Round paint palette"]\n    },\n    "painting": {\n      "type": "Hyper-realistic portrait",\n      "reference": "Uploaded image",\n      "placement": "Seamlessly blended onto the nail surface",\n      "details": "Soft lighting, fine brushstrokes, natural texture integration"\n    }\n  },\n  "environment": {\n    "surface": "Wooden table",\n    "objects": [\n      "Small paint pots",\n      "Paint brushes",\n      "Glass vase with colorful flowers",\n      "Additional painting of the artist"\n    ],\n    "background": "Softly blurred for depth of field"\n  },\n  "materials": {\n    "fingernail": {\n      "texture": "Smooth, glossy",\n      "realism": "Highly detailed, natural skin and nail texture"\n    }\n  },\n  "lighting": {\n    "type": "Soft, natural lighting",\n    "effect": "Enhances realism and highlights fine details"\n  },\n  "focus": {\n    "primary": "Intricate painting on the nail",\n    "secondary": "Miniature artist and surrounding tools"\n  }\n}',
  },
  {
    id: 'impasto-oil-painting-portrait',
    title: 'Impasto Oil Painting Portrait',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage(
      'Impasto Oil Painting Portrait of a Woman in a Straw Hat .jpg'
    ),
    prompt:
      'Impasto oil painting portrait of a young woman [use the uploaded photo as reference], with red lips, and long brown hair. She wears a wide-brimmed straw hat and a vibrant blue off-the-shoulder dress, gently holding a small bouquet of white daisies. The background features a softly blurred golden field illuminated by warm, natural golden-hour sunlight. Heavy, expressive palette knife strokes create deep, tactile textures in the clothing, hair, and background. The mood is romantic and serene, utilizing a vibrant color palette dominated by warm golds, rich blues, and stark whites. Highly detailed, 4k resolution masterpiece.',
  },
  {
    id: 'dune-moebius-style-poster',
    title: 'Dune Protagonists in Moebius Style Poster',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage('Dune Protagonists in Moebius Style Poster .jpg'),
    prompt:
      'A poster for Dune, the main subject is all the protagonists (without mentioning detailed personnel), the background is the desert, and the style is Moebius (Mobis Style)',
  },
  {
    id: 'bach-heaven-business-earth',
    title: 'Bach in Heaven, Business on Earth',
    category: 'Collage & Story',
    image: nanoGalleryImage('Bach in Heaven, Business on Earth .jpg'),
    prompt:
      '4-panel comic\n\nTitle\n"Bach in Heaven, Business on Earth"\n​or\n"The Light and Shadow of the Critical Edition (Urtext)"',
  },
  {
    id: 'cinematic-starry-sky-portrait',
    title: 'Cinematic Portrait Under Starry Sky',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage('Cinematic Portrait Under Starry Sky .jpg'),
    prompt:
      'Cinematic ultra-realistic wide-shot portrait of {argument name="person description" default="[the exact person / same face, body, and likeness as the uploaded reference photo]"}, sitting relaxed on the hood of a classic or modern car parked in an open remote area at night, gazing upward in awe at an enormous, crystal-clear starry sky filled with the dense Milky Way galaxy, countless bright stars, subtle nebulae, and shooting stars streaking across. Deep dark indigo-black sky with vibrant star fields, faint aurora hints or meteor trails for extra magic, warm subtle glow from car headlights or interior lights casting soft rim light and highlights on the figure and car hood. Person leaning back slightly on hands or arms crossed, thoughtful or peaceful expression, wind lightly moving hair/clothing. Vast empty landscape with no other lights or people for maximum isolation and wonder. Low to mid-angle cinematic composition, 24mm or 35mm lens look, shallow depth of field focusing sharply on the person and car while stars remain pin-sharp, high dynamic range with deep blacks and glowing star points, subtle film grain, emotional contemplative and cosmic mood, shot in the style of interstellar adventure cinema like Interstellar.',
  },
  {
    id: 'american-id-photo-portrait',
    title: 'Professional American ID Photo',
    category: 'Portrait & Avatar',
    image: nanoGalleryImage('Professional American ID Photo Portrait .jpg'),
    prompt:
      'Smart professional ID photo, overall style referencing American ID photos, with the subject size being moderate. Use a subtle gray-to-white gradient photographic background, soft and natural lighting, highlighting realistic skin tone and layering. The image should be clear and high-quality, with the face in focus, transparent and good skin texture, and a comfortable, normal head-to-shoulder ratio. The overall temperament is modern and elegant, with a relaxed, naturally confident expression and bright, expressive eyes. Medium shot portrait, moderate subject size, centered subject, low contrast, presenting the refined quality of professional portrait photography. Suitable for business and professional headshots. Aspect ratio 3:4',
  },
  {
    id: 'low-angle-luxury-fashion',
    title: 'Low-Angle Luxury Fashion Campaign',
    category: 'Fashion & Editorial',
    image: nanoGalleryImage(
      'Luxury Fashion Campaign- Low-Angle Floral Portrait .jpg'
    ),
    prompt:
      'Ultra-realistic, extremely low-angle shot (from grass level), directed vertically upward toward the model, using the uploaded reference link as the basis for identity. Preserve the exact facial structure, proportions, expression, and natural skin texture. Strict identity lock. No accessories. No alteration of facial features.\nThe model leans toward the camera, extending one hand forward toward the lens, creating a dramatic perspective with a strong depth effect. Direct, confident gaze.\nThe model is wearing a premium brown leather Armani bomber jacket with a matte smooth texture and natural creases. Underneath is a minimalist black fitted T-shirt. Dark blue wide-leg jeans made from heavy denim with natural fabric texture. White leather sneakers with clean stitching and minimal branding.\nThe model is positioned inside a dense circular dome of tall stems of {argument name="flowers" default="[WRITE YOUR FLOWERS]"}, forming a natural circular frame from the edges of the frame toward the center. The petals are natural, opaque, with realistic texture and slight natural imperfections.\nShot on a full-frame camera with an ultra-wide 14mm lens, aperture f/8 for deep depth of field (the face remains sharp), ISO 100 to eliminate noise, and a high shutter speed for crystal-clear detail.\nHard directional daylight as the only light source. High contrast with deep, dense shadows on the facial structure and folds of clothing. No fill light.\n8K resolution, hyper-realism, clean image with no grain, sharp skin texture and detailed fashion elements. Experimental aggressive perspective as a stylistic technique. High-energy fashion aesthetic. Bold, confident visual language suitable for a luxury fashion campaign.',
  },
  {
    id: 'double-exposure-lake-portrait',
    title: 'Double Exposure Lake Portrait',
    category: 'Fine Art & Poster',
    image: nanoGalleryImage(
      'Double Exposure Portrait with Lake Landscape .jpg'
    ),
    prompt:
      'double exposure portrait of the character(reference image) in side profile looking left, blending into bare tree branches, surreal artistic composition, inside the silhouette a peaceful lake landscape with mountains and mist, a small character(of the same reference image) in a standing on mossy rocks holding a curved tree trunk, dreamy atmosphere, soft natural light, minimal white background, ethereal and poetic mood, fine art photography, ultra detailed, cinematic lighting, high resolution, poster design.',
  },
  {
    id: 'digital-scrapbook-birthday-card',
    title: 'Digital Scrapbook Birthday Card',
    category: 'Collage & Story',
    image: nanoGalleryImage(
      'Photorealistic Digital Scrapbook Collage Birthday Card .jpg'
    ),
    prompt:
      'Use the uploaded photo as the ONLY facial reference. Face must remain identical to reference. A high-resolution, photorealistic digital scrapbook collage featuring five photos of a woman with long wavy dark hair wearing a red sleeveless sweetheart-neckline dress with white polka dots. Center a square portrait, surrounded by four tilted Polaroid-style photos showing her in various poses. Use soft, warm natural lighting against light gray backgrounds within the photos. Elegant bold red cursive text reading "{argument name="text" default="HAPPY BIRTHDAY"}" on The top of the collage. Set the layout on a white grid paper background framed by pastel pink and green floral borders. Add sticker-like scrapbook decorations: pink paper tape, pink ribbon bows, red and pink hearts, hand-drawn black arrows, butterflies, and small stars. Create a cheerful, nostalgic, and romantic mood with sharp fabric textures and highly detailed features, vertical portrait, 4K quality.',
  },
] as const satisfies readonly NanoImageGalleryItem[];
