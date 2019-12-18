import fileFrom, { FileFromOptions } from '../fileFrom/fileFrom'
import defaultSettings from '../defaultSettings'
import group from '../api/group'
import { UploadcareGroup } from '../UploadcareGroup'
import { UploadcareFile } from '../UploadcareFile'

/* Types */
import { isFileDataArray, isUrlArray, isUuidArray } from './types'
import { FileData, Url, Uuid } from '../api/types'

export type GroupFromOptions = {
  defaultEffects?: string
  jsonpCallback?: string
}

/**
 * Uploads file from provided data.
 * @param data
 * @param options
 * @param [options.publicKey]
 * @param [options.fileName]
 * @param [options.baseURL]
 * @param [options.secureSignature]
 * @param [options.secureExpire]
 * @param [options.store]
 * @param [options.cancel]
 * @param [options.onProgress]
 * @param [options.source]
 * @param [options.integration]
 * @param [options.retryThrottledRequestMaxTimes]
 * @param [options.contentType]
 * @param [options.multipartChunkSize]
 * @param [options.baseCDN]
 */
export default function groupFrom(
  data: FileData[] | Url[] | Uuid[],
  {
    publicKey,

    fileName = defaultSettings.fileName,
    baseURL = defaultSettings.baseURL,
    secureSignature,
    secureExpire,
    store,

    cancel,
    onProgress,

    source,
    integration,

    retryThrottledRequestMaxTimes,

    contentType = defaultSettings.contentType,
    multipartChunkSize = defaultSettings.multipartChunkSize,

    baseCDN = defaultSettings.baseCDN,

    jsonpCallback,
    defaultEffects
  }: FileFromOptions & GroupFromOptions
): Promise<UploadcareGroup> {
  if (!isFileDataArray(data) && !isUrlArray(data) && !isUuidArray(data)) {
    throw new TypeError(`Group uploading from "${data}" is not supported`)
  }

  let progressValues: number[]
  const filesCount = data.length
  const createProgressHandler = (
    size: number,
    index: number
  ): (({ value: number }) => void) | undefined => {
    if (!onProgress) return
    if (!progressValues) {
      progressValues = Array(size).fill(0)
    }

    const normalize = (values: number[]): number =>
      values.reduce((sum, next) => sum + next) / size

    return ({ value }: { value: number }): void => {
      progressValues[index] = value
      onProgress({ value: normalize(progressValues) })
    }
  }

  return Promise.all(
    (data as FileData[]).map((file, index) =>
      fileFrom(file, {
        publicKey,

        fileName,
        baseURL,
        secureSignature,
        secureExpire,
        store,

        cancel,
        onProgress: createProgressHandler(filesCount, index),

        source,
        integration,

        retryThrottledRequestMaxTimes,

        contentType,
        multipartChunkSize,

        baseCDN
      })
    )
  ).then(files => {
    const uuids = files.map(file => file.uuid)
    const addDefaultEffects = (file): UploadcareFile => {
      const cdnUrlModifiers = defaultEffects ? `-/${defaultEffects}` : null
      const cdnUrl = `${file.urlBase}${cdnUrlModifiers || ''}`

      return {
        ...file,
        cdnUrlModifiers,
        cdnUrl
      }
    }

    const filesInGroup = defaultEffects ? files.map(addDefaultEffects) : files

    return group(uuids, {
      publicKey,
      baseURL,
      jsonpCallback,
      secureSignature,
      secureExpire,
      cancel,
      source,
      integration,
      retryThrottledRequestMaxTimes
    }).then(groupInfo => new UploadcareGroup(groupInfo, filesInGroup))
  })
}
