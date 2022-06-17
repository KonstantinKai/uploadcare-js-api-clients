import { FailedResponse } from '../request/types'
import { Metadata, Uuid } from './types'
import { CustomUserAgent } from '../types'

import request from '../request/request.node'
import buildFormData from '../tools/buildFormData'
import getUrl from '../tools/getUrl'
import {
  defaultSettings,
  defaultFilename,
  defaultContentType
} from '../defaultSettings'
import { getUserAgent } from '../tools/userAgent'
import camelizeKeys from '../tools/camelizeKeys'
import retryIfThrottled from '../tools/retryIfThrottled'
import { UploadClientError } from '../tools/errors'
import { getStoreValue } from '../tools/getStoreValue'

export type MultipartStartOptions = {
  publicKey: string
  contentType?: string
  fileName?: string
  baseURL?: string
  secureSignature?: string
  secureExpire?: string
  store?: boolean
  multipartChunkSize?: number
  signal?: AbortSignal
  source?: string
  integration?: string
  userAgent?: CustomUserAgent
  retryThrottledRequestMaxTimes?: number
  metadata?: Metadata
}

export type MultipartPart = string

export type MultipartStartResponse = {
  parts: MultipartPart[]
  uuid: Uuid
}

type Response = MultipartStartResponse | FailedResponse

/**
 * Start multipart uploading.
 */
export default function multipartStart(
  size: number,
  {
    publicKey,
    contentType,
    fileName,
    multipartChunkSize = defaultSettings.multipartChunkSize,
    baseURL = '',
    secureSignature,
    secureExpire,
    store,
    signal,
    source = 'local',
    integration,
    userAgent,
    retryThrottledRequestMaxTimes = defaultSettings.retryThrottledRequestMaxTimes,
    metadata
  }: MultipartStartOptions
): Promise<MultipartStartResponse> {
  return retryIfThrottled(
    () =>
      request({
        method: 'POST',
        url: getUrl(baseURL, '/multipart/start/', { jsonerrors: 1 }),
        headers: {
          'X-UC-User-Agent': getUserAgent({ publicKey, integration, userAgent })
        },
        data: buildFormData({
          filename: fileName ?? defaultFilename,
          size: size,
          content_type: contentType ?? defaultContentType,
          part_size: multipartChunkSize,
          UPLOADCARE_STORE: getStoreValue(store),
          UPLOADCARE_PUB_KEY: publicKey,
          signature: secureSignature,
          expire: secureExpire,
          source: source,
          metadata
        }),
        signal
      }).then(({ data, headers, request }) => {
        const response = camelizeKeys<Response>(JSON.parse(data))

        if ('error' in response) {
          throw new UploadClientError(
            response.error.content,
            response.error.errorCode,
            request,
            response,
            headers
          )
        } else {
          // convert to array
          response.parts = Object.keys(response.parts).map(
            (key) => response.parts[key]
          )

          return response
        }
      }),
    retryThrottledRequestMaxTimes
  )
}
