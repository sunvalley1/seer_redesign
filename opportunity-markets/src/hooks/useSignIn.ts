import { useSignIn as useSignInBase, type SignInResult } from '@seer-pm/react';
import { toastify } from '../lib/toastify';
import { setAccessToken } from './useAccessToken';

export type { SignInResult };

export function useSignIn(onSuccess?: (data: SignInResult) => unknown) {
  return useSignInBase({
    notifier: toastify,
    onSuccess: (data) => {
      setAccessToken(data.token);
      onSuccess?.(data);
    },
  });
}
