import { IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL } from '@/shared/lib/imageeditorai-media';

export type UseCase = {
  id: string;
  title: string;
  beforeImage: string;
  afterImage: string;
  previewBeforeImage?: string;
  previewAfterImage?: string;
  prompt: string;
  recommended?: boolean;
};

function useCaseImage(fileName: string) {
  return `${IMAGEEDITORAI_NANO_PROMPT_ASSET_BASE_URL}/${fileName}`;
}

export const USE_CASES = [
  {
    id: 'caricature-trend',
    title: 'Caricature Trend',
    beforeImage: useCaseImage('engineer-portrait.webp'),
    afterImage: useCaseImage('engineer-portrait-effect.webp'),
    prompt:
      'Create a humorous caricature of an engineer holding oversized blueprints, surrounded by gadgets, exaggerated facial features, playful expression, cartoon style, preserve identity, dynamic perspective, vibrant colors.',
    recommended: true,
  },
  {
    id: 'professional-business-photo',
    title: 'Professional Business Photo',
    beforeImage: useCaseImage('business-photo.webp'),
    afterImage: useCaseImage('business-photo-effect.webp'),
    prompt:
      'Keep the facial features of the person in the uploaded image exactly consistent. Dress them in a professional navy blue business suit with a white shirt, similar to the reference image. Place the subject against a clean, solid dark gray studio photography backdrop with a subtle gradient and vignette effect. Use a Sony A7III with an 85mm f/1.4 lens, classic three-point lighting, natural skin texture, catchlights in the eyes, subtle wool texture in the suit, and an ultra-realistic 8k professional headshot finish.',
    recommended: true,
  },
  {
    id: 'santa-hat',
    title: 'Santa Hat',
    beforeImage: useCaseImage('santa-hat.webp'),
    afterImage: useCaseImage('santa-hat-effect.webp'),
    prompt:
      'Add a realistic Santa hat to each visible subject in the uploaded image. Automatically detect all subjects with visible heads, including people or animals, and place one Santa hat on each subject. Keep every hat correctly scaled, positioned, and aligned with the head shape, head angle, and hair or fur line. Preserve faces, expressions, pose, body, clothing, background, lighting, camera angle, and image style. Only add Santa hats.',
    recommended: true,
  },
  {
    id: 'zootopia-selfie',
    title: 'Zootopia Selfie',
    beforeImage: useCaseImage('zootopia-selfie.webp'),
    afterImage: useCaseImage('zootopia-selfie-effect.webp'),
    prompt:
      'Create an ultra-realistic selfie photo. Use the uploaded image as the exact character reference - do not modify facial features, hairstyle, clothing, or accessories. Add Judy Hopps from Zootopia standing next to the real person in a dark, crowded movie theater, with a cinema screen in the background showing a Zootopia scene. Use selfie composition, warm ambient screen glow, shallow depth of field, sharp focus on both subjects, and ultra-HD hyper-realistic photography.',
    recommended: true,
  },
  {
    id: 'rim-light-portrait',
    title: 'Rim Light Portrait',
    beforeImage: useCaseImage('rim-light-portrait-before.webp'),
    afterImage: useCaseImage('rim-light-portrait-after.webp'),
    prompt:
      'Transform the image into a top-tier, studio-style, close-up face portrait. The subject wears a fitted black turtleneck knit sweater with clear fabric texture, natural folds, and rich shadow variation. Use a dark gradient background with contrasting cold blue and warm golden halos. Add a Rim Light to outline hair, shoulders, and neck, plus soft front Key Light for translucent natural skin tone. Create a cinematic warm/cool color portrait with delicate film grain, deep elegant atmosphere, and off-center composition.',
    recommended: true,
  },
  {
    id: 'product-photo-studio',
    title: 'Product Photo Studio',
    beforeImage: useCaseImage('product-photo-studio.webp'),
    afterImage: useCaseImage('product-photo-studio-effect.webp'),
    prompt:
      'Identify the main product in the uploaded photo and recreate it as a premium e-commerce product shot. Cleanly extract the product, remove fingers, hands, clutter, and messy background details. Place the product on a pure white studio background with a subtle natural contact shadow. Use soft commercial studio lighting, even illumination, texture enhancement, lens distortion fixes, sharpness improvements, and professional color correction.',
    recommended: true,
  },
  {
    id: 'ai-beauty-filter',
    title: 'AI Beauty Filter',
    beforeImage: useCaseImage('ai-beauty-filter.webp'),
    afterImage: useCaseImage('ai-beauty-filter-effect.webp'),
    prompt:
      'Apply AI Beauty Filter to enhance facial appearance while preserving identity. Smooth skin naturally, even out tone, brighten eyes, and add gentle soft light on the face. Keep natural pores, realistic lighting, and the original makeup style. Do not overblur or change facial shape.',
    recommended: true,
  },
  {
    id: 'candy-cane-christmas',
    title: 'Candy Cane Christmas',
    beforeImage: useCaseImage('candy-cane-ai.webp'),
    afterImage: useCaseImage('candy-cane-ai-effect.webp'),
    prompt:
      'Transform the original image into a vivid Candy Cane-style Christmas scene. Preserve all original subjects and identities. Do not add or remove people or animals, and keep faces, poses, and composition unchanged. Fully replace existing clothing with bold red-and-white candy-striped winter outfits, and convert the background into a festive Candy Cane Wonderland with oversized candy cane decorations, snow, sparkling lights, and warm cinematic Christmas lighting.',
    recommended: true,
  },
  {
    id: 'natural-bangs-filter',
    title: 'Natural Bangs Filter',
    beforeImage: useCaseImage('bangs-filter.webp'),
    afterImage: useCaseImage('bangs-filter-effect.webp'),
    prompt:
      'Add natural bangs to this person\'s hairstyle while maintaining original facial features and identity, natural matching hair color and texture, realistic hairline and hair flow, and the original lighting and composition. Create bangs that complement the face shape and blend seamlessly with existing hair, like a professional salon style.',
  },
  {
    id: 'ai-man-filter',
    title: 'AI Man Filter',
    beforeImage: useCaseImage('ai-man-filter.webp'),
    afterImage: useCaseImage('ai-man-filter-effect.webp'),
    prompt:
      'Convert this person to a male appearance while preserving facial identity and recognition, natural lighting and composition, and realistic skin texture. Add appropriate masculine features such as a stronger jaw and broader facial structure while keeping the transformation natural and photorealistic.',
  },
  {
    id: 'image-to-pixel',
    title: 'Image to Pixel',
    beforeImage: useCaseImage('image-to-pixel.webp'),
    afterImage: useCaseImage('image-to-pixel-effect.webp'),
    prompt:
      'Transform to pixel art: retro 8-bit or 16-bit video game style, clear pixel grid visible, reduced resolution with blocky appearance, simplified color palette, nostalgic arcade game aesthetic, and maintain the subject\'s key features while pixelating.',
  },
  {
    id: 'minecraft-filter',
    title: 'Minecraft Filter',
    beforeImage: useCaseImage('ai-minecraft-filter.webp'),
    afterImage: useCaseImage('ai-minecraft-filter-effect.webp'),
    prompt:
      'Transform the source photo into an isometric 3D voxel scene in Minecraft pixel art style. Preserve original composition, colors, pose, and key details. Build everything with small cubes under bright neutral light. Each character head is one solid cube with pixel eyes and mouth, while the body and environment use detailed voxels. Keep sharp edges, subtle ambient occlusion, and an ultra-clean 8k finish.',
  },
  {
    id: 'flat-illustration',
    title: 'Flat Illustration',
    beforeImage: useCaseImage('flat-illustration.webp'),
    afterImage: useCaseImage('flat-illustration-effect.webp'),
    prompt:
      'Transform the uploaded image into a full body flat vector illustration with whimsical wavy cartoon style. Use thin black outlines, smooth rounded shapes, simplified facial features with dot eyes, exaggerated playful proportions, and bold flat colors only. Avoid gradients, shading, or smudging. Choose a solid background color that complements and contrasts with the character colors.',
  },
  {
    id: 'y2k-style-ai',
    title: 'Y2K Style AI',
    beforeImage: useCaseImage('y2k-style-ai.webp'),
    afterImage: useCaseImage('y2k-style-ai-effect.webp'),
    prompt:
      'Transform the uploaded image into a dreamy Y2K style portrait while retaining the subject\'s hairstyle and accessories. Depict the subject lying on shiny pink satin bedding, holding a large 90s style corded phone in a thoughtful pose, wearing delicate jewelry and chunky rings. Add a girly daydream atmosphere with 90s posters, simple glamorous makeup, grainy 90s texture, dim room lighting, and a slightly ominous figure in the doorway.',
  },
  {
    id: 'chibi-3d-toy',
    title: 'Chibi 3D Toy',
    beforeImage: useCaseImage('3d-toy.webp'),
    afterImage: useCaseImage('3d-toy-effect.webp'),
    prompt:
      'Q-version modern style, 3D toy, original character rendering, clever and cute, minimalist art style, with a cartoon aesthetic.',
  },
  {
    id: 'three-d-caricature',
    title: '3D Caricature',
    beforeImage: useCaseImage('3d-caricature.webp'),
    afterImage: useCaseImage('3d-caricature-effect.webp'),
    prompt:
      'Create a highly stylized 3D caricature of this character, with expressive facial features and playful exaggeration. Render it in a smooth polished style with clean materials, soft ambient lighting, and a bold color background that emphasizes the character charm and presence.',
  },
  {
    id: 'sixteen-bit-game-character',
    title: '16-Bit Game Character',
    beforeImage: useCaseImage('16-bit-video-game-character.webp'),
    afterImage: useCaseImage('16-bit-video-game-character-effect.webp'),
    prompt:
      'Recreate this character as a 16-bit video game character, and place the character in a level of a 2D 16-bit platform video game.',
  },
  {
    id: 'younger-self-hug',
    title: 'Hug My Younger Self',
    beforeImage: useCaseImage('hug-my-younger-self.webp'),
    afterImage: useCaseImage('hug-my-younger-self-effect.webp'),
    prompt:
      'Take a photo taken with a Polaroid camera. The photo should look like an ordinary photograph, with slight blur and a consistent light source like a flash from a dark room. Do not change the face. Change the background behind the two people to white curtains and make it look like both people in the reference picture are hugging each other.',
  },
  {
    id: 'object-extraction',
    title: 'Object Extraction',
    beforeImage: useCaseImage('object-extraction.webp'),
    afterImage: useCaseImage('object-extraction-effect.webp'),
    prompt:
      'Extract the clothing from the source image and present it as a clean e-commerce product photo. Remove the model body completely. Keep the outfit in natural 3D shape with realistic fabric folds, seams, and textures. Display the garment as if photographed on a mannequin or neatly laid flat, centered on a pure white or transparent background with professional lighting.',
  },
  {
    id: 'golden-hour-edit',
    title: 'Golden Hour Edit',
    beforeImage: useCaseImage('time-based-image-edit.webp'),
    afterImage: useCaseImage('time-based-image-edit-effect.webp'),
    prompt:
      'Generate an image of the same scene as the source image, but show it during sunset or golden hour. Keep the environment and composition consistent, but transform the lighting to warm sunset colors with a golden orange sky, long shadows, warm amber light on subjects, and the sun low on the horizon. Keep photorealistic continuity with the original scene.',
  },
  {
    id: 'chibi-knitted-doll',
    title: 'Chibi Knitted Doll',
    beforeImage: useCaseImage('chibi-knitted-doll.webp'),
    afterImage: useCaseImage('chibi-knitted-doll-effect.webp'),
    prompt:
      'Create a close-up, professionally composed photograph showcasing a hand-crocheted yarn doll gently cradled by two hands. The doll has a rounded cute chibi image of the uploaded character, vivid contrasting colors, rich details, natural hand posture, skin texture, and light transitions. Use a warm indoor tabletop background with natural light from a window and shallow depth of field.',
  },
  {
    id: 'pixie-cut-filter',
    title: 'Pixie Cut Filter',
    beforeImage: useCaseImage('pixie-cut-filter.webp'),
    afterImage: useCaseImage('pixie-cut-filter-effect.webp'),
    prompt:
      'Transform to pixie cut hairstyle: ultra short hair, closely cropped sides and back, slightly longer textured top, wispy bangs, tapered neckline, boyish yet feminine style, face-framing cut, exposed ears, defined jawline, modern edgy look, and professional salon styling.',
  },
  {
    id: 'professional-headshots',
    title: 'Professional Headshots',
    beforeImage: useCaseImage('professional-headshots.webp'),
    afterImage: useCaseImage('professional-headshots-effect.webp'),
    prompt:
      'Create a half-length corporate portrait in a professional studio: person in a suit, pure white backdrop, minimal shadows, clean and polished look.',
    recommended: true,
  },
  {
    id: 'sixties-beehive-hairstyle',
    title: '1960s Beehive Hairstyle',
    beforeImage: useCaseImage('1960s-beehive-hairstyle.webp'),
    afterImage: useCaseImage('1960s-beehive-hairstyle-effect.webp'),
    prompt:
      'Keep this person\'s likeness identical. Restyle into a 1960s beehive hairstyle and tailored suit, with a warm studio backdrop.',
  },
  {
    id: 'linkedin-profile-photo',
    title: 'LinkedIn Profile Photo',
    beforeImage: useCaseImage('linkedIn-profile-photo.webp'),
    afterImage: useCaseImage('linkedIn-profile-photo-effect.webp'),
    prompt:
      'Create a professional LinkedIn profile photo following best practices. Keep the person\'s facial features and identity exactly the same. Use professional attire, a clean solid background, straight shoulders, direct eye contact, a genuine confident smile, head and shoulders framing, even professional lighting, and sharp high-resolution focus throughout.',
    recommended: true,
  },
  {
    id: 'three-view-drawing',
    title: 'Three View Drawing',
    beforeImage: useCaseImage('three-view-drawing.webp'),
    afterImage: useCaseImage('three-view-drawing-effect.webp'),
    prompt:
      'Create a model sheet for a character, showing front, side, and back poses.',
  },
  {
    id: 'expand-image',
    title: 'Expand Image',
    beforeImage: useCaseImage('expand-image.webp'),
    afterImage: useCaseImage('expand-image-effect.webp'),
    prompt:
      'Expand this photo to a full-body shot while keeping the same pose, identity, lighting direction, and visual style consistent with the original image.',
  },
  {
    id: 'emoji-icon',
    title: 'Emoji Icon',
    beforeImage: useCaseImage('emoji-icon.webp'),
    afterImage: useCaseImage('emoji-icon-effect.webp'),
    prompt:
      'Transform the image into a simplified emoji design on a pure white background. Use clean rounded shapes, bold outlines, flat vibrant colors, and minimal details for instant recognition. The emoji should be expressive, universally readable, and suitable for small display sizes.',
  },
  {
    id: 'photo-booth-grid',
    title: 'Photo Booth Grid',
    beforeImage: useCaseImage('photo-booth-grid.webp'),
    afterImage: useCaseImage('photo-booth-grid-effect.webp'),
    prompt:
      'Using this photo, create a 3x3 photo booth grid with each pose different. Include arms crossed, chin resting on hands, making a heart sign, hands in pockets, pretending to make a phone call, pointing to the sky, waving, holding a book, and crossing arms. No repetitions are allowed.',
  },
  {
    id: 'watermark-remove',
    title: 'Watermark Remove',
    beforeImage: useCaseImage('Watermark Remove-before-1.webp'),
    afterImage: useCaseImage('Watermark Remove-after-1.webp'),
    prompt:
      'Remove watermarks, clean the image, and maintain the original content, composition, lighting, and subject details.',
  },
  {
    id: 'old-photo-restore',
    title: 'Old Photo Restore',
    beforeImage: useCaseImage('Old Photo Restore-before1 (1).webp'),
    afterImage: useCaseImage('Old Photo Restore-after1 (1).webp'),
    prompt:
      'Transform into a modern high-quality digital portrait with vibrant updated colors, smooth realistic skin textures, and natural lighting. Upgrade the outfit and background into a clean modern aesthetic while preserving the authenticity of the original pose and expression.',
    recommended: true,
  },
  {
    id: 'three-d-figure',
    title: '3D Figure',
    beforeImage: useCaseImage('3D Figure-before1 (2).webp'),
    afterImage: useCaseImage('3D Figure-after1 (2).webp'),
    prompt:
      'Turn this photo into a character figure. Behind it, place a box with the character image printed on it. Next to it, add a computer with its screen showing the Blender modeling process. In front of the box, add a round plastic base for the figure and have it stand on it in an indoor scene.',
    recommended: true,
  },
] as const satisfies readonly UseCase[];
