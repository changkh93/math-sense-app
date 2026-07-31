import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { Megaphone, X, Send } from 'lucide-react';
import { functions } from '../../firebase';

// 어드민이 학부모 전체(또는 선택)에게 인앱 공지를 일괄 발송하는 모달 컴포넌트.
// 발송은 adminBroadcastParentAnnouncement Cloud Function이 처리하며
// notifications 컬렉션에 학부모 1명당 1문서를 생성합니다 (SMS/문자 아님).
// 학부모는 ParentDashboard의 알림 벨/상단 배너로 수신합니다.
export default function ParentAnnouncementBroadcaster({ parents = [], onClose }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [scope, setScope] = useState('all'); // 'all' | 'selected'
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const targetCount = scope === 'all' ? parents.length : selectedIds.length;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async () => {
    setError('');
    if (!title.trim() || !message.trim()) {
      setError('제목과 본문을 모두 입력하세요.');
      return;
    }
    if (targetCount === 0) {
      setError('발송 대상이 없습니다.');
      return;
    }

    if (!confirm(`학부모 ${targetCount}명에게 이 공지를 발송할까요?\n(앱에 접속한 학부모에게 인앱 알림으로 표시됩니다)`)) return;

    setSending(true);
    setResult(null);
    try {
      const fn = httpsCallable(functions, 'adminBroadcastParentAnnouncement');
      const payload = {
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || null,
      };
      if (scope === 'selected') payload.targetUids = selectedIds;
      const res = await fn(payload);
      setResult(res.data || { sent: 0, skipped: 0, failed: 0 });
    } catch (err) {
      console.error(err);
      setError(err?.message || '발송 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, color: '#67e8f9' }}>
            <Megaphone size={20} /> 학부모 공지 일괄 발송
          </h3>
          <button type="button" onClick={onClose} style={iconBtnStyle} aria-label="닫기"><X size={18} /></button>
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 0 }}>
          입력한 공지를 학부모의 인앱 알림으로 발송합니다. 학부모는 앱에 접속하면 상단 배너와 알림 벨로 확인할 수 있습니다. (문자/SMS가 아닌 무료 인앱 알림)
        </p>

        {/* 대상 범위 */}
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>발송 대상</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: scope === 'selected' ? 10 : 0 }}>
            <button type="button" onClick={() => setScope('all')} style={scope === 'all' ? chipActiveStyle : chipStyle}>전체 학부모 ({parents.length}명)</button>
            <button type="button" onClick={() => setScope('selected')} style={scope === 'selected' ? chipActiveStyle : chipStyle}>선택 발송</button>
          </div>

          {scope === 'selected' && (
            <div style={{ maxHeight: 140, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 8 }}>
              {parents.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 6 }}>학부모 목록이 없습니다.</div>
              ) : parents.map((p) => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', fontSize: 13 }}>
                  <input type="checkbox" checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  <span>{p.phone?.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') || p.id}</span>
                </label>
              ))}
            </div>
          )}
          {scope === 'selected' && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>{selectedIds.length}명 선택됨</div>}
        </div>

        {/* 제목 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 친구 추천 프로모션 안내"
            maxLength={120}
            style={inputStyle}
          />
        </div>

        {/* 본문 */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>본문</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="예: 지금 친구를 추천하면 다음 달 수강료가 최대 100% 할인됩니다. 추천 링크는 대시보드에서 복사할 수 있어요!"
            rows={5}
            maxLength={1000}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* 링크 (선택) */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>이동 링크 (선택)</label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/referral"
            maxLength={300}
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>학부모가 알림을 누르면 이동할 경로입니다. 추천인 안내는 /referral</div>
        </div>

        {error && <div style={{ color: '#fecaca', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        {result && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(134,239,172,0.3)', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13, color: '#bbf7d0' }}>
            발송 완료 · 성공 {result.sent}건{result.skipped ? `, 건너뜀 ${result.skipped}` : ''}{result.failed ? `, 실패 ${result.failed}` : ''}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={secondaryBtnStyle}>닫기</button>
          <button type="button" onClick={handleSend} disabled={sending || !!result} style={primaryBtnStyle}>
            {sending ? '발송 중...' : <><Send size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />{targetCount}명에게 발송</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
};
const modalStyle = {
  background: 'rgba(15,22,46,0.98)', border: '1px solid rgba(103,232,249,0.25)', borderRadius: 16,
  padding: 24, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle = { display: 'block', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6, fontWeight: 700 };
const inputStyle = {
  width: '100%', padding: '11px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.25)', color: '#fff', fontSize: 14,
};
const chipStyle = {
  border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: 'rgba(255,255,255,0.7)',
  borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontSize: 13,
};
const chipActiveStyle = { ...chipStyle, background: 'rgba(6,182,212,0.15)', borderColor: 'rgba(103,232,249,0.5)', color: '#67e8f9', fontWeight: 700 };
const iconBtnStyle = { background: 'transparent', border: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4 };
const primaryBtnStyle = {
  border: '1px solid rgba(103,232,249,0.45)', background: 'rgba(6,182,212,0.16)', color: '#67e8f9',
  borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 800,
};
const secondaryBtnStyle = {
  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.75)',
  borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontWeight: 700,
};
