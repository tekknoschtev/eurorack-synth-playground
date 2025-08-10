import { BaseModule, ModuleConfig, ModulePosition } from './base-module'

export interface OutputConfig extends Partial<ModuleConfig> {
  initialMasterLevel?: number // Initial master volume (0-1)
  initialHeadphoneLevel?: number // Initial headphone level (0-1)
  enableStereo?: boolean // Enable stereo L/R inputs
  enableMute?: boolean // Enable mute functionality
}

export class OutputModule extends BaseModule {
  private masterGainNode!: GainNode
  private headphoneGainNode!: GainNode
  private leftInputGain?: GainNode
  private rightInputGain?: GainNode
  private analyserNode!: AnalyserNode
  
  private isMuted = false
  private masterLevel = 0.7
  private headphoneLevel = 0.7
  private currentPeakLevel = 0
  
  private config: OutputConfig

  constructor(config: OutputConfig = {}) {
    const moduleConfig: ModuleConfig = {
      type: config.type || 'output',
      displayName: config.displayName || 'OUTPUT',
      description: config.description || 'Master output with volume control and monitoring',
      hp: config.hp || 6,
      color: config.color || '#e74c3c',
      id: config.id,
      name: config.name,
      position: config.position,
    }
    
    super(moduleConfig)
    this.config = config
    this.defineUI()
    
    // Apply config after initialization is complete
    this.applyConfig()
    
    // Start level monitoring
    this.startLevelMonitoring()
  }

  protected initialize(): void {
    // Create the master gain node
    this.masterGainNode = this.context.createGain()
    this.masterGainNode.gain.value = 0.7 // Default master level

    // Create headphone gain node
    this.headphoneGainNode = this.context.createGain()
    this.headphoneGainNode.gain.value = 0.7 // Default headphone level

    // Create analyser for level monitoring
    this.analyserNode = this.context.createAnalyser()
    this.analyserNode.fftSize = 256
    this.analyserNode.smoothingTimeConstant = 0.8

    // Create main input
    this.createInput('input', this.masterGainNode)
    
    // Connect master gain -> analyser -> headphone gain -> destination
    this.masterGainNode.connect(this.analyserNode)
    this.analyserNode.connect(this.headphoneGainNode)
    this.headphoneGainNode.connect(this.context.destination)

    // Create parameters
    this.createParameter('masterLevel', 0.7, 0, 1, 'level')
    this.createParameter('headphoneLevel', 0.7, 0, 1, 'level')
  }
  
  private applyConfig(): void {
    // Set initial master level if provided
    if (this.config?.initialMasterLevel !== undefined) {
      this.setParameter('masterLevel', this.config.initialMasterLevel)
    }
    
    // Set initial headphone level if provided  
    if (this.config?.initialHeadphoneLevel !== undefined) {
      this.setParameter('headphoneLevel', this.config.initialHeadphoneLevel)
    }
    
    // Add stereo inputs if enabled
    if (this.config?.enableStereo) {
      // Create separate L/R input gains
      this.leftInputGain = this.context.createGain()
      this.rightInputGain = this.context.createGain()
      
      // Connect both to master gain
      this.leftInputGain.connect(this.masterGainNode)
      this.rightInputGain.connect(this.masterGainNode)
      
      // Create stereo inputs
      this.createInput('leftInput', this.leftInputGain)
      this.createInput('rightInput', this.rightInputGain)
      
      // Create balance parameter
      this.createParameter('balance', 0, -1, 1, 'pan')
    }
  }

