import React, { useState } from 'react';
import { collection, getDocs, doc as firestoreDoc, setDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wrench, ShieldAlert, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

import { extractLearningActivityDates, getTodayKST, recalculateStreakState } from '../../utils/streakUtils';

const StreakFixer = () => {
  const [targetUid, setTargetUid] = useState('');
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [affectedUsers, setAffectedUsers] = useState([]);
  const [fixing, setFixing] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const processUser = async (uid, userData, todayKST) => {
    const displayName = userData.displayName || userData.name || uid.slice(0, 8);

    // 1. 코어 확보 증거 수집 (구매 기록)
    const txSnap = await getDocs(query(collection(db, 'users', uid, 'crystal_transactions'), orderBy('timestamp', 'asc')));
    const transactions = txSnap.docs.map(d => ({ 
      ...d.data(), 
      date: getTodayKST(d.data().timestamp?.toDate ? d.data().timestamp.toDate() : new Date(d.data().timestamp))
    }));

    const coreEvidence = transactions
      .filter(t => t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core')
      .map(t => t.date);
    
    // 2. 소모 기록과 현재 개수를 바탕으로 부족한 증거 보완 (수동 지급 등 대비)
    const usageDates = transactions.filter(t => t.type === 'streak_freeze').map(t => t.date);
    const currentOwned = userData.streakFreezeCount || 0;
    
    // 구매 기록보다 실제 소모가 많다면, 소모 시점에 코어가 있었다고 가정
    let simulatedInventory = [...coreEvidence].sort();
    usageDates.sort().forEach(uExDate => {
      const idx = simulatedInventory.findIndex(pDate => pDate <= uExDate);
      if (idx !== -1) simulatedInventory.splice(idx, 1);
      else coreEvidence.push(uExDate); 
    });
    
    // 현재 보유 중인 개수가 계산보다 많으면 오늘 날짜로 보정
    const currentlyExpected = coreEvidence.length - usageDates.length;
    if (currentOwned > currentlyExpected) {
      for (let i = 0; i < (currentOwned - currentlyExpected); i++) {
        coreEvidence.push(todayKST);
      }
    }

    // 3. 학습 히스토리 수집
    const histSnap = await getDocs(query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'asc')));
    const historyEntries = histSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const activeDates = Array.from(extractLearningActivityDates(historyEntries, transactions)).sort();

    if (activeDates.length === 0) return null;

    // 4. 시간순 재계산 실행
    const result = recalculateStreakState(activeDates, coreEvidence, todayKST);
    const dbStreak = userData.currentStreak || 0;
    const dbLastDate = userData.lastStreakDate || '';
    const shouldFix =
      result.correctStreak !== dbStreak ||
      result.coresRemaining !== currentOwned ||
      result.correctLastDate !== dbLastDate;

    if (shouldFix) {
      return {
        uid, displayName, dbStreak,
        dbLongest: userData.longestStreak || 0,
        dbLastDate,
        correctStreak: result.correctStreak,
        correctLastDate: result.correctLastDate,
        effectiveLastDate: result.effectiveLastDate,
        correctLongest: Math.max(userData.longestStreak || 0, result.correctStreak),
        coresUsed: result.coresUsed,
        defendedDates: result.defendedDates,
        totalCoresEverHad: coreEvidence.length,
        currentFreezeCount: currentOwned,
        correctFreezeCount: result.coresRemaining,
      };
    }
    return null;
  };

  const runAudit = async () => {
    setScanning(true);
    setLogs([]);
    setAffectedUsers([]);
    
    try {
      addLog('Starting comprehensive user audit...');
      const todayKST = getTodayKST();
      
      const usersSnap = await getDocs(collection(db, 'users'));
      addLog(`Found ${usersSnap.size} total users. Scanning...`);

      const _affected = [];
      for (const userDoc of usersSnap.docs) {
        const res = await processUser(userDoc.id, userDoc.data(), todayKST);
        if (res) {
          _affected.push(res);
          addLog(`⚠️ Issue found: ${res.displayName} (Streak: ${res.dbStreak}->${res.correctStreak}, Cores: ${res.currentFreezeCount}->${res.correctFreezeCount})`);
        }
      }

      setAffectedUsers(_affected);
      addLog(`Audit complete. Found ${_affected.length} users with data mismatches.`);
    } catch (err) {
      console.error(err);
      addLog(`ERROR: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const runIndividualAudit = async () => {
    if (!targetUid.trim()) return alert('Please enter a UID');
    setScanning(true);
    setLogs([]);
    setAffectedUsers([]);

    try {
      addLog(`Scanning specific user: ${targetUid}...`);
      const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', targetUid.trim())));
      
      if (userSnap.empty) {
        addLog(`❌ User ${targetUid} not found.`);
        return;
      }

      const res = await processUser(userSnap.docs[0].id, userSnap.docs[0].data(), getTodayKST());
      if (res) {
        setAffectedUsers([res]);
        addLog(`⚠️ Issue found for ${res.displayName}. Click Apply to fix!`);
      } else {
        addLog(`✅ User ${targetUid} data is consistent with activity records.`);
      }
    } catch (err) {
      console.error(err);
      addLog(`ERROR: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  const applyFixes = async () => {
    if (affectedUsers.length === 0) return;
    if (!window.confirm(`Are you sure you want to fix ${affectedUsers.length} users' streaks in Firestore?`)) return;

    setFixing(true);
    addLog('Applying fixes to Firestore...');

    try {
      for (const user of affectedUsers) {
        const updates = {
          currentStreak: user.correctStreak,
          longestStreak: user.correctLongest,
          streakFreezeCount: user.correctFreezeCount, // Restore/fix core count
          lastStreakDate: user.correctLastDate,
        };

        await setDoc(firestoreDoc(db, 'users', user.uid), updates, { merge: true });
        addLog(`✅ Fixed ${user.displayName}: Data restored successfully.`);
      }
      
      addLog('All fixes applied successfully!');
      setAffectedUsers([]);
    } catch (err) {
      console.error(err);
      addLog(`ERROR during fix: ${err.message}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="ghost-cleaner" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: 'white' }}>
      <header className="mb-8 border-b pb-4 border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Wrench size={32} className="text-cyan-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Streak/Cryo Core Rescue
          </h1>
        </div>
        <p className="text-gray-400">
          이 도구는 사용자의 전체 학습 히스토리를 분석하여 깨진 스트릭을 복구하고, 
          Race Condition이나 버그로 인해 잘못 소모되거나 증발한 크라이오 코어를 되찾아줍니다.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass p-6 rounded-xl flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-cyan-300">
            <ShieldAlert size={18} /> 개별 사용자 긴급 복구
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="User UID (e.g. MoRe5TN...)"
              className="flex-1 bg-black/40 border border-white/20 rounded-lg px-4 py-2 outline-none focus:border-cyan-500 transition-colors"
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value)}
            />
            <button 
              onClick={runIndividualAudit}
              disabled={scanning || fixing}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold disabled:opacity-50"
            >
              Scan
            </button>
          </div>
        </div>

        <div className="glass p-6 rounded-xl flex flex-col gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-blue-300">
            <RefreshCw size={18} /> 전체 데이터 무결성 검사
          </h2>
          <button 
            onClick={runAudit}
            disabled={scanning || fixing}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Run Comprehensive Audit'}
          </button>
        </div>
      </div>

      <div className="flex justify-center mb-8">
        {affectedUsers.length > 0 && (
          <button 
            onClick={applyFixes}
            disabled={fixing || scanning}
            className="flex items-center gap-2 px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-red-900/40 animate-pulse text-xl"
          >
            <ShieldAlert size={24} />
            {fixing ? 'Applying Fixes...' : `Apply Restorations to ${affectedUsers.length} Users`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Column */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="p-4 bg-white/5 border-b border-white/10">
            <h2 className="text-xl font-bold">Rescuable Data ({affectedUsers.length})</h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
            {affectedUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                {scanning ? 'Scanning in progress...' : 'Scan results will appear here.'}
              </div>
            ) : (
              affectedUsers.map(u => (
                <div key={u.uid} className="bg-black/40 border border-red-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-red-400 font-bold text-lg flex items-center gap-2">
                       <AlertTriangle size={16} /> {u.displayName}
                    </h3>
                    <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-400">{u.uid}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Streak</span>
                       <span className="text-gray-300 line-through mr-2">{u.dbStreak}</span>
                       <span className="text-green-400 font-bold">{u.correctStreak}</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Cores (Owned)</span>
                       <span className="text-gray-300 line-through mr-2">{u.currentFreezeCount}</span>
                       <span className="text-cyan-400 font-bold">{u.correctFreezeCount}</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Cores Ever Had</span>
                       <span className="text-blue-300">{u.totalCoresEverHad} (Used: {u.coresUsed})</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Bridged Days</span>
                       <span className="text-blue-300">{u.defendedDates.length} days</span>
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] text-gray-500 font-mono overflow-hidden truncate">
                    Defended: {u.defendedDates.join(', ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs Column */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 h-[600px] flex flex-col backdrop-blur-md">
          <h2 className="text-xl font-bold mb-4 border-b border-white/10 pb-2">Rescue Logs</h2>
          <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
               <div className="text-gray-500 italic">Logs are empty.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`
                  ${log.includes('⚠️') ? 'text-red-300' : ''}
                  ${log.includes('✅') ? 'text-green-300' : ''}
                  ${log.includes('❌') ? 'text-red-500' : ''}
                  ${log.includes('ERROR') ? 'text-red-500 font-bold' : 'text-gray-300'}
                `}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakFixer;
