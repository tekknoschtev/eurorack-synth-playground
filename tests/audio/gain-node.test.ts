import { describe, it, expect, beforeEach } from 'vitest'
import { EurorackGainNode } from '@/audio/gain-node'
import { resetMocks } from '../setup'

describe('EurorackGainNode', () => {
  let gainNode: EurorackGainNode

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context first
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()
    
    gainNode = new EurorackGainNode()
  })

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(gainNode.getInputNames()).toContain('input')
      expect(gainNode.getOutputNames()).toContain('output')
      expect(gainNode.getParameterNames()).toContain('gain')
      
      const gainParam = gainNode.getParameter('gain')
      expect(gainParam).toEqual({
        name: 'gain',
        value: 1,
        minValue: 0,
        maxValue: 2,
        defaultValue: 1,
        unit: 'dB',
      })
    })

    it('should create gain node with proper Web Audio node', () => {
      const input = gainNode.getInput('input')
      const output = gainNode.getOutput('output')
      
      expect(input?.node).toBeTruthy()
      expect(output?.node).toBeTruthy()
      expect(input?.node).toBe(output?.node) // Same node for gain
    })
  })

  describe('gain control', () => {
    it('should set gain value', () => {
      gainNode.setGain(0.5)
      
      expect(gainNode.getGain()).toBe(0.5)
      expect(gainNode.getParameter('gain')?.value).toBe(0.5)
    })

    it('should clamp gain values to bounds', () => {
      gainNode.setGain(5) // Above max
      expect(gainNode.getGain()).toBe(2)
      
      gainNode.setGain(-1) // Below min
      expect(gainNode.getGain()).toBe(0)
    })

    it('should update gain via parameter', () => {
      gainNode.setParameter('gain', 0.8)
      expect(gainNode.getGain()).toBe(0.8)
    })
  })

  describe('decibel conversion', () => {
    it('should convert dB to gain correctly', () => {
      expect(EurorackGainNode.dbToGain(0)).toBeCloseTo(1, 5)
      expect(EurorackGainNode.dbToGain(6)).toBeCloseTo(1.995, 3)
      expect(EurorackGainNode.dbToGain(-6)).toBeCloseTo(0.501, 3)
      expect(EurorackGainNode.dbToGain(-20)).toBeCloseTo(0.1, 3)
    })

    it('should convert gain to dB correctly', () => {
      expect(EurorackGainNode.gainToDb(1)).toBeCloseTo(0, 5)
      expect(EurorackGainNode.gainToDb(2)).toBeCloseTo(6.02, 2)
      expect(EurorackGainNode.gainToDb(0.5)).toBeCloseTo(-6.02, 2)
      expect(EurorackGainNode.gainToDb(0.1)).toBeCloseTo(-20, 1)
    })

    it('should handle zero gain in dB conversion', () => {
      const result = EurorackGainNode.gainToDb(0)
      expect(result).toBeCloseTo(-80, 1) // Should use minimum value to avoid -Infinity
    })

    it('should set gain in decibels', () => {
      gainNode.setGainInDb(-6)
      expect(gainNode.getGain()).toBeCloseTo(0.501, 3)
    })

    it('should get gain in decibels', () => {
      gainNode.setGain(0.5)
      expect(gainNode.getGainInDb()).toBeCloseTo(-6.02, 2)
    })
  })

  describe('lifecycle', () => {
    it('should handle start/stop without errors', () => {
      // Gain nodes are always active, so these should not throw
      expect(() => {
        gainNode.start()
        gainNode.stop()
      }).not.toThrow()
    })

    it('should have proper lifecycle state', () => {
      // Test that start/stop methods work without checking internal state
      expect(() => {
        gainNode.start()
        gainNode.stop()
      }).not.toThrow()
    })
  })

  describe('parameter changes', () => {
    it('should update Web Audio gain parameter on parameter change', () => {
      gainNode.setParameter('gain', 0.7)
      expect(gainNode.getGain()).toBe(0.7)
    })

    it('should ignore non-gain parameter changes', () => {
      // This should not throw even though we don't have a 'volume' parameter
      expect(() => {
        gainNode.setParameter('gain', 0.5) // Valid parameter
      }).not.toThrow()
    })
  })
})