  protected defineUI(): void {
    // Master volume knob
    this.addKnob({
      id: 'master-knob',
      parameterName: 'masterLevel',
      label: 'MASTER',
      x: 15,
      y: 25,
      size: 'large',
      style: 'knob',
      displayValue: true,
    })

    // Headphone volume knob
    this.addKnob({
      id: 'headphone-knob',
      parameterName: 'headphoneLevel',
      label: 'PHONES',
      x: 15,
      y: 65,
      size: 'medium',
      style: 'knob',
      displayValue: true,
    })

    let yOffset = 95

    // Balance knob for stereo (if enabled)
    if (this.config?.enableStereo) {
      this.addKnob({
        id: 'balance-knob',
        parameterName: 'balance',
        label: 'BALANCE',
        x: 15,
        y: yOffset,
        size: 'small',
        style: 'knob',
      })
      yOffset += 25
    }

    // Mute button (if enabled)
    if (this.config?.enableMute !== false) { // Default to enabled
      this.addSwitch({
        id: 'mute-switch',
        parameterName: 'mute',
        label: 'MUTE',
        x: 15,
        y: yOffset,
        type: 'momentary',
      })
      yOffset += 25
    }

    // Audio inputs
    if (this.config?.enableStereo) {
      // Stereo inputs
      this.addInputJack({
        id: 'left-input',
        ioName: 'leftInput',
        label: 'L',
        x: 10,
        y: yOffset,
        type: 'input',
        signalType: 'audio',
        color: '#3498db',
      })

      this.addInputJack({
        id: 'right-input',
        ioName: 'rightInput',
        label: 'R',
        x: 35,
        y: yOffset,
        type: 'input',
        signalType: 'audio',
        color: '#e67e22',
      })
    } else {
      // Mono input
      this.addInputJack({
        id: 'main-input',
        ioName: 'input',
        label: 'IN',
        x: 15,
        y: yOffset,
        type: 'input',
        signalType: 'audio',
      })
    }

    // VU meter LED
    this.addLED({
      id: 'level-led',
      label: 'LEVEL',
      x: 50,
      y: 25,
      color: '#2ecc71',
      mode: 'level',
      linkedParameter: 'masterLevel',
    })

    // Mute indicator LED
    this.addLED({
      id: 'mute-led',
      label: 'MUTE',
      x: 50,
      y: 45,
      color: '#e74c3c',
      mode: 'static',
    })

    // Power indicator LED
    this.addLED({
      id: 'power-led',
      label: 'POWER',
      x: 50,
      y: 65,
      color: '#f39c12',
      mode: 'activity',
    })
  }

  protected onParameterChange(name: string, _value: number): void {
    switch (name) {
      case 'masterLevel':
        this.updateMasterLevel()
        this.updateLevelLED()
        break
      case 'headphoneLevel':
        this.updateHeadphoneLevel()
        break
      case 'balance':
        this.updateBalance()
        break
    }
  }

  protected onStart(_when?: number): void {
    this.setLEDState('power-led', true)
    this.updateMuteState()
  }

  protected onStop(_when?: number): void {
    this.setLEDState('power-led', false)
    this.setLEDState('level-led', false)
    this.setLEDState('mute-led', false)
  }

  protected onDispose(): void {
    // Stop level monitoring
    this.stopLevelMonitoring()
    
    if (this.masterGainNode?.disconnect) {
      this.masterGainNode.disconnect()
    }
    if (this.headphoneGainNode?.disconnect) {
      this.headphoneGainNode.disconnect()
    }
    if (this.analyserNode?.disconnect) {
      this.analyserNode.disconnect()
    }
    if (this.leftInputGain?.disconnect) {
      this.leftInputGain.disconnect()
    }
    if (this.rightInputGain?.disconnect) {
      this.rightInputGain.disconnect()
    }
  }

  protected onPositionChange(_position: ModulePosition): void {
    // Position changes don't affect output behavior
  }

  protected onActivate(): void {
    this.start()
  }

  protected onDeactivate(): void {
    this.stop()
  }

  protected onKnobChange(knobId: string, _value: number): void {
    // Knob changes are handled via parameter changes
    if (knobId === 'master-knob') {
      this.updateLevelLED()
    }
  }

  protected onSwitchChange(switchId: string, value: any): void {
    if (switchId === 'mute-switch') {
      this.setMute(!!value)
    }
  }

  protected onLEDStateChange(_ledId: string, _isOn: boolean, _intensity: number): void {
    // LED state changes are visual only
  }

  protected updateLEDFromParameter(ledId: string, parameterName: string, value: number): void {
    if (ledId === 'level-led' && parameterName === 'masterLevel') {
      // Make LED intensity correspond to master level and current audio level
      const isActive = value > 0 && this.isModuleActive() && !this.isMuted
      const intensity = Math.max(value, this.currentPeakLevel)
      this.setLEDState(ledId, isActive, intensity)
    }
  }

  // Output-specific methods
  setMute(muted: boolean): void {
    if (this.isMuted !== muted) {
      this.isMuted = muted
      this.updateMuteState()
    }
  }

