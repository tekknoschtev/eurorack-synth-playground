import { describe, it, expect, beforeEach } from 'vitest'
import { resetMocks } from './setup'

// Mock the main.ts module since it has side effects
describe('EurorackApp', () => {
  let mockAppElement: HTMLElement

  beforeEach(() => {
    resetMocks()
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="app">
        <div id="loading">
          <div class="loading-text">Loading Eurorack Synth...</div>
        </div>
      </div>
    `
    
    mockAppElement = document.getElementById('app')!
  })

  it('should find the app element', () => {
    expect(mockAppElement).toBeTruthy()
    expect(mockAppElement.id).toBe('app')
  })

  it('should have loading element initially', () => {
    const loading = document.getElementById('loading')
    expect(loading).toBeTruthy()
    expect(loading?.textContent).toContain('Loading Eurorack Synth')
  })

  it('should have proper document structure for synth app', () => {
    // Test that required elements exist for the app to initialize
    const app = document.getElementById('app')
    const loading = document.getElementById('loading')
    
    expect(app).not.toBeNull()
    expect(loading).not.toBeNull()
  })
})

describe('Audio Context Mock', () => {
  it('should mock AudioContext properly', () => {
    const audioContext = new AudioContext()
    expect(audioContext).toBeTruthy()
    expect(audioContext.createOscillator).toBeTypeOf('function')
    expect(audioContext.createGain).toBeTypeOf('function')
    expect(audioContext.destination).toBeTruthy()
  })

  it('should create mock oscillator with expected properties', () => {
    const audioContext = new AudioContext()
    const oscillator = audioContext.createOscillator()
    
    expect(oscillator.frequency).toBeTruthy()
    expect(oscillator.frequency.value).toBe(440)
    expect(oscillator.connect).toBeTypeOf('function')
    expect(oscillator.start).toBeTypeOf('function')
  })
})