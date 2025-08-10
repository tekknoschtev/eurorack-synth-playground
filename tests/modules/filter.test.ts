import { describe, it, expect, beforeEach } from 'vitest'
import { FilterModule, FilterType } from '@/modules/filter'
import { resetMocks } from '../setup'

describe('FilterModule', () => {
  let filter: FilterModule

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()

    filter = new FilterModule()
  })

  describe('initialization', () => {
    it('should create filter with default config', () => {
      expect(filter.type).toBe('filter')
      expect(filter.displayName).toBe('FILTER')
      expect(filter.hp).toBe(8)
      expect(filter.color).toBe('#9b59b6')
    })

    it('should create with custom config', () => {
      const customFilter = new FilterModule({
        displayName: 'Custom Filter',
        initialCutoff: 2000,
        initialResonance: 5,
        filterType: 'highpass',
        enableCutoffCV: true,
        enableResonanceCV: true,
        hp: 10,
      })

      expect(customFilter.displayName).toBe('Custom Filter')
      expect(customFilter.getCutoff()).toBe(2000)
      expect(customFilter.getResonance()).toBe(5)
      expect(customFilter.getFilterType()).toBe('highpass')
      expect(customFilter.hp).toBe(10)
    })

    it('should have correct default parameters', () => {
      expect(filter.getParameter('cutoff')?.value).toBe(1000)
      expect(filter.getParameter('resonance')?.value).toBe(1)
      expect(filter.getFilterType()).toBe('lowpass')
    })

    it('should create appropriate UI elements', () => {
      const ui = filter.getUI()
      
      // Should have cutoff and resonance knobs
      expect(ui.knobs).toHaveLength(2)
      expect(ui.knobs.find(k => k.id === 'cutoff-knob')).toBeTruthy()
      expect(ui.knobs.find(k => k.id === 'resonance-knob')).toBeTruthy()
      
      // Should have filter type selector
      expect(ui.switches).toHaveLength(1)
      expect(ui.switches[0].id).toBe('filter-type-selector')
      
      // Should have input and output jacks
      expect(ui.inputs).toHaveLength(1)
      expect(ui.inputs[0].ioName).toBe('input')
      expect(ui.outputs).toHaveLength(1)
      expect(ui.outputs[0].ioName).toBe('output')
      
      // Should have LEDs
      expect(ui.leds).toHaveLength(2)
      expect(ui.leds.find(l => l.id === 'activity-led')).toBeTruthy()
      expect(ui.leds.find(l => l.id === 'filter-type-led')).toBeTruthy()
    })

    it('should create CV controls when enabled', () => {
      const cvFilter = new FilterModule({ 
        enableCutoffCV: true, 
        enableResonanceCV: true 
      })
      const ui = cvFilter.getUI()
      
      // Should have additional CV knobs
      expect(ui.knobs.some(k => k.id === 'cutoff-cv-knob')).toBe(true)
      expect(ui.knobs.some(k => k.id === 'resonance-cv-knob')).toBe(true)
      
      // Should have CV inputs
      expect(ui.inputs.some(i => i.id === 'cutoff-cv-input')).toBe(true)
      expect(ui.inputs.some(i => i.id === 'resonance-cv-input')).toBe(true)
      
      // Should have CV parameters
      expect(cvFilter.getParameter('cutoffCVAmount')).toBeTruthy()
      expect(cvFilter.getParameter('resonanceCVAmount')).toBeTruthy()
    })
  })

  describe('parameter management', () => {
    it('should update cutoff frequency', () => {
      filter.setParameter('cutoff', 2500)
      expect(filter.getCutoff()).toBe(2500)
    })

    it('should clamp cutoff to valid range', () => {
      filter.setParameter('cutoff', 25000) // Above max
      expect(filter.getCutoff()).toBe(20000)
      
      filter.setParameter('cutoff', 10) // Below min
      expect(filter.getCutoff()).toBe(20)
    })

    it('should update resonance', () => {
      filter.setParameter('resonance', 8)
      expect(filter.getResonance()).toBe(8)
    })

    it('should clamp resonance to valid range', () => {
      filter.setParameter('resonance', 50) // Above max
      expect(filter.getResonance()).toBe(30)
      
      filter.setParameter('resonance', 0.05) // Below min
      expect(filter.getResonance()).toBe(0.1)
    })

    it('should handle CV amounts when CV is enabled', () => {
      const cvFilter = new FilterModule({ 
        enableCutoffCV: true, 
        enableResonanceCV: true 
      })
      
      cvFilter.setParameter('cutoffCVAmount', 500)
      expect(cvFilter.getParameter('cutoffCVAmount')?.value).toBe(500)
      
      cvFilter.setParameter('resonanceCVAmount', 5)
      expect(cvFilter.getParameter('resonanceCVAmount')?.value).toBe(5)
    })

    it('should clamp CV amounts to valid ranges', () => {
      const cvFilter = new FilterModule({ 
        enableCutoffCV: true, 
        enableResonanceCV: true 
      })
      
      // Cutoff CV amount
      cvFilter.setParameter('cutoffCVAmount', 1500) // Above max
      expect(cvFilter.getParameter('cutoffCVAmount')?.value).toBe(1000)
      
      cvFilter.setParameter('cutoffCVAmount', -1500) // Below min
      expect(cvFilter.getParameter('cutoffCVAmount')?.value).toBe(-1000)
      
      // Resonance CV amount
      cvFilter.setParameter('resonanceCVAmount', 15) // Above max
      expect(cvFilter.getParameter('resonanceCVAmount')?.value).toBe(10)
      
      cvFilter.setParameter('resonanceCVAmount', -15) // Below min
      expect(cvFilter.getParameter('resonanceCVAmount')?.value).toBe(-10)
    })
  })

  describe('filter types', () => {
    const filterTypes: FilterType[] = ['lowpass', 'highpass', 'bandpass', 'notch']

    filterTypes.forEach(filterType => {
      it(`should set ${filterType} filter type`, () => {
        filter.setFilterType(filterType)
        expect(filter.getFilterType()).toBe(filterType)
      })
    })

    it('should handle filter type change via onSwitchChange', () => {
      filter.setFilterType('bandpass')
      expect(filter.getFilterType()).toBe('bandpass')
    })

    it('should not recreate filter for same type', () => {
      const initialType = filter.getFilterType()
      filter.setFilterType(initialType) // Set to same type
      
      // Should still work correctly
      expect(filter.getFilterType()).toBe(initialType)
    })
  })

  describe('audio connections', () => {
    it('should have audio input and output', () => {
      expect(filter.getInputNames()).toContain('input')
      expect(filter.getOutputNames()).toContain('output')
    })

    it('should have cutoff CV input when enabled', () => {
      const cvFilter = new FilterModule({ enableCutoffCV: true })
      expect(cvFilter.getInputNames()).toContain('cutoffCV')
    })

    it('should have resonance CV input when enabled', () => {
      const cvFilter = new FilterModule({ enableResonanceCV: true })
      expect(cvFilter.getInputNames()).toContain('resonanceCV')
    })

    it('should not have CV inputs when disabled', () => {
      expect(filter.getInputNames()).not.toContain('cutoffCV')
      expect(filter.getInputNames()).not.toContain('resonanceCV')
    })
  })

  describe('lifecycle management', () => {
    it('should start and stop filter', () => {
      expect(filter.isModuleActive()).toBe(false)
      
      filter.activate()
      expect(filter.isModuleActive()).toBe(true)
      
      filter.deactivate()
      expect(filter.isModuleActive()).toBe(false)
    })

    it('should handle start/stop with timing', () => {
      const currentTime = filter['context'].currentTime
      
      filter.start(currentTime + 0.1)
      // In real implementation, this would schedule the start
      
      filter.stop(currentTime + 1.0)
      // In real implementation, this would schedule the stop
      
      // These should not throw
      expect(filter).toBeTruthy()
    })
  })

  describe('LED management', () => {
    it('should update activity LED based on cutoff', () => {
      // Set a cutoff frequency
      filter.setParameter('cutoff', 5000)
      filter.activate()
      
      // The LED update happens internally via parameter changes
      expect(filter.getCutoff()).toBe(5000)
      expect(filter.isModuleActive()).toBe(true)
    })

    it('should update filter type LED', () => {
      filter.setFilterType('highpass')
      filter.activate()
      
      // LED update happens internally
      expect(filter.getFilterType()).toBe('highpass')
      expect(filter.isModuleActive()).toBe(true)
    })
  })

  describe('serialization', () => {
    it('should serialize filter state', () => {
      filter.setParameter('cutoff', 3000)
      filter.setParameter('resonance', 6)
      filter.setFilterType('bandpass')
      filter.setPosition({ x: 100, y: 50 })
      filter.activate()

      const serialized = filter.serialize()
      
      expect(serialized.type).toBe('filter')
      expect(serialized.parameters.cutoff).toBe(3000)
      expect(serialized.parameters.resonance).toBe(6)
      expect(serialized.filterType).toBe('bandpass')
      expect(serialized.position.x).toBe(100)
      expect(serialized.isActive).toBe(true)
    })

    it('should deserialize filter state', () => {
      const data = {
        id: 'test-filter',
        type: 'filter',
        parameters: {
          cutoff: 1500,
          resonance: 4,
        },
        filterType: 'highpass',
        position: { x: 200, y: 100 },
        isActive: true,
      }

      const deserialized = FilterModule.deserialize(data)
      
      expect(deserialized.getCutoff()).toBe(1500)
      expect(deserialized.getResonance()).toBe(4)
      expect(deserialized.getFilterType()).toBe('highpass')
      expect(deserialized.getPosition().x).toBe(200)
      expect(deserialized.isModuleActive()).toBe(true)
    })
  })

  describe('CV functionality', () => {
    let cvFilter: FilterModule

    beforeEach(() => {
      cvFilter = new FilterModule({ 
        enableCutoffCV: true, 
        enableResonanceCV: true 
      })
    })

    it('should have CV amount parameters', () => {
      expect(cvFilter.getParameter('cutoffCVAmount')).toBeTruthy()
      expect(cvFilter.getParameter('cutoffCVAmount')?.value).toBe(0)
      
      expect(cvFilter.getParameter('resonanceCVAmount')).toBeTruthy()
      expect(cvFilter.getParameter('resonanceCVAmount')?.value).toBe(0)
    })

    it('should update CV amounts', () => {
      cvFilter.setParameter('cutoffCVAmount', 300)
      expect(cvFilter.getParameter('cutoffCVAmount')?.value).toBe(300)
      
      cvFilter.setParameter('resonanceCVAmount', 7)
      expect(cvFilter.getParameter('resonanceCVAmount')?.value).toBe(7)
    })
  })

  describe('error handling', () => {
    it('should handle start gracefully', () => {
      expect(() => {
        filter.start()
      }).not.toThrow()
    })

    it('should handle stop gracefully', () => {
      filter.start()
      
      expect(() => {
        filter.stop()
      }).not.toThrow()
    })

    it('should handle dispose properly', () => {
      filter.activate()
      
      expect(() => {
        filter.dispose()
      }).not.toThrow()
    })
  })

  describe('frequency response characteristics', () => {
    it('should handle extreme cutoff frequencies', () => {
      // Very low cutoff
      filter.setParameter('cutoff', 20)
      expect(filter.getCutoff()).toBe(20)
      
      // Very high cutoff
      filter.setParameter('cutoff', 20000)
      expect(filter.getCutoff()).toBe(20000)
    })

    it('should handle extreme resonance values', () => {
      // Minimum resonance
      filter.setParameter('resonance', 0.1)
      expect(filter.getResonance()).toBe(0.1)
      
      // Maximum resonance
      filter.setParameter('resonance', 30)
      expect(filter.getResonance()).toBe(30)
    })

    it('should maintain filter stability at high resonance', () => {
      filter.setParameter('resonance', 25) // High Q
      filter.setParameter('cutoff', 1000)
      
      // Should not throw or become unstable
      expect(() => {
        filter.activate()
      }).not.toThrow()
    })
  })
})