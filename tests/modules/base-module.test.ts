import { describe, it, expect, beforeEach } from 'vitest'
import { BaseModule, ModuleConfig, ModulePosition, snapToGrid, calculateModuleWidth, validateModulePosition } from '@/modules/base-module'
import { resetMocks } from '../setup'

// Test implementation of abstract BaseModule
class TestModule extends BaseModule {
  private uiDefined = false

  constructor(config: ModuleConfig) {
    super(config)
    this.defineUI()
  }

  protected initialize(): void {
    const oscillator = this.context.createOscillator()
    this.createOutput('output', oscillator)
    this.createParameter('frequency', 440, 20, 20000, 'Hz')
  }

  protected defineUI(): void {
    this.addKnob({
      id: 'freq-knob',
      parameterName: 'frequency',
      label: 'Frequency',
      x: 10,
      y: 20,
      size: 'medium',
      style: 'knob',
    })

    this.addOutputJack({
      id: 'out-jack',
      ioName: 'output',
      label: 'Out',
      x: 10,
      y: 60,
      type: 'output',
      signalType: 'audio',
    })

    this.addLED({
      id: 'activity-led',
      label: 'Activity',
      x: 30,
      y: 20,
      color: '#7ed321',
      mode: 'activity',
      linkedParameter: 'frequency',
    })

    this.uiDefined = true
  }

  protected onParameterChange(_name: string, _value: number): void {
    // Test implementation
  }

  protected onStart(_when?: number): void {
    // Test implementation
  }

  protected onStop(_when?: number): void {
    // Test implementation
  }

  protected onDispose(): void {
    // Test implementation
  }

  protected onPositionChange(_position: ModulePosition): void {
    // Test implementation
  }

  protected onActivate(): void {
    // Test implementation
  }

  protected onDeactivate(): void {
    // Test implementation
  }

  protected onKnobChange(_knobId: string, _value: number): void {
    // Test implementation
  }

  protected onSwitchChange(_switchId: string, _value: any): void {
    // Test implementation
  }

  protected onLEDStateChange(_ledId: string, _isOn: boolean, _intensity: number): void {
    // Test implementation
  }

  protected updateLEDFromParameter(_ledId: string, _parameterName: string, _value: number): void {
    // Test implementation
  }

  // Expose for testing
  isUIConfigured(): boolean {
    return this.uiDefined
  }
}

