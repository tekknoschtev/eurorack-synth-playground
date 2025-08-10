import { BaseModule, ModuleConfig, ModulePosition } from './base-module'

export type OscillatorWaveform = 'sine' | 'square' | 'sawtooth' | 'triangle'

export interface OscillatorConfig extends Partial<ModuleConfig> {
  initialFrequency?: number
  initialWaveform?: OscillatorWaveform
  enableFM?: boolean // Frequency Modulation input
  enableSync?: boolean // Hard sync input
}

export class OscillatorModule extends BaseModule {
  private oscillatorNode!: OscillatorNode
  private fmGainNode?: GainNode
  private currentWaveform: OscillatorWaveform = 'sine'
  private isRunning = false
  
  private config: OscillatorConfig

  constructor(config: OscillatorConfig = {}) {
    const moduleConfig: ModuleConfig = {
      type: config.type || 'oscillator',
      displayName: config.displayName || 'VCO',
      description: config.description || 'Voltage Controlled Oscillator with multiple waveforms',
      hp: config.hp || 8,
      color: config.color || '#ff6b6b',
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
    // Create the main oscillator
    this.oscillatorNode = this.context.createOscillator()
    this.oscillatorNode.type = 'sine' // Default waveform, will be set after config is available
    this.currentWaveform = this.oscillatorNode.type as OscillatorWaveform

    // Create main output
    this.createOutput('output', this.oscillatorNode)

    // Create frequency parameter with default value - will be updated in constructor
    this.createParameter('frequency', 440, 20, 20000, 'Hz')
    this.createParameter('detune', 0, -1200, 1200, 'cents')

    // Set initial frequency
    this.updateFrequency()
  }
  
  private applyConfig(): void {
    // Set initial frequency if provided
    if (this.config?.initialFrequency) {
      this.setParameter('frequency', this.config.initialFrequency)
    }
    
    // Set initial waveform if provided
    if (this.config?.initialWaveform) {
      this.setWaveform(this.config.initialWaveform)
    }
    
    // Add FM controls if enabled
    if (this.config?.enableFM) {
      this.fmGainNode = this.context.createGain()
      this.fmGainNode.gain.value = 0 // No FM by default
      
      // Connect FM gain to oscillator frequency if available
      if (this.oscillatorNode?.frequency) {
        this.fmGainNode.connect(this.oscillatorNode.frequency)
      }
      
      this.createInput('fm', this.fmGainNode)
      this.createParameter('fmAmount', 0, 0, 1000, 'Hz')
    }

    // Add sync input if enabled
    if (this.config?.enableSync) {
      const syncGain = this.context.createGain()
      syncGain.gain.value = 0
      this.createInput('sync', syncGain)
    }
  }

  protected defineUI(): void {
    // Frequency knob
    this.addKnob({
      id: 'freq-knob',
      parameterName: 'frequency',
      label: 'FREQ',
      x: 15,
      y: 25,
      size: 'large',
      style: 'knob',
      displayValue: true,
    })

    // Detune knob
    this.addKnob({
      id: 'detune-knob',
      parameterName: 'detune',
      label: 'FINE',
      x: 15,
      y: 60,
      size: 'small',
      style: 'knob',
    })

    // Waveform selector
    this.addSwitch({
      id: 'waveform-selector',
      parameterName: 'waveform',
      label: 'WAVE',
      x: 15,
      y: 85,
      type: 'selector',
      options: ['sine', 'square', 'sawtooth', 'triangle'],
    })

    // FM controls (if enabled)
    if (this.config?.enableFM) {
      this.addKnob({
        id: 'fm-knob',
        parameterName: 'fmAmount',
        label: 'FM',
        x: 50,
        y: 45,
        size: 'medium',
        style: 'knob',
      })

      this.addInputJack({
        id: 'fm-input',
        ioName: 'fm',
        label: 'FM',
        x: 50,
        y: 75,
        type: 'input',
        signalType: 'cv',
        color: '#f39c12',
      })
    }

    // Sync input (if enabled)
    if (this.config?.enableSync) {
      this.addInputJack({
        id: 'sync-input',
        ioName: 'sync',
        label: 'SYNC',
        x: 50,
        y: 100,
        type: 'input',
        signalType: 'trigger',
        color: '#e74c3c',
      })
    }

    // Main output
    this.addOutputJack({
      id: 'main-output',
      ioName: 'output',
      label: 'OUT',
      x: 15,
      y: 110,
      type: 'output',
      signalType: 'audio',
    })

    // Activity LED
    this.addLED({
      id: 'activity-led',
      label: 'ACTIVE',
      x: 55,
      y: 25,
      color: '#7ed321',
      mode: 'activity',
    })
  }

  protected onParameterChange(name: string, _value: number): void {
    switch (name) {
      case 'frequency':
        this.updateFrequency()
        this.updateActivityLED()
        break
      case 'detune':
        this.updateDetune()
        break
      case 'fmAmount':
        this.updateFMAmount()
        break
    }
  }

  protected onStart(when?: number): void {
    if (!this.isRunning && this.oscillatorNode) {
      try {
        this.oscillatorNode.start(when || this.context.currentTime)
        this.isRunning = true
        this.setLEDState('activity-led', true)
      } catch (error) {
        console.warn('Oscillator start failed:', error)
      }
    }
  }

  protected onStop(when?: number): void {
    if (this.isRunning && this.oscillatorNode) {
      try {
        this.oscillatorNode.stop(when || this.context.currentTime)
        this.isRunning = false
        this.setLEDState('activity-led', false)
      } catch (error) {
        console.warn('Oscillator stop failed:', error)
      }
    }
  }

  protected onDispose(): void {
    if (this.isRunning && this.oscillatorNode) {
      try {
        this.oscillatorNode.stop()
      } catch (error) {
        console.warn('Failed to stop oscillator during dispose:', error)
      }
    }
    if (this.oscillatorNode?.disconnect) {
      this.oscillatorNode.disconnect()
    }
    if (this.fmGainNode?.disconnect) {
      this.fmGainNode.disconnect()
    }
  }

  protected onPositionChange(_position: ModulePosition): void {
    // Position changes don't affect oscillator behavior
  }

  protected onActivate(): void {
    this.start()
  }

  protected onDeactivate(): void {
    this.stop()
  }

  protected onKnobChange(knobId: string, _value: number): void {
    // Knob changes are handled via parameter changes
    if (knobId === 'freq-knob') {
      this.updateActivityLED()
    }
  }

  protected onSwitchChange(switchId: string, value: any): void {
    if (switchId === 'waveform-selector') {
      this.setWaveform(value as OscillatorWaveform)
    }
  }

  protected onLEDStateChange(_ledId: string, _isOn: boolean, _intensity: number): void {
    // LED state changes are visual only
  }

  protected updateLEDFromParameter(ledId: string, parameterName: string, value: number): void {
    if (ledId === 'activity-led' && parameterName === 'frequency') {
      // Make LED blink rate correspond to frequency (visual feedback)
      const isActive = value > 20 && this.isModuleActive()
      this.setLEDState(ledId, isActive)
    }
  }

  // Oscillator-specific methods
  setWaveform(waveform: OscillatorWaveform): void {
    if (this.currentWaveform !== waveform) {
      const wasRunning = this.isRunning
      const currentTime = this.context.currentTime
      
      // Stop current oscillator
      if (this.isRunning) {
        this.oscillatorNode.stop(currentTime)
        this.isRunning = false
      }

      // Create new oscillator with new waveform
      if (this.oscillatorNode?.disconnect) {
        this.oscillatorNode.disconnect()
      }
      this.oscillatorNode = this.context.createOscillator()
      this.oscillatorNode.type = waveform
      this.currentWaveform = waveform

      // Reconnect
      const output = this.getOutput('output')
      if (output) {
        // Reconnect to all existing connections
        this.reconnectOutput('output', this.oscillatorNode)
      }

      // Restore frequency and detune
      this.updateFrequency()
      this.updateDetune()

      // Restart if it was running
      if (wasRunning) {
        this.oscillatorNode.start(currentTime + 0.01) // Small delay to avoid clicks
        this.isRunning = true
      }
    }
  }

  getCurrentWaveform(): OscillatorWaveform {
    return this.currentWaveform
  }

  getFrequency(): number {
    const param = this.getParameter('frequency')
    return param?.value || 440
  }

  private updateFrequency(): void {
    const frequency = this.getFrequency()
    if (this.oscillatorNode?.frequency) {
      this.oscillatorNode.frequency.setValueAtTime(
        frequency,
        this.context.currentTime
      )
    }
  }

  private updateDetune(): void {
    const detune = this.getParameter('detune')?.value || 0
    if (this.oscillatorNode?.detune) {
      this.oscillatorNode.detune.setValueAtTime(
        detune,
        this.context.currentTime
      )
    }
  }

  private updateFMAmount(): void {
    if (this.fmGainNode) {
      const fmAmount = this.getParameter('fmAmount')?.value || 0
      this.fmGainNode.gain.setValueAtTime(
        fmAmount,
        this.context.currentTime
      )
    }
  }

  private updateActivityLED(): void {
    const frequency = this.getFrequency()
    const isActive = frequency > 20 && this.isModuleActive()
    this.setLEDState('activity-led', isActive)
  }

  private reconnectOutput(outputName: string, newNode: AudioNode): void {
    const output = this.getOutput(outputName)
    if (output) {
      // This would need to be implemented to maintain existing connections
      // For now, we'll update the node reference
      output.node = newNode
    }
  }

  // Serialization
  serialize(): Record<string, any> {
    const baseData = super.serialize()
    return {
      ...baseData,
      waveform: this.currentWaveform,
      isRunning: this.isRunning,
    }
  }

  static deserialize(data: Record<string, any>): OscillatorModule {
    const config: OscillatorConfig = {
      id: data.id,
      type: data.type,
      displayName: data.displayName,
      initialFrequency: data.parameters?.frequency,
      initialWaveform: data.waveform,
      enableFM: data.enableFM,
      enableSync: data.enableSync,
    }
    
    const module = new OscillatorModule(config)
    
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
    
    // Restore waveform
    if (data.waveform) {
      module.setWaveform(data.waveform)
    }
    
    // Restore active state
    if (data.isActive) {
      module.activate()
    }
    
    return module
  }
}