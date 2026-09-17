// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from './Icon.js';
import {
  BOOTSTRAP_ICON_NAMES,
  BOOTSTRAP_ICON_PATHS,
  BOOTSTRAP_ICONS_VERSION,
} from '../icons/bootstrapIcons.generated.js';

describe('Icon', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the embedded Bootstrap glyph as inline SVG paths', () => {
    const { container } = render(<Icon name="gear" size={18} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(svg?.getAttribute('width')).toBe('18');
    expect(svg?.getAttribute('height')).toBe('18');
    expect(svg?.getAttribute('fill')).toBe('currentColor');
    expect(svg?.getAttribute('data-icon')).toBe('gear');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelectorAll('path')).toHaveLength(BOOTSTRAP_ICON_PATHS.gear.length);
    expect(svg?.querySelector('path')?.getAttribute('d')).toBe(BOOTSTRAP_ICON_PATHS.gear[0]?.d);
    // No external resource: everything is inline.
    expect(container.innerHTML).not.toMatch(/https?:\/\//);
    expect(container.querySelector('use, image, link')).toBeNull();
  });

  it('exposes an accessible name when labelled', () => {
    const { container } = render(<Icon name="exclamation-triangle" label="Warning" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('role')).toBe('img');
    expect(svg?.getAttribute('aria-label')).toBe('Warning');
    expect(svg?.hasAttribute('aria-hidden')).toBe(false);
  });

  it('keeps fill rules and merges class names', () => {
    const { container } = render(<Icon name="arrows-expand" className="custom" />);
    const svg = container.querySelector('svg');
    expect(svg?.className.baseVal).toBe('doku-icon doku-icon--arrows-expand custom');
    expect(svg?.querySelector('path')?.getAttribute('fill-rule')).toBe('evenodd');
  });

  it('ships every manifest icon with path data', () => {
    expect(BOOTSTRAP_ICONS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(BOOTSTRAP_ICON_NAMES.length).toBeGreaterThan(0);
    for (const name of BOOTSTRAP_ICON_NAMES) {
      const paths = BOOTSTRAP_ICON_PATHS[name];
      expect(paths.length, name).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path.d, name).toMatch(/^[Mm]/);
      }
    }
  });
});
