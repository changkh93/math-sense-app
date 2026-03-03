import React, { useState, useEffect } from 'react';
import { useRegions, useChapters, useUnits, useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Database, Download, Search, Trash2, RefreshCw, AlertTriangle, CheckCircle, FileJson, UploadCloud } from 'lucide-react';

const DataSync = () => {
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'seed' | 'scan' | 'inspect'

  return (
    <div className="data-sync-container p-6 max-w-6xl mx-auto">
      <header className="mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Database size={32} className="text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Data Sync & Maintenance</h1>
        </div>
        <p className="text-gray-400">
          Manage your Firestore data, backup manual edits, and purge "ghost" documents.
        </p>
      </header>

      <div className="tabs flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Download size={18} /> Bulk Export
        </button>
        <button 
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'scan' ? 'bg-red-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <AlertTriangle size={18} /> Global Ghost Scan
        </button>
        <button 
          onClick={() => setActiveTab('inspect')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'inspect' ? 'bg-purple-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Search size={18} /> Unit Inspector
        </button>
      </div>

      <div className="tab-content glass p-6 rounded-xl">
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'scan' && <GlobalScanTab />}
        {activeTab === 'inspect' && <InspectorTab />}
      </div>
    </div>
  );
};

// --- Sub-Components ---

const ExportTab = () => {
  const { data: regions } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [generatedChapters, setGeneratedChapters] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedRegion) return;
    setIsGenerating(true);
    setGeneratedChapters([]);
    
    try {
      // 1. Fetch all chapters for the region
      const chaptersQ = query(collection(db, 'chapters'), where('regionId', '==', selectedRegion));
      const chaptersSnap = await getDocs(chaptersQ);
      const chapters = chaptersSnap.docs
        .map(d => ({ ...d.data(), docId: d.id }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      const results = [];

      for (const chapter of chapters) {
        // 2. Fetch all units for the chapter
        const unitsQ = query(collection(db, 'units'), where('chapterId', '==', chapter.docId));
        const unitsSnap = await getDocs(unitsQ);
        const units = unitsSnap.docs
          .map(d => ({ ...d.data(), docId: d.id }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        // Refined naming logic
        let varName = '';
        const chapNum = chapter.id ? chapter.id.match(/\d+/)?.[0] : null;
        
        if (selectedRegion === 'fractions' || selectedRegion === 'fractions_v2' || selectedRegion === 'decimals') {
          varName = `chapter${chapNum || chapter.docId}Quizzes`;
        } else if (selectedRegion === 'ratios') {
          varName = `ratioChapter${chapNum || chapter.docId}Quizzes`;
        } else {
          // Default to previous pattern for addition/multiplication
          const suffix = chapter.id ? chapter.id.replace('chap', '') : chapter.docId;
          varName = `${selectedRegion}Chapter${suffix}Quizzes`;
        }
        
        let chapterOutput = `export const ${varName} = {\n`;

        for (const unit of units) {
          // 3. Fetch quizzes for each unit
          const quizzesQ = query(collection(db, 'quizzes'), where('unitId', '==', unit.docId));
          const quizzesSnap = await getDocs(quizzesQ);
          let quizzes = quizzesSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
          quizzes.sort((a, b) => (a.order || 0) - (b.order || 0));

          chapterOutput += `  '${unit.id}': {\n`;
          chapterOutput += `    title: '${(unit.title || '').replace(/'/g, "\\'")}',\n`;
          chapterOutput += `    questions: [\n`;

          for (const q of quizzes) {
            // FIX: Ensure everything is string before .replace() and handle 0 correctly
            const optionsText = q.options?.map(o => `'${String(o.text ?? '').replace(/'/g, "\\'")}'`).join(', ') || '';
            const answerText = q.options?.find(o => o.isCorrect)?.text ?? q.answer ?? '';

            chapterOutput += `      {\n`;
            chapterOutput += `        id: '${q.id || q.docId}',\n`;
            chapterOutput += `        question: '${String(q.question ?? '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}',\n`;
            chapterOutput += `        options: [${optionsText}],\n`;
            chapterOutput += `        answer: '${String(answerText ?? '').replace(/'/g, "\\'")}',\n`;
            if (q.hint) chapterOutput += `        hint: '${String(q.hint ?? '').replace(/'/g, "\\'")}',\n`;
            if (q.imageUrl) chapterOutput += `        imageUrl: '${q.imageUrl}',\n`;
            chapterOutput += `      },\n`;
          }
          chapterOutput += `    ]\n  },\n`;
        }
        chapterOutput += `};\n`;

        results.push({
          id: chapter.docId,
          title: chapter.title,
          varName,
          code: chapterOutput
        });
      }

      setGeneratedChapters(results);
    } catch (err) {
      console.error(err);
      alert("Export failed: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadFull = () => {
    if (generatedChapters.length === 0) return;
    const fullCode = `/**\n * FULL EXPORT FOR REGION: ${selectedRegion}\n * Date: ${new Date().toLocaleString()}\n */\n\n` + 
      generatedChapters.map(c => `// --- ${c.title} ---\n${c.code}`).join('\n\n');
      
    const blob = new Blob([fullCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedRegion}_full_backup.js`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-4">
        <h3 className="text-blue-300 font-bold mb-1">💡 지역별 데이터 로컬 업데이트 방법</h3>
        <p className="text-sm text-blue-200/70 mb-2">
          1. 지역을 선택하고 **"Generate Region Code"**를 누르세요.<br/>
          2. 각 챕터별로 생성된 코드 블록에서 **"Copy"** 버튼을 눌러 복사하세요.<br/>
          3. 로컬 프로젝트의 해당 파일(예: `chapter1Quizzes.js`) 내용 전체를 붙여넣으세요.
        </p>
      </div>

      <div className="flex gap-4 items-center">
        <select className="input-dark flex-1" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
          <option value="">Select Region to Backup</option>
          {regions?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <button 
          className="btn-primary py-2 px-6 flex items-center gap-2"
          onClick={handleGenerate}
          disabled={!selectedRegion || isGenerating}
        >
          {isGenerating ? <RefreshCw className="animate-spin" /> : <Download size={20} />}
          Generate Region Code
        </button>
        {generatedChapters.length > 0 && (
          <button 
            className="btn-secondary py-2 px-4 flex items-center gap-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30"
            onClick={handleDownloadFull}
          >
            <FileJson size={18} /> Full Backup (.js)
          </button>
        )}
      </div>

      <div className="grid gap-6">
        {generatedChapters.map((chap) => (
          <div key={chap.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-bold">{chap.title}</span>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-mono">{chap.varName}</span>
              </div>
              <button 
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs font-bold transition-all"
                onClick={() => {
                  navigator.clipboard.writeText(chap.code);
                  alert(`Chapter "${chap.title}" code copied!`);
                }}
              >
                Copy Chapter Code
              </button>
            </div>
            <textarea 
              className="w-full h-[300px] bg-black/60 font-mono text-[10px] p-4 rounded border border-white/10 text-blue-100 focus:outline-none custom-scrollbar"
              readOnly
              value={chap.code}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const GlobalScanTab = () => {
  const [ghosts, setGhosts] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const { deleteQuiz } = useAdminMutations();

  const handleScan = async () => {
    setIsScanning(true);
    setGhosts([]);
    try {
      const quizzesSnap = await getDocs(collection(db, 'quizzes'));
      const allQuizzes = quizzesSnap.docs.map(d => ({ ...d.data(), docId: d.id }));
      
      const ghostCandidates = allQuizzes.filter(q => {
        // 1. Options format is wrong (legacy string array instead of object array)
        const isLegacyOptions = q.options && q.options.length > 0 && typeof q.options[0] === 'string';
        // 2. Or unitId is missing
        const hasNoUnit = !q.unitId;
        // 3. Or broken text from specific migration failures
        const brokenText = q.question?.includes('비/에이') || q.question === '';
        
        return isLegacyOptions || hasNoUnit || brokenText;
      });

      setGhosts(ghostCandidates);
    } catch (err) {
       console.error(err);
       alert("Scan failed");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFixAll = async () => {
    if (!confirm(`${ghosts.length}개의 유령 문서를 모두 삭제하시겠습니까?`)) return;
    for (const g of ghosts) {
      await deleteQuiz.mutateAsync(g.docId);
    }
    setGhosts([]);
    alert("Cleanup complete!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-red-400">전체 유령 문서 스캔</h3>
          <p className="text-sm text-gray-400">데이터 구조가 오래되었거나 깨진 퀴즈를 찾아냅니다.</p>
        </div>
        <button onClick={handleScan} disabled={isScanning} className="btn-primary bg-red-600 hover:bg-red-500 py-2 px-6 rounded-lg">
          {isScanning ? "Scanning DB..." : "Start Scan"}
        </button>
      </div>

      {ghosts.length > 0 && (
        <div className="space-y-4">
          <div className="bg-red-900/20 p-4 rounded border border-red-500/30 flex justify-between items-center">
             <span className="text-red-200">{ghosts.length}개의 유령 문서를 발견했습니다!</span>
             <button onClick={handleFixAll} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Fix All</button>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {ghosts.map(g => (
              <div key={g.docId} className="flex items-center gap-4 bg-black/30 p-3 rounded border border-white/5 text-xs">
                 <span className="text-red-400 font-mono">{g.docId}</span>
                 <span className="flex-1 truncate">{g.question || "(No Question Text)"}</span>
                 <span className="text-gray-500">{g.unitId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isScanning && ghosts.length === 0 && <div className="text-center py-20 text-gray-500">시스템이 깨끗합니다.</div>}
    </div>
  );
};

const InspectorTab = () => {
  const { data: regions } = useRegions();
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const { data: chapters } = useChapters(selectedRegion);
  const { data: units } = useUnits(selectedChapter);
  const { data: quizzes, isLoading, refetch } = useQuizzes(selectedUnit);
  const { deleteQuiz } = useAdminMutations();

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <select className="input-dark w-1/4" value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
          <option value="">Select Region</option>
          {regions?.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
        <select className="input-dark w-1/4" value={selectedChapter} onChange={e => setSelectedChapter(e.target.value)} disabled={!selectedRegion}>
          <option value="">Select Chapter</option>
          {chapters?.map(c => <option key={c.docId} value={c.docId}>{c.title}</option>)}
        </select>
        <select className="input-dark w-1/4" value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} disabled={!selectedChapter}>
          <option value="">Select Unit</option>
          {units?.map(u => <option key={u.docId} value={u.docId}>{u.title}</option>)}
        </select>
        <button onClick={() => refetch()} className="btn-icon bg-white/10 p-2 rounded"><RefreshCw size={18} /></button>
      </div>

      {isLoading ? <div>Loading...</div> : (
        <div className="grid gap-2">
           <div className="flex justify-between items-center mb-2">
             <span className="text-gray-400">Found {quizzes?.length || 0} Quizzes</span>
           </div>
           {quizzes?.map((q, i) => (
             <div key={q.docId} className="flex items-center gap-4 bg-black/20 p-2 rounded border border-white/5">
                <span className="text-gray-500 font-mono w-8">#{i+1}</span>
                <span className="text-purple-300 font-mono text-[10px] w-24 truncate">{q.docId}</span>
                <span className="flex-1 truncate">{q.question}</span>
                <span className="text-xs bg-white/10 px-2 py-0.5 rounded">{q.options?.length} opts</span>
                <button 
                  onClick={() => {
                    if (confirm(`Delete quiz ${q.docId}?`)) deleteQuiz.mutate(q.docId);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 size={16} />
                </button>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default DataSync;
