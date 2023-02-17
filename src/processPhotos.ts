//@ts-ignore
import Photos from 'googlephotos'
import fs from 'fs'
import { https } from 'follow-redirects'
import Logger from './logger'

const processPhotos = async (photos: Photos, destination: string, pageSize: number, dryRun: boolean, logger: Logger): Promise<number> => {
  let searchListing
  let nextPageToken
  const filters = new photos.Filters()
  const mediaTypeFilter = new photos.MediaTypeFilter(photos.MediaType.ALL_MEDIA)

  filters.setIncludeArchivedMedia = true
  filters.setMediaTypeFilter(mediaTypeFilter)
  let counter = 0
  do {
    try {
      searchListing = await photos.mediaItems.search(filters, pageSize, nextPageToken)
    } catch (error: any) {
      throw new Error('Token error' + error.message)
    }

    if (searchListing?.mediaItems?.length) {
      counter += searchListing?.mediaItems?.length
    }

    searchListing?.mediaItems?.forEach(async function (item: any) {
      const fileType = item.mimeType.toString().split('/')[0]
      const fileUrl = item.baseUrl + '=' + (fileType === 'image' ? 'd' : 'dv')
      const filePath = destination + '/' + item.filename

      if (!fs.existsSync(filePath)) {
        const file = fs.createWriteStream(filePath)
        https.get(fileUrl, (response) => {
          if (!dryRun) {
            response.pipe(file)
            file.on("finish", () => {
              file.close()
              const fileDate = new Date(item.mediaMetadata.creationTime)
              fs.utimesSync(filePath, fileDate, fileDate)
              logger.log("Download of " + item.filename + " completed")
            })
          } else {
            logger.log("Download of " + item.filename + " completed (not saved - dry run!)")
          }
        })
      } else {
        logger.log(`File ${item.filename} already exists`)
      }
    })
    nextPageToken = searchListing.nextPageToken
  } while (nextPageToken)
  return counter
}

export { processPhotos }