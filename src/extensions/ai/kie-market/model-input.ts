import {
  getKieImageModel,
  KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL,
  KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL,
  KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL,
  KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL,
  KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL,
  KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL,
  KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
  KIE_IDEOGRAM_CHARACTER_MODEL,
  KIE_IDEOGRAM_V3_MODEL,
  KIE_NANO_BANANA_2_MODEL,
  KIE_NANO_BANANA_MODEL,
  KIE_NANO_BANANA_PRO_MODEL,
  KIE_QWEN_IMAGE_EDIT_MODEL,
  KIE_QWEN_IMAGE_TO_IMAGE_MODEL,
  KIE_QWEN_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL,
  KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL,
  KIE_Z_IMAGE_MODEL,
  type KieImageRequest,
} from './types';

const T2I_ONLY_MODELS = new Set([
  KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL,
  KIE_IDEOGRAM_V3_MODEL,
  KIE_Z_IMAGE_MODEL,
]);

const FLUX_2_MODELS = new Set([
  KIE_FLUX_2_PRO_TEXT_TO_IMAGE_MODEL,
  KIE_FLUX_2_PRO_IMAGE_TO_IMAGE_MODEL,
  KIE_FLUX_2_FLEX_TEXT_TO_IMAGE_MODEL,
  KIE_FLUX_2_FLEX_IMAGE_TO_IMAGE_MODEL,
]);

function getRequestImageUrls(request: KieImageRequest) {
  return request.imageUrls && request.imageUrls.length > 0
    ? request.imageUrls
    : request.imageUrl
      ? [request.imageUrl]
      : [];
}

function getImageSize(aspectRatio: string) {
  switch (aspectRatio) {
    case '4:3':
      return 'landscape_4_3';
    case '3:4':
      return 'portrait_4_3';
    case '16:9':
      return 'landscape_16_9';
    case '9:16':
      return 'portrait_16_9';
    case '1:1':
    default:
      return 'square_hd';
  }
}

function getSeedreamQuality(request: KieImageRequest) {
  return request.resolution === '4K' ? 'high' : 'basic';
}

function isSeedreamQualityModel(model: string) {
  return (
    model === KIE_SEEDREAM_45_TEXT_TO_IMAGE_MODEL ||
    model === KIE_SEEDREAM_45_IMAGE_TO_IMAGE_MODEL ||
    model === KIE_SEEDREAM_5_LITE_TEXT_TO_IMAGE_MODEL ||
    model === KIE_SEEDREAM_5_LITE_IMAGE_TO_IMAGE_MODEL
  );
}

function withOptionalNumber(
  input: Record<string, unknown>,
  key: string,
  value: number | undefined
) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    input[key] = value;
  }
}

function buildQwenTextInput(request: KieImageRequest) {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    image_size: getImageSize(request.aspectRatio),
    num_inference_steps: request.numInferenceSteps ?? 30,
    guidance_scale: request.guidanceScale ?? 2.5,
    enable_safety_checker: request.nsfwChecker ?? true,
    output_format: request.outputFormat,
    negative_prompt: request.negativePrompt ?? ' ',
    acceleration: 'none',
  };

  withOptionalNumber(input, 'seed', request.seed);

  return input;
}

function buildQwenImageToImageInput(request: KieImageRequest) {
  return {
    prompt: request.prompt,
    image_url: getRequestImageUrls(request)[0] || '',
    strength: request.strength ?? 0.8,
    output_format: request.outputFormat,
    acceleration: 'none',
    negative_prompt: request.negativePrompt ?? 'blurry, ugly',
    num_inference_steps: request.numInferenceSteps ?? 30,
    guidance_scale: request.guidanceScale ?? 2.5,
    enable_safety_checker: request.nsfwChecker ?? true,
  };
}

function buildQwenImageEditInput(request: KieImageRequest) {
  return {
    prompt: request.prompt,
    image_url: getRequestImageUrls(request)[0] || '',
    acceleration: 'none',
    image_size: getImageSize(request.aspectRatio),
    num_inference_steps: request.numInferenceSteps ?? 25,
    guidance_scale: request.guidanceScale ?? 4,
    sync_mode: false,
    enable_safety_checker: request.nsfwChecker ?? true,
    output_format: request.outputFormat,
    negative_prompt: request.negativePrompt ?? 'blurry, ugly',
  };
}

function buildIdeogramInput(request: KieImageRequest, model: string) {
  const imageUrls = getRequestImageUrls(request);
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    rendering_speed: 'BALANCED',
    style: 'AUTO',
    expand_prompt: true,
    image_size: getImageSize(request.aspectRatio),
    negative_prompt: request.negativePrompt ?? '',
  };

  if (model === KIE_IDEOGRAM_CHARACTER_MODEL) {
    input.reference_image_urls = imageUrls;
    input.num_images = String(request.numImages ?? 1);
  }

  withOptionalNumber(input, 'seed', request.seed);

  return input;
}

