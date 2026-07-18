import React from 'react'
import { motion as Motion } from 'framer-motion'
import { normalizeShipLoadout } from '../../utils/shipCatalog'
import './ModularShip.css'

function ShipArtwork({ loadout, title }) {
  const rawId = React.useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const hullAurora = loadout.hull === 'hull-aurora'
  const solarWings = loadout.wings === 'wings-solar'
  const prismWings = loadout.wings === 'wings-prism'
  const goldCockpit = loadout.cockpit === 'cockpit-gold'
  const holoCockpit = loadout.cockpit === 'cockpit-holo'
  const plasmaEngine = loadout.engine === 'engine-plasma'
  const darkEngine = loadout.engine === 'engine-dark'
  const cometTrail = loadout.trail === 'trail-comet'
  const equationTrail = loadout.trail === 'trail-equation'
  const drone = loadout.companion === 'companion-drone'
  const orb = loadout.companion === 'companion-orb'

  return (
    <svg viewBox="0 0 512 512" role="img" aria-label={title || '나의 조립식 탐사선'}>
      <defs>
        <linearGradient id={`${id}-hull`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={hullAurora ? '#f4fbff' : '#dffbff'} />
          <stop offset="0.34" stopColor={hullAurora ? '#8ff5e5' : '#63d7ec'} />
          <stop offset="0.7" stopColor={hullAurora ? '#8368ff' : '#19779d'} />
          <stop offset="1" stopColor={hullAurora ? '#312a78' : '#102f55'} />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={solarWings ? '#fff2a1' : prismWings ? '#c5fff4' : '#83f4ff'} />
          <stop offset="0.52" stopColor={solarWings ? '#f6a91a' : prismWings ? '#6f70ff' : '#2999d4'} />
          <stop offset="1" stopColor={prismWings ? '#c338ff' : '#17375e'} />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={goldCockpit ? '#fff8c2' : holoCockpit ? '#e8ddff' : '#d8ffff'} />
          <stop offset="0.35" stopColor={goldCockpit ? '#ffc338' : holoCockpit ? '#a36cff' : '#36d8ff'} />
          <stop offset="1" stopColor={goldCockpit ? '#8a4b08' : holoCockpit ? '#173d88' : '#08264e'} />
        </linearGradient>
        <radialGradient id={`${id}-engine`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.28" stopColor={darkEngine ? '#d6a5ff' : plasmaEngine ? '#ffe8a8' : '#9cffff'} />
          <stop offset="0.7" stopColor={darkEngine ? '#8b33ff' : plasmaEngine ? '#ff7a18' : '#1aa7ff'} />
          <stop offset="1" stopColor={darkEngine ? '#260052' : plasmaEngine ? '#ff2f4e' : '#042b89'} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`${id}-soft`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>

      <g className="modular-ship__trail">
        {cometTrail && <>
          <path d="M256 356 C252 414 219 457 185 494" fill="none" stroke="#82f6ff" strokeWidth="11" strokeLinecap="round" opacity=".26" filter={`url(#${id}-soft)`} />
          <path d="M256 352 C252 414 219 457 185 494" fill="none" stroke="#e9ffff" strokeWidth="3" strokeLinecap="round" opacity=".82" />
          {[390, 420, 451, 477].map((cy, i) => <circle key={cy} cx={246 - i * 16} cy={cy} r={3 + (i % 2)} fill="#fff" opacity={0.9 - i * 0.13} />)}
        </>}
        {equationTrail && <>
          <path d="M256 354 C250 402 282 445 246 502" fill="none" stroke="#38f5ff" strokeWidth="3" strokeDasharray="8 12" opacity=".7" filter={`url(#${id}-glow)`} />
          <text x="286" y="402" fill="#92ffff" fontSize="24" fontWeight="800" opacity=".84">π</text>
          <text x="220" y="442" fill="#c6abff" fontSize="23" fontWeight="800" opacity=".8">∑</text>
          <text x="272" y="486" fill="#7fffe7" fontSize="18" fontWeight="800" opacity=".7">x²</text>
        </>}
      </g>

      <g className={`modular-ship__engine ${darkEngine ? 'is-warp' : ''}`} filter={`url(#${id}-glow)`}>
        {(plasmaEngine || darkEngine) ? <>
          <ellipse cx="227" cy="377" rx={darkEngine ? 23 : 18} ry={darkEngine ? 62 : 48} fill={`url(#${id}-engine)`} />
          <ellipse cx="285" cy="377" rx={darkEngine ? 23 : 18} ry={darkEngine ? 62 : 48} fill={`url(#${id}-engine)`} />
        </> : <ellipse cx="256" cy="379" rx="23" ry="64" fill={`url(#${id}-engine)`} />}
      </g>

      <g className="modular-ship__wings">
        {prismWings ? <>
          <path d="M221 244 L72 352 L202 330 L232 282 Z" fill={`url(#${id}-wing)`} stroke="#b7fff4" strokeWidth="4" />
          <path d="M291 244 L440 352 L310 330 L280 282 Z" fill={`url(#${id}-wing)`} stroke="#e1bbff" strokeWidth="4" />
          <path d="M95 342 L190 278" stroke="#eaffff" strokeWidth="4" opacity=".55" />
          <path d="M417 342 L322 278" stroke="#fff" strokeWidth="4" opacity=".4" />
        </> : solarWings ? <>
          <path d="M220 255 L92 292 L58 362 L207 324 Z" fill={`url(#${id}-wing)`} stroke="#ffd869" strokeWidth="4" />
          <path d="M292 255 L420 292 L454 362 L305 324 Z" fill={`url(#${id}-wing)`} stroke="#ffd869" strokeWidth="4" />
          {[0, 1, 2].map((i) => <React.Fragment key={i}>
            <path d={`M${91 + i * 36} ${294 + i * 8} L${69 + i * 40} ${350 - i * 8}`} stroke="#533918" strokeWidth="3" opacity=".7" />
            <path d={`M${421 - i * 36} ${294 + i * 8} L${443 - i * 40} ${350 - i * 8}`} stroke="#533918" strokeWidth="3" opacity=".7" />
          </React.Fragment>)}
        </> : <>
          <path d="M222 267 L139 340 L211 322 L239 290 Z" fill={`url(#${id}-wing)`} stroke="#7deeff" strokeWidth="4" />
          <path d="M290 267 L373 340 L301 322 L273 290 Z" fill={`url(#${id}-wing)`} stroke="#7deeff" strokeWidth="4" />
        </>}
      </g>

      <g className="modular-ship__body">
        <path d="M256 66 C215 107 194 184 198 267 C202 323 222 352 256 376 C290 352 310 323 314 267 C318 184 297 107 256 66 Z" fill={`url(#${id}-hull)`} stroke={hullAurora ? '#bfffe8' : '#9bf6ff'} strokeWidth="6" />
        <path d="M256 82 C236 119 228 178 230 284 C232 322 240 345 256 360" fill="none" stroke="#ffffff" strokeWidth="7" strokeLinecap="round" opacity=".38" />
        <path d="M214 298 Q256 327 298 298" fill="none" stroke="#071d38" strokeWidth="7" opacity=".5" />
        <path d="M233 348 L224 382 L244 372" fill="#102b4e" stroke="#6deaff" strokeWidth="3" />
        <path d="M279 348 L288 382 L268 372" fill="#102b4e" stroke="#6deaff" strokeWidth="3" />
        {hullAurora && <>
          <path d="M206 247 C242 222 282 224 306 247" fill="none" stroke="#e7d4ff" strokeWidth="5" opacity=".78" />
          <circle cx="256" cy="316" r="13" fill="#8b5cff" stroke="#ddcaff" strokeWidth="4" filter={`url(#${id}-glow)`} />
        </>}
      </g>

      <g className={`modular-ship__cockpit ${holoCockpit ? 'is-holo' : ''}`}>
        <path d="M256 123 C229 146 218 188 221 232 C239 245 273 245 291 232 C294 188 283 146 256 123 Z" fill={`url(#${id}-glass)`} stroke={goldCockpit ? '#ffe27c' : holoCockpit ? '#d9bbff' : '#a5f7ff'} strokeWidth="5" />
        <path d="M246 143 C233 164 229 185 230 208" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".6" />
        {holoCockpit && <>
          <path d="M234 194 H279 M237 209 H274" stroke="#aefcff" strokeWidth="2" opacity=".72" />
          <circle cx="265" cy="177" r="12" fill="none" stroke="#f0c4ff" strokeWidth="2" strokeDasharray="4 4" />
        </>}
      </g>

      <g className="modular-ship__nose">
        <path d="M256 58 L238 91 L256 82 L274 91 Z" fill={darkEngine ? '#b277ff' : '#eaffff'} stroke={darkEngine ? '#e8c7ff' : '#89eeff'} strokeWidth="4" filter={`url(#${id}-glow)`} />
      </g>

      {(drone || orb) && <g className="modular-ship__companion">
        {drone ? <>
          <circle cx="378" cy="209" r="31" fill="#07182e" stroke="#75f8ff" strokeWidth="5" />
          <circle cx="378" cy="209" r="10" fill="#baffff" filter={`url(#${id}-glow)`} />
          <path d="M347 201 L326 187 M409 201 L430 187 M350 224 L332 238 M406 224 L424 238" stroke="#8bdfff" strokeWidth="7" strokeLinecap="round" />
        </> : <>
          <circle cx="382" cy="200" r="30" fill="#8b5cff" opacity=".28" filter={`url(#${id}-soft)`} />
          <circle cx="382" cy="200" r="22" fill="#aefce8" stroke="#f1ffff" strokeWidth="4" filter={`url(#${id}-glow)`} />
          <circle cx="375" cy="195" r="4" fill="#173c68" /><circle cx="390" cy="195" r="4" fill="#173c68" />
          <path d="M375 207 Q382 213 390 207" fill="none" stroke="#173c68" strokeWidth="3" strokeLinecap="round" />
        </>}
      </g>}
    </svg>
  )
}

export default function ModularShip({ userData, loadout: loadoutProp, size = 160, title, className = '', animate = true }) {
  const loadout = loadoutProp || normalizeShipLoadout(userData)
  return (
    <Motion.div
      className={`modular-ship ${className}`}
      style={{ width: size, height: size }}
      initial={animate ? { opacity: 0, scale: 0.92 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 18 }}
    >
      <ShipArtwork loadout={loadout} title={title} />
    </Motion.div>
  )
}
