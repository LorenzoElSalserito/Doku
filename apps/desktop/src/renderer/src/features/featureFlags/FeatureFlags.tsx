import { createContext, useContext, type ReactNode } from 'react';
import {
  DEFAULT_FEATURE_FLAGS,
  isFeatureEnabled,
  type FeatureFlagId,
  type FeatureFlags,
} from '@doku/application';

const FeatureFlagsContext = createContext<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

/** Makes the persisted v2 feature flags available to the renderer tree. */
export function FeatureFlagsProvider({
  flags,
  children,
}: {
  flags: FeatureFlags | undefined;
  children: ReactNode;
}) {
  return (
    <FeatureFlagsContext.Provider value={flags ?? DEFAULT_FEATURE_FLAGS}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/** Whether a v2 capability is on. Off outside a provider. */
export function useFeatureFlag(id: FeatureFlagId): boolean {
  return isFeatureEnabled(useContext(FeatureFlagsContext), id);
}

/** Renders `children` only when the flag is on, `fallback` otherwise. */
export function FeatureGate({
  flag,
  children,
  fallback = null,
}: {
  flag: FeatureFlagId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{useFeatureFlag(flag) ? children : fallback}</>;
}
