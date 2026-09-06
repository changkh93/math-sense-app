# Astra Frontier: startup and low-spec rendering

## Changes (2026-09-07)

- The initial Lumi briefing is DOM-only: no Canvas, terrain generation or underwater model construction until the user leaves the first full-screen UI. A paint opportunity precedes world loading. Later menus preserve the existing scene instead of remounting it.
- Split the world and object dialog from MetaGalaxy with lazy imports and local Suspense fallbacks. The main MetaGalaxy build chunk decreased from approximately 504 kB to 185 kB uncompressed (150 kB to 59 kB gzip). This shifts world loading until needed, not a claim that the total game download disappears. Existing hashed-asset caching remains.
- Full-screen UI and hidden tabs stop the actual Canvas frame loop. The pause value is passed to Canvas itself: a child-only imperative change was found to be overwritten by Canvas configuration on HUD renders and was replaced. Resuming preserves the scene and restarts rendering.
- Off-range fish are removed from instance draw counts. Previously every school still ran through the vertex pipeline even when scaled to zero. Distant schools now skip simulation and matrix uploads; vertical distance also matters for flights. Reef culling now reacts to altitude and quality changes. Inactive bubbles use a draw count of zero.
- Seabed geometry: 225,280 -> 92,160 triangles, while retaining the shared continuous collision heightfield, shoreline, deep water and exploration bounds. Existing <0.2m sampled triangle-interior error tests pass on normal and expanded islands. Lower quality does not change collision height or shrink the world.
- Ground procedural texture: 512² -> 128² by default; 16 times fewer sampled pixels/terrain evaluations. Grass density is reduced in balanced/low mode. Coral, fish and turtle meshes retain their existing near-view shapes.
- Local graphics presets are available before loading the world in the briefing and during exploration. They persist in this browser, with no server request. Settings synchronize between the briefing and active world controls.

| Preset | Render pixel ratio | Realtime shadows | Ground texture | Marine/reef range |
|---|---:|---|---:|---:|
| 절약 · 저사양 | 0.75 | Off | 96² | 16m / 16m |
| 기본 · 균형 (default) | 1 | Off | 128² | 24m / 22m |
| 고화질 | 1.25 | 512² shadow map | 256² | 32m / 28m |

MSAA is disabled for this Canvas; higher preset resolution is available when desired. Close objects, buildings and the navigable world remain; distant life and ground decoration become less dense in lower presets. This is an explicit visual-quality/performance tradeoff, not an assertion of unchanged rendering quality.

## Measurements

Local Chrome, 1280x720, synthetic guest landing scene, default third-person camera. Counters are GPU submissions from the renderer, not triangles visible to the user or actual billing measurements. Baseline is b37128c with the briefing open (its background previously ran continuously); revised active-mode samples use the same landing view after closing the briefing. Counts can vary with animation/culling.

| Case | Submitted triangles | Render calls | Pixel ratio |
|---|---:|---:|---:|
| Before | 2,271,092 | 444 | 1 |
| Revised balanced | 516,618 | 373 | 1 |
| Revised low | 347,514 | 367 | 0.75 |

Approximate triangle reductions: 77% balanced / 85% low. This does **not** imply matching FPS or electricity/billing savings. There is no valid before/after FPS benchmark across physical low-end machines yet.

The first briefing was verified with zero Canvas elements. A later briefing changed the Canvas loop to `never`; closing it resumed rendering and V-key perspective changes. CPU 4x emulation was also used to verify the initial briefing, choosing low mode and closing it into exploration. It is CPU emulation on the available machine, not a slow-GPU/low-memory PC test. Development boot still produced long tasks (up to about 1.3 seconds in one 4x run); these include the whole development app and QA module loading. No claim of zero startup delay is made.

## Verification and boundaries

- `test:frontier-performance`: real React/StrictMode deferred mounting, cancellation before first mount, preservation on later overlays, graphics persistence and control synchronization, hidden/paused/resume behavior and listener cleanup; geometry budget and true instance-count contract.
- Existing ocean, exploration, cost, pointer-lock, movement, navigation, audio, story, builder and terrain regression tests run for this change. No collision simplification or authorization/time-accounting/reward bypass was introduced.
- The pre-existing story fixture omitted `isNewDiscovery: true`, which the unchanged story policy requires for its first-discovery step. Corrected only the synthetic event; no story or reward rules changed.
- Scoped ESLint and production build checked. Existing unrelated chunk-size/audio metadata warnings and the existing GalaxyWorld3D seed dependency warning remain.
- No new package, paid API, function, recurring job, telemetry upload or subscription. Existing server admission and data-fetch latency is not measured here; this addresses proven client startup/rendering bottlenecks, not unknown Firebase cold starts.
- Real logged-in student inventories with unusually many buildings, actual low-end GPU hardware, long-duration thermal behavior and production network conditions remain to be checked after deployment. No production deployment or student-data mutation was performed.

## User guidance

On a slow PC, select **그래픽 → 절약 · 저사양** in the first briefing before entering the world. The setting is remembered locally. Try 기본 or 고화질 only if the device has headroom. Use the regular browser zoom/fullscreen controls as desired; the game itself caps rendering resolution independently of a high-DPI monitor.
