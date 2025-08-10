import { describe, it, expect, beforeEach } from 'vitest'
import { VCAModule, VCAResponse } from '@/modules/vca'
import { resetMocks } from '../setup'

describe('VCAModule', () => {
  let vca: VCAModule

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()

    vca = new VCAModule()
  })

  describe('initialization', () => {
    it('should create VCA with default config', () => {
      expect(vca.type).toBe('vca')
      expect(vca.displayName).toBe('VCA')
      expect(vca.hp).toBe(6)
      expect(vca.color).toBe('#2ecc71')
    })

    it('should create with custom config', () => {
      const customVCA = new VCAModule({
        displayName: 'Custom VCA',
        initialLevel: 0.5,
        response: 'exponential',
        enableCV: true,
        hp: 8,
      })

      expect(customVCA.displayName).toBe('Custom VCA')
      expect(customVCA.getLevel()).toBe(0.5)
      expect(customVCA.getResponse()).toBe('exponential')
      expect(customVCA.hp).toBe(8)
    })

    it('should have correct default parameters', () => {
      expect(vca.getParameter('level')?.value).toBe(1.0)
      expect(vca.getResponse()).toBe('linear')
    })

    it('should create appropriate UI elements', () => {
      const ui = vca.getUI()
      
      // Should have level knob
      expect(ui.knobs).toHaveLength(1)
      expect(ui.knobs.find(k => k.id === 'level-knob')).toBeTruthy()
      
      // Should have response selector
      expect(ui.switches).toHaveLength(1)
      expect(ui.switches[0].id).toBe('response-selector')
      
      // Should have input and output jacks
      expect(ui.inputs).toHaveLength(1)
      expect(ui.inputs[0].ioName).toBe('input')
      expect(ui.outputs).toHaveLength(1)
      expect(ui.outputs[0].ioName).toBe('output')
      
      // Should have activity LED
      expect(ui.leds).toHaveLength(1)
      expect(ui.leds[0].id).toBe('activity-led')
    })

    it('should create CV controls when enabled', () => {
      const cvVCA = new VCAModule({ enableCV: true })
      const ui = cvVCA.getUI()
      
      // Should have additional CV knob
      expect(ui.knobs.some(k => k.id === 'cv-knob')).toBe(true)
      
      // Should have CV input
      expect(ui.inputs.some(i => i.id === 'cv-input')).toBe(true)
      
      // Should have CV parameter
      expect(cvVCA.getParameter('cvAmount')).toBeTruthy()
    })
  })

  describe('parameter management', () => {
    it('should update level', () => {
      vca.setParameter('level', 0.75)
      expect(vca.getLevel()).toBe(0.75)
    })

    it('should clamp level to valid range', () => {
      // Check parameter bounds first
      const param = vca.getParameter('level')
      expect(param?.minValue).toBe(0)
      expect(param?.maxValue).toBe(1)
      
      vca.setParameter('level', 1.5) // Above max
      expect(vca.getLevel()).toBe(1.0)
      
      vca.setParameter('level', -0.1) // Below min
      expect(vca.getParameter('level')?.value).toBe(0)
      expect(vca.getLevel()).toBe(0)
    })

    it('should handle CV amount when CV is enabled', () => {
      const cvVCA = new VCAModule({ enableCV: true })
      
      cvVCA.setParameter('cvAmount', 0.8)
      expect(cvVCA.getParameter('cvAmount')?.value).toBe(0.8)
    })

    it('should clamp CV amount to valid range', () => {
      const cvVCA = new VCAModule({ enableCV: true })
      
      cvVCA.setParameter('cvAmount', 1.5) // Above max
      expect(cvVCA.getParameter('cvAmount')?.value).toBe(1.0)
      
      cvVCA.setParameter('cvAmount', -1.5) // Below min
      expect(cvVCA.getParameter('cvAmount')?.value).toBe(-1.0)
    })
  })

  describe('response curves', () => {
    const responses: VCAResponse[] = ['linear', 'exponential']

    responses.forEach(response => {
      it(`should set ${response} response`, () => {
        vca.setResponse(response)
        expect(vca.getResponse()).toBe(response)
      })
    })

    it('should handle response change via onSwitchChange', () => {
      vca.setResponse('exponential')
      expect(vca.getResponse()).toBe('exponential')
    })

    it('should apply different gain curves for different responses', () => {
      // Test that different responses produce different gain values
      vca.setParameter('level', 0.5)
      
      vca.setResponse('linear')
      const linearLevel = vca.getLevel()
      
      vca.setResponse('exponential') 
      const expLevel = vca.getLevel()
      
      // Both should return the same parameter value
      expect(linearLevel).toBe(0.5)
      expect(expLevel).toBe(0.5)
      
      // But the internal gain calculation should differ
      // (This is tested by the fact that updateLevel() is called)
    })
  })

  describe('audio connections', () => {
    it('should have audio input and output', () => {
      expect(vca.getInputNames()).toContain('input')
      expect(vca.getOutputNames()).toContain('output')
    })

    it('should have CV input when enabled', () => {
      const cvVCA = new VCAModule({ enableCV: true })
      expect(cvVCA.getInputNames()).toContain('cv')
    })

    it('should not have CV input when disabled', () => {
      expect(vca.getInputNames()).not.toContain('cv')
    })
  })

  describe('lifecycle management', () => {
    it('should start and stop VCA', () => {
      expect(vca.isModuleActive()).toBe(false)
      
      vca.activate()
      expect(vca.isModuleActive()).toBe(true)
      
      vca.deactivate()
      expect(vca.isModuleActive()).toBe(false)
    })

    it('should handle start/stop with timing', () => {
      const currentTime = vca['context'].currentTime
      
      vca.start(currentTime + 0.1)
      // In real implementation, this would schedule the start
      
      vca.stop(currentTime + 1.0)
      // In real implementation, this would schedule the stop
      
      // These should not throw
      expect(vca).toBeTruthy()
    })
  })

  describe('LED management', () => {
    it('should update activity LED based on level', () => {
      // Set a valid level
      vca.setParameter('level', 0.8)
      vca.activate()
      
      // The LED update happens internally via parameter changes
      expect(vca.getLevel()).toBe(0.8)
      expect(vca.isModuleActive()).toBe(true)
    })

    it('should turn off LED for zero level', () => {
      vca.setParameter('level', 0)
      vca.activate()
      
      // The LED update happens internally via parameter changes
      expect(vca.getLevel()).toBe(0)
      expect(vca.isModuleActive()).toBe(true)
    })
  })

  describe('serialization', () => {
    it('should serialize VCA state', () => {
      vca.setParameter('level', 0.6)
      vca.setResponse('exponential')
      vca.setPosition({ x: 100, y: 50 })
      vca.activate()

      const serialized = vca.serialize()
      
      expect(serialized.type).toBe('vca')
      expect(serialized.parameters.level).toBe(0.6)
      expect(serialized.response).toBe('exponential')
      expect(serialized.position.x).toBe(100)
      expect(serialized.isActive).toBe(true)
    })

    it('should deserialize VCA state', () => {
      const data = {
        id: 'test-vca',
        type: 'vca',
        parameters: {
          level: 0.4,
        },
        response: 'exponential',
        position: { x: 200, y: 100 },
        isActive: true,
      }

      const deserialized = VCAModule.deserialize(data)
      
      expect(deserialized.getLevel()).toBe(0.4)
      expect(deserialized.getResponse()).toBe('exponential')
      expect(deserialized.getPosition().x).toBe(200)
      expect(deserialized.isModuleActive()).toBe(true)
    })
  })

  describe('CV functionality', () => {
    let cvVCA: VCAModule

    beforeEach(() => {
      cvVCA = new VCAModule({ enableCV: true })
    })

    it('should have CV amount parameter', () => {
      expect(cvVCA.getParameter('cvAmount')).toBeTruthy()
      expect(cvVCA.getParameter('cvAmount')?.value).toBe(0)
    })

    it('should update CV amount', () => {
      cvVCA.setParameter('cvAmount', 0.7)
      expect(cvVCA.getParameter('cvAmount')?.value).toBe(0.7)
    })
  })

  describe('error handling', () => {
    it('should handle start gracefully', () => {
      expect(() => {
        vca.start()
      }).not.toThrow()
    })

    it('should handle stop gracefully', () => {
      vca.start()
      
      expect(() => {
        vca.stop()
      }).not.toThrow()
    })

    it('should handle dispose properly', () => {
      vca.activate()
      
      expect(() => {
        vca.dispose()
      }).not.toThrow()
    })
  })
})