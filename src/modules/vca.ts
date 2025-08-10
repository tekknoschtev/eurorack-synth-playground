import { BaseModule, ModuleConfig, ModulePosition } from './base-module'

export type VCAResponse = 'linear' | 'exponential'

export interface VCAConfig extends Partial<ModuleConfig> {
  initialLevel?: number // Initial gain level (0-1)
  response?: VCAResponse // Linear or exponential response
  enableCV?: boolean // Enable CV input
}

export class VCAModule extends BaseModule {
  private gainNode!: GainNode
  private cvGainNode?: GainNode
  private currentLevel = 1.0
  private response: VCAResponse = 'linear'
  
  private config: VCAConfig

  constructor(config: VCAConfig = {}) {
    const moduleConfig: ModuleConfig = {
      type: config.type || 'vca',
      displayName: config.displayName || 'VCA',
      description: config.description || 'Voltage Controlled Amplifier',
      hp: config.hp || 6,
      color: config.color || '#2ecc71',
      id: config.id,
      name: config.name,
      position: config.position,
    }
    
    super(moduleConfig)
    this.config = config
    this.defineUI()
    
    // Apply config after initialization is complete
    this.applyConfig()
  }

  protected initialize(): void {
    // Create the main gain node
    this.gainNode = this.context.createGain()
    this.gainNode.gain.value = 1.0 // Default to unity gain

    // Create main input and output
    this.createInput('input', this.gainNode)
    this.createOutput('output', this.gainNode)

    // Create level parameter
    this.createParameter('level', 1.0, 0, 1, 'gain')
  }
  
  private applyConfig(): void {
    // Set initial level if provided
    if (this.config?.initialLevel !== undefined) {
      this.setParameter('level', this.config.initialLevel)
    }
    
    // Set response type if provided
    if (this.config?.response) {
      this.response = this.config.response
    }
    
    // Add CV controls if enabled
    if (this.config?.enableCV) {
      this.cvGainNode = this.context.createGain()
      this.cvGainNode.gain.value = 0 // No CV by default
      
      // Connect CV gain to main gain
      if (this.gainNode?.gain) {
        this.cvGainNode.connect(this.gainNode.gain)
      }
      
      this.createInput('cv', this.cvGainNode)
      this.createParameter('cvAmount', 0, -1, 1, 'gain')
    }
  }

  protected defineUI(): void {
    // Level knob
    this.addKnob({
      id: 'level-knob',
      parameterName: 'level',
      label: 'LEVEL',
      x: 15,
      y: 25,
      size: 'large',
      style: 'knob',
      displayValue: true,
    })

    // CV amount knob (if CV is enabled)
    if (this.config?.enableCV) {
      this.addKnob({
        id: 'cv-knob',
        parameterName: 'cvAmount',
        label: 'CV AMT',
        x: 15,
        y: 55,
        size: 'small',
        style: 'knob',
      })

      this.addInputJack({
        id: 'cv-input',
        ioName: 'cv',
        label: 'CV',
        x: 15,
        y: 75,
        type: 'input',
        signalType: 'cv',
        color: '#f39c12',
      })
    }

    // Response mode selector
    this.addSwitch({
      id: 'response-selector',
      parameterName: 'response',
      label: 'RESP',
      x: 15,
      y: this.config?.enableCV ? 95 : 75,
      type: 'toggle',
      options: ['linear', 'exponential'],
    })

    // Main input
    this.addInputJack({
      id: 'main-input',
      ioName: 'input',
      label: 'IN',
      x: 15,
      y: this.config?.enableCV ? 115 : 95,
      type: 'input',
      signalType: 'audio',
    })

    // Main output
    this.addOutputJack({
      id: 'main-output',
      ioName: 'output',
      label: 'OUT',
      x: 15,
      y: this.config?.enableCV ? 135 : 115,
      type: 'output',
      signalType: 'audio',
    })

    // Activity LED
    this.addLED({
      id: 'activity-led',
      label: 'ACTIVE',
      x: 40,
      y: 25,
      color: '#2ecc71',
      mode: 'level',
      linkedParameter: 'level',
    })
  }

