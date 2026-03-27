# AGENTS.md

## Project
Small browser-playable decipherment alpha built with vanilla TypeScript and Vite.

## Primary goals
- Keep the implementation extremely small.
- Favor clarity and maintainability over abstraction.
- Build only what is needed for the alpha.
- Do not introduce framework complexity.

## Tech constraints
- Vanilla TypeScript
- Vite
- Plain CSS
- No frontend framework
- No backend
- No external dependencies unless clearly necessary

## File structure
Keep a flat `src` structure unless there is a strong reason to change it.

Expected files:
- `main.ts`
- `styles.css`
- `types.ts`
- `data.ts`
- `state.ts`
- `render.ts`
- `events.ts`

## Data assumptions
- Sign ids match PNG filenames in `public/symbols`.
- The corpus shape is:

```ts
type Inscription = {
  id: string;
  words: string[][];
};
