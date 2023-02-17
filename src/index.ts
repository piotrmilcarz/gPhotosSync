#!/usr/bin/env node

import fs from 'fs'
import figlet from 'figlet'
import { Command, OptionValues } from 'commander'
//@ts-ignore
import Photos from 'googlephotos'
import Auth from './auth'
import path from 'path'
import { processPhotos } from './processPhotos'
import Logger from './logger'

const scopes = [
  'https://www.googleapis.com/auth/photoslibrary.readonly'
]
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const logger = new Logger()

const run = async (options: OptionValues) => {
  if (!!options.credentials) {
    const secrets = JSON.parse(fs.readFileSync(options.credentials).toString())

    try {
      const auth = new Auth(logger)
      const accessToken = await auth.getAccessToken(TOKEN_PATH, secrets.installed.client_id,
        secrets.installed.client_secret, secrets.installed.redirect_uris[0], scopes)
      if (options.authonly) {
        return
      }

      if (!options.destination) {
        console.log('You need to define destination folder')
      } else {
        const photos = new Photos(accessToken)
        const pageSize = parseInt(options.page)
        const processedImages = await processPhotos(photos, options.destination, pageSize, options.dryRun, logger)
        console.log(`Synced ${processedImages} files!`)
      }
    } catch (e) {
      fs.rm('./token.json', function () {
        logger.log((e as Error).message)
        console.log('There is an issue with your token. Please run gPhotosSync again & authorize.')
      })
    }
  } else {
    console.log('You have to specify at least credentials file!')
  }
}

console.log(figlet.textSync("gPhotosSync") + "\n")

const program = new Command()
program
  .version('0.0.1')
  .description('Tool for syncing Google Photos with local folder')
  .option('-c, --credentials <type>', 'Path to json with credentials')
  .option('-d, --destination <type>', 'Destination folder to save photos')
  .option('-a --authonly', 'Auth only - just authenticate in Google and save token for further use', false)
  .option('-r, --dry-run', 'Dry run - just print on screen and not save to folder', false)
  .option('--debug', 'Activate verbose mode.', false)
  .option('-p, --page', 'Page size for API calls', '50')
  .parse(process.argv)

const options = program.opts()

if (!!options.debug) {
  logger.setVerbosity(1)
}

logger.log("Destination folder is " + options.destination)
run(options)
