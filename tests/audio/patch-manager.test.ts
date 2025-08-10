import { describe, it, expect, beforeEach } from 'vitest'
import { PatchManager, getPatchManager, resetPatchManager } from '@/audio/patch-manager'
import { EurorackAudioNode } from '@/audio/audio-node'
import { resetMocks } from '../setup'

// Test implementation for patch manager tests
class TestOscillatorNode extends EurorackAudioNode {
  protected initialize(): void {
    const oscillator = this.context.createOscillator()
    this.createOutput('output', oscillator)
    this.createParameter('frequency', 440, 20, 20000, 'Hz')
  }

  protected onParameterChange(_name: string, _value: number): void {}
  protected onStart(_when?: number): void {}
  protected onStop(_when?: number): void {}
  protected onDispose(): void {}
}

class TestFilterNode extends EurorackAudioNode {
  protected initialize(): void {
    const filter = this.context.createBiquadFilter()
    this.createInput('input', filter)
    this.createOutput('output', filter)
    this.createParameter('frequency', 1000, 20, 20000, 'Hz')
  }

  protected onParameterChange(_name: string, _value: number): void {}
  protected onStart(_when?: number): void {}
  protected onStop(_when?: number): void {}
  protected onDispose(): void {}
}

describe('PatchManager', () => {
  let patchManager: PatchManager
  let oscillator: TestOscillatorNode
  let filter: TestFilterNode

  beforeEach(async () => {
    resetMocks()
    // Initialize audio context first
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()
    
    patchManager = new PatchManager()
    oscillator = new TestOscillatorNode({ id: 'osc-1' })
    filter = new TestFilterNode({ id: 'filter-1' })
  })

  describe('node registration', () => {
    it('should register nodes', () => {
      patchManager.registerNode(oscillator)
      patchManager.registerNode(filter)
      
      expect(patchManager.getNode('osc-1')).toBe(oscillator)
      expect(patchManager.getNode('filter-1')).toBe(filter)
      expect(patchManager.getAllNodes()).toEqual([oscillator, filter])
    })

    it('should throw error for duplicate node registration', () => {
      patchManager.registerNode(oscillator)
      
      expect(() => patchManager.registerNode(oscillator))
        .toThrow("Node with ID 'osc-1' is already registered")
    })

    it('should unregister nodes', () => {
      patchManager.registerNode(oscillator)
      patchManager.unregisterNode('osc-1')
      
      expect(patchManager.getNode('osc-1')).toBeUndefined()
      expect(patchManager.getAllNodes()).toEqual([])
    })

    it('should handle unregistering non-existent node', () => {
      expect(() => patchManager.unregisterNode('non-existent')).not.toThrow()
    })
  })

  describe('connections', () => {
    beforeEach(() => {
      patchManager.registerNode(oscillator)
      patchManager.registerNode(filter)
    })

    it('should create connection between nodes', () => {
      const connectionId = patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      expect(connectionId).toMatch(/^patch-[a-z0-9]+$/)
      
      const connection = patchManager.getConnection(connectionId)
      expect(connection).toEqual({
        id: connectionId,
        sourceNodeId: 'osc-1',
        sourceOutput: 'output',
        targetNodeId: 'filter-1',
        targetInput: 'input',
        connected: true,
      })
    })

    it('should throw error for non-existent source node', () => {
      expect(() => patchManager.connect('non-existent', 'output', 'filter-1', 'input'))
        .toThrow("Source node 'non-existent' not found")
    })

    it('should throw error for non-existent target node', () => {
      expect(() => patchManager.connect('osc-1', 'output', 'non-existent', 'input'))
        .toThrow("Target node 'non-existent' not found")
    })

    it('should throw error for already connected input', () => {
      patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      expect(() => patchManager.connect('osc-1', 'output', 'filter-1', 'input'))
        .toThrow("Input 'input' on node 'filter-1' is already connected")
    })

    it('should disconnect connection', () => {
      const connectionId = patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      patchManager.disconnect(connectionId)
      
      expect(patchManager.getConnection(connectionId)).toBeUndefined()
    })

    it('should throw error for disconnecting non-existent connection', () => {
      expect(() => patchManager.disconnect('non-existent'))
        .toThrow("Connection 'non-existent' not found")
    })

    it('should disconnect all connections for a node', () => {
      const connectionId = patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      patchManager.disconnectAllForNode('osc-1')
      
      expect(patchManager.getConnection(connectionId)).toBeUndefined()
    })
  })

  describe('connection queries', () => {
    let connectionId: string

    beforeEach(() => {
      patchManager.registerNode(oscillator)
      patchManager.registerNode(filter)
      connectionId = patchManager.connect('osc-1', 'output', 'filter-1', 'input')
    })

    it('should get all connections', () => {
      const connections = patchManager.getAllConnections()
      
      expect(connections).toHaveLength(1)
      expect(connections[0].id).toBe(connectionId)
    })

    it('should get connections for a node', () => {
      const oscConnections = patchManager.getConnectionsForNode('osc-1')
      const filterConnections = patchManager.getConnectionsForNode('filter-1')
      
      expect(oscConnections).toHaveLength(1)
      expect(filterConnections).toHaveLength(1)
      expect(oscConnections[0].id).toBe(connectionId)
      expect(filterConnections[0].id).toBe(connectionId)
    })

    it('should get output connections', () => {
      const connections = patchManager.getOutputConnections('osc-1', 'output')
      
      expect(connections).toHaveLength(1)
      expect(connections[0].sourceNodeId).toBe('osc-1')
      expect(connections[0].sourceOutput).toBe('output')
    })

    it('should get input connections', () => {
      const connections = patchManager.getInputConnections('filter-1', 'input')
      
      expect(connections).toHaveLength(1)
      expect(connections[0].targetNodeId).toBe('filter-1')
      expect(connections[0].targetInput).toBe('input')
    })

    it('should find connection to input', () => {
      const connection = patchManager.findConnectionToInput('filter-1', 'input')
      
      expect(connection?.id).toBe(connectionId)
    })

    it('should find connections from output', () => {
      const connections = patchManager.findConnectionFromOutput('osc-1', 'output')
      
      expect(connections).toHaveLength(1)
      expect(connections[0].id).toBe(connectionId)
    })
  })

  describe('validation', () => {
    beforeEach(() => {
      patchManager.registerNode(oscillator)
      patchManager.registerNode(filter)
    })

    it('should validate successful connection', () => {
      const result = patchManager.canConnect('osc-1', 'output', 'filter-1', 'input')
      
      expect(result.canConnect).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should validate non-existent source node', () => {
      const result = patchManager.canConnect('non-existent', 'output', 'filter-1', 'input')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe("Source node 'non-existent' not found")
    })

    it('should validate non-existent target node', () => {
      const result = patchManager.canConnect('osc-1', 'output', 'non-existent', 'input')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe("Target node 'non-existent' not found")
    })

    it('should validate non-existent output', () => {
      const result = patchManager.canConnect('osc-1', 'non-existent', 'filter-1', 'input')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe("Output 'non-existent' not found on source node")
    })

    it('should validate non-existent input', () => {
      const result = patchManager.canConnect('osc-1', 'output', 'filter-1', 'non-existent')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe("Input 'non-existent' not found on target node")
    })

    it('should validate already connected input', () => {
      patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      const result = patchManager.canConnect('osc-1', 'output', 'filter-1', 'input')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe('Target input is already connected')
    })

    it('should prevent feedback loops', () => {
      // Create nodes with both inputs and outputs to test feedback prevention
      const node1 = new TestFilterNode({ id: 'node-1' })
      const node2 = new TestFilterNode({ id: 'node-2' })
      
      patchManager.registerNode(node1)
      patchManager.registerNode(node2)
      
      // Connect node1 -> node2
      patchManager.connect('node-1', 'output', 'node-2', 'input')
      
      // Try to connect node2 -> node1 (would create cycle)
      const result = patchManager.canConnect('node-2', 'output', 'node-1', 'input')
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe('Connection would create feedback loop')
    })

    it('should validate connection limit', () => {
      const limitedManager = new PatchManager({ maxConnections: 1 })
      const osc1 = new TestOscillatorNode({ id: 'osc-1' })
      const filter1 = new TestFilterNode({ id: 'filter-1' })
      const filter2 = new TestFilterNode({ id: 'filter-2' })
      
      limitedManager.registerNode(osc1)
      limitedManager.registerNode(filter1)
      limitedManager.registerNode(filter2)
      
      // First connection should succeed
      limitedManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      // Second connection should fail due to limit
      const result = limitedManager.canConnect('osc-1', 'output', 'filter-2', 'input')
      expect(result.canConnect).toBe(false)
      expect(result.reason).toBe('Maximum number of connections reached')
    })
  })

  describe('utilities', () => {
    beforeEach(() => {
      patchManager.registerNode(oscillator)
      patchManager.registerNode(filter)
    })

    it('should provide statistics', () => {
      const stats = patchManager.getStats()
      
      expect(stats).toEqual({
        nodeCount: 2,
        connectionCount: 0,
        maxConnections: 1000,
      })
      
      patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      const updatedStats = patchManager.getStats()
      expect(updatedStats.connectionCount).toBe(1)
    })

    it('should clear all nodes and connections', () => {
      patchManager.connect('osc-1', 'output', 'filter-1', 'input')
      
      patchManager.clear()
      
      expect(patchManager.getAllNodes()).toEqual([])
      expect(patchManager.getAllConnections()).toEqual([])
    })
  })
})

describe('Global Patch Manager', () => {
  beforeEach(() => {
    resetPatchManager()
    resetMocks()
  })

  it('should return singleton instance', () => {
    const manager1 = getPatchManager()
    const manager2 = getPatchManager()
    
    expect(manager1).toBe(manager2)
  })

  it('should reset global instance', async () => {
    const { getAudioManager } = await import('@/audio/audio-context')
    await getAudioManager().initialize()
    
    const manager1 = getPatchManager()
    const oscillator = new TestOscillatorNode({ id: 'test-osc' })
    manager1.registerNode(oscillator)
    
    expect(manager1.getAllNodes()).toHaveLength(1)
    
    resetPatchManager()
    
    const manager2 = getPatchManager()
    expect(manager2).not.toBe(manager1)
    expect(manager2.getAllNodes()).toHaveLength(0)
  })
})