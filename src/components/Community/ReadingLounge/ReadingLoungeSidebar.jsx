import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Sparkles, Compass, ArrowRight, Bookmark, Heart } from 'lucide-react';
import './ReadingLounge.css';

const READING_QUOTES = [
  {
    quote: "책 없는 방은 영혼 없는 육체와 같다.",
    author: "키케로",
  },
  {
    quote: "오늘의 나를 있게 한 것은 우리 마을의 작은 도서관이었다.",
    author: "빌 게이츠",
  },
  {
    quote: "독서는 다만 지식의 재료를 공급할 뿐, 그것을 자기 것으로 만드는 것은 사색의 힘이다.",
    author: "존 로크",
  },
  {
    quote: "좋은 책을 읽는 것은 과거의 가장 훌륭한 사람들과 대화하는 것과 같다.",
    author: "데카르트",
  },
];

export default function ReadingLoungeSidebar() {
  const navigate = useNavigate();

  // Pick a deterministic quote of the day based on date
  const today = new Date();
  const dayIndex = (today.getFullYear() * 365 + today.getMonth() * 31 + today.getDate()) % READING_QUOTES.length;
  const quoteOfTheDay = READING_QUOTES[dayIndex];

  return (
    <div className="reading-lounge-sidebar">
      {/* 1. My Bookshelf Quick Card */}
      <section className="reading-sidebar-card reading-sidebar-hero glass hud-border">
        <div className="reading-sidebar-hero-header">
          <div className="reading-sidebar-hero-icon" aria-hidden="true">
            <BookOpen size={20} />
          </div>
          <div>
            <h3 className="reading-sidebar-hero-title font-title">나의 고전 서재</h3>
            <p className="reading-sidebar-hero-subtitle">내가 읽고 담아둔 책 목록</p>
          </div>
        </div>

        <p className="reading-sidebar-hero-desc">
          라운지에서 발견한 관심 도서와 나의 완독 기록을 서재에서 모아보세요.
        </p>

        <button
          type="button"
          onClick={() => navigate('/?view=reading_library', { state: { view: 'reading_library' } })}
          className="reading-sidebar-action-btn font-tech"
        >
          <span>서재로 이동하기</span>
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </section>

      {/* 2. Quote of the Day */}
      <section className="reading-sidebar-card reading-sidebar-quote-card glass hud-border">
        <div className="reading-sidebar-quote-badge font-title">
          <Sparkles size={16} />
          <span>오늘의 독서 한마디</span>
        </div>
        <blockquote className="reading-sidebar-quote-text">
          &ldquo;{quoteOfTheDay.quote}&rdquo;
        </blockquote>
        <div className="reading-sidebar-quote-author">
          — {quoteOfTheDay.author}
        </div>
      </section>

      {/* 3. Lounge Exploration Guide */}
      <section className="reading-sidebar-card reading-sidebar-guide-card glass hud-border">
        <h4 className="reading-sidebar-guide-title font-title">
          <Compass size={17} color="#34d399" />
          <span>독서 라운지 즐기기</span>
        </h4>

        <ul className="reading-sidebar-guide-list">
          <li className="reading-sidebar-guide-item">
            <Bookmark size={15} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>읽고 싶어요</strong>: 마음에 드는 책을 내 서재 관심 도서로 바로 저장해요.</span>
          </li>
          <li className="reading-sidebar-guide-item">
            <BookOpen size={15} color="#34d399" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>저도 읽었어요</strong>: 완독한 책으로 연결하고 소감을 나눠보세요.</span>
          </li>
          <li className="reading-sidebar-guide-item">
            <Heart size={15} color="#f43f5e" style={{ marginTop: '2px', flexShrink: 0 }} />
            <span><strong>공감과 대화</strong>: 친구들의 생각에 답글을 달며 고전의 감동을 나눠요.</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
