import fs from 'fs'
import { google } from 'googleapis'
import http from 'http'
import url from 'url'
import open from 'open'
import destroyer from 'server-destroy'
import { log } from './logger'

const webServerPort = 3000

const getAccessToken = async (tokenPath: string, clientId: string, clientSecret: string,
  redirectUri: string, scopes: string[]): Promise<string> => {
  const client = loadRefreshTokenFromFile(tokenPath)
  if (client) {
    const tokens = await client.refreshAccessToken()
    return Promise.resolve(tokens.credentials.access_token as string)
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri + ':' + webServerPort + '/oauth2callback'
  )
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes.join(' '),
  })
  const code = await authorize(authUrl)
  const { tokens } = await oauth2Client.getToken(code)
  console.log(tokens)
  saveRefreshToken(tokenPath, clientId, clientSecret, tokens.refresh_token as string)
  return Promise.resolve(tokens.access_token as string)
}

const authorize = (authorizeUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
      try {
        const reqUrl = req.url || ''
        if (reqUrl.indexOf('/oauth2callback') > -1) {
          const qs = (new url.URL(reqUrl, 'http://localhost:3000')).searchParams
          const code = qs.get('code') || ''
          log(`Code is ${code}`)
          res.end('Authentication successful! Please return to the console.')
          server.destroy()
          resolve(code)
        }
      } catch (e) {
        log((e as Error).message)
        reject(e)
      }
    }).listen(3000, () => {
      console.log("Now your browser will open and you will be asked to grant permission for this application")
      open(authorizeUrl, { wait: false }).then(cp => cp.unref())
    })
    destroyer(server)
  })
}

const loadRefreshTokenFromFile = (tokenPath: string): any => {
  try {
    const content = fs.readFileSync(tokenPath).toString()
    const credentials = JSON.parse(content)
    const client = google.auth.fromJSON(credentials)
    return client
  } catch (_) {
    return null
  }
}

const saveRefreshToken = (tokenPath: string, clientId: string, clientSecret: string,
  refreshToken: string) => {
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  fs.writeFileSync(tokenPath, payload)
}


export { getAccessToken }