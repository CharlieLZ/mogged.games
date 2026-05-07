export type PromptToolMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'text-to-image'
  | 'image-to-image';

export type PromptToolKind = 'translate-prompt' | 'rewrite-prompt';

export const PROMPT_TOOL_COST_CREDITS: Record<PromptToolKind, number> = {
  'translate-prompt': 1,
  'rewrite-prompt': 2,
};

export const TRANSLATE_PROMPT_COST_CREDITS =
  PROMPT_TOOL_COST_CREDITS['translate-prompt'];
export const REWRITE_PROMPT_COST_CREDITS =
  PROMPT_TOOL_COST_CREDITS['rewrite-prompt'];

export function getPromptToolCostCredits(tool: PromptToolKind) {
  return PROMPT_TOOL_COST_CREDITS[tool];
}

export function getPromptToolChargeDescription(tool: PromptToolKind) {
  switch (tool) {
    case 'rewrite-prompt':
      return 'rewrite prompt for safety';
    case 'translate-prompt':
    default:
      return 'translate prompt to English';
  }
}

export function isPromptToolInsufficientCreditsMessage(
  message?: string | null
) {
  return message?.trim().toLowerCase() === 'insufficient credits';
}
