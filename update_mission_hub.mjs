import fs from 'fs';

let content = fs.readFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', 'utf-8');

// 1. Add idTokenRef, saveStatus, resumePosStr
let stateDecls = `
  const idTokenRef = useRef(null)
  useEffect(() => {
    if (user) {
      user.getIdToken().then(t => idTokenRef.current = t)
      const interval = setInterval(() => user.getIdToken().then(t => idTokenRef.current = t), 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [user])

  const [saveStatus, setSaveStatus] = useState(null)
  const [resumePosStr, setResumePosStr] = useState("")
`;

content = content.replace("const autoSaveIntervalRef = useRef(null)", `const autoSaveIntervalRef = useRef(null)
${stateDecls}`);

// 2. handleVideoTimeUpdate logic for saving to local storage
let timeUpdateFind = `    if (newStampsAdded) {
      setStampCount(stampedSetRef.current.size)
    }`;
let timeUpdateReplace = `    if (newStampsAdded) {
      setStampCount(stampedSetRef.current.size)
      // Save locally every stamp update (Offline-first caching)
      if (userId && selectedTx) {
        const txId = selectedTx.id || 'default'
        const localCacheKey = \`video_progress_\${userId}_\${unitId}_\${txId}\`
        localStorage.setItem(localCacheKey + '_stamps', JSON.stringify(Array.from(stampedSetRef.current)))
        localStorage.setItem(localCacheKey + '_pos', currentSecond.toString())
      }
    }`;
content = content.replace(timeUpdateFind, timeUpdateReplace);

// 3. handleSaveVideoPosition
let savePosFind = `const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
      await setDoc(progressRef, {
        [\`videoProgress.\${txId}\`]: {
          lastPosition: savedPosition,
          stampedSeconds: stamps,
          rewardedStampCount: stamps.length - newStampCountRef.current,
          totalRewardedCrystals: totalRewardedCrystalsRef.current,
          totalTimeSpent: totalTimeSpentRef.current,
          updatedAt: serverTimestamp()
        }
      }, { merge: true })`;

let savePosReplace = `let isManualComplete = false
      if (isAtEnd && !videoCompleted && (totalTimeSpentRef.current >= (videoDurationRef.current || 1) * 0.2)) {
         isManualComplete = true
      }
      
      const progressRef = doc(db, 'users', userId, 'learning_progress', unitId)
      const updateData = {
        [\`videoProgress.\${txId}.lastPosition\`]: savedPosition,
        [\`videoProgress.\${txId}.stampedSeconds\`]: stamps,
        [\`videoProgress.\${txId}.rewardedStampCount\`]: stamps.length - newStampCountRef.current,
        [\`videoProgress.\${txId}.totalRewardedCrystals\`]: totalRewardedCrystalsRef.current,
        [\`videoProgress.\${txId}.totalTimeSpent\`]: totalTimeSpentRef.current,
        [\`videoProgress.\${txId}.updatedAt\`]: serverTimestamp()
      }
      
      if (isManualComplete) {
         updateData[\`videoProgress.\${txId}.completed\`] = true
         updateData[\`videoProgress.\${txId}.completionBonusGiven\`] = true
      }
      
      await setDoc(progressRef, updateData, { merge: true })
      
      // Cleanup local storage
      const localCacheKey = \`video_progress_\${userId}_\${unitId}_\${txId}\`
      localStorage.removeItem(localCacheKey + '_stamps')
      localStorage.removeItem(localCacheKey + '_pos')`;
      
content = content.replace(savePosFind, savePosReplace);

// 4. useEffect selectedTx: LocalStorage Set Union & Auto Save
let resetFind = `// Restore stamped set from Firestore
      const savedStamps = savedProgress?.stampedSeconds || []
      stampedSetRef.current = new Set(savedStamps)
      const rewardedCount = savedProgress?.rewardedStampCount || 0
      newStampCountRef.current = Math.max(0, savedStamps.length - rewardedCount)
      setStampCount(savedStamps.length)
      
      // Restore analytics and reward tracking
      totalTimeSpentRef.current = savedProgress?.totalTimeSpent || 0
      totalRewardedCrystalsRef.current = savedProgress?.totalRewardedCrystals || 0
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      videoDurationRef.current = 0 // Will be set by first onTimeUpdate
      
      setVideoCompleted(savedProgress?.completed || false)
      setIsAtEnd(false) // Reset end detection when switching/reloading tx
      setVideoCompletionBonusGiven(savedProgress?.completionBonusGiven || false)
      lastVideoTimeRef.current = (savedProgress?.lastPosition !== undefined) ? savedProgress.lastPosition : -1
      setInitialStartPosition((savedProgress?.lastPosition !== undefined) ? savedProgress.lastPosition : (selectedTx.start || 0))`;

