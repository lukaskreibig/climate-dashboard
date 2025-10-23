# Developer Onboarding

Welcome! This guide gets you productive quickly and outlines the conventions used throughout the repository.

---

## 1. Local environment

### Prerequisites

- Node.js 20+ with Corepack enabled (`corepack enable`).
- Python 3.11 (virtualenv recommended).
- Yarn 3 (`yarn set version berry` handled automatically via `packageManager` field).
- Mapbox + MapTiler API keys (free tier is sufficient for development).
- Optional: Docker if you prefer running services in containers.

### Bootstrap commands

```bash
# clone
git clone git@github.com:lukaskreibig/climate-dashboard.git
cd climate-dashboard

# frontend
cd frontend
yarn install
cp .env.local.example .env.local   # create this file if it does not exist

# backend
cd ../backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

See the repository README for run/start commands.

---

## 2. Coding conventions

### Type safety

- **Frontend** — extend `frontend/types/` first, then consume types in React components. Avoid `any`; use discriminated unions for scene configs.
- **Backend** — update `backend/schemas.py` alongside database changes. Pydantic models are the canonical schema.

### Styling & UI

- TailwindCSS 4 powers global tokens; utility classes should remain readable. Use CSS variables declared in `globals.css`.
- For bespoke styling (GSAP-heavy elements), consider co-located CSS modules.
- Prefer Radix primitives for accessible dialogs, tooltips, and popovers.

### State & hooks

- React Server Components are used for static layout; anything interactive runs in a `use client` component.
- Keep GSAP timelines inside `useLayoutEffect` blocks and clean them up via `ctx.revert()`.
- When you need global state (rare), use `useRef` and modules rather than context to keep bundle size small.

### Linting & formatting

- Prettier is not enforced; rely on ESLint + Tailwind plugin (`yarn lint`).
- CSS is checked with Stylelint (`npx stylelint "components/**/*.css"`).
- Python code follows `black` (not yet enforced) and `ruff` (optional).

---

## 3. Data & pipelines

- Development mode can rely on the JSON fallback shipped in `backend/data/data.json`.
- To test against fresh data:
  1. Run `python data-pipeline/update_pipeline.py`.
  2. Run `python data-pipeline/update_fjord_data.py`.
  3. Restart the backend (`uvicorn main:app --reload`).
- For the Sentinel‑2 segmentation job see [docs/DATA_PIPELINE.md](DATA_PIPELINE.md#sentinel-2-sea-ice-segmentation).

---

## 4. Testing workflow

Command checklist before opening a pull request:

```bash
cd frontend
yarn lint
yarn test
yarn tsc --noEmit
pytest ../backend        # run from repo root or backend/
yarn test:e2e            # Playwright (ensure `yarn dev` running)
```

> Tip: Playwright requires the dev server to be running (`yarn dev`). Install the browsers once via `yarn playwright install`.

---

## 5. Git & branching

- Use feature branches named `feat/...`, `fix/...`, or `docs/...`.
- Keep commits focused; squash before merging if the history is noisy.
- Pull requests should include:
  - Summary of changes
  - Testing evidence (commands run, screenshots or GIF for UI work)
  - Any follow-up tasks or TODOs

---

## 6. Tooling suggestions

- **VS Code extensions**
  - Tailwind CSS IntelliSense
  - ESLint
  - i18n Ally (for translations)
  - Python (Microsoft)
- **Recommended settings**

  ```json
  {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "tailwindCSS.experimental.classRegex": [["clsx\\(([^)]*)\\)"]],
    "files.associations": { "*.css": "tailwindcss" }
  }
  ```

- **Terminal aliases**
  - `alias yt="(cd frontend && yarn test)"`, `alias yl="(cd frontend && yarn lint)"`

---

## 7. When in doubt

- Read the architecture doc (`docs/ARCHITECTURE.md`) to understand data flow.
- Ping @lukaskreibig for access or direction.
- Document new decisions in `docs/` so the knowledge base stays fresh.

Happy building! 🚀
