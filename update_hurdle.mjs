import fs from 'fs';

let content = fs.readFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', 'utf-8');

// 1. Remove hurdle from tracking logic
let trackingFind = `      let isManualComplete = false
      if (isAtEnd && !videoCompleted && (totalTimeSpentRef.current >= (videoDurationRef.current || 1) * 0.2)) {
         isManualComplete = true
      }`;
let trackingReplace = `      let isManualComplete = false
      // Remove 20% hurdle. If they reached the end but didn't complete, allow manual completion without bonus
      if (isAtEnd && !videoCompleted) {
         isManualComplete = true
      }`;
content = content.replace(trackingFind, trackingReplace);

// 2. Remove hurdle from UI button
let uiFind = `              ) : isAtEnd ? (
                totalTimeSpentRef.current >= (videoDurationRef.current || 1) * 0.2 ? (
                  <>☑️ 수동 완료 처리 (광석 보상 없음)</>
                ) : (
                  <>⚠️ 데이터 수신 부족 ({Math.min(100, Math.floor((stampCount / (videoDurationRef.current || Math.max(stampCount, 1))) * 100))}%)</>
                )
              ) : (`;
let uiReplace = `              ) : isAtEnd ? (
                  <>☑️ 수동 완료 처리 (광석 보상 없음) - 수신율 {Math.min(100, Math.floor((stampCount / (videoDurationRef.current || Math.max(stampCount, 1))) * 100))}%</>
              ) : (`;
content = content.replace(uiFind, uiReplace);

fs.writeFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', content);
console.log("Hurdle removed!");
