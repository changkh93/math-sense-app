import { Link } from 'react-router-dom';
import './Footer.css';

const channels = [
  ['인스타그램', 'https://www.instagram.com/metasense_edu/'],
  ['카카오톡 상담', 'https://pf.kakao.com/_xfxkGDn'],
  ['유튜브', 'https://www.youtube.com/@metasense_edu'],
  ['네이버 블로그', 'https://blog.naver.com/metasense_edu'],
  ['네이버 클립', 'https://clip.naver.com/@metasense_edu'],
  ['수학감각 교재', 'https://smartstore.naver.com/dulcine'],
];

export default function Footer() {
  return (
    <footer className="metasense-footer">
      <div className="metasense-footer__inner">
        <div className="metasense-footer__top">
        <div className="metasense-footer__brand">
          <a className="metasense-footer__logo" href="https://msense.me">메타센스<span>msense.me</span></a>
          <p>메타센스는 둘시네가 운영합니다.</p>
        </div>
        <nav className="metasense-footer__channels" aria-label="메타센스 공식 채널 및 교재">
          {channels.map(([label, href]) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer">
              {label}<span className="metasense-footer__arrow" aria-hidden="true">↗</span>
              <span className="metasense-footer__sr-only"> (새 창)</span>
            </a>
          ))}
        </nav>
        </div>
        <p className="metasense-footer__channel-note">카카오톡 채널명: 둘시네 온라인 교육</p>
        <div className="metasense-footer__business">
          <span>사업자등록번호: 891-91-00078</span>
          <span>대표자: 장기홍</span>
          <span>주소: 인천시 중구 송산로 9</span>
          <span>전화: <a href="tel:01062854382">010-6285-4382</a></span>
          <span>이메일: <a href="mailto:paul@dulcine.net">paul@dulcine.net</a></span>
        </div>
        <div className="metasense-footer__bottom">
          <nav aria-label="이용 정책">
            <Link to="/privacy">개인정보처리방침</Link>
            <Link to="/terms">이용약관</Link>
            <Link to="/referral">추천인 제도</Link>
          </nav>
          <small>© {new Date().getFullYear()} MetaSense. All rights reserved.</small>
        </div>
      </div>
    </footer>
  );
}
