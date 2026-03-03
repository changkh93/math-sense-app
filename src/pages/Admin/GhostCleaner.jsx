import React, { useState, useEffect } from 'react';
import { useRegions, useChapters, useUnits, useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { Trash2, RefreshCw, Search, Globe } from 'lucide-react';
import { ref, listAll, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { collection, getDocs, writeBatch, doc as firestoreDoc } from 'firebase/firestore';

const GhostCleaner = () => {
  const { data: regions } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const { data: chapters } = useChapters(selectedRegion);
  const { data: units } = useUnits(selectedChapter);
  const { refetch } = useQuizzes(selectedUnit);

  const { deleteQuiz } = useAdminMutations();
  const [inspectQuiz, setInspectQuiz] = useState(null);

  // Global Scan State
  const [isGlobalMode, setIsGlobalMode] = useState(true); // Default to global scan now
  const [globalQuizzes, setGlobalQuizzes] = useState([]);
  const [globalUnits, setGlobalUnits] = useState([]);
  const [globalChapters, setGlobalChapters] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanStats, setScanStats] = useState({ total: 0, orphans: 0, unitOrphans: 0, chapterOrphans: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes', 'units', 'chapters', 'storage'
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(true);

  // Storage Cleaner State
  const [storageScrubbing, setStorageScrubbing] = useState(false);
  const [storageOrphans, setStorageOrphans] = useState([]);
  const [storageStats, setStorageStats] = useState({ scanned: 0, orphans: 0 });

  // Clear children selection when parent changes
  useEffect(() => setSelectedChapter(null), [selectedRegion]);
  useEffect(() => setSelectedUnit(null), [selectedChapter]);

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
    setGlobalUnits([]);
    try {
      console.log(`[SCAN] Target Project ID: ${db.app.options.projectId}`);
      // 1. Fetch EVERYTHING from Firestore
      const [chaptersSnap, unitsSnap, quizzesSnap] = await Promise.all([
        getDocs(collection(db, 'chapters')),
        getDocs(collection(db, 'units')),
        getDocs(collection(db, 'quizzes'))
      ]);

      const allFirestoreChapters = chaptersSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
      const allFirestoreUnits = unitsSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
      const allFirestoreQuizzes = quizzesSnap.docs.map(d => ({ ...d.data(), docId: d.id }));

      const existingChapterIds = new Set(allFirestoreChapters.map(c => c.docId));
      const existingUnitIds = new Set(allFirestoreUnits.map(u => u.docId));

      // 2. Audit Quizzes
      const auditedQuizzes = allFirestoreQuizzes.map(quiz => {
        let isOrphan = false;
        let reasons = [];
        
        if (!quiz.unitId) {
          isOrphan = true;
          reasons.push('Stray Quiz (Missing unitId)');
        } else if (!existingUnitIds.has(quiz.unitId)) {
          isOrphan = true;
          reasons.push(`Displaced Quiz: Parent unit "${quiz.unitId}" does not exist`);
        }

        return { ...quiz, isOrphan, ghostReasons: reasons };
      });

      // 3. Audit Units
      const auditedUnits = allFirestoreUnits.map(unit => {
        let isOrphan = false;
        let reasons = [];
        
        if (!unit.chapterId) {
          isOrphan = true;
          reasons.push('Stray Unit (Missing chapterId)');
        } else if (!existingChapterIds.has(unit.chapterId)) {
          isOrphan = true;
          reasons.push(`Displaced Unit: Parent chapter "${unit.chapterId}" does not exist`);
        }

        return { ...unit, isOrphan, ghostReasons: reasons };
      });

      setGlobalChapters(allFirestoreChapters.map(c => ({...c, isOrphan: false, ghostReasons: []})));
      setGlobalUnits(auditedUnits);
      setGlobalQuizzes(auditedQuizzes);
      
      setScanStats({ 
        total: auditedQuizzes.length, 
        orphans: auditedQuizzes.filter(q => q.isOrphan).length, 
        unitOrphans: auditedUnits.filter(u => u.isOrphan).length,
        chapterOrphans: 0
      });

    } catch (err) {
      console.error("Global scan failed:", err);
      alert("Scan failed. Check console for details.");
    } finally {
      setScanning(false);
    }
  };

  const getFilteredItems = () => {
    let source = [];
    if (activeTab === 'quizzes') source = globalQuizzes;
    else if (activeTab === 'units') source = globalUnits;
    else if (activeTab === 'chapters') source = globalChapters;

    return source.filter(item => {
      const matchesSearch = searchQuery === '' || 
        JSON.stringify(item).toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesOrphan = !showOnlyOrphans || item.isOrphan;
      
      return matchesSearch && matchesOrphan;
    });
  };

  const filteredItems = getFilteredItems();

  const handlePurge = async () => {
    const ghosts = globalQuizzes.filter(q => q.isOrphan);
    if (ghosts.length === 0) return;
    if (!confirm(`CRITICAL: Are you sure you want to delete ALL ${ghosts.length} detected ghost documents? This will permanently remove them from Firestore.`)) return;

    setScanning(true);
    try {
      const batch = writeBatch(db);
      ghosts.forEach(ghost => {
        batch.delete(firestoreDoc(db, 'quizzes', ghost.docId));
      });
      await batch.commit();
      setGlobalQuizzes(prev => prev.filter(q => !q.isOrphan));
      alert(`${ghosts.length} ghost documents purged successfully.`);
    } catch (err) {
      console.error("Purge failed:", err);
      alert("Purge failed. Check console.");
    } finally {
      setScanning(false);
    }
  };

  const purgeStaleUnits = async () => {
    const targets = globalUnits.filter(u => u.isOrphan);
    if (targets.length === 0) return;
    if (!confirm(`CRITICAL: Are you sure you want to delete ${targets.length} detected ghost/stale units?`)) return;

    setScanning(true);
    try {
      const batch = writeBatch(db);
      targets.forEach(u => batch.delete(firestoreDoc(db, 'units', u.docId)));
      await batch.commit();
      alert(`Deleted ${targets.length} stale units.`);
      runGlobalScan();
    } catch (err) {
      console.error("Unit purge failed:", err);
      alert("Purge failed.");
    } finally {
      setScanning(false);
    }
  };

  const purgeStaleChapters = async () => {
    const targets = globalChapters.filter(c => c.isOrphan);
    if (targets.length === 0) return;
    if (!confirm(`CRITICAL: Are you sure you want to delete ${targets.length} detected ghost/stale chapters?`)) return;

    setScanning(true);
    try {
      const batch = writeBatch(db);
      targets.forEach(c => batch.delete(firestoreDoc(db, 'chapters', c.docId)));
      await batch.commit();
      alert(`Deleted ${targets.length} stale chapters.`);
      runGlobalScan();
    } catch (err) {
      console.error("Chapter purge failed:", err);
      alert("Purge failed.");
    } finally {
      setScanning(false);
    }
  };



  const runStorageScan = async () => {
    setStorageScrubbing(true);
    setStorageOrphans([]);
    
    try {
      console.log("[STORAGE] Starting Storage Scan...");
      
      // 1. Fetch all unit documents to extract image URLs used in texts
      const unitsSnap = await getDocs(collection(db, 'units'));
      const activeUrls = new Set();
      
      unitsSnap.docs.forEach(d => {
        const data = d.data();
        const text = data.learningContents?.text || '';
        // Extract URLs from ![alt](url)
        const regex = /!\[.*?\]\((.*?)\)/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          activeUrls.add(match[1]);
        }
      });
      console.log(`[STORAGE] Found ${activeUrls.size} active image URLs in Unit contents.`);

      // 2. List all files in 'mission_images/' folder in Storage
      const listRef = ref(storage, 'mission_images');
      let res;
      try {
        res = await listAll(listRef);
      } catch (err) {
        if (err.code === 'storage/object-not-found') {
           console.log("[STORAGE] No mission_images folder found.");
           setStorageStats({ scanned: 0, orphans: 0 });
           setStorageScrubbing(false);
           return;
        }
        throw err;
      }
      
      console.log(`[STORAGE] Found ${res.items.length} files in mission_images/ folder.`);

      // 3. Compare and find orphans
      const orphans = [];
      let scanned = 0;
      
      for (const itemRef of res.items) {
        scanned++;
        const url = await getDownloadURL(itemRef);
        if (!activeUrls.has(url)) {
           orphans.push({
               name: itemRef.name,
               fullPath: itemRef.fullPath,
               url: url
           });
        }
      }

      setStorageOrphans(orphans);
      setStorageStats({ scanned, orphans: orphans.length });
      console.log(`[STORAGE] Scan complete. Found ${orphans.length} orphaned images.`);

    } catch (err) {
      console.error("[STORAGE] Scan failed:", err);
      alert("Storage Scan failed. Check console.");
    } finally {
      setStorageScrubbing(false);
    }
  };

  const handlePurgeStorage = async () => {
    if (!storageOrphans.length) return;
    if (!confirm(`Are you sure you want to permanently delete ${storageOrphans.length} orphaned images from Firebase Storage?`)) return;

    setStorageScrubbing(true);
    let deletedCount = 0;
    
    try {
        for (const orphan of storageOrphans) {
            const itemRef = ref(storage, orphan.fullPath);
            await deleteObject(itemRef);
            deletedCount++;
        }
        alert(`Successfully deleted ${deletedCount} orphaned images.`);
        runStorageScan(); // Refresh scan after purge
    } catch (err) {
        console.error("Storage purge failed:", err);
        alert(`Purge interrupted. Deleted ${deletedCount} before failing.`);
    } finally {
        setStorageScrubbing(false);
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
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={runGlobalScan}
                  disabled={scanning}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
                >
                  <RefreshCw size={20} className={scanning ? 'animate-spin' : ''} />
                  {scanning ? 'Scanning Firestore...' : 'Run Global Orphan Scan'}
                </button>

                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                  <button 
                    onClick={() => setShowOnlyOrphans(true)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${showOnlyOrphans ? 'bg-red-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    ORPHANS ONLY
                  </button>
                  <button 
                    onClick={() => setShowOnlyOrphans(false)}
                    className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${!showOnlyOrphans ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    ALL DOCUMENTS
                  </button>
                </div>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />
                <input 
                  type="text"
                  placeholder={`Search ${activeTab} by text, ID, or content...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-gray-600"
                />
              </div>

              <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
                {[
                  { id: 'quizzes', label: 'Quizzes', count: showOnlyOrphans ? scanStats.orphans : globalQuizzes.length },
                  { id: 'units', label: 'Units', count: showOnlyOrphans ? scanStats.unitOrphans : globalUnits.length },
                  { id: 'chapters', label: 'Chapters', count: showOnlyOrphans ? scanStats.chapterOrphans : globalChapters.length },
                  { id: 'storage', label: 'Storage Cleanup', count: storageOrphans.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                  >
                    {tab.label.toUpperCase()} ({tab.count})
                  </button>
                ))}
              </div>
                <span className="text-sm text-gray-400 ml-4">
                  {activeTab === 'storage' ? `Scanned ${storageStats.scanned} files.` :
                   `Scanned ${scanStats.total} docs.`}
                </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List Column */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="p-6 bg-white/5 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {activeTab === 'storage' ? 'Orphaned Images' : (showOnlyOrphans ? 'Detected Ghosts' : 'All Firestore Records')}
                <span className="text-sm bg-white/10 px-3 py-1 rounded-full text-gray-400 font-mono">
                  {activeTab === 'storage' ? `Found ${storageOrphans.length}` : `Showing ${filteredItems.length}`}
                </span>
              </h2>
              {activeTab === 'storage' ? (
                 <div className="flex gap-2">
                    <button onClick={runStorageScan} disabled={storageScrubbing} className="px-3 py-1 bg-blue-600 rounded text-xs flex items-center gap-1">
                      <RefreshCw size={14} className={storageScrubbing ? 'animate-spin' : ''} /> {storageScrubbing ? 'Scanning...' : 'Scan Storage'}
                    </button>
                    {storageOrphans.length > 0 && <button onClick={handlePurgeStorage} disabled={storageScrubbing} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-xs flex items-center gap-1 shadow-lg animate-pulse"><Trash2 size={14}/> Purge Orphans</button>}
                 </div>
              ) : (
                showOnlyOrphans && activeTab === 'quizzes' && filteredItems.length > 0 && (
                  <button 
                    onClick={handlePurge}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-red-900/20 animate-pulse"
                  >
                    <Trash2 size={18} /> Purge All {filteredItems.length} Quizzes
                  </button>
                )
              )}
            </div>

            <div className="divide-y divide-white/10 max-h-[500px] overflow-y-auto">
              {activeTab === 'storage' ? (
                storageOrphans.length === 0 ? (
                  <div className="p-20 text-center">
                    <ShieldAlert className="mx-auto mb-4 text-green-700" size={64} />
                    <p className="text-green-500 text-lg">No orphaned images found.</p>
                    <button onClick={runStorageScan} disabled={storageScrubbing} className="mt-4 text-blue-400 font-bold">Rescan Storage</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 p-4">
                     {storageOrphans.map(orphan => (
                         <div key={orphan.fullPath} className="bg-black/40 border border-white/10 rounded-lg p-2 flex flex-col items-center">
                             <img src={orphan.url} alt="orphan" className="w-full h-32 object-cover rounded-md mb-2 bg-gray-900 border border-white/5" />
                             <span className="text-[10px] text-gray-500 font-mono truncate w-full text-center">{orphan.name}</span>
                         </div>
                     ))}
                  </div>
                )
              ) : (
                filteredItems.length === 0 ? (
                  <div className="p-20 text-center">
                    <Ghost className="mx-auto mb-4 text-gray-700" size={64} />
                    <p className="text-gray-500 text-lg">No items match your criteria.</p>
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div 
                      key={item.docId}
                      className={`p-4 flex items-center justify-between transition-all cursor-pointer group ${inspectQuiz?.docId === item.docId ? 'bg-blue-500/20 shadow-[inset_4px_0_0_#3b82f6]' : 'hover:bg-white/5'}`}
                      onClick={() => setInspectQuiz(item)}
                    >
                      {/* ... existing item list content ... */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.isOrphan ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                            {item.isOrphan ? 'GHOST' : 'VALID'}
                          </span>
                          <span className="text-gray-400 text-xs font-mono truncate">{item.docId}</span>
                        </div>
                        <p className="text-white font-medium truncate group-hover:text-blue-300 transition-colors">
                          {item.question || item.title || <span className="text-gray-600 italic">No Content</span>}
                        </p>
                      </div>
                      <button className={`p-2 rounded-lg transition-all ${inspectQuiz?.docId === item.docId ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-white/10 hover:text-white'}`}>
                        <Eye size={20} />
                      </button>
                    </div>
                  ))
                )
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
                      {isGlobalMode ? 'Global Item Inspector' : 'Quiz Inspector'}
                    </h3>
                    <p className="font-mono text-sm text-purple-300">ID: {inspectQuiz.docId}</p>
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
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs uppercase text-red-400 font-bold block">Why is this flagged?</span>
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-200">
                        {inspectQuiz.ghostReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                   </div>
                )}

                <div className="bg-black/30 p-4 rounded-lg">
                  <span className="text-xs uppercase text-gray-400 font-bold block mb-2 font-mono">
                    {activeTab === 'quizzes' ? 'Question Text' : 'Title'}
                  </span>
                  <p className="text-lg text-white">
                    {inspectQuiz.question || inspectQuiz.title || <span className="text-red-400 italic">Undefined</span>}
                  </p>
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
