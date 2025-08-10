import { BaseModule, ModuleConfig, ModulePosition } from './base-module'

export type FilterType = 'lowpass' | 'highpass' | 'bandpass' | 'notch'

export interface FilterConfig extends Partial<ModuleConfig> {
  initialCutoff?: number // Initial cutoff frequency in Hz
  initialResonance?: number // Initial Q/resonance value
  filterType?: FilterType // Initial filter type
  enableCutoffCV?: boolean // Enable CV input for cutoff
  enableResonanceCV?: boolean // Enable CV input for resonance
}

export class FilterModule extends BaseModule {
  private filterNode!: BiquadFilterNode
  private cutoffCVGainNode?: GainNode
  private resonanceCVGainNode?: GainNode
  private currentFilterType: FilterType = 'lowpass'
  
  private config: FilterConfig

  constructor(config: FilterConfig = {}) {
    const moduleConfig: ModuleConfig = {
      type: config.type || 'filter',
      displayName: config.displayName || 'FILTER',
      description: config.description || 'Multi-mode resonant filter',
      hp: config.hp || 8,
      color: config.color || '#9b59b6',
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
    // Create the main filter node
    this.filterNode = this.context.createBiquadFilter()
    this.filterNode.type = 'lowpass' // Default filter type
    this.filterNode.frequency.value = 1000 // Default cutoff frequency
    this.filterNode.Q.value = 1 // Default resonance

    // Create main input and output
    this.createInput('input', this.filterNode)
    this.createOutput('output', this.filterNode)

    // Create parameters
    this.createParameter('cutoff', 1000, 20, 20000, 'Hz')
    this.createParameter('resonance', 1, 0.1, 30, 'Q')
  }
  
  private applyConfig(): void {
    // Set initial cutoff if provided
    if (this.config?.initialCutoff !== undefined) {
      this.setParameter('cutoff', this.config.initialCutoff)
    }
    
    // Set initial resonance if provided
    if (this.config?.initialResonance !== undefined) {
      this.setParameter('resonance', this.config.initialResonance)
    }
    
    // Set filter type if provided
    if (this.config?.filterType) {
      this.setFilterType(this.config.filterType)
    }
    
    // Add cutoff CV controls if enabled
    if (this.config?.enableCutoffCV) {
      this.cutoffCVGainNode = this.context.createGain()
      this.cutoffCVGainNode.gain.value = 0 // No CV by default
      
      // Connect cutoff CV gain to filter frequency
      if (this.filterNode?.frequency) {
        this.cutoffCVGainNode.connect(this.filterNode.frequency)
      }
      
      this.createInput('cutoffCV', this.cutoffCVGainNode)
      this.createParameter('cutoffCVAmount', 0, -1000, 1000, 'Hz')
    }

    // Add resonance CV controls if enabled
    if (this.config?.enableResonanceCV) {
      this.resonanceCVGainNode = this.context.createGain()
      this.resonanceCVGainNode.gain.value = 0 // No CV by default
      
      // Connect resonance CV gain to filter Q
      if (this.filterNode?.Q) {
        this.resonanceCVGainNode.connect(this.filterNode.Q)
      }
      
      this.createInput('resonanceCV', this.resonanceCVGainNode)
      this.createParameter('resonanceCVAmount', 0, -10, 10, 'Q')
    }
  }

  protected defineUI(): void {
    // Cutoff frequency knob
    this.addKnob({
      id: 'cutoff-knob',
      parameterName: 'cutoff',
      label: 'CUTOFF',
      x: 15,
      y: 25,
      size: 'large',
      style: 'knob',
      displayValue: true,
    })

    // Resonance knob
    this.addKnob({
      id: 'resonance-knob',
      parameterName: 'resonance',
      label: 'RES',
      x: 50,
      y: 25,
      size: 'medium',
      style: 'knob',
      displayValue: true,
    })

    // Filter type selector
    this.addSwitch({
      id: 'filter-type-selector',
      parameterName: 'filterType',
      label: 'TYPE',
      x: 15,
      y: 60,
      type: 'selector',
      options: ['lowpass', 'highpass', 'bandpass', 'notch'],
    })

    // CV controls if enabled
    let yOffset = 85
    if (this.config?.enableCutoffCV) {
      this.addKnob({
        id: 'cutoff-cv-knob',
        parameterName: 'cutoffCVAmount',
        label: 'FREQ CV',
        x: 15,
        y: yOffset,
        size: 'small',
        style: 'knob',
      })

      this.addInputJack({
        id: 'cutoff-cv-input',
        ioName: 'cutoffCV',
        label: 'FREQ',
        x: 45,
        y: yOffset,
        type: 'input',
        signalType: 'cv',
        color: '#e67e22',
      })

      yOffset += 25
    }

    if (this.config?.enableResonanceCV) {
      this.addKnob({
        id: 'resonance-cv-knob',
        parameterName: 'resonanceCVAmount',
        label: 'RES CV',
        x: 15,
        y: yOffset,
        size: 'small',
        style: 'knob',
      })

      this.addInputJack({
        id: 'resonance-cv-input',
        ioName: 'resonanceCV',
        label: 'RES',
        x: 45,
        y: yOffset,
        type: 'input',
        signalType: 'cv',
        color: '#f39c12',
      })

      yOffset += 25
    }

    // Main input
    this.addInputJack({
      id: 'main-input',
      ioName: 'input',
      label: 'IN',
      x: 15,
      y: yOffset + 10,
      type: 'input',
      signalType: 'audio',
    })

    // Main output
    this.addOutputJack({
      id: 'main-output',
      ioName: 'output',
      label: 'OUT',
      x: 50,
      y: yOffset + 10,
      type: 'output',
      signalType: 'audio',
    })

    // Activity LED
    this.addLED({
      id: 'activity-led',
      label: 'ACTIVE',
      x: 65,
      y: 25,
      color: '#9b59b6',
      mode: 'activity',
    })

    // Filter type indicator LED
    this.addLED({
      id: 'filter-type-led',
      label: 'TYPE',
      x: 65,
      y: 45,
      color: '#3498db',
      mode: 'static',
    })
  }

  protected onParameterChange(name: string, _value: number): void {
    switch (name) {
      case 'cutoff':
        this.updateCutoff()
        this.updateActivityLED()
        break
      case 'resonance':
        this.updateResonance()
        break
      case 'cutoffCVAmount':
        this.updateCutoffCVAmount()
        break
      case 'resonanceCVAmount':
        this.updateResonanceCVAmount()
        break
    }
  }

  protected onStart(_when?: number): void {
    this.setLEDState('activity-led', true)
    this.updateFilterTypeLED()
  }

  protected onStop(_when?: number): void {
    this.setLEDState('activity-led', false)
    this.setLEDState('filter-type-led', false)
  }

  protected onDispose(): void {
    if (this.filterNode?.disconnect) {
      this.filterNode.disconnect()
    }
    if (this.cutoffCVGainNode?.disconnect) {
      this.cutoffCVGainNode.disconnect()
    }
    if (this.resonanceCVGainNode?.disconnect) {
      this.resonanceCVGainNode.disconnect()
    }
  }

  protected onPositionChange(_position: ModulePosition): void {
    // Position changes don't affect filter behavior
  }

  protected onActivate(): void {
    this.start()
  }

  protected onDeactivate(): void {
    this.stop()
  }

  protected onKnobChange(knobId: string, _value: number): void {
    // Knob changes are handled via parameter changes
    if (knobId === 'cutoff-knob') {
      this.updateActivityLED()
    }
  }

  protected onSwitchChange(switchId: string, value: any): void {
    if (switchId === 'filter-type-selector') {
      this.setFilterType(value as FilterType)
    }
  }

  protected onLEDStateChange(_ledId: string, _isOn: boolean, _intensity: number): void {
    // LED state changes are visual only
  }

  protected updateLEDFromParameter(ledId: string, parameterName: string, value: number): void {
    if (ledId === 'activity-led' && parameterName === 'cutoff') {
      // Make LED brightness correspond to cutoff frequency position
      const normalizedCutoff = (value - 20) / (20000 - 20) // Normalize to 0-1
      const isActive = this.isModuleActive()
      this.setLEDState(ledId, isActive, normalizedCutoff)
    }
  }

  // Filter-specific methods
  setFilterType(filterType: FilterType): void {
    if (this.currentFilterType !== filterType) {
      this.currentFilterType = filterType
      
      if (this.filterNode) {
        this.filterNode.type = filterType
      }
      
      this.updateFilterTypeLED()
    }
  }

  getFilterType(): FilterType {
    return this.currentFilterType
  }

  getCutoff(): number {
    const param = this.getParameter('cutoff')
    return param?.value ?? 1000
  }

  getResonance(): number {
    const param = this.getParameter('resonance')
    return param?.value ?? 1
  }

  private updateCutoff(): void {
    const cutoff = this.getCutoff()
    if (this.filterNode?.frequency) {
      this.filterNode.frequency.setValueAtTime(
        cutoff,
        this.context.currentTime
      )
    }
  }

  private updateResonance(): void {
    const resonance = this.getResonance()
    if (this.filterNode?.Q) {
      this.filterNode.Q.setValueAtTime(
        resonance,
        this.context.currentTime
      )
    }
  }

  private updateCutoffCVAmount(): void {
    if (this.cutoffCVGainNode) {
      const cvAmount = this.getParameter('cutoffCVAmount')?.value || 0
      this.cutoffCVGainNode.gain.setValueAtTime(
        cvAmount,
        this.context.currentTime
      )
    }
  }

  private updateResonanceCVAmount(): void {
    if (this.resonanceCVGainNode) {
      const cvAmount = this.getParameter('resonanceCVAmount')?.value || 0
      this.resonanceCVGainNode.gain.setValueAtTime(
        cvAmount,
        this.context.currentTime
      )
    }
  }

  private updateActivityLED(): void {
    const cutoff = this.getCutoff()
    const normalizedCutoff = (cutoff - 20) / (20000 - 20) // Normalize to 0-1
    const isActive = this.isModuleActive()
    this.setLEDState('activity-led', isActive, normalizedCutoff)
  }

  private updateFilterTypeLED(): void {
    if (this.isModuleActive()) {
      // Different LED patterns for different filter types
      const intensity = this.currentFilterType === 'lowpass' ? 1.0 :
                       this.currentFilterType === 'highpass' ? 0.8 :
                       this.currentFilterType === 'bandpass' ? 0.6 : 0.4
      this.setLEDState('filter-type-led', true, intensity)
    }
  }

  // Serialization
  serialize(): Record<string, any> {
    const baseData = super.serialize()
    return {
      ...baseData,
      filterType: this.currentFilterType,
    }
  }

  static deserialize(data: Record<string, any>): FilterModule {
    const config: FilterConfig = {
      id: data.id,
      type: data.type,
      displayName: data.displayName,
      initialCutoff: data.parameters?.cutoff,
      initialResonance: data.parameters?.resonance,
      filterType: data.filterType,
      enableCutoffCV: data.enableCutoffCV,
      enableResonanceCV: data.enableResonanceCV,
    }
    
    const module = new FilterModule(config)
    
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
    
    // Restore filter type
    if (data.filterType) {
      module.setFilterType(data.filterType)
    }
    
    // Restore active state
    if (data.isActive) {
      module.activate()
    }
    
    return module
  }
}