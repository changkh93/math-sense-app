import React, { useState } from 'react';
import { collection, getDocs, doc as firestoreDoc, setDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Wrench, ShieldAlert, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

// KST 기준 오늘
function getTodayKST() {
  const kstNow = new Date(Date.now() + 9 * 3600000);
  return kstNow.toISOString().split('T')[0];
}

function daysBetween(d1, d2) {
  const a = new Date(d1 + 'T00:00:00+09:00');
  const b = new Date(d2 + 'T00:00:00+09:00');
  return Math.floor((b - a) / 86400000);
}

/**
 * 사용자의 전체 히스토리를 기반으로 올바른 스트릭을 재계산합니다.
 */
function recalculateStreak(activeDates, totalCoresAvailable, todayKST) {
  if (activeDates.length === 0) {
    return { correctStreak: 0, correctLastDate: '', coresUsed: 0, defendedDates: [] };
  }

  const sorted = [...activeDates].sort();
  let coresRemaining = totalCoresAvailable;
  const defendedDates = [];
  const allDates = new Set(sorted);
  
  for (let i = 0; i < sorted.length - 1 && coresRemaining > 0; i++) {
    const gap = daysBetween(sorted[i], sorted[i + 1]) - 1;
    if (gap > 0 && gap <= coresRemaining) {
      const scanObj = new Date(sorted[i] + 'T12:00:00Z');
      for (let j = 0; j < gap; j++) {
        scanObj.setUTCDate(scanObj.getUTCDate() + 1);
        const dStr = scanObj.toISOString().split('T')[0];
        defendedDates.push(dStr);
        allDates.add(dStr);
        coresRemaining--;
      }
    }
  }
  
  const allSorted = Array.from(allDates).sort();
  let streakCount = 1;
  let lastDate = allSorted[allSorted.length - 1];
  
  for (let i = allSorted.length - 2; i >= 0; i--) {
    if (daysBetween(allSorted[i], allSorted[i + 1]) === 1) {
      streakCount++;
    } else {
      break;
    }
  }
  
  return {
    correctStreak: streakCount,
    correctLastDate: lastDate,
    coresUsed: totalCoresAvailable - coresRemaining,
    coresRemaining,
    defendedDates
  };
}

const StreakFixer = () => {
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [affectedUsers, setAffectedUsers] = useState([]);
  const [fixing, setFixing] = useState(false);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const runAudit = async () => {
    setScanning(true);
    setLogs([]);
    setAffectedUsers([]);
    
    try {
      addLog('Starting comprehensive user audit...');
      const todayKST = getTodayKST();
      
      const usersSnap = await getDocs(collection(db, 'users'));
      addLog(`Found ${usersSnap.size} total users. Scanning transactions...`);

      const _affected = [];

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        const displayName = userData.displayName || userData.name || uid.slice(0, 8);

        // Fetch transactions to find core budget
        const txSnap = await getDocs(
          query(collection(db, 'users', uid, 'crystal_transactions'), orderBy('timestamp', 'asc'))
        );
        const transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const corePurchases = transactions.filter(t => 
          t.type === 'store_purchase' && t.metadata?.itemId === 'cryo_core'
        ).length;
        const freezeEvents = transactions.filter(t => t.type === 'streak_freeze').length;
        const currentFreezeCount = userData.streakFreezeCount || 0;
        
        if (corePurchases === 0 && currentFreezeCount === 0 && freezeEvents === 0) continue;

        const totalCoresEverHad = Math.max(corePurchases, freezeEvents + currentFreezeCount);

        // Fetch history
        const histSnap = await getDocs(
          query(collection(db, 'users', uid, 'history'), orderBy('timestamp', 'asc'))
        );
        
        const activeDates = new Set();
        histSnap.docs.forEach(d => {
          const h = d.data();
          if (!h.timestamp) return;
          const ts = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp);
          const kst = new Date(ts.getTime() + 9 * 3600000);
          activeDates.add(kst.toISOString().split('T')[0]);
        });

        if (activeDates.size === 0) continue;

        // Recalculate
        const result = recalculateStreak(Array.from(activeDates), totalCoresEverHad, todayKST);
        
        const dbStreak = userData.currentStreak || 0;
        const dbLongest = userData.longestStreak || 0;
        const dbLastDate = userData.lastStreakDate || '';

        const shouldFix = result.correctStreak > dbStreak;
        const longestShouldBe = Math.max(dbLongest, result.correctStreak);

        if (shouldFix) {
          _affected.push({
            uid,
            displayName,
            dbStreak,
            dbLongest,
            dbLastDate,
            correctStreak: result.correctStreak,
            correctLastDate: result.correctLastDate,
            correctLongest: longestShouldBe,
            coresUsed: result.coresUsed,
            defendedDates: result.defendedDates,
            totalCoresEverHad,
            currentFreezeCount,
          });
          addLog(`⚠️ Found broken streak: ${displayName} (DB: ${dbStreak} -> Correct: ${result.correctStreak})`);
        } else {
          // addLog(`✅ User OK: ${displayName} (Streak: ${dbStreak})`);
        }
      }

      setAffectedUsers(_affected);
      addLog(`Audit complete. Found ${_affected.length} affected users requiring fixes.`);

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
        };
        
        if (!user.dbLastDate || user.correctLastDate > user.dbLastDate) {
          updates.lastStreakDate = user.correctLastDate;
        }

        await setDoc(firestoreDoc(db, 'users', user.uid), updates, { merge: true });
        addLog(`✅ Fixed ${user.displayName}: Streak updated to ${user.correctStreak}`);
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
    <div className="ghost-cleaner" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="mb-8 border-b pb-4 border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Wrench size={32} className="text-cyan-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Cryo Core Bug Fixer
          </h1>
        </div>
        <p className="text-gray-400">
          This tool scans all users to detect broken streaks caused by the Cryo Core bug, 
          recalculates their correct streaks based on full activity history, and applies the corrections.
        </p>
      </header>

      <div className="glass p-6 rounded-xl mb-8 flex gap-4 items-center">
        <button 
          onClick={runAudit}
          disabled={scanning || fixing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
        >
          <RefreshCw size={20} className={scanning ? 'animate-spin' : ''} />
          {scanning ? 'Auditing Users...' : 'Run Comprehensive Audit'}
        </button>

        {affectedUsers.length > 0 && (
          <button 
            onClick={applyFixes}
            disabled={fixing || scanning}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-red-900/20 animate-pulse"
          >
            <ShieldAlert size={20} />
            {fixing ? 'Applying Fixes...' : `Apply Fixes to ${affectedUsers.length} Users`}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results Column */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="p-4 bg-white/5 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Affected Users ({affectedUsers.length})</h2>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto space-y-4">
            {affectedUsers.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                {scanning ? 'Scanning in progress...' : 'Run audit to find affected users.'}
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
                       <span className="block text-gray-500 text-xs uppercase mb-1">Longest</span>
                       <span className="text-gray-300 line-through mr-2">{u.dbLongest}</span>
                       <span className="text-green-400 font-bold">{u.correctLongest}</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Core Budget</span>
                       <span className="text-blue-300">Had {u.totalCoresEverHad} / Used {u.coresUsed}</span>
                    </div>
                    <div>
                       <span className="block text-gray-500 text-xs uppercase mb-1">Bridged Days</span>
                       <span className="text-blue-300">{u.defendedDates.length} days</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logs Column */}
        <div className="glass rounded-xl p-6 h-[600px] flex flex-col">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">Audit Logs</h2>
          <div className="flex-1 overflow-y-auto font-mono text-sm space-y-1">
            {logs.length === 0 ? (
               <div className="text-gray-500 italic">No logs yet.</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className={`
                  ${log.includes('⚠️') ? 'text-red-300' : ''}
                  ${log.includes('✅') ? 'text-green-300' : ''}
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
