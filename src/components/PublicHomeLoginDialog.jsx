import { useEffect, useRef } from 'react'

export default function PublicHomeLoginDialog({ open, onClose, children }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} className="ms-login-dialog" aria-labelledby="ms-login-title" onCancel={onClose} onClose={onClose}>
    <div className="ms-dialog-heading"><div><span>다시 만나 반가워요</span><h2 id="ms-login-title">메타센스 로그인</h2></div><button type="button" onClick={onClose} aria-label="로그인 닫기">×</button></div>
    {children}
    <p className="ms-dialog-signup">아직 계정이 없으신가요? <a href="/signup">회원가입</a></p>
  </dialog>
}
