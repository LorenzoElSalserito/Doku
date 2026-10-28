import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_SETTINGS,
  FEATURE_FLAG_IDS,
  SettingsSchema,
} from './settings.js';

describe('feature flags in settings', () => {
  it('declares the fifteen v2 capabilities, all off by default', () => {
    expect(FEATURE_FLAG_IDS).toHaveLength(15);
    expect(Object.values(DEFAULT_FEATURE_FLAGS).every((value) => value === false)).toBe(true);
    expect(DEFAULT_SETTINGS.features).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('fills the flags in when settings from 0.2.0 have none', () => {
    const { features: _features, ...legacy } = DEFAULT_SETTINGS;
    const parsed = SettingsSchema.parse(legacy);
    expect(parsed.features).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('keeps stored flags and defaults the missing ones', () => {
    const parsed = SettingsSchema.parse({ ...DEFAULT_SETTINGS, features: { vault: true } });
    expect(parsed.features.vault).toBe(true);
    expect(parsed.features.graph).toBe(false);
  });

  it('rejects a non-boolean flag', () => {
    expect(
      SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, features: { vault: 'yes' } }).success,
    ).toBe(false);
  });
});
