import React, { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import { isUnreliableUrl, markUrlFailed, hasUrlFailed } from '../utils/imageFallback.js';

/**
 * SafeAvatar Component
 *
 * Reliably renders user profile avatars with automatic fallback to user initials
 * or fallback icon if the avatar image URL is missing, blocked, or fails to load.
 */
export const SafeAvatar = ({
  src,
  name = '',
  alt = '',
  className = 'w-full h-full object-cover',
  fallbackClassName = 'w-full h-full flex items-center justify-center font-bold text-white uppercase',
  iconClassName = 'w-1/2 h-1/2 text-white/70',
}) => {
  const [hasError, setHasError] = useState(() => {
    return !src || isUnreliableUrl(src) || hasUrlFailed(src);
  });

  useEffect(() => {
    setHasError(!src || isUnreliableUrl(src) || hasUrlFailed(src));
  }, [src]);

  const initial = (name && typeof name === 'string' && name.trim())
    ? name.trim().charAt(0).toUpperCase()
    : null;

  if (hasError || !src) {
    return (
      <div className={fallbackClassName} aria-label={alt || name || 'User avatar'}>
        {initial || <UserIcon className={iconClassName} />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || name || 'User avatar'}
      onError={() => {
        markUrlFailed(src);
        setHasError(true);
      }}
      className={className}
    />
  );
};

export default SafeAvatar;
