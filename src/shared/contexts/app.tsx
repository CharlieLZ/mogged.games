'use client';

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';

import { authClient, getAuthClient } from '@/core/auth/client';
import { triggerGoogleOneTap } from '@/core/auth/one-tap-client';
import { fetchApiJson } from '@/shared/lib/api/client';
import type { User, UserCredits } from '@/shared/models/user';

export interface ContextValue {
  user: User | null;
  sessionUser: User | null;
  isCheckSign: boolean;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  authModalView: 'sign-in' | 'sign-up';
  setAuthModalView: (view: 'sign-in' | 'sign-up') => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchUserCredits: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
}

const noop = () => undefined;
const noopAsync = async () => undefined;

const defaultAppContextValue: ContextValue = {
  user: null,
  sessionUser: null,
  isCheckSign: false,
  isShowSignModal: false,
  setIsShowSignModal: noop,
  authModalView: 'sign-in',
  setAuthModalView: noop,
  isShowPaymentModal: false,
  setIsShowPaymentModal: noop,
  configs: {},
  fetchUserCredits: noopAsync,
  fetchUserInfo: noopAsync,
};

const AppContext = createContext(defaultAppContextValue);

export const useAppContext = () => useContext(AppContext);

export const AppContextProvider = ({
  children,
  authEnabled = false,
}: {
  children?: ReactNode;
  authEnabled?: boolean;
}) => {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const router = useRouter();

  // sign user
  const [user, setUser] = useState<User | null>(null);

  // session
  const [sessionUser, setSessionUser] = useState<User | null>(null);

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(authEnabled);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);
  const [authModalView, setAuthModalView] = useState<'sign-in' | 'sign-up'>(
    'sign-in'
  );

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  // guards to prevent redundant operations
  const configsFetchedRef = useRef(false);
  const mountedRef = useRef(false);
  const oneTapInitializedRef = useRef(false);
  const oneTapSessionSyncingRef = useRef(false);

  const fetchConfigs = async function () {
    if (configsFetchedRef.current) {
      return;
    }
    configsFetchedRef.current = true;

    try {
      const { data } = await fetchApiJson<Record<string, string>>(
        '/api/config/get-configs',
        {
          method: 'GET',
          cache: 'no-store',
        }
      );
      if (!mountedRef.current) {
        return;
      }
      setConfigs(data || {});
    } catch (error) {
      console.error('[config] fetch configs failed', {
        error,
        step: 'app-fetch-configs',
      });
      configsFetchedRef.current = false;
    }
  };

  const fetchUserCredits = async function () {
    try {
      if (!user) {
        return;
      }

      const { data } = await fetchApiJson<UserCredits>(
        '/api/user/get-user-credits',
        {
          method: 'POST',
        }
      );
      if (!data) {
        return;
      }

      if (!mountedRef.current) {
        return;
      }
      setUser((currentUser) =>
        currentUser ? { ...currentUser, credits: data } : currentUser
      );
    } catch (error) {
      console.error('[user] fetch user credits failed', {
        error,
        step: 'app-fetch-user-credits',
      });
    }
  };

  const fetchUserInfo = async function () {
    try {
      const { data } = await fetchApiJson<User>('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!mountedRef.current) {
        return;
      }
      setUser(data || null);
    } catch (error) {
      console.error('[user] fetch user info failed', {
        error,
        step: 'app-fetch-user-info',
      });
    }
  };

  const syncSession = async function () {
    if (!authEnabled) {
      setIsCheckSign(false);
      return;
    }

    setIsCheckSign(true);

    try {
      const sessionResult = await authClient.getSession({
        fetchOptions: {
          cache: 'no-cache',
          next: { revalidate: 0 },
        },
      });

      const nextSessionUser =
        (sessionResult.data?.user as User | undefined) ?? null;

      if (!mountedRef.current) {
        return;
      }

      setSessionUser(nextSessionUser);

      if (nextSessionUser) {
        setUser(nextSessionUser);
        await fetchUserInfo();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[auth] session fetch failed', {
        error,
        step: 'app-session-sync',
      });

      if (mountedRef.current) {
        setSessionUser(null);
        setUser(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsCheckSign(false);
      }
    }
  };

  const syncOneTapSession = async function (
    authConfigs: Record<string, string>
  ) {
    if (oneTapSessionSyncingRef.current) {
      return false;
    }
    oneTapSessionSyncingRef.current = true;

    const oneTapAuthClient = getAuthClient(authConfigs);

    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        if (!mountedRef.current) {
          return false;
        }

        try {
          const sessionResult = await oneTapAuthClient.getSession({
            fetchOptions: {
              cache: 'no-cache',
              next: { revalidate: 0 },
            },
          });

          const oneTapSessionUser = sessionResult.data?.user;
          if (oneTapSessionUser) {
            if (!mountedRef.current) {
              return false;
            }

            setSessionUser(oneTapSessionUser as User);
            setUser(oneTapSessionUser as User);
            await fetchUserInfo();
            if (mountedRef.current) {
              router.refresh();
            }
            return true;
          }
        } catch (error) {
          console.error('[auth][one-tap] session fetch failed', {
            attempt: attempt + 1,
            error,
            step: 'one-tap-session-sync',
          });
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 200 * (attempt + 1))
        );
      }

      return false;
    } finally {
      oneTapSessionSyncingRef.current = false;
    }
  };

  const showOneTap = async function (authConfigs: Record<string, string>) {
    const initialized = await triggerGoogleOneTap({
      configs: authConfigs,
      onSuccess: async () => {
        const synced = await syncOneTapSession(authConfigs);

        if (!synced) {
          console.error('[auth][one-tap] session sync timed out');
        }
      },
      onPromptNotification: () => {
        oneTapInitializedRef.current = false;
        setAuthModalView('sign-in');
        setIsShowSignModal(true);
      },
    });

    if (!initialized) {
      oneTapInitializedRef.current = false;
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    fetchConfigs();
    syncSession();

    return () => {
      mountedRef.current = false;
    };
  }, [authEnabled]);

  // Reset OneTap guard when user is authenticated or OneTap is disabled
  useEffect(() => {
    if (sessionUser || configs.google_one_tap_enabled !== 'true') {
      oneTapInitializedRef.current = false;
    }
  }, [sessionUser, configs.google_one_tap_enabled]);

  // Trigger Google OneTap prompt when configs are loaded,
  // no active session exists, and not already initialized.
  useEffect(() => {
    if (
      configs.google_one_tap_enabled !== 'true' ||
      configs.google_auth_enabled !== 'true' ||
      !configs.google_client_id ||
      sessionUser ||
      isCheckSign ||
      oneTapInitializedRef.current ||
      oneTapSessionSyncingRef.current
    ) {
      return;
    }

    oneTapInitializedRef.current = true;
    showOneTap(configs);
  }, [configs.google_one_tap_enabled, sessionUser, isCheckSign]);

  useEffect(() => {
    if (user && !user.credits) {
      // fetchUserCredits();
    }
  }, [user]);

  return (
    <AppContext.Provider
      value={{
        user,
        sessionUser,
        isCheckSign,
        isShowSignModal,
        setIsShowSignModal,
        authModalView,
        setAuthModalView,
        isShowPaymentModal,
        setIsShowPaymentModal,
        configs,
        fetchUserCredits,
        fetchUserInfo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
