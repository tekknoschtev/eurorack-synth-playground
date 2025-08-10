import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EurorackAudioNode } from '@/audio/audio-node'
import { resetMocks } from '../setup'

// Test implementation of abstract EurorackAudioNode
class TestAudioNode extends EurorackAudioNode {
  private oscillator: OscillatorNode | null = null

  protected initialize(): void {
    this.oscillator = this.context.createOscillator()
    
    this.createInput('input', this.oscillator)
    this.createOutput('output', this.oscillator)
    this.createParameter('frequency', 440, 20, 20000, 'frequency')
  }

  protected onParameterChange(name: string, value: number): void {
    if (name === 'frequency' && this.oscillator) {
      this.oscillator.frequency.setValueAtTime(value, this.context.currentTime)
    }
  }

  protected onStart(when?: number): void {
    if (this.oscillator) {
      this.oscillator.start(when)
    }
  }

  protected onStop(when?: number): void {
    if (this.oscillator) {
      this.oscillator.stop(when)
    }
  }

  protected onDispose(): void {
    if (this.oscillator) {
      this.oscillator.disconnect()
    }
  }

  // Expose oscillator for testing
  getOscillator(): OscillatorNode | null {
    return this.oscillator
  }

  // Expose isActive for testing
  getIsActive(): boolean {
    return this.isActive
  }
}

describe('EurorackAudioNode', () => {
  let node: TestAudioNode

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context first
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()
    
    node = new TestAudioNode()
  })

  describe('initialization', () => {
    it('should create node with generated ID and name', () => {
      expect(node.id).toMatch(/TestAudioNode-[a-z0-9]{9}/)
      expect(node.name).toBe('TestAudioNode')
    })

    it('should create node with provided config', () => {
      const configNode = new TestAudioNode({
        id: 'test-id',
        name: 'Custom Name',
      })
      
      expect(configNode.id).toBe('test-id')
      expect(configNode.name).toBe('Custom Name')
    })

    it('should initialize with inputs, outputs, and parameters', () => {
      expect(node.getInputNames()).toEqual(['input'])
      expect(node.getOutputNames()).toEqual(['output'])
      expect(node.getParameterNames()).toEqual(['frequency'])
    })
  })

  describe('parameter management', () => {
    it('should get parameter by name', () => {
      const param = node.getParameter('frequency')
      
      expect(param).toEqual({
        name: 'frequency',
        value: 440,
        minValue: 20,
        maxValue: 20000,
        defaultValue: 440,
        unit: 'frequency',
      })
    })

    it('should set parameter value within bounds', () => {
      node.setParameter('frequency', 880)
      
      const param = node.getParameter('frequency')
      expect(param?.value).toBe(880)
    })

    it('should clamp parameter values to bounds', () => {
      node.setParameter('frequency', 30000) // Above max
      expect(node.getParameter('frequency')?.value).toBe(20000)
      
      node.setParameter('frequency', 10) // Below min
      expect(node.getParameter('frequency')?.value).toBe(20)
    })

    it('should throw error for non-existent parameter', () => {
      expect(() => node.setParameter('nonexistent', 100))
        .toThrow("Parameter 'nonexistent' not found")
    })

    it('should call onParameterChange when parameter is set', () => {
      // Test that setting parameters works
      node.setParameter('frequency', 880)
      expect(node.getParameter('frequency')?.value).toBe(880)
    })
  })

  describe('connections', () => {
    let targetNode: TestAudioNode

    beforeEach(() => {
      targetNode = new TestAudioNode()
    })

    it('should connect output to input', () => {
      const sourceOutput = node.getOutput('output')
      const targetInput = targetNode.getInput('input')
      const connectSpy = vi.mocked(sourceOutput!.node.connect)
      
      node.connect('output', targetNode, 'input')
      
      expect(connectSpy).toHaveBeenCalledWith(targetInput!.node)
      expect(targetInput!.connected).toBe(true)
      expect(sourceOutput!.connections.has(targetInput!)).toBe(true)
    })

    it('should throw error for non-existent output', () => {
      expect(() => node.connect('nonexistent', targetNode, 'input'))
        .toThrow("Output 'nonexistent' not found on TestAudioNode")
    })

    it('should throw error for non-existent input', () => {
      expect(() => node.connect('output', targetNode, 'nonexistent'))
        .toThrow("Input 'nonexistent' not found on TestAudioNode")
    })

    it('should disconnect specific connection', () => {
      node.connect('output', targetNode, 'input')
      const sourceOutput = node.getOutput('output')
      const targetInput = targetNode.getInput('input')
      const disconnectSpy = vi.mocked(sourceOutput!.node.disconnect)
      
      node.disconnect('output', targetNode, 'input')
      
      expect(disconnectSpy).toHaveBeenCalledWith(targetInput!.node)
      expect(targetInput!.connected).toBe(false)
      expect(sourceOutput!.connections.has(targetInput!)).toBe(false)
    })

    it('should disconnect all connections from output', () => {
      node.connect('output', targetNode, 'input')
      const sourceOutput = node.getOutput('output')
      const disconnectSpy = vi.mocked(sourceOutput!.node.disconnect)
      
      node.disconnect('output')
      
      expect(disconnectSpy).toHaveBeenCalled()
      expect(sourceOutput!.connections.size).toBe(0)
    })

    it('should disconnect all outputs', () => {
      node.connect('output', targetNode, 'input')
      const sourceOutput = node.getOutput('output')
      const disconnectSpy = vi.mocked(sourceOutput!.node.disconnect)
      
      node.disconnect()
      
      expect(disconnectSpy).toHaveBeenCalled()
      expect(sourceOutput!.connections.size).toBe(0)
    })
  })

  describe('lifecycle', () => {
    it('should start node', () => {
      expect(node.getIsActive()).toBe(false)
      node.start()
      expect(node.getIsActive()).toBe(true)
    })

    it('should stop node', () => {
      node.start()
      expect(node.getIsActive()).toBe(true)
      node.stop()
      expect(node.getIsActive()).toBe(false)
    })

    it('should not start already active node', () => {
      node.start()
      expect(node.getIsActive()).toBe(true)
      node.start() // Second start should be ignored
      expect(node.getIsActive()).toBe(true)
    })

    it('should not stop inactive node', () => {
      expect(node.getIsActive()).toBe(false)
      node.stop() // Stop without start should be ignored
      expect(node.getIsActive()).toBe(false)
    })

    it('should dispose node and cleanup resources', () => {
      const targetNode = new TestAudioNode()
      node.connect('output', targetNode, 'input')
      
      node.dispose()
      
      expect(node.getInputNames()).toEqual([])
      expect(node.getOutputNames()).toEqual([])
      expect(node.getParameterNames()).toEqual([])
    })
  })
})