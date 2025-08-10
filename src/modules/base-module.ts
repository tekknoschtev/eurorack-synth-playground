import { EurorackAudioNode, AudioNodeConfig } from '@/audio/audio-node'
import { getPatchManager } from '@/audio/patch-manager'

export interface ModulePosition {
  x: number
  y: number
  width: number
  height: number
  rackRow: 'top' | 'bottom'
  slotPosition: number
}

export interface ModuleConfig extends AudioNodeConfig {
  type: string
  displayName: string
  description?: string
  position?: Partial<ModulePosition>
  color?: string
  hp?: number // Horizontal pitch units (eurorack standard)
}

export interface ModuleUI {
  knobs: ModuleKnob[]
  switches: ModuleSwitch[]
  leds: ModuleLED[]
  displays: ModuleDisplay[]
  inputs: ModuleJack[]
  outputs: ModuleJack[]
}

export interface ModuleKnob {
  id: string
  parameterName: string
  label: string
  x: number
  y: number
  size: 'small' | 'medium' | 'large'
  style: 'knob' | 'slider' | 'fader'
  displayValue?: boolean
}

export interface ModuleSwitch {
  id: string
  parameterName: string
  label: string
  x: number
  y: number
  type: 'toggle' | 'momentary' | 'selector'
  options?: string[]
}

export interface ModuleLED {
  id: string
  label?: string
  x: number
  y: number
  color: string
  mode: 'static' | 'activity' | 'level'
  linkedParameter?: string
}

export interface ModuleDisplay {
  id: string
  label?: string
  x: number
  y: number
  width: number
  height: number
  type: 'text' | 'waveform' | 'spectrum' | 'level'
  linkedParameter?: string
}

export interface ModuleJack {
  id: string
  ioName: string
  label: string
  x: number
  y: number
  type: 'input' | 'output'
  signalType: 'audio' | 'cv' | 'gate' | 'trigger'
  color?: string
}

export abstract class BaseModule extends EurorackAudioNode {
  public readonly type: string
  public readonly displayName: string
  public readonly description: string
  public readonly color: string
  public readonly hp: number
  
  protected position: ModulePosition
  protected ui: ModuleUI
  protected isActive = false

  constructor(config: ModuleConfig) {
    super(config)
    this.type = config.type
    this.displayName = config.displayName
    this.description = config.description || ''
    this.color = config.color || '#4a90e2'
    this.hp = config.hp || 8

    // Initialize position with defaults
    this.position = {
      x: 0,
      y: 0,
      width: this.hp * 5.08, // Standard eurorack HP to mm conversion
      height: 128.5, // Standard eurorack 3U height
      rackRow: 'top',
      slotPosition: 0,
      ...config.position,
    }

    // Initialize empty UI
    this.ui = {
      knobs: [],
      switches: [],
      leds: [],
      displays: [],
      inputs: [],
      outputs: [],
    }

    // Register this module with the patch manager
    getPatchManager().registerNode(this)
  }

  // Position management
  getPosition(): ModulePosition {
    return { ...this.position }
  }

  setPosition(position: Partial<ModulePosition>): void {
    this.position = { ...this.position, ...position }
    this.onPositionChange(this.position)
  }

  // UI component management
  getUI(): ModuleUI {
    return {
      knobs: [...this.ui.knobs],
      switches: [...this.ui.switches],
      leds: [...this.ui.leds],
      displays: [...this.ui.displays],
      inputs: [...this.ui.inputs],
      outputs: [...this.ui.outputs],
    }
  }

  protected addKnob(knob: ModuleKnob): void {
    this.ui.knobs.push(knob)
  }

  protected addSwitch(switchConfig: ModuleSwitch): void {
    this.ui.switches.push(switchConfig)
  }

  protected addLED(led: ModuleLED): void {
    this.ui.leds.push(led)
  }

  protected addDisplay(display: ModuleDisplay): void {
    this.ui.displays.push(display)
  }

  protected addInputJack(jack: ModuleJack): void {
    if (jack.type !== 'input') {
      throw new Error('addInputJack requires type: "input"')
    }
    this.ui.inputs.push(jack)
  }

  protected addOutputJack(jack: ModuleJack): void {
    if (jack.type !== 'output') {
      throw new Error('addOutputJack requires type: "output"')
    }
    this.ui.outputs.push(jack)
  }

  // Module lifecycle
  activate(): void {
    if (!this.isActive) {
      this.isActive = true
      this.start()
      this.onActivate()
    }
  }

  deactivate(): void {
    if (this.isActive) {
      this.isActive = false
      this.stop()
      this.onDeactivate()
    }
  }

  isModuleActive(): boolean {
    return this.isActive
  }

  // LED control helpers
  setLEDState(ledId: string, isOn: boolean, intensity?: number): void {
    const led = this.ui.leds.find(l => l.id === ledId)
    if (led) {
      this.onLEDStateChange(ledId, isOn, intensity || 1.0)
    }
  }

  // Parameter change with UI updates
  setParameter(name: string, value: number): void {
    super.setParameter(name, value)
    
    // Update related UI elements
    const knob = this.ui.knobs.find(k => k.parameterName === name)
    if (knob) {
      this.onKnobChange(knob.id, value)
    }

    const led = this.ui.leds.find(l => l.linkedParameter === name)
    if (led) {
      this.updateLEDFromParameter(led.id, name, value)
    }
  }

  // Abstract methods for subclasses
  protected abstract defineUI(): void
  protected abstract onPositionChange(position: ModulePosition): void
  protected abstract onActivate(): void
  protected abstract onDeactivate(): void
  protected abstract onKnobChange(knobId: string, value: number): void
  protected abstract onSwitchChange(switchId: string, value: any): void
  protected abstract onLEDStateChange(ledId: string, isOn: boolean, intensity: number): void
  protected abstract updateLEDFromParameter(ledId: string, parameterName: string, value: number): void

  // Cleanup
  dispose(): void {
    // Unregister from patch manager
    getPatchManager().unregisterNode(this.id)
    
    // Call parent cleanup
    super.dispose()
    
    // Clear UI
    this.ui = {
      knobs: [],
      switches: [],
      leds: [],
      displays: [],
      inputs: [],
      outputs: [],
    }
  }

  // Serialization for saving/loading patches
  serialize(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      displayName: this.displayName,
      position: this.position,
      parameters: Object.fromEntries(
        this.getParameterNames().map(name => {
          const param = this.getParameter(name)
          return [name, param?.value]
        })
      ),
      isActive: this.isActive,
    }
  }

  static deserialize(_data: Record<string, any>): BaseModule {
    throw new Error('deserialize must be implemented by subclasses')
  }
}

// Utility functions for module positioning
export function snapToGrid(value: number, gridSize: number = 5.08): number {
  return Math.round(value / gridSize) * gridSize
}

export function calculateModuleWidth(hp: number): number {
  return hp * 5.08 // Standard eurorack HP to mm conversion
}

export function validateModulePosition(position: ModulePosition): boolean {
  return (
    position.x >= 0 &&
    position.y >= 0 &&
    position.width > 0 &&
    position.height > 0 &&
    (position.rackRow === 'top' || position.rackRow === 'bottom')
  )
}