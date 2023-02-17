import { google } from 'googleapis'
import Auth from '../src/auth'
import fs from 'fs'
import path from 'path'
import Logger from '../src/logger'

const scopes = [
  'https://www.googleapis.com/auth/photoslibrary.readonly'
]

const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const logger = new Logger()

jest.mock('googleapis', () => {
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => {
          return {
            getToken: jest.fn().mockResolvedValue({
              tokens: {
                refresh_token: 'refreshToken',
                access_token: 'accessToken'
              }
            }),
            generateAuthUrl: jest.fn().mockResolvedValue('http://foobar')
          }
        }),
        fromJSON: jest.fn().mockImplementation(() => {
          return {
            refreshAccessToken: jest.fn().mockResolvedValue({
              credentials: {
                access_token: 'accessToken'
              }
            }),
          }
        })
      }
    }
  }
})

const mockFs = jest.mock('fs', () => {
  return {
    writeFileSync: jest.fn().mockImplementation((_path: string, _payload: string) => null),
    readFileSync: jest.fn()
      .mockImplementationOnce((_path: string) => null)
      .mockImplementationOnce((_path: string) => '{"type":"authorized_user","client_id":"qwerty.apps.googleusercontent.com","client_secret":"abc","refresh_token":"abc"}'),
  }
});

describe('Test authentication process', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('when token.json does not exists', async () => {
    const auth = new Auth(logger)

    const mockauthorize = jest.spyOn(Auth.prototype, 'authorize').mockResolvedValue('code')
    const mocksaveRefreshToken = jest.spyOn(Auth.prototype, 'saveRefreshToken')//.mockImplementation(() => null)
    const accessToken = await auth.getAccessToken(TOKEN_PATH, 'client_id', 'client_secret', 'http://localhost', scopes)

    expect(accessToken).toBe('accessToken')
    expect(mockauthorize).toHaveBeenCalledTimes(1)
    expect(mocksaveRefreshToken).toHaveBeenCalledTimes(1)

    mockauthorize.mockRestore()
    mocksaveRefreshToken.mockRestore()

    fs.unlink(TOKEN_PATH, (err) => {
      if (err) {
        console.log('Something went wrong', err)
      }
    })
  })

  test('when token.json exists', async () => {
    const auth = new Auth(logger)

    jest.spyOn(fs, 'readFileSync').mockReturnValueOnce('{"type":"authorized_user","client_id":"qwerty.apps.googleusercontent.com","client_secret":"abc","refresh_token":"abc"}')

    const mockauthorize = jest.spyOn(Auth.prototype, 'authorize')
    const mocksaveRefreshToken = jest.spyOn(Auth.prototype, 'saveRefreshToken')
    const accessToken = await auth.getAccessToken(TOKEN_PATH, 'client_id', 'client_secret', 'http://localhost', scopes)

    expect(accessToken).toBe('accessToken')
    expect(mockauthorize).toHaveBeenCalledTimes(0)
    expect(mocksaveRefreshToken).toHaveBeenCalledTimes(0)

    mockauthorize.mockRestore()
    mocksaveRefreshToken.mockRestore()
  })
})