import './styles/main.css'

class EurorackApp {
  private appElement: HTMLElement

  constructor() {
    const app = document.getElementById('app')
    if (!app) {
      throw new Error('App element not found')
    }
    this.appElement = app
    this.init()
  }

  private async init(): Promise<void> {
    try {
      this.showLoadingState()
      await this.setupAudioContext()
      this.render()
      this.hideLoadingState()
    } catch (error) {
      this.showError(error as Error)
    }
  }

  private showLoadingState(): void {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.style.display = 'flex'
    }
  }

  private hideLoadingState(): void {
    const loading = document.getElementById('loading')
    if (loading) {
      loading.style.display = 'none'
    }
  }

  private async setupAudioContext(): Promise<void> {
    // Audio context setup will be implemented in Phase 2
    console.log('Audio context setup placeholder')
  }

  private render(): void {
    this.appElement.innerHTML = `
      <div class="synth-container">
        <header class="synth-header">
          <h1>Eurorack Synth Playground</h1>
        </header>
        <main class="rack-container">
          <div class="rack">
            <div class="rack-row rack-row--top">
              <!-- Top rack modules will go here -->
            </div>
            <div class="rack-row rack-row--bottom">
              <!-- Bottom rack modules will go here -->
            </div>
          </div>
        </main>
      </div>
    `
  }

  private showError(error: Error): void {
    this.appElement.innerHTML = `
      <div class="error-container">
        <h2>Error Loading Synth</h2>
        <p>${error.message}</p>
        <button onclick="location.reload()">Reload</button>
      </div>
    `
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new EurorackApp()
})