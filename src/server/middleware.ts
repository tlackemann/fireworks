/**
 * Middleware
 *
 * @format
 */

import expressSession from 'express-session'
import expressWs from 'express-ws'
import { Express } from 'express'
import { WithWebsocketMethod } from 'express-ws'

import createLogger from '../lib/log'
import { IGameEvent, GameEventType } from '../lib/ws'

const log = createLogger(__filename)

// @FIXME we shouldn't store this in memory but oh well
const listeners: { [id: string]: any[] } = {}

export default function initMiddleware(server: Express & WithWebsocketMethod) {
  server.use(
    expressSession({
      resave: false,
      saveUninitialized: false,
      secret: `${process.env.SESSION_SECRET}`,
    }),
  )

  // initialize websocket server
  const wsInstance = expressWs(server)
  const wss = wsInstance.getWss()

  wss.on('connection', () => {
    const totalClients = wss.clients.size
    log.info('websocket connected (%d connected)', totalClients)

    wss.clients.forEach(client => {
      client.send(JSON.stringify({ type: GameEventType.Watchers, message: totalClients }))
    })
  })

  server.ws('/game', (ws, req) => {
    ws.on('message', (msg: string) => {
      try {
        const { type, message } = JSON.parse(msg) as IGameEvent<any>

        wss.clients.forEach(client => {
          switch (type) {
            // pass the message along as-is
            default: {
              client.send(msg)
              break
            }
          }
        })
      } catch (error) {
        log.error('problem parsing websocket message: %s', error)
      }
    })

    ws.on('close', () => {
      const totalClients = wss.clients.size
      log.info('websocket disconnected (%d connected)', totalClients)

      wss.clients.forEach(client => {
        client.send(JSON.stringify({ type: GameEventType.Watchers, message: totalClients }))
      })
    })
  })
}
