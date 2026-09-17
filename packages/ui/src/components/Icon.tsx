import type { SVGProps } from 'react';
import {
  BOOTSTRAP_ICON_PATHS,
  type BootstrapIconName,
  type BootstrapIconPath,
} from '../icons/bootstrapIcons.generated.js';

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'children'> {
  /** Bootstrap Icons glyph name (see packages/ui/src/icons/bootstrap-icons.manifest.json). */
  name: BootstrapIconName;
  /** Rendered size in CSS pixels; CSS on `className` may override it. */
  size?: number | string;
  /**
   * Accessible name. When omitted the icon is decorative (`aria-hidden`) and
   * the surrounding control must carry the label.
   */
  label?: string;
}

/**
 * Inline Bootstrap icon. Glyph data is embedded at build time from the
 * generated registry, so the packaged app has no icon font, stylesheet or
 * network dependency.
 */
export function Icon({ name, size = 16, label, className, ...rest }: IconProps) {
  const paths: readonly BootstrapIconPath[] = BOOTSTRAP_ICON_PATHS[name];
  return (
    <svg
      className={['doku-icon', `doku-icon--${name}`, className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      focusable="false"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-icon={name}
      {...rest}
    >
      {paths.map((path, index) => (
        <path key={index} d={path.d} fillRule={path.fillRule} />
      ))}
    </svg>
  );
}
