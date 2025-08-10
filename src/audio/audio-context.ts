export type AudioContextState = 'suspended' | 'running' | 'closed'

export interface AudioContextConfig {
  sampleRate?: number
  latencyHint?: 'interactive' | 'balanced' | 'playback'
}

export class AudioContextManager {
  private context: AudioContext | null = null
  private initialized = false
  private listeners: Set<(state: AudioContextState) => void> = new Set()

  constructor(private config: AudioContextConfig = {}) {}

  async initialize(): Promise<AudioContext> {
    if (this.context && this.context.state !== 'closed') {
      return this.context
    }

    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latencyHint || 'interactive',
      })

      this.context.addEventListener('statechange', this.handleStateChange)
      this.initialized = true
      
      return this.context
    } catch (error) {
      throw new Error(`Failed to initialize AudioContext: ${(error as Error).message}`)
    }
  }

  async resume(): Promise<void> {
    if (!this.context) {
      throw new Error('AudioContext not initialized')
    }

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  async suspend(): Promise<void> {
    if (!this.context) {
      throw new Error('AudioContext not initialized')
    }

    if (this.context.state === 'running') {
      await this.context.suspend()
    }
  }

  async close(): Promise<void> {
    if (!this.context) {
      return
    }

    this.context.removeEventListener('statechange', this.handleStateChange)
    await this.context.close()
    this.context = null
    this.initialized = false
  }

  getContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioContext not initialized. Call initialize() first.')
    }
    return this.context
  }

  get state(): AudioContextState {
    return this.context?.state as AudioContextState || 'suspended'
  }

  get currentTime(): number {
    return this.context?.currentTime || 0
  }

  get sampleRate(): number {
    return this.context?.sampleRate || 44100
  }

  get destination(): AudioDestinationNode {
    if (!this.context) {
      throw new Error('AudioContext not initialized')
    }
    return this.context.destination
  }

  isInitialized(): boolean {
    return this.initialized && this.context !== null && this.context.state !== 'closed'
  }

  onStateChange(callback: (state: AudioContextState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private handleStateChange = (): void => {
    const state = this.state
    this.listeners.forEach(listener => listener(state))
  }
}

// Global singleton instance
let globalAudioManager: AudioContextManager | null = null

export function getAudioManager(): AudioContextManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioContextManager()
  }
  return globalAudioManager
}

export function resetAudioManager(): void {
  if (globalAudioManager) {
    globalAudioManager.close()
    globalAudioManager = null
  }
}