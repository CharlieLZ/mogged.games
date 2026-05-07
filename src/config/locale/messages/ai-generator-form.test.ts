import { describe, expect, it } from 'vitest';

import enVideoMessages from '@/config/locale/messages/en/ai/video.json';
import zhVideoMessages from '@/config/locale/messages/zh/ai/video.json';

describe('ai generator form copy', () => {
  it('ships public media validation copy in English', () => {
    expect(enVideoMessages.generator.form.upload_media).toBeTruthy();
    expect(enVideoMessages.generator.form.optional).toBeTruthy();
    expect(enVideoMessages.generator.form.image_url_private).toBeTruthy();
    expect(enVideoMessages.generator.form.video_url_cloud_drive).toBeTruthy();
    expect(enVideoMessages.generator.form.audio_url_too_many).toBeTruthy();
  });

  it('ships public media validation copy in Chinese', () => {
    expect(zhVideoMessages.generator.form.upload_media).toBeTruthy();
    expect(zhVideoMessages.generator.form.optional).toBeTruthy();
    expect(zhVideoMessages.generator.form.image_url_private).toBeTruthy();
    expect(zhVideoMessages.generator.form.video_url_cloud_drive).toBeTruthy();
    expect(zhVideoMessages.generator.form.audio_url_too_many).toBeTruthy();
  });
});
