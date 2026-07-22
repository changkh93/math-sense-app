import React, { useState } from 'react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { CircleHelp, Hammer, Shield, Sparkles, Trophy, Users, X, Zap } from 'lucide-react'
import { CREW_MOTHERSHIP_LEVELS } from '../../utils/crewMothershipCatalog'
import soundManager from '../../utils/SoundManager'
import './CrewGuideModal.css'

export default function CrewGuideModal({ isOpen, onClose, initialTab = 'all' }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <Motion.div
        className="crew-guide-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          soundManager.playClick()
          onClose()
        }}
      >
        <Motion.div
          className="crew-guide-modal"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="crew-guide-header">
            <div className="crew-guide-header__title">
              <span className="font-tech"><CircleHelp size={16} /> MOTHERSHIP & MISSION XP GUIDE</span>
              <h2 className="font-title">스터디 크루 레벨 & XP 가이드</h2>
            </div>
            <button
              type="button"
              className="crew-guide-close font-tech"
              onClick={() => {
                soundManager.playClick()
                onClose()
              }}
              aria-label="가이드 닫기"
            >
              <X size={18} />
              <span>닫기</span>
            </button>
          </div>

          {/* Nav Tabs */}
          <div className="crew-guide-tabs font-tech">
            <button
              type="button"
              className={`crew-guide-tab ${activeTab === 'all' ? 'is-active' : ''}`}
              onClick={() => { soundManager.playClick(); setActiveTab('all') }}
            >
              전체 가이드
            </button>
            <button
              type="button"
              className={`crew-guide-tab ${activeTab === 'level' ? 'is-active' : ''}`}
              onClick={() => { soundManager.playClick(); setActiveTab('level') }}
            >
              🛸 모함 레벨 (Level)
            </button>
            <button
              type="button"
              className={`crew-guide-tab ${activeTab === 'xp' ? 'is-active' : ''}`}
              onClick={() => { soundManager.playClick(); setActiveTab('xp') }}
            >
              ⚡ 미션 경험치 (MISSION XP)
            </button>
          </div>

          <div className="crew-guide-body font-tech">
            {/* Mothership Level Section */}
            {(activeTab === 'all' || activeTab === 'level') && (
              <section className="crew-guide-section">
                <div className="crew-guide-section__head">
                  <div className="crew-guide-icon-badge level-badge">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3>스터디 크루 모함 레벨이란?</h3>
                    <p>크루에 가입한 승무원 수에 따라 승격되는 공동 함선(모함)의 외형과 기능 해금 단계입니다.</p>
                  </div>
                </div>

                <div className="crew-guide-card">
                  <h4>💡 모함 레벨을 올리는 방법</h4>
                  <div className="crew-guide-callout highlight-box">
                    <Users size={18} />
                    <span>크루의 <strong>정식 승무원(멤버) 수</strong> 또는 <strong>누적 MISSION XP</strong> 중 하나라도 달성하면 모함 레벨이 자동으로 승격 및 확장됩니다!</span>
                  </div>
                </div>

                <div className="crew-guide-card">
                  <h4>🛸 모함 레벨별 단계 & 듀얼 승격 기준</h4>
                  <div className="crew-level-list">
                    {CREW_MOTHERSHIP_LEVELS.map((lvl) => (
                      <div key={lvl.level} className="crew-level-item">
                        <div className="crew-level-item__badge">
                          <span>Lv.{lvl.level}</span>
                        </div>
                        <div className="crew-level-item__info">
                          <strong>{lvl.name} <small>({lvl.code})</small></strong>
                          <p>{lvl.description}</p>
                        </div>
                        <div className="crew-level-item__req">
                          <span>승격 조건 (OR)</span>
                          <strong>{lvl.minMembers}명 이상{lvl.minXP > 0 ? ` 또는 ${lvl.minXP} XP` : ''}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crew-guide-card">
                  <h4>🏗️ 모함 레벨 승격 혜택</h4>
                  <p>더 높은 레벨에 달성하면 <strong>공동 건설소</strong>에서 도킹 라이트, 황금 광석 저장고, 통신 안테나, 다크 매터 연구소, 궤도 링, 워프 게이트 등 고급 모함 건설 시설을 해금할 자격이 주어집니다.</p>
                </div>
              </section>
            )}

            {/* MISSION XP Section */}
            {(activeTab === 'all' || activeTab === 'xp') && (
              <section className="crew-guide-section">
                <div className="crew-guide-section__head">
                  <div className="crew-guide-icon-badge xp-badge">
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3>MISSION XP (미션 경험치)란?</h3>
                    <p>크루원들이 함께 스터디 활동과 공동 미션을 완수하며 쌓아 올린 모함의 누적 경험치이자 공동 성취 점수입니다.</p>
                  </div>
                </div>

                <div className="crew-guide-card">
                  <h4>🎯 MISSION XP를 버는 방법</h4>
                  <div className="crew-xp-sources">
                    <div className="crew-xp-source-item">
                      <div className="crew-xp-source-icon"><Trophy size={18} /></div>
                      <div>
                        <strong>팀 미션 완수 <span className="xp-tag">+20 XP</span></strong>
                        <p>크루원들과 함께 주어진 주간/일일 팀 미션을 1회 성공적으로 완료할 때마다 모함 XP를 받습니다.</p>
                      </div>
                    </div>
                    <div className="crew-xp-source-item">
                      <div className="crew-xp-source-icon"><Sparkles size={18} /></div>
                      <div>
                        <strong>크루 광석 상자 완성 <span className="xp-tag">+20 XP</span></strong>
                        <p>크루원들이 모은 광석으로 크루 광석 상자 1개 사이클(100%)을 채워 개봉할 때마다 모함 XP를 얻습니다.</p>
                      </div>
                    </div>
                    <div className="crew-xp-source-item">
                      <div className="crew-xp-source-icon"><Hammer size={18} /></div>
                      <div>
                        <strong>공동 건설소 시설 완성 <span className="xp-tag">+50 XP</span></strong>
                        <p>공동 건설 프로젝트에 광석을 지원하여 모함 건설 시설 1개를 최종 조립 완료할 때마다 대량의 XP를 얻습니다.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="crew-guide-card">
                  <h4>🌟 MISSION XP의 역할 & 랭킹 반영 공식</h4>
                  <p>MISSION XP는 **모함 레벨업 조건**에 사용될 뿐만 아니라, **크루 주간 리더보드 랭킹**에 보너스 점수로 직접 합산됩니다!</p>
                  <div className="crew-guide-callout highlight-box" style={{ borderColor: 'rgba(255, 215, 0, 0.3)', background: 'rgba(255, 215, 0, 0.08)' }}>
                    <Trophy size={18} style={{ color: '#ffd700' }} />
                    <span><strong>크루 주간 랭킹 점수</strong> = (멤버 주간 획득 광석/SEI 합산) + <strong>(획득 MISSION XP × 10)</strong></span>
                  </div>
                </div>
              </section>
            )}
          </div>

          <div className="crew-guide-footer">
            <button
              type="button"
              className="space-btn cosmic-btn font-tech"
              onClick={() => {
                soundManager.playClick()
                onClose()
              }}
            >
              확인하였습니다
            </button>
          </div>
        </Motion.div>
      </Motion.div>
    </AnimatePresence>
  )
}
