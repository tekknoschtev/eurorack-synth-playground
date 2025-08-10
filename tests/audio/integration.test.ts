import { describe, it, expect, beforeEach } from 'vitest'
import { getAudioManager, resetAudioManager } from '@/audio/audio-context'
import { EurorackGainNode } from '@/audio/gain-node'
import { getPatchManager, resetPatchManager } from '@/audio/patch-manager'
import { resetMocks } from '../setup'

describe('Audio Engine Integration', () => {
  beforeEach(async () => {
    resetMocks()
    resetAudioManager()
    resetPatchManager()
    
    // Initialize audio system
    await getAudioManager().initialize()
  })

  describe('Basic Audio Flow', () => {
    it('should create and connect audio nodes', () => {
      const patchManager = getPatchManager()
      
      // Create nodes
      const inputGain = new EurorackGainNode({ 
        id: 'input-gain',
        initialGain: 0.5 
      })
      const outputGain = new EurorackGainNode({ 
        id: 'output-gain',
        initialGain: 0.8 
      })
      
      // Register nodes
      patchManager.registerNode(inputGain)
      patchManager.registerNode(outputGain)
      
      // Verify nodes are registered
      expect(patchManager.getNode('input-gain')).toBe(inputGain)
      expect(patchManager.getNode('output-gain')).toBe(outputGain)
      
      // Connect nodes
      const connectionId = patchManager.connect(
        'input-gain', 
        'output', 
        'output-gain', 
        'input'
      )
      
      expect(connectionId).toBeTruthy()
      
      // Verify connection
      const connection = patchManager.getConnection(connectionId)
      expect(connection).toBeDefined()
      expect(connection?.connected).toBe(true)
      
      // Verify parameter control
      inputGain.setGain(0.3)
      expect(inputGain.getGain()).toBe(0.3)
      
      outputGain.setGain(1.0)
      expect(outputGain.getGain()).toBe(1.0)
    })

    it('should validate audio context management', async () => {
      const audioManager = getAudioManager()
      
      expect(audioManager.isInitialized()).toBe(true)
      expect(audioManager.state).toBe('running')
      expect(audioManager.sampleRate).toBe(44100)
      
      // Test context lifecycle
      await audioManager.suspend()
      // Note: Mock doesn't change state, but method should not throw
      
      await audioManager.resume()
      // Note: Mock doesn't change state, but method should not throw
    })

    it('should prevent invalid connections', () => {
      const patchManager = getPatchManager()
      const gainNode = new EurorackGainNode({ id: 'test-gain' })
      patchManager.registerNode(gainNode)
      
      // Test validation
      const result = patchManager.canConnect(
        'non-existent',
        'output',
        'test-gain', 
        'input'
      )
      
      expect(result.canConnect).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('should handle parameter bounds correctly', () => {
      const gainNode = new EurorackGainNode({ 
        id: 'bounded-gain',
        minGain: 0,
        maxGain: 2,
        initialGain: 1 
      })
      
      // Test parameter bounds
      gainNode.setGain(5.0) // Above max
      expect(gainNode.getGain()).toBe(2.0)
      
      gainNode.setGain(-1.0) // Below min  
      expect(gainNode.getGain()).toBe(0.0)
      
      gainNode.setGain(1.5) // Within bounds
      expect(gainNode.getGain()).toBe(1.5)
    })

    it('should support decibel conversions', () => {
      const gainNode = new EurorackGainNode({ id: 'db-gain' })
      
      // Test dB conversions
      gainNode.setGainInDb(0) // 0 dB = 1.0 gain
      expect(gainNode.getGain()).toBeCloseTo(1.0, 3)
      
      gainNode.setGainInDb(-6) // -6 dB ≈ 0.5 gain
      expect(gainNode.getGain()).toBeCloseTo(0.501, 2)
      
      gainNode.setGain(0.5)
      expect(gainNode.getGainInDb()).toBeCloseTo(-6, 1)
    })

    it('should manage multiple connections', () => {
      const patchManager = getPatchManager()
      
      // Create a signal chain: input -> gain1 -> gain2 -> output
      const inputGain = new EurorackGainNode({ id: 'input' })
      const middleGain = new EurorackGainNode({ id: 'middle' })
      const outputGain = new EurorackGainNode({ id: 'output' })
      
      patchManager.registerNode(inputGain)
      patchManager.registerNode(middleGain)
      patchManager.registerNode(outputGain)
      
      // Create connections
      const conn1 = patchManager.connect('input', 'output', 'middle', 'input')
      const conn2 = patchManager.connect('middle', 'output', 'output', 'input')
      
      // Verify connections exist
      expect(patchManager.getConnection(conn1)?.connected).toBe(true)
      expect(patchManager.getConnection(conn2)?.connected).toBe(true)
      
      // Test connection queries
      const inputConnections = patchManager.getOutputConnections('input')
      const outputConnections = patchManager.getInputConnections('output')
      
      expect(inputConnections).toHaveLength(1)
      expect(outputConnections).toHaveLength(1)
      
      // Test disconnection
      patchManager.disconnect(conn1)
      expect(patchManager.getConnection(conn1)).toBeUndefined()
      
      // Verify stats
      const stats = patchManager.getStats()
      expect(stats.nodeCount).toBe(3)
      expect(stats.connectionCount).toBe(1) // One connection left
    })
  })

  describe('Error Handling', () => {
    it('should handle audio context errors gracefully', () => {
      expect(() => {
        const audioManager = getAudioManager()
        audioManager.getContext() // Should work after initialization
      }).not.toThrow()
    })

    it('should handle connection errors gracefully', () => {
      const patchManager = getPatchManager()
      
      expect(() => {
        patchManager.connect('non-existent', 'output', 'also-non-existent', 'input')
      }).toThrow('Source node')
      
      expect(() => {
        patchManager.disconnect('non-existent-connection')
      }).toThrow('Connection')
    })

    it('should handle parameter errors gracefully', () => {
      const gainNode = new EurorackGainNode({ id: 'error-test' })
      
      expect(() => {
        gainNode.setParameter('non-existent-param', 1.0)
      }).toThrow('Parameter')
    })
  })
})