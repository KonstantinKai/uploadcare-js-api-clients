import { describe, it } from '@jest/globals'
import { executeAddon } from './executeAddon'

import { testSettings } from '../../../test/helpers'
import { AddonName } from '../../types/AddonName'

describe.skip('executeAddon', () => {
  it('should work', async () => {
    const response = await executeAddon(
      {
        addonName: AddonName.UC_CLAMAV_VIRUS_SCAN
      },
      testSettings
    )
    expect(response.requestId).toBeTruthy()
  })

  it('should throw error if non-200 status received', async () => {
    await expect(
      executeAddon(
        {
          addonName: 'invalid' as AddonName
        },
        testSettings
      )
    ).rejects.toThrowError()
  })
})
