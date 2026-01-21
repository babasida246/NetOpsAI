import { describe, it, expect } from 'vitest'
import { seed } from './seed-assets'

describe('seed-assets script', () => {
    it('exports seed function', () => {
        expect(typeof seed).toBe('function')
    })
})
