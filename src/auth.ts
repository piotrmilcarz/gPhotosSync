import fs from 'fs'
import { google } from 'googleapis'
import http from 'http'
import url from 'url'
import open from 'open'
import destroyer from 'server-destroy'
import Logger from './logger'

type OAuth2Client = typeof google.prototype.auth.OAuth2.prototype;

class Auth {
  private webServerPort: number = 3000
  private logger: Logger

  constructor(logger: Logger) {
    this.logger = logger
  }

  async getAccessToken(tokenPath: string, clientId: string, clientSecret: string,
    redirectUri: string, scopes: string[]): Promise<string> {
    const client = this.loadRefreshTokenFromFile(tokenPath)
    if (client) {
      const tokens = await client.refreshAccessToken()
      return Promise.resolve(tokens.credentials.access_token as string)
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri + ':' + this.webServerPort + '/oauth2callback'
    )
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes.join(' '),
    })
    const code = await this.authorize(authUrl, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)
    this.saveRefreshToken(tokenPath, clientId, clientSecret, tokens.refresh_token as string)
    return Promise.resolve(tokens.access_token as string)
  }

  authorize(authorizeUrl: string, redirectUri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        try {
          const reqUrl = req.url || ''
          if (reqUrl.indexOf('/oauth2callback') > -1) {
            const qs = (new url.URL(reqUrl, redirectUri + ':' + this.webServerPort)).searchParams
            const code = qs.get('code') || ''
            this.logger.log(`Code is ${code}`)
            res.end('Authentication successful! Please return to the console.')
            server.destroy()
            resolve(code)
          }
        } catch (e) {
          this.logger.log((e as Error).message)
          reject(e)
        }
      }).listen(this.webServerPort, () => {
        console.log("Now your browser will open and you will be asked to grant permission for this application")
        open(authorizeUrl, { wait: false }).then(cp => cp.unref())
      })
      destroyer(server)
    })
  }

  loadRefreshTokenFromFile(tokenPath: string): OAuth2Client | null {
    try {
      const content = fs.readFileSync(tokenPath).toString()
      const credentials = JSON.parse(content)
      const client = google.auth.fromJSON(credentials)
      return client
    } catch {
      return null
    }
  }

  saveRefreshToken(tokenPath: string, clientId: string, clientSecret: string,
    refreshToken: string) {
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    })
    fs.writeFileSync(tokenPath, payload)
  }
}

export default Auth