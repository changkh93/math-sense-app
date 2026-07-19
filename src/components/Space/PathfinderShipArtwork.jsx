import React from 'react'

export default function PathfinderShipArtwork({ loadout = {}, title }) {
  const rawId = React.useId()
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const hasWings = loadout.wings === 'pathfinder-twin-nova'
  const hasCockpit = loadout.cockpit === 'pathfinder-prism'
  const hasEngine = loadout.engine === 'pathfinder-trinity'
  const hasCore = loadout.core === 'pathfinder-quantum-core'
  const hasHalo = loadout.orbital === 'pathfinder-halo-ring'
  const hasTrail = loadout.trail === 'pathfinder-warp-afterglow'
  const hasDrones = loadout.companion === 'pathfinder-sentinel-drones'

  return (
    <svg viewBox="0 0 640 512" role="img" aria-label={title || 'Grade 03 심우주 개척함'}>
      <defs>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e7fbff" /><stop offset=".17" stopColor="#6885ad" /><stop offset=".46" stopColor="#142d55" /><stop offset=".78" stopColor="#07162f" /><stop offset="1" stopColor="#020817" />
        </linearGradient>
        <linearGradient id={`${id}-armor`} x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#407b9d" /><stop offset=".28" stopColor="#183d67" /><stop offset=".7" stopColor="#081936" /><stop offset="1" stopColor="#020817" />
        </linearGradient>
        <linearGradient id={`${id}-wing`} x1="0" y1="0" x2="1" y2=".8">
          <stop offset="0" stopColor="#8ef9ff" /><stop offset=".08" stopColor="#2aa7c8" /><stop offset=".5" stopColor="#102d57" /><stop offset=".83" stopColor="#07132c" /><stop offset="1" stopColor="#ca8c26" />
        </linearGradient>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dcffff" /><stop offset=".2" stopColor="#589bbd" /><stop offset=".48" stopColor="#182758" /><stop offset=".78" stopColor="#080821" /><stop offset="1" stopColor="#02030d" />
        </linearGradient>
        <linearGradient id={`${id}-halo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#63fff0" /><stop offset=".42" stopColor="#3ed4ff" /><stop offset=".72" stopColor="#7c58ff" /><stop offset="1" stopColor="#e07cff" />
        </linearGradient>
        <radialGradient id={`${id}-core`}><stop offset="0" stopColor="#fff" /><stop offset=".22" stopColor="#baffff" /><stop offset=".55" stopColor="#32efd9" /><stop offset=".8" stopColor="#3977ff" /><stop offset="1" stopColor="#6e3cff" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}-flame`}><stop offset="0" stopColor="#fff" /><stop offset=".22" stopColor="#bffeff" /><stop offset=".52" stopColor="#27ddff" /><stop offset=".78" stopColor="#7544ff" /><stop offset="1" stopColor="#291065" stopOpacity="0" /></radialGradient>
        <filter id={`${id}-glow`} x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="7" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id={`${id}-blur`} x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>

      {hasTrail && <g className="pathfinder-ship__trail">
        <path d="M320 397 C319 438 306 467 281 505" fill="none" stroke="#5cecff" strokeWidth="24" strokeLinecap="round" opacity=".2" filter={`url(#${id}-blur)`} />
        <path d="M320 392 C319 438 306 470 281 505" fill="none" stroke={`url(#${id}-halo)`} strokeWidth="6" strokeLinecap="round" opacity=".86" filter={`url(#${id}-glow)`} />
        <path d="M320 396 C335 438 346 466 358 500" fill="none" stroke="#b077ff" strokeWidth="3" strokeDasharray="5 12" opacity=".7" />
      </g>}

      {hasHalo && <g className="pathfinder-ship__halo pathfinder-ship__halo--back">
        <ellipse cx="320" cy="258" rx="226" ry="202" fill="none" stroke="#17304e" strokeWidth="34" opacity=".96" transform="rotate(-12 320 258)" />
        <ellipse cx="320" cy="258" rx="226" ry="202" fill="none" stroke="#7593a6" strokeWidth="5" opacity=".65" transform="rotate(-12 320 258)" />
        <ellipse cx="320" cy="258" rx="226" ry="202" fill="none" stroke="#45dbe9" strokeWidth="25" opacity=".22" filter={`url(#${id}-blur)`} transform="rotate(-12 320 258)" />
        <ellipse className="pathfinder-ship__halo-energy" cx="320" cy="258" rx="226" ry="202" fill="none" stroke={`url(#${id}-halo)`} strokeWidth="10" strokeDasharray="660 540" strokeLinecap="round" opacity=".88" transform="rotate(-12 320 258)" />
        <ellipse cx="320" cy="258" rx="204" ry="182" fill="none" stroke="#b5ffff" strokeWidth="2" strokeDasharray="6 18" opacity=".48" transform="rotate(17 320 258)" />
      </g>}

      <g className={`pathfinder-ship__engine ${hasEngine ? 'is-trinity' : ''}`} filter={`url(#${id}-glow)`}>
        {hasEngine ? <><ellipse cx="171" cy="393" rx="23" ry="70" fill={`url(#${id}-flame)`} /><ellipse cx="320" cy="411" rx="29" ry="94" fill={`url(#${id}-flame)`} /><ellipse cx="469" cy="393" rx="23" ry="70" fill={`url(#${id}-flame)`} /></> : <ellipse cx="320" cy="411" rx="22" ry="64" fill={`url(#${id}-flame)`} opacity=".62" />}
      </g>

      {hasWings && <g className="pathfinder-ship__wings">
        <path d="M220 177 C156 141 94 121 19 132 L74 184 L25 255 C103 241 164 250 224 284 L270 238 Z" fill={`url(#${id}-wing)`} stroke="#587c9b" strokeWidth="6" />
        <path d="M420 177 C484 141 546 121 621 132 L566 184 L615 255 C537 241 476 250 416 284 L370 238 Z" fill={`url(#${id}-wing)`} stroke="#587c9b" strokeWidth="6" />
        <path d="M216 265 C149 268 92 294 39 346 L110 337 L74 405 C144 367 202 350 260 345 Z" fill="#091b39" stroke="#6f8faa" strokeWidth="6" />
        <path d="M424 265 C491 268 548 294 601 346 L530 337 L566 405 C496 367 438 350 380 345 Z" fill="#091b39" stroke="#6f8faa" strokeWidth="6" />
        {[0, 1, 2, 3].map((cell) => <React.Fragment key={cell}>
          <path d={`M${65 + cell * 39} ${162 + cell * 15} L${91 + cell * 36} ${195 + cell * 13} L${132 + cell * 34} ${209 + cell * 10} L${104 + cell * 38} ${177 + cell * 13} Z`} fill="#31c9d8" opacity={.26 + cell * .08} />
          <path d={`M${575 - cell * 39} ${162 + cell * 15} L${549 - cell * 36} ${195 + cell * 13} L${508 - cell * 34} ${209 + cell * 10} L${536 - cell * 38} ${177 + cell * 13} Z`} fill="#31c9d8" opacity={.26 + cell * .08} />
        </React.Fragment>)}
        <path d="M31 139 C98 145 160 170 221 207 M609 139 C542 145 480 170 419 207" fill="none" stroke="#d8f8ff" strokeWidth="4" opacity=".42" />
        <path d="M51 338 L139 319 L225 310 M589 338 L501 319 L415 310" fill="none" stroke="#d59b38" strokeWidth="5" opacity=".74" />
      </g>}

      <g className="pathfinder-ship__outer-frame">
        <path d="M284 145 L232 126 L182 148 L143 204 L132 286 L151 351 L211 382 L278 338 L294 248 Z" fill={`url(#${id}-armor)`} stroke="#65859d" strokeWidth="7" />
        <path d="M356 145 L408 126 L458 148 L497 204 L508 286 L489 351 L429 382 L362 338 L346 248 Z" fill={`url(#${id}-armor)`} stroke="#65859d" strokeWidth="7" />
        <path d="M281 163 L236 151 L199 169 L170 218 L165 279 L181 326 L221 348 L270 321 L279 247 Z" fill="#10294c" stroke="#2b516e" strokeWidth="4" />
        <path d="M359 163 L404 151 L441 169 L470 218 L475 279 L459 326 L419 348 L370 321 L361 247 Z" fill="#10294c" stroke="#2b516e" strokeWidth="4" />
        <path d="M274 185 L203 190 L173 235 M366 185 L437 190 L467 235" fill="none" stroke="#75e9e9" strokeWidth="5" opacity=".68" />
        <path d="M266 314 L212 342 M374 314 L428 342" stroke="#c99335" strokeWidth="6" opacity=".82" />
        <path d="M235 127 L268 103 L292 129 M405 127 L372 103 L348 129" fill={`url(#${id}-metal)`} stroke="#7996a8" strokeWidth="5" />
        <g className="pathfinder-ship__engine-pods">
          <path d="M132 283 L154 249 L196 257 L210 322 L198 379 L171 398 L144 379 Z" fill={`url(#${id}-metal)`} stroke="#7395a8" strokeWidth="6" />
          <path d="M508 283 L486 249 L444 257 L430 322 L442 379 L469 398 L496 379 Z" fill={`url(#${id}-metal)`} stroke="#7395a8" strokeWidth="6" />
          <ellipse cx="171" cy="370" rx="23" ry="13" fill="#061126" stroke="#65e9ee" strokeWidth="5" />
          <ellipse cx="469" cy="370" rx="23" ry="13" fill="#061126" stroke="#65e9ee" strokeWidth="5" />
          <path d="M148 294 L181 278 L198 309 M492 294 L459 278 L442 309" fill="none" stroke="#d8f5ff" strokeWidth="4" opacity=".38" />
        </g>
        <path d="M210 219 C239 202 267 193 291 192 M430 219 C401 202 373 193 349 192" fill="none" stroke="#8aa5b4" strokeWidth="13" opacity=".5" />
        {[207, 244, 281].map((y) => <React.Fragment key={y}><rect x="184" y={y} width="42" height="8" rx="4" fill="#40e7df" opacity=".42" /><rect x="414" y={y} width="42" height="8" rx="4" fill="#40e7df" opacity=".42" /></React.Fragment>)}
      </g>

      <g className="pathfinder-ship__frame">
        <path d="M320 38 L280 99 L256 193 L264 311 L290 379 L320 408 L350 379 L376 311 L384 193 L360 99 Z" fill={`url(#${id}-metal)`} stroke="#91aebc" strokeWidth="7" />
        <path d="M320 57 L294 116 L281 204 L286 304 L307 366 L320 388" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".35" />
        <path d="M278 205 L240 246 L260 331 L287 317 Z M362 205 L400 246 L380 331 L353 317 Z" fill={`url(#${id}-armor)`} stroke="#52768e" strokeWidth="4" />
        <path d="M280 295 Q320 324 360 295" fill="none" stroke="#030917" strokeWidth="12" opacity=".72" />
        <path d="M292 338 L264 385 L295 371 M348 338 L376 385 L345 371" fill="#07152c" stroke="#73eaff" strokeWidth="4" />
        <path d="M320 51 L301 92 L320 80 L339 92 Z" fill="#e9d18c" stroke="#99814c" strokeWidth="4" filter={`url(#${id}-glow)`} />
        {[134, 176, 218, 260].map((y) => <React.Fragment key={y}><circle cx="273" cy={y} r="3" fill="#6fffee" opacity=".76" /><circle cx="367" cy={y} r="3" fill="#6fffee" opacity=".76" /></React.Fragment>)}
      </g>

      <g className={`pathfinder-ship__cockpit ${hasCockpit ? 'is-prism' : ''}`}>
        <path d="M320 101 C283 125 270 170 274 230 C297 248 343 248 366 230 C370 170 357 125 320 101 Z" fill={hasCockpit ? `url(#${id}-glass)` : '#081a31'} stroke={hasCockpit ? '#a8cbd5' : '#496a7d'} strokeWidth={hasCockpit ? 7 : 5} />
        {hasCockpit && <><path d="M294 137 C285 158 282 180 285 209" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" opacity=".58" /><path d="M320 111 V238 M277 188 H363" fill="none" stroke="#5c7d94" strokeWidth="4" opacity=".66" /><ellipse cx="320" cy="195" rx="22" ry="13" fill="none" stroke="#6cf4ef" strokeWidth="3" strokeDasharray="5 5" opacity=".72" /><circle cx="320" cy="195" r="5" fill="#dbffff" filter={`url(#${id}-glow)`} /></>}
      </g>

      <g className={`pathfinder-ship__core ${hasCore ? 'is-online' : ''}`}>
        <circle cx="320" cy="286" r="43" fill="#07172d" stroke="#7893a3" strokeWidth="8" />
        <circle cx="320" cy="286" r="34" fill="none" stroke="#2c6472" strokeWidth="5" strokeDasharray="18 8" opacity=".75" />
        {hasCore ? <><circle cx="320" cy="286" r="53" fill={`url(#${id}-core)`} opacity=".4" filter={`url(#${id}-glow)`} /><circle cx="320" cy="286" r="23" fill="#caffff" stroke="#51ffe4" strokeWidth="5" filter={`url(#${id}-glow)`} /><path d="M320 254 L330 277 L355 286 L330 295 L320 318 L310 295 L285 286 L310 277 Z" fill="none" stroke="#fff" strokeWidth="3" opacity=".78" /><path d="M293 286 H263 M347 286 H377 M320 259 V238 M320 313 V337" stroke="#65f8eb" strokeWidth="5" opacity=".7" /></> : <><path d="M320 268 L333 286 L320 304 L307 286 Z" fill="#704e8f" stroke="#a987c4" strokeWidth="3" opacity=".62" /><circle cx="320" cy="286" r="5" fill="#d9c6e8" /></>}
      </g>

      {hasHalo && <g className="pathfinder-ship__halo pathfinder-ship__halo--front">
        <path d="M103 318 C134 417 232 472 348 461 C432 453 507 408 548 335" fill="none" stroke="#142b48" strokeWidth="31" strokeLinecap="round" opacity=".98" />
        <path d="M103 318 C134 417 232 472 348 461 C432 453 507 408 548 335" fill="none" stroke="#718c9d" strokeWidth="5" strokeLinecap="round" opacity=".72" />
        <path className="pathfinder-ship__halo-energy" d="M103 318 C134 417 232 472 348 461 C432 453 507 408 548 335" fill="none" stroke={`url(#${id}-halo)`} strokeWidth="10" strokeDasharray="120 18" strokeLinecap="round" opacity=".92" filter={`url(#${id}-glow)`} />
        <circle cx="103" cy="318" r="9" fill="#d7ffff" filter={`url(#${id}-glow)`} /><circle cx="548" cy="335" r="9" fill="#efc7ff" filter={`url(#${id}-glow)`} />
      </g>}

      {hasDrones && <g className="pathfinder-ship__drones">
        {[{ x: 48, side: 1 }, { x: 592, side: -1 }].map(({ x, side }) => <g key={x} transform={`translate(${x} 326)`}><path d={`M0 -24 L${32 * side} 0 L0 24 L${-15 * side} 0 Z`} fill="#07182e" stroke="#668b9f" strokeWidth="5" /><circle cx="0" cy="0" r="10" fill="#d8ffff" stroke="#56eaff" strokeWidth="4" filter={`url(#${id}-glow)`} /><path d={`M${7 * side} 21 L${14 * side} 42`} stroke="#9770ff" strokeWidth="6" strokeLinecap="round" filter={`url(#${id}-glow)`} /></g>)}
      </g>}
    </svg>
  )
}
