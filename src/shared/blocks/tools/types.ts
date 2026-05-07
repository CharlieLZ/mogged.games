type FreeToolPageCopyBase = {
  title: string;
  description: string;
  tips?: string[];
};

export type FreeToolCommonCopy = {
  badge: string;
  select_file: string;
  change_file: string;
  download: string;
  reset: string;
  processing: string;
  ready: string;
  file_empty: string;
  local_notice: string;
  original_size: string;
  output_size: string;
  saving: string;
  drop_hint: string;
  status_waiting: string;
  invalid_image: string;
  invalid_video: string;
  image_too_large: string;
  invalid_dimensions: string;
  output_format_label: string;
  quality_label: string;
  generic_error: string;
  tips_title: string;
  input_preview: string;
  original_preview: string;
  converted_preview: string;
  compressed_preview: string;
  edited_preview: string;
  thumbnail_preview: string;
  gif_preview: string;
};

export type ImageConverterCopy = {
  title: string;
  description: string;
  target_format_label: string;
  action: string;
  formats: Record<string, string>;
  tips?: string[];
};

export type ImageCompressorCopy = {
  title: string;
  description: string;
  quality_label: string;
  max_width_label: string;
  action: string;
  tips?: string[];
};

export type FreeToolsIndexItem = {
  title: string;
  description: string;
  url: string;
};

export type FreeToolsIndexSection = {
  title: string;
  description: string;
  items: FreeToolsIndexItem[];
};

export type FreeToolsIndexCopy = {
  title: string;
  description: string;
  sections: FreeToolsIndexSection[];
};

export type LocalImageToolCopy = FreeToolPageCopyBase & {
  action: string;
  crop_x_label?: string;
  crop_y_label?: string;
  crop_width_label?: string;
  crop_height_label?: string;
  width_label?: string;
  height_label?: string;
  lock_aspect_label?: string;
  scale_label?: string;
  scales?: Record<string, string>;
  angle_label?: string;
  angles?: Record<string, string>;
  flip_horizontal_label?: string;
  flip_vertical_label?: string;
};

export type LocalImageToolMode =
  | 'crop'
  | 'resize'
  | 'upscale'
  | 'rotate'
  | 'metadata';

export type ImageColorExtractorCopy = FreeToolPageCopyBase & {
  action: string;
  palette_size_label: string;
  palette_size_options: Record<string, string>;
  dominant_color_label: string;
  palette_label: string;
  colors_found_label: string;
  css_variables_label: string;
  json_label: string;
};

export type VideoConverterCopy = FreeToolPageCopyBase & {
  target_format_label: string;
  action: string;
  formats: Record<string, string>;
};

export type VideoTrimmerCopy = FreeToolPageCopyBase & {
  action: string;
  start_time_label: string;
  end_time_label: string;
  duration_label: string;
  invalid_range_error: string;
  formats: Record<string, string>;
};

export type VideoToGifCopy = FreeToolPageCopyBase & {
  action: string;
  length_label: string;
  fps_label: string;
};

export type VideoThumbnailCopy = FreeToolPageCopyBase & {
  action: string;
  timestamp_label: string;
};
