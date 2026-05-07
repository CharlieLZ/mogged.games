import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import type {
  SeedanceAspectRatio,
  SeedanceRequest,
  SeedanceResolution,
  SeedanceScene,
} from '@/extensions/ai/seedance/types';

const DEFAULT_PROMPT =
  'A realistic chestnut horse walking calmly through a sunlit meadow, cinematic, natural lighting, smooth motion, stable composition.';

export const OFFICIAL_VOLCENGINE_SEEDANCE_CREATE_URL =
  'https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks';

export type SeedanceOfficialSmokeOptions = {
  scene: SeedanceScene;
  prompt: string;
  imageUrls: string[];
  videoUrls: string[];
  audioUrls: string[];
  duration: number;
  executionExpiresAfter: number;
  resolution: SeedanceResolution;
  aspectRatio: SeedanceAspectRatio;
  seed?: number;
  safetyIdentifier?: string;
  pollIntervalMs: number;
  maxPolls: number;
  fast: boolean;
  generateAudio: boolean;
  webSearch: boolean;
  watermark: boolean;
  returnLastFrame: boolean;
  useDbConfig: boolean;
  dryRun: boolean;
  wait: boolean;
};

function printUsage() {
  console.log(
    `
Usage:
  pnpm seedance:official:smoke -- [options]

Options:
  --scene <text-to-video|image-to-video|reference-to-video>
  --prompt <text>
  --image-url <url>            Repeatable
  --video-url <url>            Repeatable
  --audio-url <url>            Repeatable
  --duration <seconds>
  --execution-expires-after <seconds>
  --resolution <480p|720p>
  --aspect-ratio <16:9|9:16|4:3|3:4|1:1|21:9|auto>
  --seed <number>
  --safety-identifier <string>
  --poll-interval-ms <ms>
  --max-polls <count>
  --fast / --standard
  --generate-audio / --silent
  --web-search
  --watermark
  --return-last-frame
  --use-db-config
  --execute
  --wait
  --help

Examples:
  pnpm seedance:official:smoke
  pnpm seedance:official:smoke -- --execute --wait
  pnpm seedance:official:smoke -- --scene=image-to-video --image-url=https://example.com/first-frame.png --prompt=""
  pnpm seedance:official:smoke -- --scene=reference-to-video --image-url=https://example.com/ref.png --video-url=https://example.com/ref.mp4 --prompt=""
`.trim()
  );
}

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = value ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function normalizeScene(value: string | undefined): SeedanceScene {
  if (
    value === 'text-to-video' ||
    value === 'image-to-video' ||
    value === 'reference-to-video'
  ) {
    return value;
  }

  return 'text-to-video';
}

function normalizeResolution(value: string | undefined): SeedanceResolution {
  return value === '720p' ? '720p' : '480p';
}

function normalizeAspectRatio(value: string | undefined): SeedanceAspectRatio {
  if (
    value === 'auto' ||
    value === '16:9' ||
    value === '9:16' ||
    value === '4:3' ||
    value === '3:4' ||
    value === '1:1' ||
    value === '21:9'
  ) {
    return value;
  }

  return '16:9';
}

