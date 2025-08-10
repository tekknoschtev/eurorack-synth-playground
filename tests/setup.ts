// Test setup file for Vitest
import { vi } from 'vitest'

// Mock Web Audio API for testing
const mockAudioContext = {
  createOscillator: vi.fn(() => ({
    frequency: { value: 440, setValueAtTime: vi.fn() },
    detune: { value: 0, setValueAtTime: vi.fn() },
    type: 'sine',
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  createGain: vi.fn(() => {
    const mockGainNode = {
      gain: { 
        value: 1, 
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(), 
        exponentialRampToValueAtTime: vi.fn()
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
    return mockGainNode
  }),
  createBiquadFilter: vi.fn(() => ({
    frequency: { value: 1000, setValueAtTime: vi.fn() },
    Q: { value: 1, setValueAtTime: vi.fn() },
    type: 'lowpass',
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  createAnalyser: vi.fn(() => ({
    fftSize: 256,
    frequencyBinCount: 128,
    smoothingTimeConstant: 0.8,
    getByteFrequencyData: vi.fn((array) => {
      // Fill with some mock frequency data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.random() * 255
      }
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  destination: {
    connect: vi.fn(),
    disconnect: vi.fn(),
  },
  currentTime: 0,
  sampleRate: 44100,
  state: 'running',
  resume: vi.fn(() => Promise.resolve()),
  suspend: vi.fn(() => Promise.resolve()),
  close: vi.fn(() => Promise.resolve()),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn((_event: Event) => {
    // Simple event dispatch simulation
    return true
  }),
}

// Mock global AudioContext
;(global as any).AudioContext = vi.fn(() => mockAudioContext)
;(global as any).webkitAudioContext = vi.fn(() => mockAudioContext)

// Mock requestAnimationFrame for testing
;(global as any).requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  setTimeout(cb, 16)
  return 1
})

;(global as any).cancelAnimationFrame = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

;(global as any).localStorage = localStorageMock

// Mock performance.now() for consistent timing in tests
;(global as any).performance = {
  ...(global as any).performance,
  now: vi.fn(() => Date.now()),
}

// Cleanup function to reset mocks between tests
export function resetMocks(): void {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
}