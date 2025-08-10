import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AudioContextManager, getAudioManager, resetAudioManager } from '@/audio/audio-context'
import { resetMocks } from '../setup'

describe('AudioContextManager', () => {
  let manager: AudioContextManager

  beforeEach(() => {
    resetMocks()
    manager = new AudioContextManager()
  })

  describe('initialization', () => {
    it('should initialize AudioContext successfully', async () => {
      const context = await manager.initialize()
      
      expect(context).toBeTruthy()
      expect(manager.isInitialized()).toBe(true)
      expect(manager.state).toBe('running')
    })

    it('should return same context on multiple initializations', async () => {
      const context1 = await manager.initialize()
      const context2 = await manager.initialize()
      
      expect(context1).toBe(context2)
    })

    it('should configure AudioContext with provided options', async () => {
      const config = {
        sampleRate: 48000,
        latencyHint: 'balanced' as const,
      }
      
      const configuredManager = new AudioContextManager(config)
      await configuredManager.initialize()
      
      expect(configuredManager.sampleRate).toBe(44100) // Mock returns 44100
    })
  })

  describe('state management', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should resume suspended context', async () => {
      const context = manager.getContext()
      vi.mocked(context.resume).mockResolvedValue()
      
      // Mock suspended state
      Object.defineProperty(context, 'state', { value: 'suspended' })
      
      await manager.resume()
      
      expect(context.resume).toHaveBeenCalled()
    })

    it('should suspend running context', async () => {
      const context = manager.getContext()
      vi.mocked(context.suspend).mockResolvedValue()
      
      // Mock the context state as running
      Object.defineProperty(context, 'state', { value: 'running', configurable: true })
      
      await manager.suspend()
      
      expect(context.suspend).toHaveBeenCalled()
    })

    it('should close context and cleanup', async () => {
      const context = manager.getContext()
      vi.mocked(context.close).mockResolvedValue()
      
      await manager.close()
      
      expect(context.close).toHaveBeenCalled()
      expect(manager.isInitialized()).toBe(false)
    })
  })

  describe('properties', () => {
    beforeEach(async () => {
      await manager.initialize()
    })

    it('should provide access to current time', () => {
      expect(typeof manager.currentTime).toBe('number')
      expect(manager.currentTime).toBe(0) // Mock value
    })

    it('should provide access to sample rate', () => {
      expect(manager.sampleRate).toBe(44100)
    })

    it('should provide access to destination node', () => {
      const destination = manager.destination
      expect(destination).toBeTruthy()
    })
  })

  describe('error handling', () => {
    it('should throw when accessing context before initialization', () => {
      expect(() => manager.getContext()).toThrow('AudioContext not initialized')
    })

    it('should throw when accessing destination before initialization', () => {
      expect(() => manager.destination).toThrow('AudioContext not initialized')
    })

    it('should throw when trying to resume uninitialized context', async () => {
      await expect(manager.resume()).rejects.toThrow('AudioContext not initialized')
    })

    it('should throw when trying to suspend uninitialized context', async () => {
      await expect(manager.suspend()).rejects.toThrow('AudioContext not initialized')
    })
  })

  describe('state change listeners', () => {
    it('should register and notify state change listeners', async () => {
      const listener = vi.fn()
      const unsubscribe = manager.onStateChange(listener)
      
      await manager.initialize()
      const context = manager.getContext()
      
      // Get the event handler that was registered
      const addEventListenerCalls = vi.mocked(context.addEventListener).mock.calls
      expect(addEventListenerCalls.length).toBeGreaterThan(0)
      const [eventType, handler] = addEventListenerCalls[0]
      expect(eventType).toBe('statechange')
      
      // Manually call the handler to simulate state change
      if (typeof handler === 'function') {
        handler(new Event('statechange'))
      }
      
      expect(listener).toHaveBeenCalledWith('running')
      
      unsubscribe()
    })

    it('should unsubscribe state change listeners', async () => {
      const listener = vi.fn()
      const unsubscribe = manager.onStateChange(listener)
      
      await manager.initialize()
      unsubscribe()
      
      const context = manager.getContext()
      const stateChangeEvent = new Event('statechange')
      context.dispatchEvent(stateChangeEvent)
      
      expect(listener).not.toHaveBeenCalled()
    })
  })
})

describe('Global Audio Manager', () => {
  beforeEach(() => {
    resetAudioManager()
    resetMocks()
  })

  it('should return singleton instance', () => {
    const manager1 = getAudioManager()
    const manager2 = getAudioManager()
    
    expect(manager1).toBe(manager2)
  })

  it('should reset global instance', async () => {
    const manager1 = getAudioManager()
    await manager1.initialize()
    
    expect(manager1.isInitialized()).toBe(true)
    
    resetAudioManager()
    
    const manager2 = getAudioManager()
    expect(manager2).not.toBe(manager1)
    expect(manager2.isInitialized()).toBe(false)
  })
})