function normalizeOptionalString(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeRepeatedValues(values: string[] | undefined) {
  return (values || []).map((value) => value.trim()).filter(Boolean);
}

function getDefaultPrompt(scene: SeedanceScene) {
  return scene === 'text-to-video' ? DEFAULT_PROMPT : '';
}

function getVolcengineModel(request: Pick<SeedanceRequest, 'fast'>) {
  return request.fast
    ? 'doubao-seedance-2-0-fast-260128'
    : 'doubao-seedance-2-0-260128';
}

function buildOfficialVolcengineContent(request: SeedanceRequest) {
  const content: Array<Record<string, unknown>> = [];

  if (request.prompt.trim()) {
    content.push({
      type: 'text',
      text: request.prompt,
    });
  }

  if (request.scene === 'image-to-video') {
    if (request.imageUrls[0]) {
      content.push({
        type: 'image_url',
        image_url: {
          url: request.imageUrls[0],
        },
        role: 'first_frame',
      });
    }

    if (request.imageUrls[1]) {
      content.push({
        type: 'image_url',
        image_url: {
          url: request.imageUrls[1],
        },
        role: 'last_frame',
      });
    }

    return content;
  }

  if (request.scene === 'reference-to-video') {
    for (const url of request.imageUrls) {
      content.push({
        type: 'image_url',
        image_url: {
          url,
        },
        role: 'reference_image',
      });
    }

    for (const url of request.videoUrls) {
      content.push({
        type: 'video_url',
        video_url: {
          url,
        },
        role: 'reference_video',
      });
    }

    for (const url of request.audioUrls) {
      content.push({
        type: 'audio_url',
        audio_url: {
          url,
        },
        role: 'reference_audio',
      });
    }
  }

  return content;
}

function buildOfficialVolcenginePayload(request: SeedanceRequest) {
  const payload: Record<string, unknown> = {
    model: getVolcengineModel(request),
    content: buildOfficialVolcengineContent(request),
    execution_expires_after: request.executionExpiresAfter,
    generate_audio: request.generateAudio,
    ratio: request.aspectRatio === 'auto' ? 'adaptive' : request.aspectRatio,
    resolution: request.resolution,
    duration: request.duration,
    watermark: request.watermark,
  };

  if (request.returnLastFrame) {
    payload.return_last_frame = true;
  }

  if (request.webSearch) {
    payload.tools = [{ type: 'web_search' }];
  }

  if (request.seed !== undefined) {
    payload.seed = request.seed;
  }

  if (request.safetyIdentifier) {
    payload.safety_identifier = request.safetyIdentifier;
  }

  return payload;
}

function collectUrls(values: string[] | undefined) {
  return Array.from(new Set(normalizeRepeatedValues(values)));
}

export function parseSeedanceOfficialSmokeArgs(
  args: string[]
): SeedanceOfficialSmokeOptions {
  const rawArgs = args.filter((arg) => arg !== '--');
  const { values } = parseArgs({
    args: rawArgs,
    options: {
      help: { type: 'boolean' },
      scene: { type: 'string' },
      prompt: { type: 'string' },
      'image-url': { type: 'string', multiple: true },
      'video-url': { type: 'string', multiple: true },
      'audio-url': { type: 'string', multiple: true },
      duration: { type: 'string' },
      'execution-expires-after': { type: 'string' },
      resolution: { type: 'string' },
      'aspect-ratio': { type: 'string' },
      seed: { type: 'string' },
      'safety-identifier': { type: 'string' },
      'poll-interval-ms': { type: 'string' },
      'max-polls': { type: 'string' },
      fast: { type: 'boolean' },
      standard: { type: 'boolean' },
      'generate-audio': { type: 'boolean' },
      silent: { type: 'boolean' },
      'web-search': { type: 'boolean' },
      watermark: { type: 'boolean' },
      'return-last-frame': { type: 'boolean' },
      'use-db-config': { type: 'boolean' },
      execute: { type: 'boolean' },
      wait: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    throw new Error('HELP_REQUESTED');
  }

  const scene = normalizeScene(values.scene);
  const prompt =
    values.prompt !== undefined ? values.prompt : getDefaultPrompt(scene);
  const seedValue = parseInteger(values.seed, Number.NaN);

  return {
    scene,
    prompt,
    imageUrls: collectUrls(values['image-url']),
    videoUrls: collectUrls(values['video-url']),
    audioUrls: collectUrls(values['audio-url']),
    duration: parseInteger(values.duration, 4),
    executionExpiresAfter: parseInteger(
      values['execution-expires-after'],
      3600
    ),
    resolution: normalizeResolution(values.resolution),
    aspectRatio: normalizeAspectRatio(values['aspect-ratio']),
    seed: Number.isFinite(seedValue) && seedValue >= 0 ? seedValue : undefined,
    safetyIdentifier: normalizeOptionalString(values['safety-identifier']),
    pollIntervalMs: parseInteger(values['poll-interval-ms'], 10000),
    maxPolls: parseInteger(values['max-polls'], 36),
    fast: values.standard ? false : (values.fast ?? true),
    generateAudio: values.silent ? false : (values['generate-audio'] ?? false),
    webSearch: values['web-search'] ?? false,
    watermark: values.watermark ?? false,
    returnLastFrame: values['return-last-frame'] ?? false,
    useDbConfig: values['use-db-config'] ?? false,
    dryRun: !(values.execute ?? false),
    wait: values.wait ?? false,
  };
}

export async function runSeedanceOfficialSmoke(args: string[]) {
  const options = parseSeedanceOfficialSmokeArgs(args);

  if (!options.useDbConfig) {
    process.env.DATABASE_URL = '';
  }

  const [{ envConfigs }, { SeedanceService }, { normalizeSeedanceRequest }] =
    await Promise.all([
      import('@/config'),
      import('@/extensions/ai/seedance/service'),
      import('@/extensions/ai/seedance/validation'),
    ]);

  const normalizedRequest = normalizeSeedanceRequest({
    scene: options.scene,
    prompt: options.prompt,
    options: {
      duration: options.duration,
      execution_expires_after: options.executionExpiresAfter,
      resolution: options.resolution,
      aspect_ratio: options.aspectRatio,
      seed: options.seed,
      safety_identifier: options.safetyIdentifier,
      fast: options.fast,
      generate_audio: options.generateAudio,
      web_search: options.webSearch,
      watermark: options.watermark,
      return_last_frame: options.returnLastFrame,
      image_urls: options.imageUrls,
      video_urls: options.videoUrls,
      audio_urls: options.audioUrls,
    },
  });

  const request: SeedanceRequest = {
    ...normalizedRequest,
    safetyIdentifier:
      normalizedRequest.safetyIdentifier ||
      `seedance-cli-smoke-${Date.now().toString(36)}`,
  };

  const officialPayload = buildOfficialVolcenginePayload(request);

  console.log(
    JSON.stringify(
      {
        phase: options.dryRun ? 'dry-run' : 'start',
        officialCreateUrl: OFFICIAL_VOLCENGINE_SEEDANCE_CREATE_URL,
        cliSafeDbBypass: !options.useDbConfig,
        request,
        payload: officialPayload,
      },
      null,
      2
    )
  );

  if (options.dryRun) {
    return;
  }

  const service = new SeedanceService({
    ...envConfigs,
    seedance_enabled_providers: 'volcengine',
    seedance_default_provider: 'volcengine',
    seedance_provider_order: 'volcengine',
    seedance_provider_mode: 'single',
  });

  const generated = await service.generate({ request });

  console.log(
    JSON.stringify(
      {
        phase: 'generate',
        provider: generated.provider,
        model: generated.model,
        taskId: generated.result.taskId,
        taskStatus: generated.result.taskStatus,
        providerStatus: generated.result.taskInfo?.status ?? null,
      },
      null,
      2
    )
  );

  if (!options.wait) {
    return;
  }

  let result = generated.result;

  for (let attempt = 1; attempt <= options.maxPolls; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, options.pollIntervalMs));

    result = await service.query({
      provider: generated.provider,
      taskId: generated.result.taskId,
      model: generated.model,
    });

    const videos =
      result.taskInfo?.videos
        ?.map((item: { videoUrl?: string | null }) => item.videoUrl)
        .filter((value): value is string => Boolean(value)) || [];
    const images =
      result.taskInfo?.images
        ?.map((item: { imageUrl?: string | null }) => item.imageUrl)
        .filter((value): value is string => Boolean(value)) || [];

    console.log(
      JSON.stringify(
        {
          phase: 'poll',
          attempt,
          taskStatus: result.taskStatus,
          providerStatus: result.taskInfo?.status ?? null,
          videoCount: videos.length,
          imageCount: images.length,
          errorMessage: result.taskInfo?.errorMessage ?? null,
        },
        null,
        2
      )
    );

    if (
      result.taskStatus === 'success' ||
      result.taskStatus === 'failed' ||
      result.taskStatus === 'canceled'
    ) {
      break;
    }
  }

  const videos =
    result.taskInfo?.videos
      ?.map((item: { videoUrl?: string | null }) => item.videoUrl)
      .filter((value): value is string => Boolean(value)) || [];
  const images =
    result.taskInfo?.images
      ?.map((item: { imageUrl?: string | null }) => item.imageUrl)
      .filter((value): value is string => Boolean(value)) || [];

  console.log(
    JSON.stringify(
      {
        phase: 'final',
        taskId: generated.result.taskId,
        taskStatus: result.taskStatus,
        providerStatus: result.taskInfo?.status ?? null,
        videos,
        images,
        errorMessage: result.taskInfo?.errorMessage ?? null,
      },
      null,
      2
    )
  );

  if (result.taskStatus === 'success') {
    return;
  }

  if (result.taskStatus !== 'failed' && result.taskStatus !== 'canceled') {
    throw new Error(
      `official smoke timed out after ${options.maxPolls} polls (${options.pollIntervalMs}ms each)`
    );
  }

  throw new Error(result.taskInfo?.errorMessage || 'official smoke failed');
}

async function main() {
  try {
    await runSeedanceOfficialSmoke(process.argv.slice(2));
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'HELP_REQUESTED') {
      printUsage();
      process.exit(0);
    }

    console.error(message);
    printUsage();
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void main();
}
