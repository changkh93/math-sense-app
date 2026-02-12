import React, { useState, useEffect } from 'react';
import { useRegions, useChapters, useUnits, useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { Trash2, AlertTriangle, RefreshCw, Eye, Ghost, Search, Globe, ShieldAlert } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

const GhostCleaner = () => {
  const { data: regions, isLoading: loadingRegions } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const { data: chapters } = useChapters(selectedRegion);
  const { data: units } = useUnits(selectedChapter);
  const { data: quizzes, isLoading: loadingQuizzes, refetch } = useQuizzes(selectedUnit);

  const { deleteQuiz } = useAdminMutations();
  const [inspectQuiz, setInspectQuiz] = useState(null);

  // Global Scan State
  const [isGlobalMode, setIsGlobalMode] = useState(false);
  const [globalQuizzes, setGlobalQuizzes] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanStats, setScanStats] = useState({ total: 0, orphans: 0, suspicious: 0 });

  // Clear children selection when parent changes
  useEffect(() => setSelectedChapter(null), [selectedRegion]);
  useEffect(() => setSelectedUnit(null), [selectedChapter]);
  // useEffect(() => setInspectQuiz(null), [selectedUnit]); // Removed to allow inspection in global mode

  const handleDelete = (quizId) => {
    if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      deleteQuiz.mutate(quizId, {
        onSuccess: () => {
          setInspectQuiz(null);
          // Auto-refetch is handled by hook invalidation, but we can force it
          if (isGlobalMode) {
             setGlobalQuizzes(prev => prev.filter(q => q.docId !== quizId));
          } else {
             refetch();
          }
        }
      });
    }
  };

  const runGlobalScan = async () => {
    setScanning(true);
    setGlobalQuizzes([]);
    setInspectQuiz(null);
    try {
      // 1. Fetch ALL Units to build a valid ID set
      const unitsSnap = await getDocs(collection(db, 'units'));
      const validUnitIds = new Set(unitsSnap.docs.map(d => d.id));
      console.log(`[SCAN] Found ${validUnitIds.size} valid units.`);

      // 2. Fetch ALL Quizzes (This might be heavy, but it's an admin tool)
      // Note: In a massive DB, this should be paginated or done via a cloud function.
      const quizzesSnap = await getDocs(collection(db, 'quizzes'));
      console.log(`[SCAN] Found ${quizzesSnap.size} total quizzes.`);

      const orphans = [];
      let suspiciousCount = 0;

      quizzesSnap.forEach(doc => {
        const data = doc.data();
        const quiz = { ...data, docId: doc.id };
        let isOrphan = false;
        let reasons = [];

        // Check 1: Missing unitId
        if (!quiz.unitId) {
          isOrphan = true;
          reasons.push('Missing unitId');
        } 
        // Check 2: Invalid unitId
        else if (!validUnitIds.has(quiz.unitId)) {
          isOrphan = true;
          reasons.push(`Invalid unitId: ${quiz.unitId}`);
        }

        // Check 3: Suspicious Content (Specific user report)
        if (quiz.question && quiz.question.includes('비를 우리말로 읽어주세요')) {
          // Even if it has a valid unit, flag it if it's the specific reported one
          isOrphan = true; 
          reasons.push('REPORTED SUSPICIOUS CONTENT');
          suspiciousCount++;
        }

        if (isOrphan) {
          orphans.push({ ...quiz, ghostReasons: reasons });
        }
      });

      setGlobalQuizzes(orphans);
      setScanStats({ 
        total: quizzesSnap.size, 
        orphans: orphans.length, 
        suspicious: suspiciousCount 
      });

    } catch (err) {
      console.error("Global scan failed:", err);
      alert("Scan failed. Check console for details.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="ghost-cleaner" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header className="mb-8 border-b pb-4 border-white/10">
        <div className="flex items-center gap-3 mb-2">
          <Ghost size={32} className="text-purple-400" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Ghost Cleaner & Scanner
          </h1>
        </div>
        <p className="text-gray-400">
          Identify and remove orphaned quiz documents from Firestore. 
          Use "Global Scan" to find quizzes with missing or invalid unit linkages.
        </p>
      </header>

      <div className="filters glass p-6 rounded-xl mb-8 flex gap-4 flex-wrap items-center">
        {/* Mode Toggle */}
        <button
          onClick={() => { setIsGlobalMode(!isGlobalMode); setInspectQuiz(null); }}
          className={`flex items-center gap-2 px-4 py-2 rounded transition-colors border ${
            isGlobalMode 
              ? 'bg-purple-600 border-purple-400 text-white' 
              : 'bg-black/40 border-white/20 text-gray-400 hover:text-white'
          }`}
        >
          <Globe size={18} /> {isGlobalMode ? 'Global Scan Mode' : 'Unit Browser Mode'}
        </button>

        {!isGlobalMode ? (
          <>
            <div className="h-8 w-px bg-white/10 mx-2"></div>
            <select 
              className="bg-black/40 border border-white/20 rounded px-4 py-2 text-white min-w-[200px]"
              value={selectedRegion || ''}
              onChange={(e) => setSelectedRegion(e.target.value || null)}
            >
              <option value="">Select Region</option>
              {regions?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>

            <select 
              className="bg-black/40 border border-white/20 rounded px-4 py-2 text-white min-w-[200px]"
              value={selectedChapter || ''}
              onChange={(e) => setSelectedChapter(e.target.value || null)}
              disabled={!selectedRegion}
            >
              <option value="">Select Chapter</option>
              {chapters?.map(c => <option key={c.docId} value={c.docId}>{c.title}</option>)}
            </select>

            <select 
              className="bg-black/40 border border-white/20 rounded px-4 py-2 text-white min-w-[200px]"
              value={selectedUnit || ''}
              onChange={(e) => setSelectedUnit(e.target.value || null)}
              disabled={!selectedChapter}
            >
              <option value="">Select Unit</option>
              {units?.map(u => <option key={u.docId} value={u.docId}>{u.title}</option>)}
            </select>

            <button 
              onClick={() => refetch()} 
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
              title="Refresh List"
              disabled={!selectedUnit}
            >
              <RefreshCw size={18} /> Refresh
            </button>
          </>
        ) : (
          <div className="flex items-center gap-4 ml-4 flex-1">
             <button 
              onClick={runGlobalScan}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 rounded transition-colors"
            >
              {scanning ? <RefreshCw className="animate-spin" size={18} /> : <ShieldAlert size={18} />}
              {scanning ? 'Scanning Database...' : 'Run Global Orphan Scan'}
            </button>
            {scanStats.total > 0 && (
              <span className="text-sm text-gray-400">
                Scanned {scanStats.total} docs. Found <strong className="text-red-400">{scanStats.orphans} orphans</strong>.
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List Column */}
          <div className="glass rounded-xl overflow-hidden flex flex-col h-[700px]">
             <div className="p-4 bg-white/5 border-b border-white/10 flex justify-between items-center">
               <h2 className="font-bold text-lg">
                 {isGlobalMode ? `Scanned Orphans (${globalQuizzes.length})` : `Quizzes in Unit (${quizzes?.length || 0})`}
               </h2>
               <span className={`text-xs px-2 py-1 rounded ${isGlobalMode ? 'bg-red-500/20 text-red-300' : 'bg-purple-500/20 text-purple-300'}`}>
                 {isGlobalMode ? 'Global Scan Results' : 'Live Unit Data'}
               </span>
             </div>
             
             <div className="overflow-y-auto flex-1 p-2 space-y-2">
               {(isGlobalMode ? globalQuizzes : quizzes)?.length === 0 ? (
                 <div className="text-center py-10 text-gray-500">
                   {isGlobalMode 
                     ? (scanning ? "Scanning..." : "No orphans found (Run Scan to check)") 
                     : "No quizzes found in this unit."}
                 </div>
               ) : (
                 (isGlobalMode ? globalQuizzes : quizzes)?.map((quiz, idx) => (
                   <div 
                     key={quiz.docId}
                     onClick={() => setInspectQuiz(quiz)}
                     className={`p-3 rounded cursor-pointer transition-all border ${
                       inspectQuiz?.docId === quiz.docId 
                         ? 'bg-purple-500/20 border-purple-500/50' 
                         : 'bg-black/20 border-white/5 hover:bg-white/10'
                     }`}
                   >
                     <div className="flex justify-between mb-1">
                       <span className="font-mono text-xs text-gray-400">#{idx + 1} • {quiz.docId}</span>
                       <span className="text-xs bg-white/10 px-1 rounded">{quiz.type}</span>
                     </div>
                     <p className="text-sm font-medium line-clamp-2">{quiz.question || "(No Question Text)"}</p>
                     
                     {/* Reasons in Global Mode */}
                     {isGlobalMode && quiz.ghostReasons && (
                       <div className="mt-2 flex flex-wrap gap-1">
                         {quiz.ghostReasons.map((r, i) => (
                           <span key={i} className="text-[10px] px-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded">
                             {r}
                           </span>
                         ))}
                       </div>
                     )}

                     {/* Heuristic for Ghost Detection in Normal Mode */}
                     {!isGlobalMode && (!quiz.question || !quiz.options) && (
                       <div className="flex items-center gap-1 text-red-400 text-xs mt-2">
                         <AlertTriangle size={12} /> Malformed Data
                       </div>
                     )}
                   </div>
                 ))
               )}
             </div>
          </div>

          {/* Inspector Column */}
          <div className="glass rounded-xl p-6 h-[700px] overflow-y-auto relative">
            {!inspectQuiz ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-500">
                 <Eye size={48} className="mb-4 opacity-50" />
                 <p>Select a quiz from the list to inspect details.</p>
               </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">
                      {isGlobalMode ? 'Orphan Inspector' : 'Quiz Inspector'}
                    </h3>
                    <p className="font-mono text-sm text-purple-300">{inspectQuiz.docId}</p>
                  </div>
                  <button 
                    onClick={() => handleDelete(inspectQuiz.docId)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 border border-red-500/30 rounded transition-colors"
                  >
                    <Trash2 size={18} /> Delete Document
                  </button>
                </div>

                {isGlobalMode && inspectQuiz.ghostReasons && (
                   <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg">
                      <span className="text-xs uppercase text-red-400 font-bold block mb-2">Why is this a ghost?</span>
                      <ul className="list-disc list-inside text-sm text-red-200">
                        {inspectQuiz.ghostReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                   </div>
                )}

                <div className="bg-black/30 p-4 rounded-lg">
                  <span className="text-xs uppercase text-gray-500 font-bold block mb-2">Question Text</span>
                  <p className="text-lg text-white">{inspectQuiz.question || <span className="text-red-400 italic">Undefined</span>}</p>
                </div>

                {inspectQuiz.imageUrl && (
                  <div className="bg-black/30 p-4 rounded-lg">
                    <span className="text-xs uppercase text-gray-500 font-bold block mb-2">Image</span>
                    <img src={inspectQuiz.imageUrl} alt="Quiz" className="max-h-40 rounded border border-white/10" />
                  </div>
                )}

                <div className="bg-black/30 p-4 rounded-lg">
                  <span className="text-xs uppercase text-gray-500 font-bold block mb-2">Options</span>
                  {Array.isArray(inspectQuiz.options) ? (
                    <ul className="space-y-2">
                      {inspectQuiz.options.map((opt, i) => (
                        <li key={i} className={`flex items-center gap-3 p-2 rounded ${opt.isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5'}`}>
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs ${opt.isCorrect ? 'bg-green-500 text-black font-bold' : 'bg-white/20'}`}>
                            {i + 1}
                          </span>
                          <span className={opt.isCorrect ? 'text-green-300' : 'text-gray-300'}>{opt.text}</span>
                          {opt.isCorrect && <span className="ml-auto text-xs text-green-400 font-bold">CORRECT</span>}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-red-400 italic">Invalid Options Format ({typeof inspectQuiz.options})</p>
                  )}
                </div>

                <div className="bg-black/30 p-4 rounded-lg">
                  <details>
                    <summary className="cursor-pointer text-xs uppercase text-gray-500 font-bold mb-2 flex items-center gap-2">
                       <span>Raw JSON Data</span>
                       <span className="text-[10px] bg-white/10 px-1 rounded">Debug</span>
                    </summary>
                    <pre className="text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(inspectQuiz, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  );
};

export default GhostCleaner;
