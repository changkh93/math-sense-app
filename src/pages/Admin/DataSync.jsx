import React, { useState, useEffect } from 'react';
import { useRegions, useChapters, useUnits, useQuizzes, useAdminMutations } from '../../hooks/useContent';
import { db } from '../../firebase';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Database, Download, Search, Trash2, RefreshCw, AlertTriangle, CheckCircle, FileJson, UploadCloud } from 'lucide-react';

const DataSync = () => {
  const [activeTab, setActiveTab] = useState('export'); // 'export'

  return (
    <div className="data-sync-container p-6 max-w-6xl mx-auto">
      <header className="mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Database size={32} className="text-blue-400" />
          <h1 className="text-3xl font-bold text-white">Data Backup & Export</h1>
        </div>
        <p className="text-gray-400">
          Export your Firestore data to local files for backup purposes.
        </p>
      </header>

      <div className="tabs flex flex-wrap gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('export')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${activeTab === 'export' ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10'}`}
        >
          <Download size={18} /> Bulk Export
        </button>
      </div>

      <div className="tab-content glass p-6 rounded-xl">
        {activeTab === 'export' && <ExportTab />}
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

export default DataSync;