  protected onParameterChange(name: string, _value: number): void {
    switch (name) {
      case 'level':
        this.updateLevel()
        this.updateActivityLED()
        break
      case 'cvAmount':
        this.updateCVAmount()
        break
    }
  }

  protected onStart(_when?: number): void {
    this.setLEDState('activity-led', true)
  }

  protected onStop(_when?: number): void {
    this.setLEDState('activity-led', false)
  }

  protected onDispose(): void {
    if (this.gainNode?.disconnect) {
      this.gainNode.disconnect()
    }
    if (this.cvGainNode?.disconnect) {
      this.cvGainNode.disconnect()
    }
  }

  protected onPositionChange(_position: ModulePosition): void {
    // Position changes don't affect VCA behavior
  }

  protected onActivate(): void {
    this.start()
  }

  protected onDeactivate(): void {
    this.stop()
  }

  protected onKnobChange(knobId: string, _value: number): void {
    // Knob changes are handled via parameter changes
    if (knobId === 'level-knob') {
      this.updateActivityLED()
    }
  }

  protected onSwitchChange(switchId: string, value: any): void {
    if (switchId === 'response-selector') {
      this.setResponse(value as VCAResponse)
    }
  }

  protected onLEDStateChange(_ledId: string, _isOn: boolean, _intensity: number): void {
    // LED state changes are visual only
  }

  protected updateLEDFromParameter(ledId: string, parameterName: string, value: number): void {
    if (ledId === 'activity-led' && parameterName === 'level') {
      // Make LED intensity correspond to level
      const isActive = value > 0 && this.isModuleActive()
      this.setLEDState(ledId, isActive, value)
    }
  }

  // VCA-specific methods
  setResponse(response: VCAResponse): void {
    this.response = response
    // Update the gain curve based on response type
    this.updateLevel()
  }

  getResponse(): VCAResponse {
    return this.response
  }

  getLevel(): number {
    const param = this.getParameter('level')
    return param?.value ?? 1.0
  }

  private updateLevel(): void {
    const level = this.getLevel()
    let actualGain: number

    // Apply response curve
    if (this.response === 'exponential') {
      // Exponential response: more natural for audio
      actualGain = level * level
    } else {
      // Linear response
      actualGain = level
    }

    if (this.gainNode?.gain) {
      this.gainNode.gain.setValueAtTime(
        actualGain,
        this.context.currentTime
      )
    }

    this.currentLevel = actualGain
  }

  private updateCVAmount(): void {
    if (this.cvGainNode) {
      const cvAmount = this.getParameter('cvAmount')?.value || 0
      this.cvGainNode.gain.setValueAtTime(
        cvAmount,
        this.context.currentTime
      )
    }
  }

  private updateActivityLED(): void {
    const level = this.getLevel()
    const isActive = level > 0 && this.isModuleActive()
    this.setLEDState('activity-led', isActive, level)
  }

  // Serialization
  serialize(): Record<string, any> {
    const baseData = super.serialize()
    return {
      ...baseData,
      response: this.response,
      currentLevel: this.currentLevel,
    }
  }

  static deserialize(data: Record<string, any>): VCAModule {
    const config: VCAConfig = {
      id: data.id,
      type: data.type,
      displayName: data.displayName,
      initialLevel: data.parameters?.level,
      response: data.response,
      enableCV: data.enableCV,
    }
    
    const module = new VCAModule(config)
    
    // Restore position
    if (data.position) {
      module.setPosition(data.position)
    }
    
    // Restore parameters
    if (data.parameters) {
      Object.entries(data.parameters).forEach(([name, value]) => {
        if (typeof value === 'number') {
          module.setParameter(name, value)
        }
      })
    }
    
    // Restore response
    if (data.response) {
      module.setResponse(data.response)
    }
    
    // Restore active state
    if (data.isActive) {
      module.activate()
    }
    
    return module
  }
}