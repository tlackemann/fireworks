/**
 * Canvas
 *
 * @format
 */

import * as Random from 'random-js'
import { useCallback, useEffect, useRef } from 'react'

import { Game } from '../lib/game'
import { IGameEvent, GameEventType } from '../lib/ws'
import createLogger from '../lib/log'

/**
 * Logger
 */
const log = createLogger(__filename)

export default () => {
  /**
   * Random Engine
   */
  const randomRef = useRef(Random.MersenneTwister19937.autoSeed())
  /**
   * Canvas
   */
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /**
   * Pixi.js Application
   */
  const appRef = useRef<Game>()

  /**
   * WebSocket Connection
   */
  const wsRef = useRef<WebSocket>()

  /**
   * Load the game engine async instead of through an import
   * PIXI does not like being loaded on the server and this will limit the import to the client
   */
  const initApp = useCallback(async () => {
    if (appRef.current) {
      log.warn('canvas already initialized')
      return
    }

    try {
      const { default: initGame } = await import('../lib/game')
      log.info('initializing canvas')
      if (canvasRef.current) {
        appRef.current = initGame(canvasRef.current)
      }
    } catch (error) {
      log.error('problem initializing canvas: %s', error)
    }

    // only after the app is initialized do we want to connect to websockets
    initWs()

    // Setup a click lsitener
    appRef.current?.app.renderer.view.addEventListener('pointerdown', ({ x, y }) => {
      sendEvent(GameEventType.Firework, {
        color: {
          start: 'ffffff',
          end: ((Random.real(0, 1, true)(randomRef.current) * 0xffffff) << 0).toString(16), // random color
        },
        pos: { x, y },
      })
    })
  }, [])

  /**
   * Send a websocket event
   */
  const sendEvent = useCallback((type: GameEventType, message: any) => {
    wsRef.current?.send(
      JSON.stringify({
        type,
        message,
      }),
    )
  }, [])

  /**
   * Initialize the websocket connection
   */
  const initWs = useCallback(() => {
    if (wsRef.current) {
      log.warn('websocket connection already initialized')
      return
    }

    const wsUrl = `${window.location.origin.replace(/http/, 'ws')}/game`
    log.info('initializing websocket connection to %s', wsUrl)

    wsRef.current = new WebSocket(wsUrl)
    wsRef.current.onopen = () => {
      log.info('websocket connection opened')
    }

    wsRef.current.onclose = reason => {
      log.info('websocket connection closed', reason)
    }

    wsRef.current.onmessage = event => {
      log.info('websocket message received')
      log.debug(event.data)

      try {
        const { type, message } = JSON.parse(event.data) as IGameEvent<any>

        switch (type) {
          case GameEventType.Firework: {
            appRef.current?.drawFirework(message)
            break
          }

          case GameEventType.Watchers: {
            appRef.current?.drawWatchers(message)
            break
          }
        }
      } catch (error) {
        log.error('problem parsing websocket message: %s', error)
      }
    }
  }, [])

  /**
   * Mount/unmount the canvas component
   */
  useEffect(() => {
    log.info('mounting canvas')

    initApp()

    return () => {
      log.info('unmounting canvas')
      appRef.current?.destroy()
      wsRef.current?.close()
    }
  }, [])

  return <canvas ref={canvasRef} />
}
