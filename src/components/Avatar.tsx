import type { CSSProperties, ReactNode } from 'react';
import { getAvatarDisplay } from '../utils/profilePresets';

interface AvatarProps {
  /** Stored avatar value: preset id, data URL, or http(s) URL. */
  avatar?: string;
  name?: string;
  className?: string;
  style?: CSSProperties;
  /** Overlays such as the online dot; they stay on top of the photo. */
  children?: ReactNode;
}

/**
 * The one place a stored avatar value becomes a face. Keeps the existing CSS classes,
 * so it drops straight into the initials-only divs it replaces.
 */
export function Avatar({ avatar, name, className, style, children }: AvatarProps) {
  const initials = (name || 'U').replace(/^@+/, '').substring(0, 2).toUpperCase();
  const display = getAvatarDisplay(avatar, initials);

  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      {display.isCustomImage ? (
        <img
          src={display.imageUrl}
          alt={name || 'Avatar'}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: 'inherit'
          }}
        />
      ) : (
        initials
      )}
      {children}
    </div>
  );
}
