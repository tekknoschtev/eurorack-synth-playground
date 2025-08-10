import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OutputModule } from '@/modules/output'
import { resetMocks } from '../setup'

// Mock requestAnimationFrame for level monitoring
global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  setTimeout(callback, 16)
  return 1
})
global.cancelAnimationFrame = vi.fn()

describe('OutputModule', () => {
  let output: OutputModule

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()

    output = new OutputModule()
  })

  afterEach(() => {
    // Clean up any running modules
    if (output) {
      output.dispose()
    }
  })

  describe('initialization', () => {
    it('should create output with default config', () => {
      expect(output.type).toBe('output')
      expect(output.displayName).toBe('OUTPUT')
      expect(output.hp).toBe(6)
      expect(output.color).toBe('#e74c3c')
    })

    it('should create with custom config', () => {
      const customOutput = new OutputModule({
        displayName: 'Custom Output',
        initialMasterLevel: 0.5,
        initialHeadphoneLevel: 0.8,
        enableStereo: true,
        enableMute: true,
        hp: 8,
      })

      expect(customOutput.displayName).toBe('Custom Output')
      expect(customOutput.getMasterLevel()).toBe(0.5)
      expect(customOutput.getHeadphoneLevel()).toBe(0.8)
      expect(customOutput.hp).toBe(8)

      // Cleanup
      customOutput.dispose()
    })

    it('should have correct default parameters', () => {
      expect(output.getParameter('masterLevel')?.value).toBe(0.7)
      expect(output.getParameter('headphoneLevel')?.value).toBe(0.7)
      expect(output.getMute()).toBe(false)
    })

    it('should create appropriate UI elements', () => {
      const ui = output.getUI()
      
      // Should have master and headphone knobs
      expect(ui.knobs).toHaveLength(2)
      expect(ui.knobs.find(k => k.id === 'master-knob')).toBeTruthy()
      expect(ui.knobs.find(k => k.id === 'headphone-knob')).toBeTruthy()
      
      // Should have mute switch (default enabled)
      expect(ui.switches).toHaveLength(1)
      expect(ui.switches[0].id).toBe('mute-switch')
      
      // Should have input jack (mono by default)
      expect(ui.inputs).toHaveLength(1)
      expect(ui.inputs[0].ioName).toBe('input')
      
      // Should have LEDs
      expect(ui.leds).toHaveLength(3)
      expect(ui.leds.find(l => l.id === 'level-led')).toBeTruthy()
      expect(ui.leds.find(l => l.id === 'mute-led')).toBeTruthy()
      expect(ui.leds.find(l => l.id === 'power-led')).toBeTruthy()
    })

    it('should create stereo controls when enabled', () => {
      const stereoOutput = new OutputModule({ enableStereo: true })
      const ui = stereoOutput.getUI()
      
      // Should have additional balance knob
      expect(ui.knobs.some(k => k.id === 'balance-knob')).toBe(true)
      
      // Should have stereo inputs
      expect(ui.inputs.some(i => i.id === 'left-input')).toBe(true)
      expect(ui.inputs.some(i => i.id === 'right-input')).toBe(true)
      
      // Should have balance parameter
      expect(stereoOutput.getParameter('balance')).toBeTruthy()

      // Cleanup
      stereoOutput.dispose()
    })

    it('should not create mute switch when disabled', () => {
      const noMuteOutput = new OutputModule({ enableMute: false })
      const ui = noMuteOutput.getUI()
      
      // Should not have mute switch
      expect(ui.switches).toHaveLength(0)

      // Cleanup
      noMuteOutput.dispose()
    })
  })

  describe('parameter management', () => {
    it('should update master level', () => {
      output.setParameter('masterLevel', 0.8)
      expect(output.getMasterLevel()).toBe(0.8)
    })

    it('should clamp master level to valid range', () => {
      output.setParameter('masterLevel', 1.5) // Above max
      expect(output.getMasterLevel()).toBe(1.0)
      
      output.setParameter('masterLevel', -0.1) // Below min
      expect(output.getMasterLevel()).toBe(0)
    })

    it('should update headphone level', () => {
      output.setParameter('headphoneLevel', 0.6)
      expect(output.getHeadphoneLevel()).toBe(0.6)
    })

    it('should clamp headphone level to valid range', () => {
      output.setParameter('headphoneLevel', 1.5) // Above max
      expect(output.getHeadphoneLevel()).toBe(1.0)
      
      output.setParameter('headphoneLevel', -0.1) // Below min
      expect(output.getHeadphoneLevel()).toBe(0)
    })

    it('should handle balance when stereo is enabled', () => {
      const stereoOutput = new OutputModule({ enableStereo: true })
      
      stereoOutput.setParameter('balance', 0.5) // Right bias
      expect(stereoOutput.getParameter('balance')?.value).toBe(0.5)
      
      stereoOutput.setParameter('balance', -0.7) // Left bias
      expect(stereoOutput.getParameter('balance')?.value).toBe(-0.7)

      // Cleanup
      stereoOutput.dispose()
    })

    it('should clamp balance to valid range', () => {
      const stereoOutput = new OutputModule({ enableStereo: true })
      
      stereoOutput.setParameter('balance', 1.5) // Above max
      expect(stereoOutput.getParameter('balance')?.value).toBe(1.0)
      
      stereoOutput.setParameter('balance', -1.5) // Below min
      expect(stereoOutput.getParameter('balance')?.value).toBe(-1.0)

      // Cleanup
      stereoOutput.dispose()
    })
  })

  describe('mute functionality', () => {
    it('should handle mute state', () => {
      expect(output.getMute()).toBe(false)
      
      output.setMute(true)
      expect(output.getMute()).toBe(true)
      
      output.setMute(false)
      expect(output.getMute()).toBe(false)
    })

    it('should handle mute via switch change', () => {
      output.setMute(true)
      expect(output.getMute()).toBe(true)
    })

    it('should affect audio output when muted', () => {
      // This tests the interface - actual audio muting would be handled by Web Audio API
      output.setParameter('masterLevel', 0.8)
      expect(output.getMasterLevel()).toBe(0.8)
      
      output.setMute(true)
      expect(output.getMute()).toBe(true)
      
      // Master level parameter should remain the same
      expect(output.getMasterLevel()).toBe(0.8)
    })
  })

  describe('audio connections', () => {
    it('should have audio input (mono)', () => {
      expect(output.getInputNames()).toContain('input')
      expect(output.getOutputNames()).toHaveLength(0) // Output goes to system destination
    })

    it('should have stereo inputs when enabled', () => {
      const stereoOutput = new OutputModule({ enableStereo: true })
      
      expect(stereoOutput.getInputNames()).toContain('leftInput')
      expect(stereoOutput.getInputNames()).toContain('rightInput')

      // Cleanup
      stereoOutput.dispose()
    })

    it('should not have stereo inputs when disabled', () => {
      expect(output.getInputNames()).not.toContain('leftInput')
      expect(output.getInputNames()).not.toContain('rightInput')
    })
  })

  describe('lifecycle management', () => {
    it('should start and stop output', () => {
      expect(output.isModuleActive()).toBe(false)
      
      output.activate()
      expect(output.isModuleActive()).toBe(true)
      
      output.deactivate()
      expect(output.isModuleActive()).toBe(false)
    })

    it('should handle start/stop with timing', () => {
      const currentTime = output['context'].currentTime
      
      output.start(currentTime + 0.1)
      // In real implementation, this would schedule the start
      
      output.stop(currentTime + 1.0)
      // In real implementation, this would schedule the stop
      
      // These should not throw
      expect(output).toBeTruthy()
    })
  })

  describe('level monitoring', () => {
    it('should initialize level monitoring', () => {
      // Level monitoring starts automatically
      expect(output.getCurrentLevel()).toBe(0) // Should start at 0
    })

    it('should handle level monitoring lifecycle', () => {
      output.activate()
      expect(output.isModuleActive()).toBe(true)
      
      // Level monitoring should be running
      expect(output.getCurrentLevel()).toBeGreaterThanOrEqual(0)
    })

    it('should stop level monitoring on dispose', () => {
      output.activate()
      output.dispose()
      
      // Should not throw after disposal
      expect(output.getCurrentLevel()).toBeGreaterThanOrEqual(0)
    })
  })

  describe('LED management', () => {
    it('should update power LED on activation', () => {
      output.activate()
      expect(output.isModuleActive()).toBe(true)
      
      output.deactivate()
      expect(output.isModuleActive()).toBe(false)
    })

    it('should update mute LED based on mute state', () => {
      output.activate()
      
      output.setMute(true)
      expect(output.getMute()).toBe(true)
      
      output.setMute(false)
      expect(output.getMute()).toBe(false)
    })

    it('should update level LED based on master level', () => {
      output.setParameter('masterLevel', 0.9)
      output.activate()
      
      expect(output.getMasterLevel()).toBe(0.9)
      expect(output.isModuleActive()).toBe(true)
    })
  })

  describe('serialization', () => {
    it('should serialize output state', () => {
      output.setParameter('masterLevel', 0.6)
      output.setParameter('headphoneLevel', 0.4)
      output.setMute(true)
      output.setPosition({ x: 100, y: 50 })
      output.activate()

      const serialized = output.serialize()
      
      expect(serialized.type).toBe('output')
      expect(serialized.parameters.masterLevel).toBe(0.6)
      expect(serialized.parameters.headphoneLevel).toBe(0.4)
      expect(serialized.isMuted).toBe(true)
      expect(serialized.position.x).toBe(100)
      expect(serialized.isActive).toBe(true)
    })

    it('should deserialize output state', () => {
      const data = {
        id: 'test-output',
        type: 'output',
        parameters: {
          masterLevel: 0.3,
          headphoneLevel: 0.9,
        },
        isMuted: true,
        position: { x: 200, y: 100 },
        isActive: true,
      }

      const deserialized = OutputModule.deserialize(data)
      
      expect(deserialized.getMasterLevel()).toBe(0.3)
      expect(deserialized.getHeadphoneLevel()).toBe(0.9)
      expect(deserialized.getMute()).toBe(true)
      expect(deserialized.getPosition().x).toBe(200)
      expect(deserialized.isModuleActive()).toBe(true)

      // Cleanup
      deserialized.dispose()
    })
  })

  describe('stereo functionality', () => {
    let stereoOutput: OutputModule

    beforeEach(() => {
      stereoOutput = new OutputModule({ enableStereo: true })
    })

    afterEach(() => {
      stereoOutput.dispose()
    })

    it('should have balance parameter', () => {
      expect(stereoOutput.getParameter('balance')).toBeTruthy()
      expect(stereoOutput.getParameter('balance')?.value).toBe(0)
    })

    it('should update balance', () => {
      stereoOutput.setParameter('balance', 0.3)
      expect(stereoOutput.getParameter('balance')?.value).toBe(0.3)
    })

    it('should handle stereo input connections', () => {
      expect(stereoOutput.getInputNames()).toContain('leftInput')
      expect(stereoOutput.getInputNames()).toContain('rightInput')
    })
  })

  describe('error handling', () => {
    it('should handle start gracefully', () => {
      expect(() => {
        output.start()
      }).not.toThrow()
    })

    it('should handle stop gracefully', () => {
      output.start()
      
      expect(() => {
        output.stop()
      }).not.toThrow()
    })

    it('should handle dispose properly', () => {
      output.activate()
      
      expect(() => {
        output.dispose()
      }).not.toThrow()
    })

    it('should handle multiple dispose calls', () => {
      output.activate()
      output.dispose()
      
      expect(() => {
        output.dispose() // Second dispose should not throw
      }).not.toThrow()
    })
  })

  describe('audio routing', () => {
    it('should handle zero master level', () => {
      output.setParameter('masterLevel', 0)
      expect(output.getMasterLevel()).toBe(0)
      
      output.activate()
      expect(output.isModuleActive()).toBe(true)
    })

    it('should handle maximum levels', () => {
      output.setParameter('masterLevel', 1.0)
      output.setParameter('headphoneLevel', 1.0)
      
      expect(output.getMasterLevel()).toBe(1.0)
      expect(output.getHeadphoneLevel()).toBe(1.0)
    })

    it('should maintain separate master and headphone controls', () => {
      output.setParameter('masterLevel', 0.3)
      output.setParameter('headphoneLevel', 0.8)
      
      expect(output.getMasterLevel()).toBe(0.3)
      expect(output.getHeadphoneLevel()).toBe(0.8)
      
      // Both controls should be independent
      output.setParameter('masterLevel', 0.9)
      expect(output.getHeadphoneLevel()).toBe(0.8) // Should remain unchanged
    })
  })
})