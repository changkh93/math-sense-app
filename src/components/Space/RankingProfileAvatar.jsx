import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useProfileSectionVisible } from '../../hooks/useProfileSectionVisible';
import { resolveProfileImageUrl } from '../../utils/profileImageUtils';
import ProfileShipAvatar from '../ProfileShipAvatar';

// Legacy leaderboard aggregates omitted image fields. Hydrate only visible
// entries, once per viewer/user cache window, while keeping the ship visible.
export default function RankingProfileAvatar({ entry, viewerId, ownProfile, size }) {
  const needsPhoto = !Object.hasOwn(entry, 'profileImageUrl') && !ownProfile;
  const [ref, visible] = useProfileSectionVisible(needsPhoto);
  const { data } = useQuery({
    queryKey: ['ranking-profile-photo', viewerId || '', entry.id],
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'users', entry.id));
      return resolveProfileImageUrl(snapshot.data() || {});
    },
    enabled: Boolean(viewerId && entry.id && visible && needsPhoto),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
    retryOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });
  const src = ownProfile ? resolveProfileImageUrl(ownProfile) : (data ?? resolveProfileImageUrl(entry));
  return <span ref={ref} style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}>
    <ProfileShipAvatar src={src} userData={entry} size={size}
      displayName={entry.publicDisplayName || entry.studentName || entry.name || '탐험가'} />
  </span>;
}
