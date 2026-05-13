# App Status

## Summary

Snake God is currently in a playable prototype state.

- Build: passing with `npm run build`
- Typecheck and tests: passing with `npm test`
- Runtime model: browser-based TypeScript game bundled with esbuild
- UI: playable pixel-art interface with reward, rest, and pause overlays

## Current Gameplay State

- Combat is auto-battled with a fast card cadence.
- The player uses a 10-card starter deck: 4 `Strike`, 4 `Coil`, 2 `Hiss`.
- Enemy actions resolve on a 2-card rhythm.
- Enemy intents are `ATTACK` and `EMPOWER`.
- Block decays on the 3-card cycle boundary.
- Snake color identity is based on the full deck, not the draw pile.
- Reward and rest screens show the current deck for decision-making.
- Pause is available from the button and `Escape`.

## Attrition Rules

- `CONSUME` heals 25% of missing health.
- `SHED` removes one card and permanently reduces max HP by 4.
- Enemy damage scales with map progression.

## Repo Cleanup Status

- `node_modules/` is now ignored.
- `dist/` is now ignored.
- Generated and dependency files were removed from git tracking and left in the working tree for local use.

## Recommended Next Steps

- Commit the cleanup so the repository stops tracking generated files.
- Push the cleanup commit to update `main`.
- Do a browser smoke test on pause flow, reward deck preview, and enemy intent readability.