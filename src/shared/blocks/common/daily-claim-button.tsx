'use client';

import { useEffect, useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useAppContext } from '@/shared/contexts/app';
import { ApiRequestError, fetchApiJson } from '@/shared/lib/api/client';
import { parseDailyClaimCreditsAmount } from '@/shared/lib/daily-claim';

export function DailyClaimButton({ className }: { className?: string }) {
  const { user, configs = {}, fetchUserCredits, isCheckSign } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [optimisticCredits, setOptimisticCredits] = useState<number | null>(
    null
  );
  const [optimisticClaimed, setOptimisticClaimed] = useState<boolean | null>(
    null
  );
  const t = useTranslations('common.daily_claim');
  const router = useRouter();
  const credits = optimisticCredits ?? user?.credits?.remainingCredits ?? null;
  const claimed =
    optimisticClaimed ?? user?.credits?.dailyClaim?.claimedToday ?? false;
  const dailyClaimCredits =
    user?.credits?.dailyClaim?.creditsAmount ??
    parseDailyClaimCreditsAmount(configs.daily_claim_credits_amount);

  useEffect(() => {
    setOptimisticCredits(null);
    setOptimisticClaimed(null);
  }, [user?.id]);

  useEffect(() => {
    if (
      optimisticCredits !== null &&
      optimisticCredits === user?.credits?.remainingCredits
    ) {
      setOptimisticCredits(null);
    }
  }, [optimisticCredits, user?.credits?.remainingCredits]);

  useEffect(() => {
    if (
      optimisticClaimed !== null &&
      optimisticClaimed === user?.credits?.dailyClaim?.claimedToday
    ) {
      setOptimisticClaimed(null);
    }
  }, [optimisticClaimed, user?.credits?.dailyClaim?.claimedToday]);

  // 每日签到
  const handleDailyClaim = async () => {
    if (!user?.id || claimed) {
      return;
    }

    setLoading(true);
    try {
      const { data } = await fetchApiJson<{ credits: number }>(
        '/api/user/daily-claim',
        {
          method: 'POST',
        }
      );
      const grantedCredits = data?.credits ?? dailyClaimCredits;
      setOptimisticClaimed(true);
      setOptimisticCredits((credits ?? 0) + grantedCredits);

      try {
        await fetchUserCredits();
      } catch (error) {
        console.error('[daily-claim-button] credits refresh failed', {
          userId: user.id,
          error,
        });
      }

      toast.success(t('messages.success', { credits: grantedCredits }));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        setOptimisticClaimed(true);
        void fetchUserCredits();
        toast(t('messages.already_claimed'));
      } else {
        console.error('[daily-claim-button] claim failed', {
          userId: user?.id,
          error,
        });
        const message =
          error instanceof Error ? error.message : t('messages.error');
        toast.error(message || t('messages.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (isCheckSign || !user?.id) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`border-border/60 bg-background/70 hover:bg-muted/80 supports-[backdrop-filter]:bg-background/60 relative min-w-24 justify-center gap-2 overflow-hidden rounded-xl px-4 font-medium shadow-sm ${className || ''}`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="font-semibold">
            {credits !== null ? credits : '...'}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="text-primary h-5 w-5" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Credits Display */}
          <div className="from-primary/5 to-primary/10 rounded-lg border bg-gradient-to-br p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {t('available_credits')}
            </p>
            <p className="text-primary mt-2 text-3xl font-bold">
              {credits !== null ? credits : '...'}
            </p>
          </div>

          {/* Daily Claim Section */}
          <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                <Sparkles className="text-primary h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{t('daily_bonus.title')}</h3>
                <p className="text-muted-foreground text-sm">
                  {t('daily_bonus.subtitle', { credits: dailyClaimCredits })}
                </p>
              </div>
            </div>

            <Button
              onClick={handleDailyClaim}
              disabled={loading || claimed}
              className="w-full gap-2"
              size="lg"
            >
              <Gift className="h-4 w-4" />
              {claimed
                ? t('daily_bonus.button_claimed')
                : t('daily_bonus.button_claim', {
                    credits: dailyClaimCredits,
                  })}
            </Button>

            {claimed && (
              <p className="text-muted-foreground text-center text-xs">
                {t('daily_bonus.come_back')}
              </p>
            )}
          </div>

          {/* Purchase Credits Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setOpen(false);
              router.push('/pricing');
            }}
          >
            {t('buttons.buy_more')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
