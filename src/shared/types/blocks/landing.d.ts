import {
  AgreementNav,
  Brand,
  Button,
  Image,
  Nav,
  NavItem,
  SocialNav,
  UserNav,
} from './common';
import { FormSubmit } from './form';

export interface SectionItem extends NavItem {}

export interface Section {
  id?: string;
  block?: string;
  tone?: 'default' | 'inverse';
  label?: string;
  sr_only_title?: string;
  title?: string;
  description?: string;
  tip?: string;
  buttons?: Button[];
  icon?: string | ReactNode;
  image?: Image;
  image_invert?: Image;
  items?: SectionItem[];
  image_position?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  text_align?: 'left' | 'center' | 'right';
  className?: string;
}

// header props for header component
export interface Header {
  id?: string;
  brand?: Brand;
  nav?: Nav;
  buttons?: Button[];
  user_nav?: UserNav;
  show_theme?: boolean;
  show_locale?: boolean;
  show_sign?: boolean;
  className?: string;
}

// footer props for footer component
export interface Footer {
  id?: string;
  brand?: Brand;
  nav?: Nav;
  copyright?: string;
  disclaimer?: string;
  social?: SocialNav;
  agreement?: AgreementNav;
  show_theme?: boolean;
  show_locale?: boolean;
  show_built_with?: boolean;
  className?: string;
}

// hero props for hero component
export interface Hero extends Section {
  id?: string;
  announcement?: Button;
  comparison_video?: {
    label?: string;
    src?: string;
    poster?: string;
  };
  show_avatars?: boolean;
  avatars_tip?: string;
  show_award?: boolean;
  highlight_text?: string;
}

export interface Features extends Section {}

export interface BenefitReviewVideo extends Image {
  poster?: string;
}

export interface BenefitReviewItem extends SectionItem {
  role?: string;
  quote?: string;
  rating?: number;
  video?: BenefitReviewVideo;
}

export interface Benefits extends Section {
  items?: BenefitReviewItem[];
}

export interface Stats extends Section {}

export interface Gallery extends Section {}

export interface UseCaseItem extends SectionItem {
  video_url?: string;
  media_fit?: 'cover' | 'contain';
  button?: Button;
}

export interface UseCases extends Section {
  items?: UseCaseItem[];
}

export interface NanoBananaCaseItem extends SectionItem {
  prompt?: string;
  button?: Button;
}

export interface NanoBananaCases extends Section {
  labels?: {
    prompt?: string;
    previous?: string;
    next?: string;
    copyPrompt?: string;
    openImage?: string;
    closeImage?: string;
    imageUnavailable?: string;
    enlargedImage?: string;
  };
  items?: NanoBananaCaseItem[];
}

export interface FAQItem extends SectionItem {
  question?: string;
  answer?: string;
}

export interface FAQCategory extends Section {
  items?: FAQItem[];
}

export interface FAQ extends Section {
  items?: FAQItem[];
  categories?: FAQCategory[];
}

export interface CTA extends Section {}

export interface Subscribe extends Section {
  submit?: FormSubmit;
}

// landing props for landing page component
export interface Landing {
  header?: Header;
  hero?: Hero;
  introduce?: Features;
  benefits?: Benefits;
  usage?: Features;
  features?: Features;
  stats?: Stats;
  gallery?: Gallery;
  use_cases?: UseCases;
  nano_banana_cases?: NanoBananaCases;
  subscribe?: Subscribe;
  faq?: FAQ;
  cta?: CTA;
  footer?: Footer;
  sections?: Section[];
}
