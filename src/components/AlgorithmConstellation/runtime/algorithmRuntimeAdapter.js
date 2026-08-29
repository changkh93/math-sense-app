/**
 * Browser runtime adapter entrypoint.
 * Keep the Worker import static so Vite fails the build if it cannot be bundled.
 */

import AlgorithmWorldWorker from './algorithmWorld.worker.js?worker'
import {
  RUNTIME_STATES,
  createAlgorithmRuntimeAdapterCore,
} from './algorithmRuntimeAdapterCore.js'

export { RUNTIME_STATES }

export function createAlgorithmRuntimeAdapter({
  limits = {},
  workerFactory = () => new AlgorithmWorldWorker(),
} = {}) {
  return createAlgorithmRuntimeAdapterCore({ limits, workerFactory })
}
