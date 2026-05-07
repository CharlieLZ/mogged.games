import { Star } from 'lucide-react';

import { Avatar, AvatarImage } from '@/shared/components/ui/avatar';

const userImgUrls = [
  '/images/avatars/1.png',
  '/images/avatars/2.png',
  '/images/avatars/3.png',
  '/images/avatars/4.png',
  '/images/avatars/5.png',
  '/images/avatars/6.png',
];

export function SocialAvatars({ tip }: { tip: string }) {
  return (
    <div className="mx-auto mt-8 flex w-fit flex-col items-center gap-2 sm:flex-row">
      <span className="mx-4 inline-flex items-center -space-x-2">
        {userImgUrls.map((url, index) => (
          <Avatar className="size-10 border" key={index}>
            <AvatarImage src={url} alt="placeholder" />
          </Avatar>
        ))}
      </span>
      <div className="flex flex-col items-center gap-1 md:items-start rtl:md:items-end">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="text-primary fill-primary size-4" />
          ))}
        </div>
        <p className="text-muted-foreground text-left text-sm font-normal rtl:text-right">
          {tip}
        </p>
      </div>
    </div>
  );
}
