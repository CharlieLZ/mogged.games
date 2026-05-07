import {
  getReferenceMediaUrlErrorMessage,
  getReferenceMediaUrlIssue,
  type ReferenceMediaUrlIssue,
} from './reference-media-url';

export type ReferenceImageUrlIssue =
  | Exclude<ReferenceMediaUrlIssue, 'wrong_media_type' | 'non_media_attachment'>
  | 'non_image_attachment'
  | 'video';

export function getReferenceImageUrlIssue(
  raw?: string | null
): ReferenceImageUrlIssue | null {
  const issue = getReferenceMediaUrlIssue(raw, 'image');
  if (!issue) {
    return null;
  }

  if (issue === 'wrong_media_type') {
    return 'video';
  }

  if (issue === 'non_media_attachment') {
    return 'non_image_attachment';
  }

  return issue;
}

export function getReferenceImageUrlErrorMessage(
  issue: ReferenceImageUrlIssue
): string {
  switch (issue) {
    case 'video':
      return 'image_url must point to an image file, not a video file.';
    case 'invalid':
    case 'unsupported_protocol':
    case 'cloud_drive_or_social':
    case 'private_host':
    case 'non_image_attachment':
      return getReferenceMediaUrlErrorMessage(
        issue === 'non_image_attachment' ? 'non_media_attachment' : issue,
        'image'
      );
  }
}
