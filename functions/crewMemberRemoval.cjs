"use strict";

// All membership changes are committed together, including cached member lists.
async function removeCrewMember({ db, uid, crewId, targetUid, HttpsError, growthService,
  clearedUserFields, removeRoomParticipant }) {
  const validId = (value) => typeof value === "string" && value.trim() && !value.includes("/");
  if (!validId(crewId) || !validId(targetUid)) {
    throw new HttpsError("invalid-argument", "크루와 멤버 ID를 확인해주세요.");
  }
  if (uid === targetUid) throw new HttpsError("invalid-argument", "본인은 내보낼 수 없습니다. 크루 삭제/탈퇴를 이용해주세요.");
  const crewRef = db.collection("crews").doc(crewId);
  await db.runTransaction(async (tx) => {
    const crewSnap = await tx.get(crewRef);
    if (!crewSnap.exists) throw new HttpsError("not-found", "크루를 찾을 수 없습니다.");
    const crew = crewSnap.data();
    if (crew.leaderId !== uid) throw new HttpsError("permission-denied", "크루 리더만 멤버를 내보낼 수 있습니다.");
    const memberIds = [...new Set([crew.leaderId, ...(crew.memberIds || [])].filter(Boolean))];
    if (!memberIds.includes(targetUid)) throw new HttpsError("not-found", "이미 크루에 없는 멤버입니다.");
    const nextIds = memberIds.filter((id) => id !== targetUid);
    const userSnaps = await Promise.all(memberIds.map((id) => tx.get(db.collection("users").doc(id))));
    const lockSnap = await tx.get(growthService.getParticipantLockRef(db, targetUid));
    const roomRef = crew.activeStudyRoomId ? db.collection("studyRooms").doc(crew.activeStudyRoomId) : null;
    const roomSnap = roomRef ? await tx.get(roomRef) : null;
    // The room helper can read its next host before it begins writing.
    if (roomSnap?.exists && roomSnap.data().crewId === crewId) {
      await removeRoomParticipant(tx, db, roomRef, roomSnap.data(), targetUid);
    }
    const now = new Date();
    tx.update(crewRef, { memberIds: nextIds, memberCount: nextIds.length, updatedAt: now });
    for (let index = 0; index < memberIds.length; index += 1) {
      const snap = userSnaps[index];
      // Deleted accounts must not be recreated; stale rosters must not clear a new crew.
      if (!snap.exists || snap.data().crewId !== crewId) continue;
      const id = memberIds[index];
      if (id === targetUid) {
        tx.update(snap.ref, clearedUserFields());
      } else if (snap.data().crewSnapshot) {
        const snapshot = snap.data().crewSnapshot;
        tx.update(snap.ref, { crewSnapshot: { ...snapshot,
          memberIds: nextIds, memberCount: nextIds.length,
          members: (snapshot.members || []).filter((member) => nextIds.includes(member.uid)),
        } });
      }
    }
    await growthService.forfeitParticipantLock(db, tx, targetUid, crewId, "member_removed", Date.now(), lockSnap);
  });
  return { success: true };
}

module.exports = { removeCrewMember };
