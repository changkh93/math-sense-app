import React, { useState } from 'react';
import { useRegions, useChapters, useUnits, useAdminMutations } from '../../hooks/useContent';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit3, BookOpen, Layers, Library, Settings, Sparkles, ArrowUp, ArrowDown, Rocket, Bot, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import AiQuizImportModal from '../../components/Admin/AiQuizImportModal';
import { db } from '../../firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const ContentManager = () => {
  const { data: regions, isLoading: loadingRegions } = useRegions();
  const { saveRegion } = useAdminMutations();
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});
  const [aiImportUnitId, setAiImportUnitId] = useState(null);

  const toggleRegion = (id) => setExpandedRegions(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleChapter = (id) => setExpandedChapters(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAddRegion = () => {
    const title = prompt("New Region Title:");
    if (title) saveRegion.mutate({ title, order: regions?.length || 0 });
  };

  if (loadingRegions) return <div className="loading">Loading Regions...</div>;

  return (
    <div className="content-manager">
      <header className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Content Manager</h1>
          <p>Regions → Chapters → Units</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          />
        ))}
      </div>

      <AiQuizImportModal 
        isOpen={!!aiImportUnitId} 
        unitId={aiImportUnitId} 
        onClose={() => setAiImportUnitId(null)} 
      />
    </div>
  );
};

const RegionNode = ({ region, isExpanded, onToggle, expandedChapters, onToggleChapter, onOpenAiImport }) => {
  const { data: chapters, isLoading: loadingChapters } = useChapters(isExpanded ? region.id : null);
  const { saveRegion, deleteRegion, saveChapter } = useAdminMutations();

  const handleRename = (e) => {
    e.stopPropagation();
    const newTitle = prompt("Rename Region:", region.title);
    if (newTitle && newTitle !== region.title) {
      saveRegion.mutate({ ...region, title: newTitle });
    }
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
        </div>
        <div className="node-actions">
          <button className="icon-btn edit-btn" onClick={handleRename} title="Rename"><Edit3 size={16} /></button>
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

const ChapterNode = ({ chapter, isExpanded, onToggle, onOpenAiImport, isFirst, isLast, onReorder }) => {
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

const UnitNode = ({ unit, onOpenAiImport, isFirst, isLast, onReorder }) => {
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