function buildFlux2Input(request: KieImageRequest, imageUrls: string[]) {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio,
    resolution: request.resolution,
    nsfw_checker: request.nsfwChecker ?? false,
  };

  if (imageUrls.length > 0) {
    input.input_urls = imageUrls;
  }

  return input;
}

function buildTextToImageInput(request: KieImageRequest) {
  const model = request.model?.trim() || getKieImageModel(request.scene);
  const imageUrls = getRequestImageUrls(request);

  if (model === KIE_GPT_IMAGE_2_TEXT_TO_IMAGE_MODEL) {
    return {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
    };
  }

  if (isSeedreamQualityModel(model)) {
    return {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      quality: getSeedreamQuality(request),
      nsfw_checker: request.nsfwChecker ?? false,
    };
  }

  if (model === KIE_SEEDREAM_4_TEXT_TO_IMAGE_MODEL) {
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      image_size: getImageSize(request.aspectRatio),
      image_resolution: request.resolution,
      max_images: request.numImages ?? 1,
      nsfw_checker: request.nsfwChecker ?? true,
    };
    withOptionalNumber(input, 'seed', request.seed);
    return input;
  }

  if (model === KIE_NANO_BANANA_MODEL) {
    return {
      prompt: request.prompt,
      output_format: request.outputFormat,
      image_size: request.aspectRatio,
    };
  }

  if (model === KIE_QWEN_TEXT_TO_IMAGE_MODEL) {
    return buildQwenTextInput(request);
  }

  if (
    model === KIE_IDEOGRAM_V3_MODEL ||
    model === KIE_IDEOGRAM_CHARACTER_MODEL
  ) {
    return buildIdeogramInput(request, model);
  }

  if (model === KIE_GROK_IMAGINE_TEXT_TO_IMAGE_MODEL) {
    return {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
    };
  }

  if (model === KIE_Z_IMAGE_MODEL) {
    return {
      prompt: request.prompt,
      aspect_ratio: request.aspectRatio,
      nsfw_checker: request.nsfwChecker ?? true,
    };
  }

  if (FLUX_2_MODELS.has(model)) {
    return buildFlux2Input(request, imageUrls);
  }

  const input: Record<string, unknown> = {
    prompt: request.prompt,
    aspect_ratio: request.aspectRatio,
    resolution: request.resolution,
    output_format: request.outputFormat,
  };

  if (imageUrls.length > 0) {
    input.image_input = imageUrls;
  }

  return input;
}

function buildImageEditInput(request: KieImageRequest) {
  const model = request.model?.trim() || getKieImageModel(request.scene);
  const imageUrls = getRequestImageUrls(request);

  if (
    model === KIE_NANO_BANANA_2_MODEL ||
    model === KIE_NANO_BANANA_PRO_MODEL
  ) {
    return {
      prompt: request.prompt,
      image_input: imageUrls,
      aspect_ratio: request.aspectRatio,
      resolution: request.resolution,
      output_format: request.outputFormat,
    };
  }

  if (model === KIE_GPT_IMAGE_2_IMAGE_TO_IMAGE_MODEL) {
    return {
      prompt: request.prompt,
      input_urls: imageUrls,
      aspect_ratio: request.aspectRatio,
    };
  }

  if (isSeedreamQualityModel(model)) {
    return {
      prompt: request.prompt,
      image_urls: imageUrls,
      aspect_ratio: request.aspectRatio,
      quality: getSeedreamQuality(request),
      nsfw_checker: request.nsfwChecker ?? false,
    };
  }

  if (model === KIE_SEEDREAM_4_IMAGE_TO_IMAGE_MODEL) {
    const input: Record<string, unknown> = {
      prompt: request.prompt,
      image_urls: imageUrls,
      image_size: getImageSize(request.aspectRatio),
      image_resolution: request.resolution,
      max_images: request.numImages ?? 1,
      nsfw_checker: request.nsfwChecker ?? true,
    };
    withOptionalNumber(input, 'seed', request.seed);
    return input;
  }

  if (model === KIE_QWEN_IMAGE_TO_IMAGE_MODEL) {
    return buildQwenImageToImageInput(request);
  }

  if (model === KIE_QWEN_IMAGE_EDIT_MODEL) {
    return buildQwenImageEditInput(request);
  }

  if (model === KIE_IDEOGRAM_CHARACTER_MODEL) {
    return buildIdeogramInput(request, model);
  }

  if (FLUX_2_MODELS.has(model)) {
    return buildFlux2Input(request, imageUrls);
  }

  return {
    prompt: request.prompt,
    image_urls: imageUrls,
    output_format: request.outputFormat,
    image_size: request.aspectRatio,
  };
}

export function buildKieMarketCreateInput(request: KieImageRequest) {
  const model = request.model?.trim() || getKieImageModel(request.scene);

  if (request.scene === 'image-to-image' && !T2I_ONLY_MODELS.has(model)) {
    return buildImageEditInput(request);
  }

  return buildTextToImageInput(request);
}
