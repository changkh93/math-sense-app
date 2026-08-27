import React, { useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useClusters, useRegions, useChapters, useUnits, useAdminMutations } from '../../hooks/useContent';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit3, BookOpen, Layers, Library, Settings, Sparkles, ArrowUp, ArrowDown, Rocket, Bot, RefreshCw, Users, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AiQuizImportModal from '../../components/Admin/AiQuizImportModal';
import AiCodeTraceImportModal from '../../components/Admin/AiCodeTraceImportModal';
import { db, functions } from '../../firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import RegionEditModal from '../../components/Admin/RegionEditModal';
import RegionStudentManagerModal from '../../components/Admin/RegionStudentManagerModal';

const ContentManager = () => {
  const { data: clusters } = useClusters();
  
  // Use sessionStorage to persist UI state across navigations
  const [selectedClusterId, setSelectedClusterId] = useState(() => {
    return sessionStorage.getItem('admin_selectedClusterId') || 'cluster_elementary';
  });
  
  const [expandedRegions, setExpandedRegions] = useState(() => {
    const saved = sessionStorage.getItem('admin_expandedRegions');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedChapters, setExpandedChapters] = useState(() => {
    const saved = sessionStorage.getItem('admin_expandedChapters');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('admin_selectedClusterId', selectedClusterId);
  }, [selectedClusterId]);

  useEffect(() => {
    sessionStorage.setItem('admin_expandedRegions', JSON.stringify(expandedRegions));
  }, [expandedRegions]);

  useEffect(() => {
    sessionStorage.setItem('admin_expandedChapters', JSON.stringify(expandedChapters));
  }, [expandedChapters]);

  const { data: regions, isLoading: loadingRegions } = useRegions(selectedClusterId);
  const { saveRegion } = useAdminMutations();
  const [aiImportUnitId, setAiImportUnitId] = useState(null);
  const [codeTraceImportUnitId, setCodeTraceImportUnitId] = useState(null);

  // Modals state
  const [editingRegion, setEditingRegion] = useState(null);
  const [managingRegionStudents, setManagingRegionStudents] = useState(null);
  const [regionCodes, setRegionCodes] = useState({});

  useEffect(() => {
    if (!regions?.length) return;
    const loadSecrets = httpsCallable(functions, 'adminGetAccessSecrets');
    loadSecrets({ keys: regions.map((region) => `region_${region.id || region.docId}`) })
      .then((result) => setRegionCodes(result.data?.secrets || {}))
      .catch((error) => console.error('Failed to load region access codes:', error));
  }, [regions]);

  const withRegionCode = (region) => {
    const regionId = region?.id || region?.docId;
    return region ? { ...region, accessCode: regionCodes[`region_${regionId}`] || '' } : region;
  };

  const toggleRegion = (id) => setExpandedRegions(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleChapter = (id) => setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddRegion = () => {
    setEditingRegion({ isNew: true, clusterId: selectedClusterId, order: regions?.length || 0 });
  };

  const handleSaveRegion = (regionData) => {
    saveRegion.mutate(regionData);
    const regionId = regionData.id || regionData.docId;
    if (regionId && regionData.accessCode) {
      setRegionCodes((current) => ({ ...current, [`region_${regionId}`]: regionData.accessCode }));
    }
  };

  const handleRecountAnswers = async () => {
    if (!window.confirm('전체 질문의 답변 개수를 동기화하시겠습니까? (이 작업은 시간이 조금 걸릴 수 있습니다.)')) return;
    try {
      const qSnap = await getDocs(collection(db, 'questions'));
      const aSnap = await getDocs(collection(db, 'answers'));
      
      const answerCounts = {};
      aSnap.docs.forEach(doc => {
        if (doc.data().parentAnswerId) return;
        const qId = doc.data().questionId;
        if (qId) {
           answerCounts[qId] = (answerCounts[qId] || 0) + 1;
        }
      });

      let count = 0;
      let batch = writeBatch(db);

      for (const qDoc of qSnap.docs) {
        const actualCount = answerCounts[qDoc.id] || 0;
        if (qDoc.data().answerCount !== actualCount) {
           batch.update(doc(db, 'questions', qDoc.id), { answerCount: actualCount });
           count++;
           if (count % 400 === 0) {
             await batch.commit();
             batch = writeBatch(db);
           }
        }
      }
      
      if (count % 400 !== 0) {
        await batch.commit();
      }

      alert(`동기화 완료! ${count}개의 질문 데이터가 수정되었습니다.`);
    } catch (err) {
      console.error(err);
      alert('오류 발생: 콘솔을 확인하세요.');
    }
  };

  if (loadingRegions) return <div className="loading">Loading Regions...</div>;

  return (
    <div className="content-manager">
      <header className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Content Manager</h1>
          <p>Regions → Chapters → Units</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="cluster-filter" style={{ minWidth: '200px' }}>
            <select 
              value={selectedClusterId} 
              onChange={(e) => {
                setSelectedClusterId(e.target.value);
                setExpandedRegions({}); // Clear expansion on switch
              }}
              className="glass"
              style={{
                width: '100%',
                padding: '0.6rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            >
              {clusters?.map(c => (
                <option key={c.docId} value={c.docId} style={{ background: '#0f172a' }}>
                  {c.name} {c.isPrivate ? '(🔒 Private)' : ''}
                </option>
              ))}
            </select>
          </div>
          <button className="hud-btn secondary glass" onClick={handleRecountAnswers} style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> 답변수 동기화
          </button>
          <button className="primary-btn" onClick={handleAddRegion}>
            <Plus size={18} /> <span>Add Region</span>
          </button>
        </div>
      </header>

      <div className="hierarchy-tree">
        {regions?.map(region => (
          <RegionNode 
            key={region.id} 
            region={region} 
            isExpanded={expandedRegions[region.id]} 
            onToggle={() => toggleRegion(region.id)}
            expandedChapters={expandedChapters}
            onToggleChapter={toggleChapter}
            onOpenAiImport={setAiImportUnitId}
            onOpenCodeTraceImport={setCodeTraceImportUnitId}
            onEditRegion={(region) => setEditingRegion(withRegionCode(region))}
            onManageStudents={(region) => setManagingRegionStudents(withRegionCode(region))}
          />
        ))}
      </div>

      <AiQuizImportModal 
        isOpen={!!aiImportUnitId} 
        unitId={aiImportUnitId} 
        onClose={() => setAiImportUnitId(null)} 
      />

      <AiCodeTraceImportModal
        isOpen={!!codeTraceImportUnitId}
        unitId={codeTraceImportUnitId}
        onClose={() => setCodeTraceImportUnitId(null)}
      />

      <RegionEditModal
        isOpen={!!editingRegion}
        initialData={editingRegion}
        onClose={() => setEditingRegion(null)}
        onSave={handleSaveRegion}
      />

      <RegionStudentManagerModal
        isOpen={!!managingRegionStudents}
        region={managingRegionStudents}
        onClose={() => setManagingRegionStudents(null)}
      />
    </div>
  );
};

const RegionNode = ({ region, isExpanded, onToggle, expandedChapters, onToggleChapter, onOpenAiImport, onOpenCodeTraceImport, onEditRegion, onManageStudents }) => {
  const { data: chapters, isLoading: loadingChapters } = useChapters(isExpanded ? region.id : null);
  const { deleteRegion, saveChapter } = useAdminMutations();

  const handleRename = (e) => {
    e.stopPropagation();
    onEditRegion(region);
  };

  const handleAddChapter = (e) => {
    e.stopPropagation();
    const title = prompt("New Chapter Title:");
    if (title) {
      saveChapter.mutate({ 
        regionId: region.id, 
        title, 
        order: chapters?.length || 0,
        id: `chap_${Date.now()}` 
      });
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete region "${region.title}"? This is destructive.`)) {
      deleteRegion.mutate(region.id);
    }
  };

  return (
    <div className="tree-node region-node">
      <div className="node-content" onClick={onToggle}>
        <div className="node-info">
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          <Library className="icon" size={18} />
          <span className="node-title">{region.title}</span>
          <span className="node-id" style={{ fontSize: '0.75rem', opacity: 0.4, marginLeft: '0.8rem', fontFamily: 'monospace' }}>[{region.id}]</span>
        </div>
        <div className="node-actions">
          <button className="icon-btn" onClick={(e) => { e.stopPropagation(); onManageStudents(region); }} title="Manage Students" style={{ color: 'var(--crystal-cyan)' }}><Users size={16} /></button>
          <button className="icon-btn edit-btn" onClick={handleRename} title="Edit Region"><Settings size={16} /></button>
          <button className="icon-btn add-btn" onClick={handleAddChapter} title="Add Chapter"><Plus size={16} /></button>
          <button className="icon-btn delete-btn" onClick={handleDelete} title="Delete"><Trash2 size={16} /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="node-children">

          {loadingChapters ? <div className="loading">Loading chapters...</div> : 
           chapters?.length === 0 ? <div className="loading">No chapters found.</div> :
           chapters?.map((chapter, index) => (
            <ChapterNode 
              key={chapter.docId} 
              chapter={chapter} 
              isExpanded={expandedChapters[chapter.docId]}
              onToggle={() => onToggleChapter(chapter.docId)}
              onOpenAiImport={onOpenAiImport}
              onOpenCodeTraceImport={onOpenCodeTraceImport}
              isFirst={index === 0}
              isLast={index === chapters.length - 1}
              onReorder={(dir) => {
                const newChapters = [...chapters];
                const targetIndex = dir === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= newChapters.length) return;
                
                // Swap
                [newChapters[index], newChapters[targetIndex]] = [newChapters[targetIndex], newChapters[index]];
                
                // Update orders for all (simplest way to ensure consistency)
                newChapters.forEach((ch, idx) => {
                  if (ch.order !== idx) {
                    saveChapter.mutate({ ...ch, order: idx });
                  }
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ChapterNode = ({ chapter, isExpanded, onToggle, onOpenAiImport, onOpenCodeTraceImport, isFirst, isLast, onReorder }) => {
  const { data: units, isLoading: loadingUnits } = useUnits(isExpanded ? chapter.docId : null);
  const { saveChapter, deleteChapter, saveUnit } = useAdminMutations();

  const handleRename = (e) => {
    e.stopPropagation();
    const newTitle = prompt("Rename Chapter:", chapter.title);
    if (newTitle && newTitle !== chapter.title) {
      saveChapter.mutate({ ...chapter, title: newTitle });
    }
  };

  const handleAddUnit = (e) => {
    e.stopPropagation();
    const title = prompt("New Unit Title:");
    if (title) {
      saveUnit.mutate({ 
        chapterId: chapter.docId, 
        title, 
        order: units?.length || 0,
        id: `unit_${Date.now()}` 
      });
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete chapter "${chapter.title}"?`)) {
      deleteChapter.mutate(chapter.docId);
    }
  };

  return (
    <div className="tree-node chapter-node">
      <div className="node-content" onClick={onToggle}>
        <div className="node-info">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Layers className="icon" size={16} />
          <span className="node-title">{chapter.title}</span>
          <span className="node-id" style={{ fontSize: '0.7rem', opacity: 0.3, marginLeft: '0.6rem', fontFamily: 'monospace' }}>[{chapter.docId || chapter.id}]</span>
        </div>
        <div className="node-actions">
          <button className="icon-btn ai-btn" onClick={() => onOpenAiImport(chapter.docId)} title="Import AI Quiz"><Sparkles size={14} /></button>
          
          <div className="reorder-btns" style={{ display: 'flex', gap: '2px', margin: '0 4px' }}>
            <button className="icon-btn" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onReorder('up'); }} title="Move Up">
              <ArrowUp size={14} />
            </button>
            <button className="icon-btn" disabled={isLast} onClick={(e) => { e.stopPropagation(); onReorder('down'); }} title="Move Down">
              <ArrowDown size={14} />
            </button>
          </div>

          <button className="icon-btn edit-btn" onClick={handleRename} title="Rename"><Edit3 size={14} /></button>
          <button className="icon-btn add-btn" onClick={handleAddUnit} title="Add Unit"><Plus size={14} /></button>
          <button className="icon-btn delete-btn" onClick={handleDelete} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="node-children">

          {loadingUnits ? <div className="loading">Loading units...</div> : 
           units?.length === 0 ? <div className="loading">No units found.</div> :
           units?.map((unit, index) => (
            <UnitNode 
              key={unit.docId} 
              unit={unit} 
              onOpenAiImport={onOpenAiImport} 
              onOpenCodeTraceImport={onOpenCodeTraceImport}
              isFirst={index === 0}
              isLast={index === units.length - 1}
              onReorder={(dir) => {
                const newUnits = [...units];
                const targetIndex = dir === 'up' ? index - 1 : index + 1;
                if (targetIndex < 0 || targetIndex >= newUnits.length) return;

                // Swap
                [newUnits[index], newUnits[targetIndex]] = [newUnits[targetIndex], newUnits[index]];

                // Update orders
                newUnits.forEach((u, idx) => {
                  if (u.order !== idx) {
                    saveUnit.mutate({ ...u, order: idx });
                  }
                });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const UnitNode = ({ unit, onOpenAiImport, onOpenCodeTraceImport, isFirst, isLast, onReorder }) => {
  const { saveUnit, deleteUnit } = useAdminMutations();

  const handleRename = (e) => {
    e.stopPropagation();
    const newTitle = prompt("Rename Unit:", unit.title);
    if (newTitle && newTitle !== unit.title) {
      saveUnit.mutate({ ...unit, title: newTitle });
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (confirm(`Delete unit "${unit.title}"?`)) {
      deleteUnit.mutate(unit.docId);
    }
  };

  return (
    <div className="tree-node unit-node">
      <div className="node-content">
        <div className="node-info">
          <BookOpen className="icon" size={14} />
          <span className="node-title">{unit.title}</span>
          <span className="node-id" style={{ fontSize: '0.65rem', opacity: 0.2, marginLeft: '0.5rem', fontFamily: 'monospace' }}>[{unit.docId || unit.id}]</span>
        </div>
        <div className="node-actions">
          <button 
            className="icon-btn ai-btn" 
            onClick={(e) => { e.stopPropagation(); onOpenAiImport(unit.docId); }} 
            title="Import AI Quiz"
            style={{ color: '#8b5cf6' }}
          >
            <Sparkles size={14} />
          </button>

          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); onOpenCodeTraceImport(unit.docId); }}
            title="Import AI Code Trace"
            style={{ color: '#22d3ee' }}
          >
            <Code2 size={14} />
          </button>

          {/* Navigation to Mission Content Editor */}
          <Link to={`/admin/mission/${unit.docId}`} className="icon-btn" title="미션 콘텐츠 편집" style={{ color: 'var(--planet-green)' }}>
            <Rocket size={14} />
          </Link>

          {/* Navigation to AI Auto-Tagging */}
          <Link to={`/admin/mission/${unit.docId}/ai-tagging`} className="icon-btn" title="AI 구간 자동 매핑" style={{ color: '#ec4899' }}>
            <Bot size={14} />
          </Link>

          {/* Navigation to Quiz Editor: CLEAR SEPARATION */}
          <Link to={`/admin/quizzes/${unit.docId}`} className="icon-btn quiz-btn" title="Manage Questions">
            <Settings size={14} />
          </Link>
          
          <div className="reorder-btns" style={{ display: 'flex', gap: '2px', margin: '0 4px' }}>
            <button className="icon-btn" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onReorder('up'); }} title="Move Up">
              <ArrowUp size={14} />
            </button>
            <button className="icon-btn" disabled={isLast} onClick={(e) => { e.stopPropagation(); onReorder('down'); }} title="Move Down">
              <ArrowDown size={14} />
            </button>
          </div>

          <button className="icon-btn edit-btn" onClick={handleRename} title="Rename"><Edit3 size={14} /></button>
          <button className="icon-btn delete-btn" onClick={handleDelete} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;