  getMute(): boolean {
    return this.isMuted
  }

  getMasterLevel(): number {
    const param = this.getParameter('masterLevel')
    return param?.value ?? 0.7
  }

  getHeadphoneLevel(): number {
    const param = this.getParameter('headphoneLevel')
    return param?.value ?? 0.7
  }

  getCurrentLevel(): number {
    return this.currentPeakLevel
  }

  private updateMasterLevel(): void {
    const level = this.getMasterLevel()
    this.masterLevel = level
    
    if (this.masterGainNode?.gain) {
      const actualLevel = this.isMuted ? 0 : level
      this.masterGainNode.gain.setValueAtTime(
        actualLevel,
        this.context.currentTime
      )
    }
  }

  private updateHeadphoneLevel(): void {
    const level = this.getHeadphoneLevel()
    this.headphoneLevel = level
    
    if (this.headphoneGainNode?.gain) {
      this.headphoneGainNode.gain.setValueAtTime(
        level,
        this.context.currentTime
      )
    }
  }

  private updateBalance(): void {
    if (this.config?.enableStereo && this.leftInputGain && this.rightInputGain) {
      const balance = this.getParameter('balance')?.value ?? 0
      
      // Convert balance (-1 to 1) to left/right gains
      const leftGain = balance <= 0 ? 1 : 1 - balance
      const rightGain = balance >= 0 ? 1 : 1 + balance
      
      this.leftInputGain.gain.setValueAtTime(leftGain, this.context.currentTime)
      this.rightInputGain.gain.setValueAtTime(rightGain, this.context.currentTime)
    }
  }

  private updateMuteState(): void {
    // Update master gain based on mute state
    this.updateMasterLevel()
    
    // Update mute LED
    this.setLEDState('mute-led', this.isMuted)
    
    // Update level LED
    this.updateLevelLED()
  }

  private updateLevelLED(): void {
    const masterLevel = this.getMasterLevel()
    const isActive = masterLevel > 0 && this.isModuleActive() && !this.isMuted
    const intensity = Math.max(masterLevel, this.currentPeakLevel)
    this.setLEDState('level-led', isActive, intensity)
  }

  private levelMonitoringId?: number

  private startLevelMonitoring(): void {
    const updateLevel = () => {
      if (this.analyserNode) {
        const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
        this.analyserNode.getByteFrequencyData(dataArray)
        
        // Calculate RMS level
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += (dataArray[i] / 255) ** 2
        }
        const rms = Math.sqrt(sum / dataArray.length)
        
        // Update peak level with decay
        const attackRate = 0.1
        const decayRate = 0.02
        
        if (rms > this.currentPeakLevel) {
          this.currentPeakLevel = this.currentPeakLevel + (rms - this.currentPeakLevel) * attackRate
        } else {
          this.currentPeakLevel = Math.max(0, this.currentPeakLevel - decayRate)
        }
        
        // Update level LED
        this.updateLevelLED()
      }
      
      this.levelMonitoringId = requestAnimationFrame(updateLevel)
    }
    
    updateLevel()
  }

  private stopLevelMonitoring(): void {
    if (this.levelMonitoringId) {
      cancelAnimationFrame(this.levelMonitoringId)
      this.levelMonitoringId = undefined
    }
  }

  // Serialization
  serialize(): Record<string, any> {
    const baseData = super.serialize()
    return {
      ...baseData,
      isMuted: this.isMuted,
      masterLevel: this.masterLevel,
      headphoneLevel: this.headphoneLevel,
    }
  }

  static deserialize(data: Record<string, any>): OutputModule {
    const config: OutputConfig = {
      id: data.id,
      type: data.type,
      displayName: data.displayName,
      initialMasterLevel: data.parameters?.masterLevel ?? data.masterLevel,
      initialHeadphoneLevel: data.parameters?.headphoneLevel ?? data.headphoneLevel,
      enableStereo: data.enableStereo,
      enableMute: data.enableMute,
    }
    
    const module = new OutputModule(config)
    
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
    
    // Restore mute state
    if (data.isMuted !== undefined) {
      module.setMute(data.isMuted)
    }
    
    // Restore active state
    if (data.isActive) {
      module.activate()
    }
    
    return module
  }
}