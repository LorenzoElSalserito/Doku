import {
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_IDS,
  type FeatureFlagId,
  type FeatureFlags,
} from '@doku/schemas';

export { DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_IDS };
export type { FeatureFlagId, FeatureFlags };

/**
 * Flags whose sprint is closed and that may be offered in Preferences. Empty
 * until Sprint K1 ships: an unreleased capability is never exposed to users.
 */
export const RELEASED_FEATURE_FLAGS: readonly FeatureFlagId[] = [];

/** Whether a v2 capability is on. Missing flags (older settings) count as off. */
export function isFeatureEnabled(
  flags: Partial<FeatureFlags> | undefined,
  id: FeatureFlagId,
): boolean {
  return flags?.[id] === true;
}

/** A new flag set with one capability switched. */
export function withFeature(
  flags: FeatureFlags,
  id: FeatureFlagId,
  enabled: boolean,
): FeatureFlags {
  return { ...flags, [id]: enabled };
}
