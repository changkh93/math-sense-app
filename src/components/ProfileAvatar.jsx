import React from 'react';
import { getSafeProfileImageUrl } from '../utils/profileImageUtils';
import './ProfileAvatar.css';

export default function ProfileAvatar({
  src,
  displayName = '탐험가',
  className = '',
  style,
  loading = 'lazy',
}) {
  const safeSrc = getSafeProfileImageUrl(src);
  const [failed, setFailed] = React.useState(false);
  const initial = Array.from(String(displayName || '').trim())[0] || '?';

  React.useEffect(() => {
    setFailed(false);
  }, [safeSrc]);

  return (
    <span
      className={`profile-avatar ${className}`.trim()}
      style={style}
      role="img"
      aria-label={`${displayName || '탐험가'}님의 프로필 사진`}
    >
      <span className="profile-avatar__fallback" aria-hidden="true">{initial}</span>
      {safeSrc && !failed ? (
        <img
          className="profile-avatar__image"
          src={safeSrc}
          alt=""
          loading={loading}
          onError={() => setFailed(true)}
          onLoad={(event) => {
            if (!event.currentTarget.naturalWidth) setFailed(true);
          }}
        />
      ) : null}
    </span>
  );
}
