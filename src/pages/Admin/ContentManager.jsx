import React, { useState } from 'react';
import { useRegions, useChapters, useUnits, useAdminMutations } from '../../hooks/useContent';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit3, BookOpen, Layers, Library, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const ContentManager = () => {
  const { data: regions, isLoading: loadingRegions } = useRegions();
  const { saveRegion } = useAdminMutations();
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedChapters, setExpandedChapters] = useState({});

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
        <button className="primary-btn" onClick={handleAddRegion}>
          <Plus size={18} /> <span>Add Region</span>
        </button>
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
          />
        ))}
      </div>
    </div>
  );
};

const RegionNode = ({ region, isExpanded, onToggle, expandedChapters, onToggleChapter }) => {
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
        id: `chap${(chapters?.length || 0) + 1}` 
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
           chapters?.map(chapter => (
            <ChapterNode 
              key={chapter.docId} 
              chapter={chapter} 
              isExpanded={expandedChapters[chapter.docId]}
              onToggle={() => onToggleChapter(chapter.docId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ChapterNode = ({ chapter, isExpanded, onToggle }) => {
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
        id: `unit${(units?.length || 0) + 1}` 
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
          <button className="icon-btn edit-btn" onClick={handleRename} title="Rename"><Edit3 size={14} /></button>
          <button className="icon-btn add-btn" onClick={handleAddUnit} title="Add Unit"><Plus size={14} /></button>
          <button className="icon-btn delete-btn" onClick={handleDelete} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="node-children">
          {loadingUnits ? <div className="loading">Loading units...</div> : 
           units?.length === 0 ? <div className="loading">No units found.</div> :
           units?.map(unit => (
            <UnitNode key={unit.docId} unit={unit} />
          ))}
        </div>
      )}
    </div>
  );
};

const UnitNode = ({ unit }) => {
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
          {/* Navigation to Quiz Editor: CLEAR SEPARATION */}
          <Link to={`/admin/quizzes/${unit.docId}`} className="icon-btn quiz-btn" title="Manage Questions">
            <Settings size={14} />
          </Link>
          <button className="icon-btn edit-btn" onClick={handleRename} title="Rename"><Edit3 size={14} /></button>
          <button className="icon-btn delete-btn" onClick={handleDelete} title="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
};

export default ContentManager;
