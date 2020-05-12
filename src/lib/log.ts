/**
 * Log Factory
 *
 * @format
 */

import debug from 'debug'

/**
 * Namespace
 */
const NS = 'fireworks'

/**
 * Create a single namespaced logger
 */
function createNSLogger(name: string, level: string) {
  return debug(`${NS}:${name}:${level}`)
}

/**
 * Create a set of loggers for a given file
 *
 * **Example:**
 *
 * ```
 * import createLogger from '@astral/logger'
 *
 * const log = createLogger(__filename)
 * ```
 */
export default function createLogger(pathname: string) {
  const name = pathname
    .replace(`${process.env.ROOT_DIR}`, '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .replace(/\/index$/, '')
    .replace(/^\/?(src)/, '') // we know the server from the client because of where it's logging
    .replace(new RegExp('/', 'g'), ':')
    .replace(/^:/, '') // remove any preceeding ":"

  return {
    debug: createNSLogger(name, 'debug'),
    error: createNSLogger(name, 'error'),
    info: createNSLogger(name, 'info'),
    warn: createNSLogger(name, 'warn'),
  }
}
