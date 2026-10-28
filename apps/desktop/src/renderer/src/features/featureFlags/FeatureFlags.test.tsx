// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, isFeatureEnabled, withFeature } from '@doku/application';
import { FeatureFlagsProvider, FeatureGate } from './FeatureFlags.js';

describe('feature flags', () => {
  afterEach(() => {
    cleanup();
  });

  it('treats missing flags as off and switches one flag at a time', () => {
    expect(isFeatureEnabled(undefined, 'vault')).toBe(false);
    expect(isFeatureEnabled({}, 'vault')).toBe(false);
    const next = withFeature(DEFAULT_FEATURE_FLAGS, 'graph', true);
    expect(isFeatureEnabled(next, 'graph')).toBe(true);
    expect(isFeatureEnabled(next, 'vault')).toBe(false);
    expect(DEFAULT_FEATURE_FLAGS.graph).toBe(false);
  });

  it('renders gated content only when the flag is on', () => {
    const { rerender } = render(
      <FeatureFlagsProvider flags={DEFAULT_FEATURE_FLAGS}>
        <FeatureGate flag="vault" fallback={<span>v1</span>}>
          <span>vault sidebar</span>
        </FeatureGate>
      </FeatureFlagsProvider>,
    );
    expect(screen.queryByText('vault sidebar')).not.toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();

    rerender(
      <FeatureFlagsProvider flags={withFeature(DEFAULT_FEATURE_FLAGS, 'vault', true)}>
        <FeatureGate flag="vault" fallback={<span>v1</span>}>
          <span>vault sidebar</span>
        </FeatureGate>
      </FeatureFlagsProvider>,
    );
    expect(screen.getByText('vault sidebar')).toBeInTheDocument();
  });

  it('keeps everything off outside a provider', () => {
    render(
      <FeatureGate flag="links">
        <span>backlinks</span>
      </FeatureGate>,
    );
    expect(screen.queryByText('backlinks')).not.toBeInTheDocument();
  });
});
