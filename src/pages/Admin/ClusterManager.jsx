import React, { useState } from 'react';
import { useClusters, useAdminMutations } from '../../hooks/useContent';
import { Plus, Edit, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import './Admin.css';

function ClusterManager() {
  const { data: clusters = [], isLoading } = useClusters();
  const { saveCluster, deleteCluster } = useAdminMutations();
  const [editingCluster, setEditingCluster] = useState(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    isPrivate: false,
    inviteCode: '',
    expiresAt: ''
  });

  const handleEdit = (cluster) => {
    setEditingCluster(cluster);
    setFormData({
      id: cluster.id || cluster.docId || '',
      name: cluster.name || '',
      isPrivate: !!cluster.isPrivate,
      inviteCode: cluster.inviteCode || '',
      expiresAt: cluster.expiresAt ? new Date(cluster.expiresAt.toDate ? cluster.expiresAt.toDate() : cluster.expiresAt).toISOString().split('T')[0] : ''
    });
  };

  const handleAddNew = () => {
    setEditingCluster({ isNew: true });
    setFormData({
      id: '',
      name: '',
      isPrivate: false,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      expiresAt: ''
    });
  };

  const generateNewCode = () => {
    setFormData(prev => ({
      ...prev,
      inviteCode: Math.random().toString(36).substring(2, 10).toUpperCase()
    }));
  };

  const copyToClipboard = async (code) => {
    const url = `${window.location.origin}/invite/${code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert('이름을 입력해주세요.');

    const payload = {
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
      order: editingCluster?.order || clusters.length
    };

    if (editingCluster && !editingCluster.isNew) {
      payload.id = editingCluster.id || editingCluster.docId;
    }

    try {
      console.log('Saving cluster with payload:', payload);
      await saveCluster.mutateAsync(payload);
      setEditingCluster(null);
      alert('성공적으로 저장되었습니다.');
    } catch (err) {
      console.error('Cluster save failed details:', err);
      alert(`저장 실패: ${err.message || '알 수 없는 오류'}`);
    }
  };

  const handleDelete = async (cluster) => {
    if (window.confirm(`'${cluster.name}' 군집을 삭제하시겠습니까? (이 군집에 연결된 은하/단원이 있다면 문제가 발생할 수 있습니다)`)) {
      try {
        await deleteCluster.mutateAsync(cluster.docId || cluster.id);
      } catch (err) {
        alert('삭제 실패');
      }
    }
  };

  if (isLoading) return <div>Loading DB...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header-row">
        <h2>행성 군집 관리 (Clusters)</h2>
        <button className="primary-btn" onClick={handleAddNew}>
          <Plus size={16} /> 새 군집 추가
        </button>
      </div>

      <div className="content-grid">
        <div className="list-section">
          <ul className="item-list">
            {clusters.map((cluster) => (
              <li key={cluster.docId || cluster.id} className="list-item">
                <div className="item-info">
                  <span className="item-title">{cluster.name}</span>
                  <span className="item-meta">
                    {cluster.isPrivate ? `비공개 (초대: ${cluster.inviteCode})` : '공개'} 
                    {cluster.usageCount ? ` | 사용: ${cluster.usageCount}회` : ''}
                  </span>
                </div>
                <div className="item-actions">
                  {cluster.isPrivate && cluster.inviteCode && (
                    <button 
                      className="icon-btn" 
                      onClick={() => copyToClipboard(cluster.inviteCode)}
                      title="초대 URL 복사"
                    >
                      {copied ? <Check size={16} color="green" /> : <Copy size={16} />}
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => handleEdit(cluster)}>
                    <Edit size={16} />
                  </button>
                  <button className="icon-btn danger" onClick={() => handleDelete(cluster)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            ))}
            {clusters.length === 0 && <p className="empty-state">생성된 군집이 없습니다.</p>}
          </ul>
        </div>

        <div className="editor-section">
          {editingCluster ? (
            <div className="editor-panel block-appear">
              <h3>{editingCluster.isNew ? '군집 추가' : '군집 수정'}</h3>
              <form onSubmit={handleSubmit} className="editor-form">
                
                <div className="form-group">
                  <label>군집 ID (고유값)</label>
                  <input 
                    type="text" 
                    value={formData.id}
                    onChange={(e) => setFormData({...formData, id: e.target.value})}
                    placeholder="예: cluster_middle"
                    disabled={!editingCluster.isNew}
                  />
                  {!editingCluster.isNew && <small>ID는 생성 후 변경할 수 없습니다.</small>}
                </div>

                <div className="form-group">
                  <label>군집 이름</label>
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="예: 중등수학"
                    required
                  />
                </div>

                <div className="form-group row-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={formData.isPrivate}
                      onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
                    />
                    비공개 (초대 링크 필요)
                  </label>
                </div>

                {formData.isPrivate && (
                  <>
                    <div className="form-group">
                      <label>초대 코드</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                          type="text" 
                          value={formData.inviteCode}
                          onChange={(e) => setFormData({...formData, inviteCode: e.target.value})}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="secondary-btn icon-only" onClick={generateNewCode} title="코드 재생성 (기존 링크 무효화)">
                          <RefreshCw size={16} />
                        </button>
                      </div>
                      <small style={{ color: '#ffb703', display: 'block', marginTop: '5px' }}>
                        * 코드를 재생성하면 기존에 배포된 초대 링크는 작동하지 않게 됩니다.
                      </small>
                    </div>

                    <div className="form-group">
                      <label>만료일 (선택)</label>
                      <input 
                        type="date" 
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                      />
                    </div>
                  </>
                )}

                <div className="form-actions">
                  <button type="button" className="ghost-btn" onClick={() => setEditingCluster(null)}>
                    취소
                  </button>
                  <button type="submit" className="primary-btn" disabled={saveCluster.isPending}>
                    {saveCluster.isPending ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="empty-selection">
              좌측 목록에서 편집할 군집을 선택하거나<br/>'새 군집 추가'를 클릭하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClusterManager;
