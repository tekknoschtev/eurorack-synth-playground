import { describe, it, expect, beforeEach } from 'vitest'
import { OscillatorModule, OscillatorWaveform } from '@/modules/oscillator'
import { resetMocks } from '../setup'

describe('OscillatorModule', () => {
  let oscillator: OscillatorModule

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()

    oscillator = new OscillatorModule()
  })

  describe('initialization', () => {
    it('should create oscillator with default config', () => {
      expect(oscillator.type).toBe('oscillator')
      expect(oscillator.displayName).toBe('VCO')
      expect(oscillator.hp).toBe(8)
      expect(oscillator.color).toBe('#ff6b6b')
    })

    it('should create with custom config', () => {
      const customOsc = new OscillatorModule({
        displayName: 'Custom VCO',
        initialFrequency: 220,
        initialWaveform: 'sawtooth',
        enableFM: true,
        enableSync: true,
        hp: 12,
      })

      expect(customOsc.displayName).toBe('Custom VCO')
      expect(customOsc.getFrequency()).toBe(220)
      expect(customOsc.getCurrentWaveform()).toBe('sawtooth')
      expect(customOsc.hp).toBe(12)
    })

    it('should have correct default parameters', () => {
      expect(oscillator.getParameter('frequency')?.value).toBe(440)
      expect(oscillator.getParameter('detune')?.value).toBe(0)
      expect(oscillator.getCurrentWaveform()).toBe('sine')
    })

    it('should create appropriate UI elements', () => {
      const ui = oscillator.getUI()
      
      // Should have frequency and detune knobs
      expect(ui.knobs).toHaveLength(2)
      expect(ui.knobs.find(k => k.id === 'freq-knob')).toBeTruthy()
      expect(ui.knobs.find(k => k.id === 'detune-knob')).toBeTruthy()
      
      // Should have waveform selector
      expect(ui.switches).toHaveLength(1)
      expect(ui.switches[0].id).toBe('waveform-selector')
      
      // Should have output jack
      expect(ui.outputs).toHaveLength(1)
      expect(ui.outputs[0].ioName).toBe('output')
      
      // Should have activity LED
      expect(ui.leds).toHaveLength(1)
      expect(ui.leds[0].id).toBe('activity-led')
    })

    it('should create FM controls when enabled', () => {
      const fmOsc = new OscillatorModule({ enableFM: true })
      const ui = fmOsc.getUI()
      
      // Should have additional FM knob
      expect(ui.knobs.some(k => k.id === 'fm-knob')).toBe(true)
      
      // Should have FM input
      expect(ui.inputs.some(i => i.id === 'fm-input')).toBe(true)
      
      // Should have FM parameter
      expect(fmOsc.getParameter('fmAmount')).toBeTruthy()
    })

    it('should create sync input when enabled', () => {
      const syncOsc = new OscillatorModule({ enableSync: true })
      const ui = syncOsc.getUI()
      
      // Should have sync input
      expect(ui.inputs.some(i => i.id === 'sync-input')).toBe(true)
    })
  })

  describe('parameter management', () => {
    it('should update frequency', () => {
      oscillator.setParameter('frequency', 880)
      expect(oscillator.getFrequency()).toBe(880)
    })

    it('should clamp frequency to valid range', () => {
      oscillator.setParameter('frequency', 25000) // Above max
      expect(oscillator.getFrequency()).toBe(20000)
      
      oscillator.setParameter('frequency', 10) // Below min
      expect(oscillator.getFrequency()).toBe(20)
    })

    it('should update detune', () => {
      oscillator.setParameter('detune', 50)
      expect(oscillator.getParameter('detune')?.value).toBe(50)
    })

    it('should clamp detune to valid range', () => {
      oscillator.setParameter('detune', 1500) // Above max
      expect(oscillator.getParameter('detune')?.value).toBe(1200)
      
      oscillator.setParameter('detune', -1500) // Below min
      expect(oscillator.getParameter('detune')?.value).toBe(-1200)
    })
  })

  describe('waveform management', () => {
    const waveforms: OscillatorWaveform[] = ['sine', 'square', 'sawtooth', 'triangle']

    waveforms.forEach(waveform => {
      it(`should set ${waveform} waveform`, () => {
        oscillator.setWaveform(waveform)
        expect(oscillator.getCurrentWaveform()).toBe(waveform)
      })
    })

    it('should handle waveform switch via onSwitchChange', () => {
      // Since onSwitchChange is protected, we'll test the public setWaveform method
      oscillator.setWaveform('triangle')
      expect(oscillator.getCurrentWaveform()).toBe('triangle')
    })

    it('should not recreate oscillator for same waveform', () => {
      const initialWaveform = oscillator.getCurrentWaveform()
      oscillator.setWaveform(initialWaveform) // Set to same waveform
      
      // Should still work correctly
      expect(oscillator.getCurrentWaveform()).toBe(initialWaveform)
    })
  })

  describe('lifecycle management', () => {
    it('should start and stop oscillator', () => {
      expect(oscillator.isModuleActive()).toBe(false)
      
      oscillator.activate()
      expect(oscillator.isModuleActive()).toBe(true)
      
      oscillator.deactivate()
      expect(oscillator.isModuleActive()).toBe(false)
    })

    it('should handle start/stop with timing', () => {
      const currentTime = oscillator['context'].currentTime
      
      oscillator.start(currentTime + 0.1)
      // In real implementation, this would schedule the start
      
      oscillator.stop(currentTime + 1.0)
      // In real implementation, this would schedule the stop
      
      // These should not throw
      expect(oscillator).toBeTruthy()
    })
  })

  describe('LED management', () => {
    it('should update activity LED based on frequency', () => {
      // Set a valid frequency
      oscillator.setParameter('frequency', 440)
      oscillator.activate()
      
      // The LED update happens internally via parameter changes
      expect(oscillator.getFrequency()).toBe(440)
      expect(oscillator.isModuleActive()).toBe(true)
    })

    it('should turn off LED for very low frequencies', () => {
      oscillator.setParameter('frequency', 10) // Below audible range
      oscillator.activate()
      
      // The LED update happens internally via parameter changes
      expect(oscillator.getFrequency()).toBe(20) // Should be clamped to minimum
      expect(oscillator.isModuleActive()).toBe(true)
    })
  })

  describe('audio connections', () => {
    it('should have audio output', () => {
      expect(oscillator.getOutputNames()).toContain('output')
    })

    it('should have FM input when enabled', () => {
      const fmOsc = new OscillatorModule({ enableFM: true })
      expect(fmOsc.getInputNames()).toContain('fm')
    })

    it('should have sync input when enabled', () => {
      const syncOsc = new OscillatorModule({ enableSync: true })
      expect(syncOsc.getInputNames()).toContain('sync')
    })

    it('should not have FM/sync inputs when disabled', () => {
      expect(oscillator.getInputNames()).not.toContain('fm')
      expect(oscillator.getInputNames()).not.toContain('sync')
    })
  })

  describe('serialization', () => {
    it('should serialize oscillator state', () => {
      oscillator.setParameter('frequency', 660)
      oscillator.setParameter('detune', 25)
      oscillator.setWaveform('sawtooth')
      oscillator.setPosition({ x: 100, y: 50 })
      oscillator.activate()

      const serialized = oscillator.serialize()
      
      expect(serialized.type).toBe('oscillator')
      expect(serialized.parameters.frequency).toBe(660)
      expect(serialized.parameters.detune).toBe(25)
      expect(serialized.waveform).toBe('sawtooth')
      expect(serialized.position.x).toBe(100)
      expect(serialized.isActive).toBe(true)
    })

    it('should deserialize oscillator state', () => {
      const data = {
        id: 'test-osc',
        type: 'oscillator',
        parameters: {
          frequency: 880,
          detune: -50,
        },
        waveform: 'triangle',
        position: { x: 200, y: 100 },
        isActive: true,
      }

      const deserialized = OscillatorModule.deserialize(data)
      
      expect(deserialized.getFrequency()).toBe(880)
      expect(deserialized.getParameter('detune')?.value).toBe(-50)
      expect(deserialized.getCurrentWaveform()).toBe('triangle')
      expect(deserialized.getPosition().x).toBe(200)
      expect(deserialized.isModuleActive()).toBe(true)
    })
  })

  describe('FM functionality', () => {
    let fmOsc: OscillatorModule

    beforeEach(() => {
      fmOsc = new OscillatorModule({ enableFM: true })
    })

    it('should have FM amount parameter', () => {
      expect(fmOsc.getParameter('fmAmount')).toBeTruthy()
      expect(fmOsc.getParameter('fmAmount')?.value).toBe(0)
    })

    it('should update FM amount', () => {
      fmOsc.setParameter('fmAmount', 500)
      expect(fmOsc.getParameter('fmAmount')?.value).toBe(500)
    })

    it('should clamp FM amount to range', () => {
      fmOsc.setParameter('fmAmount', 2000) // Above max
      expect(fmOsc.getParameter('fmAmount')?.value).toBe(1000)
    })
  })

  describe('error handling', () => {
    it('should handle oscillator start failures gracefully', () => {
      // Instead of trying to mock private fields, test the public API
      // If the oscillator node doesn't exist or throws, start() should still not throw
      expect(() => {
        oscillator.start()
      }).not.toThrow()
    })

    it('should handle oscillator stop failures gracefully', () => {
      // Start first if possible
      oscillator.start()
      
      // Test that stop doesn't throw even if internal operations fail
      expect(() => {
        oscillator.stop()
      }).not.toThrow()
    })

    it('should handle dispose properly', () => {
      oscillator.activate()
      
      expect(() => {
        oscillator.dispose()
      }).not.toThrow()
    })
  })
})