describe('BaseModule', () => {
  let module: TestModule

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()

    module = new TestModule({
      type: 'test-oscillator',
      displayName: 'Test Oscillator',
      description: 'A test oscillator module',
      hp: 6,
      color: '#ff6b6b',
    })
  })

  describe('initialization', () => {
    it('should create module with correct properties', () => {
      expect(module.type).toBe('test-oscillator')
      expect(module.displayName).toBe('Test Oscillator')
      expect(module.description).toBe('A test oscillator module')
      expect(module.hp).toBe(6)
      expect(module.color).toBe('#ff6b6b')
    })

    it('should have default position values', () => {
      const position = module.getPosition()
      
      expect(position.x).toBe(0)
      expect(position.y).toBe(0)
      expect(position.width).toBeCloseTo(30.48) // 6 HP * 5.08mm
      expect(position.height).toBe(128.5)
      expect(position.rackRow).toBe('top')
      expect(position.slotPosition).toBe(0)
    })

    it('should register with patch manager', async () => {
      const { getPatchManager } = await import('@/audio/patch-manager')
      const patchManager = getPatchManager()
      
      expect(patchManager.getNode(module.id)).toBe(module)
    })

    it('should define UI components', () => {
      expect(module.isUIConfigured()).toBe(true)
      
      const ui = module.getUI()
      expect(ui.knobs).toHaveLength(1)
      expect(ui.outputs).toHaveLength(1)
      expect(ui.leds).toHaveLength(1)
    })
  })

  describe('position management', () => {
    it('should get current position', () => {
      const position = module.getPosition()
      
      expect(position).toEqual({
        x: 0,
        y: 0,
        width: 30.48,
        height: 128.5,
        rackRow: 'top',
        slotPosition: 0,
      })
    })

    it('should set partial position updates', () => {
      module.setPosition({ x: 100, rackRow: 'bottom' })
      
      const position = module.getPosition()
      expect(position.x).toBe(100)
      expect(position.rackRow).toBe('bottom')
      expect(position.y).toBe(0) // Should remain unchanged
    })

    it('should not modify original position object', () => {
      const originalPosition = module.getPosition()
      originalPosition.x = 999
      
      const currentPosition = module.getPosition()
      expect(currentPosition.x).toBe(0)
    })
  })

  describe('UI management', () => {
    it('should provide UI components', () => {
      const ui = module.getUI()
      
      expect(ui.knobs).toEqual([{
        id: 'freq-knob',
        parameterName: 'frequency',
        label: 'Frequency',
        x: 10,
        y: 20,
        size: 'medium',
        style: 'knob',
      }])

      expect(ui.outputs).toEqual([{
        id: 'out-jack',
        ioName: 'output',
        label: 'Out',
        x: 10,
        y: 60,
        type: 'output',
        signalType: 'audio',
      }])
    })

    it('should not allow modification of UI arrays', () => {
      const ui = module.getUI()
      ui.knobs.push({
        id: 'fake-knob',
        parameterName: 'fake',
        label: 'Fake',
        x: 0,
        y: 0,
        size: 'small',
        style: 'knob',
      })
      
      const uiAgain = module.getUI()
      expect(uiAgain.knobs).toHaveLength(1) // Should still be original
    })

    it('should validate jack types', () => {
      class BadJackModule extends BaseModule {
        constructor() {
          super({
            type: 'bad-jack',
            displayName: 'Bad Jack',
          })
        }

        protected initialize(): void {}
        protected defineUI(): void {
          expect(() => {
            this.addInputJack({
              id: 'bad-jack',
              ioName: 'test',
              label: 'Bad',
              x: 0,
              y: 0,
              type: 'output', // Wrong type for input jack
              signalType: 'audio',
            })
          }).toThrow('addInputJack requires type: "input"')
        }
        
        protected onParameterChange(): void {}
        protected onStart(): void {}
        protected onStop(): void {}
        protected onDispose(): void {}
        protected onPositionChange(): void {}
        protected onActivate(): void {}
        protected onDeactivate(): void {}
        protected onKnobChange(): void {}
        protected onSwitchChange(): void {}
        protected onLEDStateChange(): void {}
        protected updateLEDFromParameter(): void {}
      }

      new BadJackModule()
    })
  })

  describe('lifecycle management', () => {
    it('should activate and deactivate', () => {
      expect(module.isModuleActive()).toBe(false)
      
      module.activate()
      expect(module.isModuleActive()).toBe(true)
      
      module.deactivate()
      expect(module.isModuleActive()).toBe(false)
    })

    it('should not double-activate', () => {
      module.activate()
      module.activate() // Second call should be ignored
      
      expect(module.isModuleActive()).toBe(true)
    })

    it('should not deactivate inactive module', () => {
      module.deactivate() // Should not throw
      expect(module.isModuleActive()).toBe(false)
    })
  })

  describe('LED control', () => {
    it('should control LED state', () => {
      // This tests the interface - actual LED behavior would be implemented by subclasses
      expect(() => {
        module.setLEDState('activity-led', true, 0.8)
      }).not.toThrow()
    })

    it('should handle non-existent LED gracefully', () => {
      expect(() => {
        module.setLEDState('non-existent-led', true)
      }).not.toThrow()
    })
  })

  describe('serialization', () => {
    it('should serialize module state', () => {
      module.setPosition({ x: 50, y: 25 })
      module.setParameter('frequency', 880)
      module.activate()

      const serialized = module.serialize()
      
      expect(serialized).toEqual({
        id: module.id,
        type: 'test-oscillator',
        displayName: 'Test Oscillator',
        position: {
          x: 50,
          y: 25,
          width: 30.48,
          height: 128.5,
          rackRow: 'top',
          slotPosition: 0,
        },
        parameters: {
          frequency: 880,
        },
        isActive: true,
      })
    })
  })

  describe('cleanup', () => {
    it('should dispose properly', async () => {
      const { getPatchManager } = await import('@/audio/patch-manager')
      const patchManager = getPatchManager()
      
      expect(patchManager.getNode(module.id)).toBe(module)
      
      module.dispose()
      
      expect(patchManager.getNode(module.id)).toBeUndefined()
      expect(module.getUI().knobs).toHaveLength(0)
    })
  })
})

describe('utility functions', () => {
  describe('snapToGrid', () => {
    it('should snap values to grid', () => {
      // Let's test the actual behavior
      const result1 = snapToGrid(7.5)
      const result2 = snapToGrid(2.5)
      
      // 7.5 / 5.08 = 1.477, rounds to 1, 1 * 5.08 = 5.08
      expect(result1).toBeCloseTo(5.08)
      
      // 2.5 / 5.08 = 0.492, rounds to 0, 0 * 5.08 = 0  
      expect(result2).toBeCloseTo(0)
      
      expect(snapToGrid(0)).toBe(0)
    })

    it('should use custom grid size', () => {
      expect(snapToGrid(7.5, 10)).toBe(10)
      expect(snapToGrid(4.9, 5)).toBe(5)
    })
  })

  describe('calculateModuleWidth', () => {
    it('should calculate width from HP', () => {
      expect(calculateModuleWidth(4)).toBeCloseTo(20.32)
      expect(calculateModuleWidth(8)).toBeCloseTo(40.64)
      expect(calculateModuleWidth(16)).toBeCloseTo(81.28)
    })
  })

  describe('validateModulePosition', () => {
    it('should validate correct positions', () => {
      const validPosition: ModulePosition = {
        x: 10,
        y: 20,
        width: 40,
        height: 128,
        rackRow: 'top',
        slotPosition: 1,
      }
      
      expect(validateModulePosition(validPosition)).toBe(true)
    })

    it('should reject invalid positions', () => {
      const invalidPositions = [
        { x: -1, y: 0, width: 40, height: 128, rackRow: 'top', slotPosition: 0 },
        { x: 0, y: -1, width: 40, height: 128, rackRow: 'top', slotPosition: 0 },
        { x: 0, y: 0, width: 0, height: 128, rackRow: 'top', slotPosition: 0 },
        { x: 0, y: 0, width: 40, height: 0, rackRow: 'top', slotPosition: 0 },
        { x: 0, y: 0, width: 40, height: 128, rackRow: 'invalid' as any, slotPosition: 0 },
      ]
      
      invalidPositions.forEach(pos => {
        expect(validateModulePosition(pos as ModulePosition)).toBe(false)
      })
    })
  })
})