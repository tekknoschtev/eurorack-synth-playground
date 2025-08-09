# Eurorack Synth Playground

An interactive, browser-based modular synthesizer sandbox.  
Arrange eurorack-style modules, connect patch cables, tweak knobs, and create evolving soundscapes — all in your browser.


## Features (MVP)
- Realistic double-stack eurorack rack layout
- Modules with knobs, sliders, switches, LEDs, and waveform displays
- Patch cables connecting module inputs/outputs
- Pixel-shader-inspired visuals with soft edges and subtle lighting effects
- Fully responsive UI — works on desktop, tablet, and mobile
- All state stored locally (no backend, no tracking)
- Runs entirely in-browser


## Tech Stack
- **TypeScript**
- **Lightweight testing**: Vitest + Testing Library
- **Build**: Vite (for dev convenience; production build is static files)
- **Deployment**: GitHub Pages (static content)


## Development Philosophy
This project follows a **TDD-first** approach.  
See [`CLAUDE.md`](CLAUDE.md) for the full development manifesto.

Key points:
- **No clever code** — boring, understandable code wins.
- **Group files by domain**, not by type.
- **Static site** — no backend; all features work offline.
- **Mobile-first considerations** — touch-friendly, responsive, tested on multiple devices.
- **Consistent visual style** — maintain the 2D pixel-shader aesthetic with soft edges and cohesive color palette.


## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/eurorack-synth-playground.git
cd eurorack-synth-playground
```


## Contributing

- Follow TDD — write tests first or alongside implementation.
- Keep PRs small and focused on one change.
- Name branches descriptively: feature/add-oscillator, fix/led-flicker.
- Test on both desktop and mobile before merging.
- Run tests before pushing.