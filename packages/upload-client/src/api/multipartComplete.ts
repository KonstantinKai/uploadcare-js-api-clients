import { FailedResponse } from '../request/types'
import { Uuid, FileInfo } from './types'
import { CustomUserAgent, camelizeKeys } from '@uploadcare/api-client-utils'

import request from '../request/request.node'
import buildFormData from '../tools/buildFormData'
import getUrl from '../tools/getUrl'
import defaultSettings from '../defaultSettings'
import { getUserAgent } from '../tools/getUserAgent'
import retryIfThrottled from '../tools/retryIfThrottled'
import { UploadClientError } from '../tools/errors'

export type MultipartCompleteOptions = {
  publicKey: string
  baseURL?: string
  signal?: AbortSignal
  source?: string
  integration?: string
  userAgent?: CustomUserAgent
  retryThrottledRequestMaxTimes?: number
}

type Response = FailedResponse | FileInfo

/**
 * Complete multipart uploading.
 */
export default function multipartComplete(
  uuid: Uuid,
  {
    publicKey,
    baseURL = defaultSettings.baseURL,
    source = 'local',
    signal,
    integration,
    userAgent,
    retryThrottledRequestMaxTimes = defaultSettings.retryThrottledRequestMaxTimes
  }: MultipartCompleteOptions
): Promise<FileInfo> {
  return retryIfThrottled(
    () =>
      request({
        method: 'POST',
        url: getUrl(baseURL, '/multipart/complete/', { jsonerrors: 1 }),
        headers: {
          'X-UC-User-Agent': getUserAgent({ publicKey, integration, userAgent })
        },
        data: buildFormData({
          uuid: uuid,
          UPLOADCARE_PUB_KEY: publicKey,
          source: source
        }),
        signal
      }).then(({ data, headers, request }) => {
        const response = camelizeKeys(JSON.parse(data)) as Response

        if ('error' in response) {
          throw new UploadClientError(
            response.error.content,
            response.error.errorCode,
            request,
            response,
            headers
          )
        } else {
          return response
        }
      }),
    retryThrottledRequestMaxTimes
  )
}
