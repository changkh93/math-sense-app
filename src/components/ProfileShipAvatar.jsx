import { useState } from 'react';
import ModularShip from './Space/ModularShip';
import { getSafeProfileImageUrl } from '../utils/profileImageUtils';
import './ProfileShipAvatar.css';

export default function ProfileShipAvatar({ src, displayName = '탐험가', userData, size = 68 }) {
  const safeSrc = getSafeProfileImageUrl(src);
  return <AvatarLayers key={safeSrc} src={safeSrc} displayName={displayName} userData={userData} size={size} />;
}

function AvatarLayers({ src, displayName, userData, size }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <span className={`profile-ship-avatar${loaded && !failed ? ' is-ready' : ''}`}
      role="img" aria-label={`${displayName}님의 ${loaded && !failed ? '프로필 사진과 ' : ''}탐사선`}>
      <span className="profile-ship-avatar__ship" aria-hidden="true">
        <ModularShip userData={userData} size={size} animate={false} />
      </span>
      {src && !failed && <img className="profile-ship-avatar__photo" src={src} alt=""
        loading="lazy" decoding="async"
        onLoad={event => setLoaded(event.currentTarget.naturalWidth > 0)}
        onError={() => setFailed(true)} />}
    </span>
  );
}
