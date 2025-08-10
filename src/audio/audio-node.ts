import { getAudioManager } from './audio-context'

export interface AudioParameter {
  value: number
  minValue: number
  maxValue: number
  defaultValue: number
  name: string
  unit?: string
}

export interface AudioInput {
  name: string
  node: AudioNode
  connected: boolean
}

export interface AudioOutput {
  name: string
  node: AudioNode
  connections: Set<AudioInput>
}

export interface AudioNodeConfig {
  id?: string
  name?: string
}

export abstract class EurorackAudioNode {
  public readonly id: string
  public readonly name: string
  protected context: AudioContext
  protected inputs: Map<string, AudioInput> = new Map()
  protected outputs: Map<string, AudioOutput> = new Map()
  protected parameters: Map<string, AudioParameter> = new Map()
  protected isActive = false

  constructor(config: AudioNodeConfig = {}) {
    this.id = config.id || this.generateId()
    this.name = config.name || this.constructor.name
    this.context = getAudioManager().getContext()
    this.initialize()
  }

  protected abstract initialize(): void

  protected createInput(name: string, node: AudioNode): AudioInput {
    const input: AudioInput = {
      name,
      node,
      connected: false,
    }
    this.inputs.set(name, input)
    return input
  }

  protected createOutput(name: string, node: AudioNode): AudioOutput {
    const output: AudioOutput = {
      name,
      node,
      connections: new Set(),
    }
    this.outputs.set(name, output)
    return output
  }

  protected createParameter(
    name: string,
    defaultValue: number,
    minValue: number = 0,
    maxValue: number = 1,
    unit?: string
  ): AudioParameter {
    const parameter: AudioParameter = {
      value: defaultValue,
      minValue,
      maxValue,
      defaultValue,
      name,
      unit,
    }
    this.parameters.set(name, parameter)
    return parameter
  }

  getInput(name: string): AudioInput | undefined {
    return this.inputs.get(name)
  }

  getOutput(name: string): AudioOutput | undefined {
    return this.outputs.get(name)
  }

  getParameter(name: string): AudioParameter | undefined {
    return this.parameters.get(name)
  }

  getInputNames(): string[] {
    return Array.from(this.inputs.keys())
  }

  getOutputNames(): string[] {
    return Array.from(this.outputs.keys())
  }

  getParameterNames(): string[] {
    return Array.from(this.parameters.keys())
  }

  setParameter(name: string, value: number): void {
    const param = this.parameters.get(name)
    if (!param) {
      throw new Error(`Parameter '${name}' not found`)
    }

    const clampedValue = Math.max(param.minValue, Math.min(param.maxValue, value))
    param.value = clampedValue
    this.onParameterChange(name, clampedValue)
  }

  protected abstract onParameterChange(name: string, value: number): void

  connect(outputName: string, target: EurorackAudioNode, inputName: string): void {
    const output = this.getOutput(outputName)
    const targetInput = target.getInput(inputName)

    if (!output) {
      throw new Error(`Output '${outputName}' not found on ${this.name}`)
    }
    if (!targetInput) {
      throw new Error(`Input '${inputName}' not found on ${target.name}`)
    }

    try {
      output.node.connect(targetInput.node)
      output.connections.add(targetInput)
      targetInput.connected = true
    } catch (error) {
      throw new Error(`Failed to connect ${this.name}:${outputName} to ${target.name}:${inputName}: ${(error as Error).message}`)
    }
  }

  disconnect(outputName?: string, target?: EurorackAudioNode, inputName?: string): void {
    if (!outputName) {
      // Disconnect all outputs
      this.outputs.forEach((output) => {
        output.node.disconnect()
        output.connections.forEach((input) => {
          input.connected = false
        })
        output.connections.clear()
      })
      return
    }

    const output = this.getOutput(outputName)
    if (!output) {
      throw new Error(`Output '${outputName}' not found on ${this.name}`)
    }

    if (!target || !inputName) {
      // Disconnect all connections from this output
      output.node.disconnect()
      output.connections.forEach((input) => {
        input.connected = false
      })
      output.connections.clear()
      return
    }

    const targetInput = target.getInput(inputName)
    if (!targetInput) {
      throw new Error(`Input '${inputName}' not found on ${target.name}`)
    }

    try {
      output.node.disconnect(targetInput.node)
      output.connections.delete(targetInput)
      targetInput.connected = false
    } catch (error) {
      throw new Error(`Failed to disconnect ${this.name}:${outputName} from ${target.name}:${inputName}: ${(error as Error).message}`)
    }
  }

  start(when?: number): void {
    if (this.isActive) {
      return
    }
    this.isActive = true
    this.onStart(when)
  }

  stop(when?: number): void {
    if (!this.isActive) {
      return
    }
    this.isActive = false
    this.onStop(when)
  }

  protected abstract onStart(when?: number): void
  protected abstract onStop(when?: number): void

  dispose(): void {
    this.disconnect()
    this.onDispose()
    this.inputs.clear()
    this.outputs.clear()
    this.parameters.clear()
  }

  protected abstract onDispose(): void

  private generateId(): string {
    return `${this.constructor.name}-${Math.random().toString(36).substr(2, 9)}`
  }
}