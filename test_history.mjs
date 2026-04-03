import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = await import('./service-account.json', { with: { type: 'json' } });
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount.default),
    databaseURL: "https://math-sense-1f6a8-default-rtdb.firebaseio.com"
  });
}
const db = admin.firestore();

async function runTest() {
  const paulId = "uKtiwPz4XTgtE9NQKKMeQxVVnHD2";
  
  // Fake what useLearningHistory does
  const rawActivities = [];
  
  // 1. activityLogs
  const actSnap = await db.collection(`users/${paulId}/activityLogs`).get();
  actSnap.forEach(docSnap => {
     const data = docSnap.data();
     const type = data.type || data.action;
     if (type === 'view_video' || type === 'video' || type === 'video_complete' || type === 'video_reward') {
        const titleRaw = data.chapterTitle || data.unitId;
        const watchTime = data.progress || 0;
        let prefix = '🎬 영상 학습 진행:';
        if (data.isCompleted) prefix = '🎬 영상 학습 완료:';
        
        rawActivities.push({
           id: docSnap.id,
           type: 'video_complete',
           title: `${prefix} ${titleRaw}`,
           metadata: { unitId: data.unitId, stampedCount: watchTime }
        });
     }
  });

  // group
  const groupMap = new Map();
  rawActivities.forEach(act => {
     const meta = act.metadata || {};
     const unitId = meta.unitId;
     let normalizedType = 'quiz';
     if (act.type === 'video_complete') normalizedType = 'video';
     const groupKey = `${unitId}_${normalizedType}`;
     
     if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, { id: groupKey, completed: false, subActivities: [] });
     }
     const group = groupMap.get(groupKey);
     group.subActivities.push(act);
     
     if (act.title?.includes('완료') || act.title?.includes('complete')) {
        group.completed = true;
     }
  });

  groupMap.forEach(v => {
     if (v.id.includes('unit_py_adv_1')) {
         console.log(JSON.stringify(v, null, 2));
     }
  });
}

runTest();
