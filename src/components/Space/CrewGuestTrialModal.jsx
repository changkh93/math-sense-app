import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';
import './CrewGuestTrialModal.css';

export default function CrewGuestTrialModal({ onClose }) {
  const titleId = useId();
  const panel = useRef(null);
  const inFlight = useRef(false);
  const [offer, setOffer] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ studentName: '', grade: '', parentPhone: '' });
  useEffect(() => {
    let cancelled = false;
    const previous = document.activeElement;
    panel.current?.focus();
    httpsCallable(functions, 'getCrewGuestTrialOffer')({}).then(({ data }) => {
      if (!cancelled) { setOffer(data); setDone(data.alreadyApplied === true); }
    }).catch(() => { if (!cancelled) setError('체험 혜택을 확인하지 못했어요. 잠시 후 다시 열어 주세요.'); });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      previous?.focus?.();
    };
  }, []);
  function handleKeys(event) {
    if (event.key === 'Escape' && !inFlight.current) { event.stopPropagation(); onClose(); }
    if (event.key !== 'Tab') return;
    const controls = [...panel.current.querySelectorAll('button:not(:disabled), input, select, a[href]')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
      event.preventDefault(); first?.focus();
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (!offer || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try {
      await httpsCallable(functions, 'submitCrewGuestTrial')(form);
      setDone(true);
    } catch (err) {
      setError(err?.message || '접수하지 못했어요. 잠시 후 다시 신청해 주세요.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  useEffect(() => { if (done) panel.current?.focus(); }, [done]);
  return createPortal(
    <div className="crew-trial-backdrop" onClick={() => { if (!busy) onClose(); }} onKeyDown={handleKeys}>
      <section ref={panel} tabIndex={-1} className="crew-trial-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="crew-trial-close" onClick={onClose} disabled={busy} aria-label="닫기">×</button>
        <span className="crew-trial-eyebrow">STUDY CREW · FREE TRIAL</span>
        <h2 id={titleId}>{done ? '무료체험 신청이 접수됐어요!' : '친구와 함께 무료체험 시작하기'}</h2>
        {done ? <>
          <p role="status">담당자가 적어 주신 연락처로 전화드려 체험 과정과 시작일을 안내할게요. 회원가입은 지금 하지 않아도 돼요.</p>
          <button type="button" className="crew-trial-submit" onClick={onClose}>계속 크루 둘러보기</button>
        </> : <>
          <div className="crew-trial-benefit" role="status">
            {!offer ? '무료체험 혜택을 확인하고 있어요…' : offer.referralVerified
              ? '기존 수강생의 추천으로 특별히 4주 무료체험을 신청할 수 있어요.'
              : '7일 무료체험을 신청할 수 있어요. 추천 혜택은 현재 초대 링크에서 확인되지 않았어요.'}
          </div>
          <p>아래 정보만 남기면 신청 끝! 담당자가 전화로 체험을 안내해 드릴게요.</p>
          <form onSubmit={submit}>
            <div className="crew-trial-fields">
              <label>학생 이름<input autoComplete="name" maxLength={80} required value={form.studentName} onChange={(e) => update('studentName', e.target.value)} placeholder="이름을 알려 주세요" /></label>
              <label>학년<select required value={form.grade} onChange={(e) => update('grade', e.target.value)}><option value="">학년 선택</option>{['초1','초2','초3','초4','초5','초6','중1','중2','중3','고1','고2','고3','기타'].map((g) => <option key={g}>{g}</option>)}</select></label>
            </div>
            <label>보호자 연락처<input type="tel" inputMode="tel" autoComplete="tel" maxLength={13} required value={form.parentPhone} onChange={(e) => update('parentPhone', e.target.value)} placeholder="010-0000-0000" /></label>
            <p className="crew-trial-reassurance">결제정보 등록 없음 · 체험 후 자동 유료 전환 없음</p>
            <button className="crew-trial-submit" type="submit" disabled={busy || !offer}>{busy ? '접수 중…' : `${offer?.referralVerified ? '4주' : offer ? '7일' : ''} 무료체험 신청하기`}</button>
            <p className="crew-trial-privacy"><a href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a></p>
          </form>
        </>}
        {error && <p className="crew-trial-error" role="alert">{error}</p>}
      </section>
    </div>, document.body,
  );
}
