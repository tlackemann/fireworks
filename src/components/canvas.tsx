/**
 * Canvas
 *
 * @format
 */

import * as Random from 'random-js'
import { useCallback, useEffect, useRef, useState } from 'react'

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
   * Watchers
   */
  const [watchers, setWatchers] = useState(1)

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

  const reconnectBackoff = useRef(100)

  /**
   * Initialize the websocket connection
   */
  const initWs = useCallback(() => {
    const wsUrl = `${window.location.origin.replace(/http/, 'ws')}/game`
    log.info('initializing websocket connection to %s', wsUrl)

    wsRef.current = new WebSocket(wsUrl)
    wsRef.current.onopen = () => {
      log.info('websocket connection opened')

      reconnectBackoff.current = 100
    }

    wsRef.current.onclose = reason => {
      log.info('websocket connection closed', reason)

      setTimeout(() => {
        log.info('attempting to reconnect')

        initWs()

        reconnectBackoff.current *= 2
      }, reconnectBackoff.current)
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
            setWatchers(message)
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

  return (
    <div className="h-full w-full">
      <div className="fixed p-8 top-0 right-0 flex flex-col select-none text-right">
        <span className="text-white font-bold leading-tight">{watchers} watching</span>
        <span className="italic text-white text-xs leading-tight">
          Click anywhere to create a firework
        </span>
      </div>

      <canvas ref={canvasRef} />

      <div className="fixed p-8 bottom-0 flex flex-col select-none text-left">
        <h1 className="text-2xl text-white font-bold tracking-wide">Fireworks</h1>
        <span className="text-white text-xs leading-tight">
          by <a className="hover:opacity-75 transition-opacity duration-200 ease-out" href="https://lacke.mn/kb/dev/fireworks?ref=fireworks">Thomas Lackemann</a>
        </span>
      </div>
    </div>
  )
}
