/**
 * Server
 *
 * @format
 */

import express, { Express } from 'express'
import next from 'next'
import { WithWebsocketMethod } from 'express-ws'

import initMiddleware from './middleware'

import createLogger from '../lib/log'

const port = process.env.PORT !== undefined ? parseInt(process.env.PORT, 10) : 5000
const production = process.env.NODE_ENV === 'production'

const app = next({ dev: !production })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const log = createLogger(__filename)

  const server = express()

  initMiddleware(server as Express & WithWebsocketMethod)

  server.all('*', (req, res) => {
    return handle(req, res)
  })

  server.listen(port, err => {
    if (err) throw err
    log.info(`listening on port %d`, port)
  })
})