let resetReplace = `// Offline-First Union: Merge local and remote stamps
      const serverStamps = savedProgress?.stampedSeconds || []
      const localCacheKey = \`video_progress_\${userId}_\${unitId}_\${txId}\`
      const localStampsRaw = localStorage.getItem(localCacheKey + '_stamps')
      const localStamps = localStampsRaw ? JSON.parse(localStampsRaw) : []
      stampedSetRef.current = new Set([...serverStamps, ...localStamps])
      
      const combinedStampCount = stampedSetRef.current.size
      const rewardedCount = savedProgress?.rewardedStampCount || 0
      newStampCountRef.current = Math.max(0, combinedStampCount - rewardedCount)
      setStampCount(combinedStampCount)
      
      // Offline-First Max: Secure local position priority
      const serverPos = savedProgress?.lastPosition || 0
      const localPosRaw = localStorage.getItem(localCacheKey + '_pos')
      const localPos = localPosRaw ? parseFloat(localPosRaw) : 0
      const maxPos = Math.max(serverPos, localPos)
      
      totalTimeSpentRef.current = savedProgress?.totalTimeSpent || 0
      totalRewardedCrystalsRef.current = savedProgress?.totalRewardedCrystals || 0
      setTotalRewardedCrystals(totalRewardedCrystalsRef.current)
      videoDurationRef.current = 0 
      
      setVideoCompleted(savedProgress?.completed || false)
      setIsAtEnd(false)
      setVideoCompletionBonusGiven(savedProgress?.completionBonusGiven || false)
      lastVideoTimeRef.current = maxPos > 0 ? maxPos : -1
      setInitialStartPosition(maxPos > 0 ? maxPos : (selectedTx.start || 0))
      
      if (maxPos > 0) {
         setResumePosStr(\`이전 지점(\${Math.floor(maxPos / 60)}분 \${Math.floor(maxPos % 60)}초)에서 이어보기 되었습니다.\`)
         setTimeout(() => setResumePosStr(""), 4000)
      }`;
content = content.replace(resetFind, resetReplace);

// 5. Visibilitychange + Auto Save Indicator
let autoSaveFind = `await setDoc(progressRef, updateData, { merge: true })

              // Sync local state as well`;
let autoSaveReplace = `setSaveStatus('saving')
              await setDoc(progressRef, updateData, { merge: true })
              
              setSaveStatus('saved')
              setTimeout(() => setSaveStatus(null), 2000)

              // Sync local state as well`;
content = content.replace(autoSaveFind, autoSaveReplace);

let intervalSetupFind = `        }, 10000) // Every 10 seconds
      }
    }

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
    }`;
let intervalSetupReplace = `        }, 10000) // Every 10 seconds

        const handleUnloadSave = () => {
          const finalPos = Math.floor(lastVideoTimeRef.current || 0)
          if (finalPos <= 0 || !idTokenRef.current) return
          const FIREBASE_POST_URL = "https://us-central1-math-sense-1f6a8.cloudfunctions.net/syncVideoProgress"
          const payload = JSON.stringify({
            idToken: idTokenRef.current,
            userId,
            unitId,
            txId,
            progressData: {
              lastPosition: finalPos,
              totalTimeSpent: totalTimeSpentRef.current,
              stampedSeconds: Array.from(stampedSetRef.current)
            }
          })
          navigator.sendBeacon(FIREBASE_POST_URL, payload)
        }
        
        const handleVisibilityChange = () => { if (document.hidden) handleUnloadSave() }

        window.addEventListener('beforeunload', handleUnloadSave)
        document.addEventListener('visibilitychange', handleVisibilityChange)
        
        // Save unmount funcs closely mapping current closures
        autoSaveIntervalRef.currentDestructors = () => {
           window.removeEventListener('beforeunload', handleUnloadSave)
           document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
      }
    }

    return () => {
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current)
      if (autoSaveIntervalRef.currentDestructors) autoSaveIntervalRef.currentDestructors()
    }`;
content = content.replace(intervalSetupFind, intervalSetupReplace);


// 6. UI Updates: Save Indicator, Force Complete Button
let uiTopFind = `<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
               {/* Watch progress indicator */}
               {stampCount > 0 && (
                 <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                   학습: {Math.floor(stampCount / 60)}분 {stampCount % 60}초
                 </span>
               )}`;
let uiTopReplace = `<div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
               {/* Cloud Save Micro-interaction */}
               <AnimatePresence>
                 {saveStatus && (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0 }}
                     style={{ color: saveStatus === 'saved' ? 'var(--planet-green)' : 'var(--crystal-cyan)', fontSize: '1rem', marginRight: '0.5rem' }}
                     title="데이터 안전하게 동기화 중"
                   >
                     {saveStatus === 'saved' ? '✔' : '☁️'}
                   </motion.div>
                 )}
                 {resumePosStr && (
                   <motion.div
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0 }}
                     style={{ color: 'var(--star-gold)', fontSize: '0.85rem', marginRight: '0.5rem', fontStyle: 'italic', fontFamily: 'var(--font-tech)' }}
                   >
                     {resumePosStr}
                   </motion.div>
                 )}
               </AnimatePresence>
               {/* Watch progress indicator */}
               {stampCount > 0 && (
                 <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                   학습: {Math.floor(stampCount / 60)}분 {stampCount % 60}초
                 </span>
               )}`;
content = content.replace(uiTopFind, uiTopReplace);

let buttonFind = `              ) : isAtEnd ? (
                <>⚠️ 데이터 수신 부족 ({Math.min(100, Math.floor((stampCount / (videoDurationRef.current || Math.max(stampCount, 1))) * 100))}%)</>
              ) : (`;
let buttonReplace = `              ) : isAtEnd ? (
                totalTimeSpentRef.current >= (videoDurationRef.current || 1) * 0.2 ? (
                  <>☑️ 수동 완료 처리 (광석 보상 없음)</>
                ) : (
                  <>⚠️ 데이터 수신 부족 ({Math.min(100, Math.floor((stampCount / (videoDurationRef.current || Math.max(stampCount, 1))) * 100))}%)</>
                )
              ) : (`;
content = content.replace(buttonFind, buttonReplace);

fs.writeFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', content);
console.log("MissionHub updated successfully!");
