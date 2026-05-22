import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

const gradeOptions = ['미취학', '초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고등'];

export default function ChildAccountCreator({ compact = false, onCreated }) {
  const [form, setForm] = useState({
    studentName: '',
    loginId: '',
    password: '',
    grade: '',
    birthDate: ''
  });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');

  const update = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setCreating(true);
    try {
      const createChild = httpsCallable(functions, 'createChildAccountForParent');
      const result = await createChild(form);
      setMessage(`${result.data?.studentName || form.studentName} 계정이 생성되었습니다. 아이디: ${result.data?.loginId || form.loginId}`);
      setForm({ studentName: '', loginId: '', password: '', grade: '', birthDate: '' });
      if (onCreated) onCreated(result.data);
    } catch (err) {
      console.error(err);
      setMessage(err?.message || '자녀 계정 생성에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: 'white',
    boxSizing: 'border-box'
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'grid',
      gap: compact ? 10 : 14,
      padding: compact ? 16 : 22,
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 16
    }}>
      <div>
        <h3 style={{ margin: '0 0 6px', color: '#ffffff' }}>자녀 학습자 계정 만들기</h3>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.55)', fontSize: '0.9rem', lineHeight: 1.5 }}>
          생성된 아이디와 비밀번호로 학생이 메타센스에 직접 로그인할 수 있습니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>이름</span>
          <input
            style={inputStyle}
            value={form.studentName}
            onChange={(e) => update('studentName', e.target.value)}
            placeholder="학생 이름"
            required
          />
        </label>
        <label>
          <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>학년</span>
          <select
            style={inputStyle}
            value={form.grade}
            onChange={(e) => update('grade', e.target.value)}
            required
          >
            <option value="" style={{ color: '#111' }}>선택하세요.</option>
            {gradeOptions.map(grade => <option key={grade} value={grade} style={{ color: '#111' }}>{grade}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 12 }}>
        <label>
          <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>학생 아이디</span>
          <input
            style={inputStyle}
            value={form.loginId}
            onChange={(e) => update('loginId', e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
            placeholder="영문/숫자 6~20자"
            minLength={6}
            maxLength={20}
            required
          />
        </label>
        <label>
          <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>비밀번호</span>
          <input
            style={inputStyle}
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="6자 이상"
            minLength={6}
            required
          />
        </label>
      </div>

      <label>
        <span style={{ display: 'block', marginBottom: 6, color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>생년월일</span>
        <input
          style={inputStyle}
          value={form.birthDate}
          onChange={(e) => update('birthDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
          placeholder="예: 20120101"
          inputMode="numeric"
        />
      </label>

      {message && (
        <div style={{ color: message.includes('실패') ? '#ff8a84' : '#80f7c4', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={creating}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 12,
          padding: '13px 16px',
          background: creating ? 'rgba(0,212,255,0.35)' : 'linear-gradient(135deg, #00d4ff, #7c3aed)',
          color: 'white',
          fontWeight: 800,
          cursor: creating ? 'not-allowed' : 'pointer'
        }}
      >
        {creating ? '생성 중...' : '학습자 추가'}
      </button>
    </form>
  );
}
