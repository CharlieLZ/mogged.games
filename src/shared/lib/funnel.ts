export const FIRST_SUCCESSFUL_GENERATION_EVENT =
  'ai_first_successful_generation';

export const ACTIVATION_SURVEY_EMAIL_SENT_EVENT =
  'email_activation_survey_sent';

export const ACTIVATION_SURVEY_REPLY_REWARD_GRANTED_EVENT =
  'activation_survey_reward_granted';

export const CHECKOUT_STARTED_EVENT = 'payment_checkout_started';

export function calculateConversionRate(
  numerator: number,
  denominator: number
) {
  if (denominator <= 0 || numerator <= 0) {
    return 0;
  }

  return numerator / denominator;
}
