# Eurorack Synth Playground — Development Manifesto

This document defines the **guiding principles and values** for building _Eurorack Synth Playground_.  
It exists to help current and future contributors — including future-me — make good decisions, stay focused, and build with care.


## Game Overview

_Eurorack Synth Playground_ is an interactive, browser-based sandbox for exploring modular synthesis.  
Players will:

- Arrange and interact with eurorack-style modules in a realistic double-stack rack.
- Adjust sliders, knobs, switches, and patch cables to create evolving soundscapes.
- See visual feedback such as LEDs, waveform displays, or sound-reactive meters.
- Optionally customize the visual appearance of modules in future updates.

The focus is **creativity and play** — no scoring, no time limits. Just sonic exploration.


## Core Development Principles

### 1. **TDD-First**
- Always write tests before or alongside implementation.
- High unit test coverage is a goal, but coverage must reflect meaningful tests — no empty assertions.
- Favor lightweight testing libraries and assertion helpers.
- Avoid testing implementation details; test behavior.

### 2. **Simplicity Over Cleverness**
- Prefer **boring, understandable code**.
- Avoid “one-liners” that sacrifice clarity for brevity.
- Write code that you’ll still understand six months from now.

### 3. **Testability by Design**
- Structure code so UI, rendering, and audio logic are **unit-testable**.
- Avoid deep coupling between modules — think “small building blocks”.

### 4. **Domain-Driven Organization**
- Group files by domain/feature (e.g., `/modules/oscillator`, `/modules/filter`), not by type (`/components`, `/tests`).
- Keep related code together — tests live alongside the code they verify.

### 5. **In-Browser, No Backend**
- This is a **static-site project** — all code runs in-browser, no server required for deployment.
- Development uses Vite’s **local dev server** for hot reload, but production build outputs static HTML/CSS/JS.
- All state is stored in **localStorage** or **IndexedDB**.
- No user tracking or analytics.
- Bundle should be small enough for offline use.

### 6. **Accessible & Performant**
- Keep UI accessible to mouse, keyboard, and touch users.
- Avoid heavy dependencies that bloat the bundle or slow rendering.

### 7. **Mobile-Friendly by Design**
- The game should be fully usable on **phones and tablets**.
- Use **responsive layouts** that adapt to different screen sizes and orientations.
- Avoid hover-only interactions — all controls must be operable via **touch input**.
- Maintain legibility with scalable fonts and touch targets of at least 44px.
- Test on at least one desktop and one mobile device before merging changes.

### 8. **Visual Style Consistency**
- The aesthetic should have a **2D pixel-shader vibe** with soft edges and no hard/black outlines.
- Color palette should lean toward slightly muted or harmonious tones rather than stark, high-contrast colors.
- Visual effects (LED glows, waveform displays) should feel cohesive with the overall pixel-art style.
- Any new visual assets should be reviewed in-game to ensure they blend with existing art and do not break immersion.


## File Structure

```
src/
  modules/        # Feature modules (oscillator, filter, etc.)
  audio/          # Audio engine and processing code
  ui/             # UI components
  utils/          # Small shared helpers
  styles/         # Styling files
tests/
  modules/        # Tests live alongside code when possible
```

## Long-Term Vision

Future enhancements could include:
- Visual customization (module colors, skins).
- More module types (sequencers, effects, samplers).
- Cable routing animations and sound visualization modes.
- Saving/sharing patch presets locally or via file export.

But **for now**, the focus is:  
> "A simple, functional, testable eurorack simulator that feels satisfying to interact with."
