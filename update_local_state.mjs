import fs from 'fs';

let content = fs.readFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', 'utf-8');

let findState = `      // Update local state
      setLearningProgress(prev => ({
        ...prev,
        videoProgress: {
          ...(prev?.videoProgress || {}),
          [txId]: {
            ...(prev?.videoProgress?.[txId] || {}),
            lastPosition: savedPosition,
            totalTimeSpent: totalTimeSpentRef.current,
            stampedSeconds: stamps
          }
        }
      }))`;

let replaceState = `      // Update local state
      setLearningProgress(prev => {
        const updatedVideoProgress = {
            ...(prev?.videoProgress?.[txId] || {}),
            lastPosition: savedPosition,
            totalTimeSpent: totalTimeSpentRef.current,
            stampedSeconds: stamps
        };
        if (isManualComplete) {
            updatedVideoProgress.completed = true;
            updatedVideoProgress.completionBonusGiven = true;
        }
        return {
          ...prev,
          videoProgress: {
            ...(prev?.videoProgress || {}),
            [txId]: updatedVideoProgress
          }
        };
      })`;

content = content.replace(findState, replaceState);

fs.writeFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', content);
console.log("Local state updated!");
