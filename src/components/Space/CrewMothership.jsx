import React from 'react'
import ModularShip from './ModularShip'
import {
  getCrewMothershipLevel,
  getCrewMothershipStats,
  getEquippedCrewModules,
} from '../../utils/crewMothershipCatalog'
import './CrewMothership.css'

function MothershipSvg({ crew, compact = false }) {
  const rawId = React.useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const level = getCrewMothershipLevel(crew)
  const modules = new Set(getEquippedCrewModules(crew))
  const color = crew?.color || '#36d9ff'
  const hasLights = modules.has('dock-lights')
  const hasStorage = modules.has('storage-gold')
  const hasComms = modules.has('comms-array')
  const hasResearch = modules.has('research-dark')
  const hasArchive = modules.has('archive-gold')
  const hasRing = modules.has('ring-orbital')
  const hasWarp = modules.has('warp-gate')
  const expanded = level.level >= 2
  const carrier = level.level >= 3
  const station = level.level >= 4

  return (
    <svg viewBox="0 0 1200 600" role="img" aria-label={`${crew?.name || '스터디 크루'} ${level.name}`}>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1feff" />
          <stop offset=".24" stopColor={color} />
          <stop offset=".62" stopColor="#226ba8" />
          <stop offset="1" stopColor="#101b55" />
        </linearGradient>
        <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#243d70" /><stop offset="1" stopColor="#070e2a" />
        </linearGradient>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#fff" /><stop offset=".26" stopColor="#a9ffff" /><stop offset=".66" stopColor={color} /><stop offset="1" stopColor="#1853b8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-purple`}>
          <stop offset="0" stopColor="#fff" /><stop offset=".28" stopColor="#deb8ff" /><stop offset=".7" stopColor="#8b39ff" /><stop offset="1" stopColor="#3d086f" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {station && <g className="crew-mothership__station-frame">
        <path d="M152 250 A475 207 0 0 1 1048 250" fill="none" stroke="#78edff" strokeWidth="13" strokeDasharray="74 24" opacity=".2" />
        <path d="M208 386 A475 207 0 0 0 992 386" fill="none" stroke="#78edff" strokeWidth="7" opacity=".12" />
      </g>}

      {hasRing && <g className="crew-mothership__ring">
        <ellipse cx="600" cy="305" rx="475" ry="207" fill="none" stroke="#78edff" strokeWidth="17" opacity=".2" />
        <ellipse cx="600" cy="305" rx="475" ry="207" fill="none" stroke="#c7ffff" strokeWidth="4" strokeDasharray="42 18" opacity=".76" filter={`url(#${id}-glow)`} />
        {[155, 350, 850, 1045].map((x, i) => <circle key={x} cx={x} cy={i % 2 ? 423 : 187} r="15" fill="#8ffcff" opacity=".8" />)}
      </g>}

      {hasWarp && <g className="crew-mothership__warp" filter={`url(#${id}-glow)`}>
        <ellipse cx="600" cy="305" rx="530" ry="238" fill="none" stroke="#a54bff" strokeWidth="8" strokeDasharray="22 18" opacity=".75" />
        <path d="M72 305 C170 238 170 372 72 305 M1128 305 C1030 238 1030 372 1128 305" fill="none" stroke="#e4b5ff" strokeWidth="14" />
      </g>}

      <g className="crew-mothership__engines" filter={`url(#${id}-glow)`}>
        {[262, 344, 856, 938].slice(0, expanded ? 4 : 2).map((x, i) => (
          <ellipse key={x} cx={expanded ? x : (i ? 856 : 344)} cy="430" rx={carrier ? 35 : 28} ry={carrier ? 92 : 72} fill={hasResearch ? `url(#${id}-purple)` : `url(#${id}-core)`} />
        ))}
      </g>

      {expanded && <g className="crew-mothership__side-bays">
        <path d="M530 246 L258 205 L112 284 L329 326 L522 310 Z" fill={`url(#${id}-dark)`} stroke="#5fe8ff" strokeWidth="7" />
        <path d="M670 246 L942 205 L1088 284 L871 326 L678 310 Z" fill={`url(#${id}-dark)`} stroke="#5fe8ff" strokeWidth="7" />
        <path d="M145 283 L322 239 L461 269" fill="none" stroke="#bafcff" strokeWidth="5" opacity=".55" />
        <path d="M1055 283 L878 239 L739 269" fill="none" stroke="#bafcff" strokeWidth="5" opacity=".55" />
      </g>}

      {carrier && <g className="crew-mothership__hangars">
        <path d="M288 321 L490 314 L446 395 L246 386 Z" fill="#08182f" stroke="#34d6ff" strokeWidth="6" />
        <path d="M912 321 L710 314 L754 395 L954 386 Z" fill="#08182f" stroke="#34d6ff" strokeWidth="6" />
        {[284, 336, 388, 812, 864, 916].map(x => <rect key={x} x={x} y="346" width="28" height="8" rx="4" fill={hasLights ? '#fff58c' : '#61f4ff'} filter={hasLights ? `url(#${id}-glow)` : undefined} />)}
      </g>}

      <g className="crew-mothership__body">
        <path d="M600 92 C520 123 458 205 446 304 C454 390 507 446 600 481 C693 446 746 390 754 304 C742 205 680 123 600 92 Z" fill={`url(#${id}-body)`} stroke="#a5fbff" strokeWidth="9" />
        <path d="M600 107 C572 166 560 261 565 409" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" opacity=".34" />
        <path d="M474 345 Q600 407 726 345" fill="none" stroke="#071635" strokeWidth="14" opacity=".68" />
        <path d="M600 140 C548 171 520 228 526 284 C570 316 630 316 674 284 C680 228 652 171 600 140 Z" fill="#12356c" stroke="#93f6ff" strokeWidth="8" />
        <path d="M566 203 Q600 178 634 203" fill="none" stroke="#eaffff" strokeWidth="8" strokeLinecap="round" opacity=".75" />
        <circle cx="600" cy="337" r="34" fill={`url(#${id}-core)`} filter={`url(#${id}-glow)`} />
      </g>

      {hasComms && <g className="crew-mothership__comms">
        <path d="M600 92 V45" stroke="#a7fbff" strokeWidth="8" />
        <ellipse cx="600" cy="42" rx="69" ry="21" fill="#123966" stroke="#98f8ff" strokeWidth="6" />
        <circle cx="600" cy="42" r="12" fill="#fff" filter={`url(#${id}-glow)`} />
        <path d="M535 36 Q600 -14 665 36" fill="none" stroke="#63edff" strokeWidth="4" strokeDasharray="9 10" />
      </g>}

      {hasStorage && <g className="crew-mothership__storage">
        <path d="M522 405 Q600 450 678 405 L651 472 Q600 505 549 472 Z" fill="#3f2a0a" stroke="#ffd866" strokeWidth="7" />
        {[570, 600, 630].map((x, i) => <polygon key={x} points={`${x},429 ${x + 12},448 ${x},467 ${x - 12},448`} fill={i === 1 ? '#fff4a3' : '#ffc53d'} filter={`url(#${id}-glow)`} />)}
      </g>}

      {hasResearch && <g className="crew-mothership__research" filter={`url(#${id}-glow)`}>
        <circle cx="805" cy="270" r="54" fill="#251052" stroke="#ba7cff" strokeWidth="7" />
        <circle cx="805" cy="270" r="25" fill={`url(#${id}-purple)`} />
        <path d="M758 245 Q805 199 852 245 M758 295 Q805 341 852 295" fill="none" stroke="#d9b7ff" strokeWidth="5" />
      </g>}

      {hasArchive && <g className="crew-mothership__archive">
        <path d="M285 244 L371 220 L409 278 L320 301 Z" fill="#4b3107" stroke="#ffd66e" strokeWidth="6" />
        <path d="M320 250 H371 M329 266 H380" stroke="#fff0a5" strokeWidth="5" />
        <circle cx="303" cy="265" r="9" fill="#fff" filter={`url(#${id}-glow)`} />
      </g>}

      {!compact && <g className="crew-mothership__beacons">
        {[477, 723].map(x => <circle key={x} cx={x} cy="303" r="8" fill={hasLights ? '#fff47f' : '#9dffff'} filter={`url(#${id}-glow)`} />)}
      </g>}
    </svg>
  )
}

export default function CrewMothership({ crew = {}, memberProfiles = [], variant = 'hero' }) {
  const level = getCrewMothershipLevel(crew)
  const stats = getCrewMothershipStats(crew)
  const compact = variant !== 'hero'
  const docked = compact ? [] : memberProfiles.filter(Boolean).slice(0, 3)
  return (
    <div className={`crew-mothership crew-mothership--${variant}`} style={{ '--mothership-accent': crew?.color || '#36d9ff' }}>
      <div className="crew-mothership__space" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      <MothershipSvg crew={crew} compact={compact} />
      {docked.map((profile, index) => (
        <div key={profile.uid || index} className={`crew-mothership__docked crew-mothership__docked--${index + 1}`}>
          <ModularShip userData={profile} size={variant === 'hero' ? 64 : 46} animate={false} />
        </div>
      ))}
      {!compact && <div className="crew-mothership__readout">
        <span>CREW MOTHERSHIP · LV.{level.level}</span>
        <strong>{level.name}</strong>
        <small>MISSION XP {stats.xp.toLocaleString()} · MODULES {getEquippedCrewModules(crew).length}</small>
      </div>}
    </div>
  )
}
