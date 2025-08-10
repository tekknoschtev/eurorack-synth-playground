import { EurorackAudioNode, AudioNodeConfig } from './audio-node'

export interface GainNodeConfig extends AudioNodeConfig {
  initialGain?: number
  minGain?: number
  maxGain?: number
}

export class EurorackGainNode extends EurorackAudioNode {
  private gainNode!: GainNode
  private config: GainNodeConfig

  constructor(config: GainNodeConfig = {}) {
    const baseConfig = { ...config }
    super(baseConfig)
    this.config = config
  }

  protected initialize(): void {
    this.gainNode = this.context.createGain()

    // Create input and output
    this.createInput('input', this.gainNode)
    this.createOutput('output', this.gainNode)

    // Create gain parameter with safe defaults
    const minGain = this.config?.minGain ?? 0
    const maxGain = this.config?.maxGain ?? 2
    const initialGain = this.config?.initialGain ?? 1
    
    this.createParameter('gain', initialGain, minGain, maxGain, 'dB')

    // Set initial gain value
    this.gainNode.gain.value = initialGain
  }

  protected onParameterChange(name: string, value: number): void {
    if (name === 'gain' && this.gainNode?.gain) {
      this.gainNode.gain.setValueAtTime(value, this.context.currentTime)
    }
  }

  protected onStart(_when?: number): void {
    // Gain node is always active when created
  }

  protected onStop(_when?: number): void {
    // Gain node doesn't need to be stopped
  }

  protected onDispose(): void {
    this.gainNode.disconnect()
  }

  // Convenience methods for common gain operations
  setGain(value: number): void {
    this.setParameter('gain', value)
  }

  getGain(): number {
    const param = this.getParameter('gain')
    return param?.value ?? 1
  }

  // Smooth gain transitions
  setGainAtTime(value: number, when: number): void {
    const param = this.getParameter('gain')
    if (!param) return

    const clampedValue = Math.max(param.minValue, Math.min(param.maxValue, value))
    param.value = clampedValue
    this.gainNode.gain.setValueAtTime(clampedValue, when)
  }

  linearRampToGain(value: number, when: number): void {
    const param = this.getParameter('gain')
    if (!param) return

    const clampedValue = Math.max(param.minValue, Math.min(param.maxValue, value))
    param.value = clampedValue
    this.gainNode.gain.linearRampToValueAtTime(clampedValue, when)
  }

  exponentialRampToGain(value: number, when: number): void {
    const param = this.getParameter('gain')
    if (!param) return

    const clampedValue = Math.max(param.minValue, Math.min(param.maxValue, value))
    // Prevent exponential ramp to zero (which would cause an error)
    const safeValue = Math.max(0.0001, clampedValue)
    param.value = clampedValue
    this.gainNode.gain.exponentialRampToValueAtTime(safeValue, when)
  }

  // Utility methods for common gain conversions
  static dbToGain(db: number): number {
    return Math.pow(10, db / 20)
  }

  static gainToDb(gain: number): number {
    return 20 * Math.log10(Math.max(0.0001, gain))
  }

  setGainInDb(db: number): void {
    this.setGain(EurorackGainNode.dbToGain(db))
  }

  getGainInDb(): number {
    return EurorackGainNode.gainToDb(this.getGain())
  }
}