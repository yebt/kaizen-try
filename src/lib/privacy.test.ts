import { describe, expect, it } from 'vitest'
import { checkPin, makePin } from './privacy'

describe('diary PIN', () => {
  it('stores a salted hash and checks it', async () => {
    const lock = await makePin('2580')
    expect(lock.hash).not.toContain('2580')
    expect(await checkPin('2580', lock)).toBe(true)
    expect(await checkPin('0000', lock)).toBe(false)
    // Same PIN, different salt → different hash.
    expect((await makePin('2580')).hash).not.toBe(lock.hash)
  })
})
