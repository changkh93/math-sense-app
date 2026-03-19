import fs from 'fs';

let content = fs.readFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', 'utf-8');

// 1. Storage key
content = content.replace("const sessionStorageKey = `datalog_timer_${unitId}`", "const storageKey = `datalog_timer_${userId || 'anon'}_${unitId}`");

// 2. Change all sessionStorage usage around the data log timer to localStorage
content = content.replace(/sessionStorageKey/g, 'storageKey');
content = content.replace(/sessionStorage\.setItem\(storageKey/g, 'localStorage.setItem(storageKey');
content = content.replace(/sessionStorage\.getItem\(storageKey/g, 'localStorage.getItem(storageKey');
content = content.replace(/sessionStorage\.removeItem\(storageKey/g, 'localStorage.removeItem(storageKey');

fs.writeFileSync('/Users/selah/Documents/수학감각_방학특가용ppt/pdf완성본/math-sense-app/src/components/Space/MissionHub.jsx', content);
console.log("MissionHub DataLog storage updated!");
