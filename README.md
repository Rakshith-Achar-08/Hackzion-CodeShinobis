# TokenScope Pro

**See your prompts like an engineer: token math, word-level heatmaps, trim savings, and risk signals—in one polished Streamlit dashboard.**

This repo is the **Hackzion / CodeShinobis** frontend: a production-style UI wired to a real analysis API. Paste a prompt (and optional assistant reply), hit **Analyze**, and watch token usage, importance scores, waste tokens, an optimized prompt, cost savings, and quality cues come alive.

---

## What we shipped (the journey)

### Core experience

- **Live token feel** — Rough live counts and estimated cost update as you type, before you even analyze.
- **One-click examples** — Three curated prompts to demo savings and heatmaps instantly.
- **Full analysis panel** — Token usage metrics, importance heatmap, waste-token list, disabled “optimized prompt” preview, animated **Cost saved %**, and a **quality risk** badge.
- **Prompt comparison** — Original vs optimized side by side with the same heatmap language you already trust.
- **Risk gauge** — Progress + labeled risk level for a quick gut check.
- **Export** — Download a plain-text report when you have a successful run.

### Phase-style UX upgrades

- **History (last 5)** — Sidebar remembers recent runs with snippet, savings %, and risk; one click reloads the full result and inputs.
- **Dark / light theme** — Toggle in the header; session-safe `st.session_state["theme"]`.
- **Ctrl+Enter** — From prompt or response fields, triggers Analyze without hunting for the button.
- **Loading skeleton** — Pulse placeholders inside the spinner so the wait feels intentional.
- **Responsive layout** — Horizontal blocks wrap on narrow viewports so nothing feels “broken” on mobile.

### Visual layer

- **Premium dark gradient + glass-style cards** — Custom CSS on top of Streamlit: cyan accents, blurred panels, gradient buttons, styled metrics and progress bars—without touching your Python analysis logic.

### Backend integration (the big win)

The UI is built to talk to **[tokenScope-backend](https://github.com/Rakshith-Achar-08/tokenScope-backend)** (FastAPI):

| Your UI sends | Their API expects |
|---------------|-------------------|
| `text` (your prompt) | `text` |
| `model` (e.g. `gemini-1.5-flash`) | `model` |

The app maps their JSON (`heatmap_data`, `cost_card`, `trimmed_prompt`, `diff_preview`, …) into the shape the dashboard already understands—so you get **real heatmaps, real savings, real trim** instead of mock data when the server is up.

**Environment knobs (optional):**

| Variable | Default | Purpose |
|----------|---------|---------|
| `TOKENSCOPE_API_BASE` | `http://127.0.0.1:8000` | API root (no trailing slash needed) |
| `TOKENSCOPE_MODEL` | `gemini-1.5-flash` | Model key their cost table supports |

If the API is down or the prompt is empty, the app **falls back to mock data** and surfaces the error so you are never stuck on a blank screen.

### Also in this repo

- **`backend/`** — An alternate FastAPI stack (OpenAI + tiktoken-style flow) for experiments; the **Streamlit app is configured for tokenScope-backend by default**, not this module path.

---

## Tech stack (as built)

| Layer | Stack |
|--------|--------|
| **Frontend** | Python 3.11+, Streamlit, `requests` |
| **Primary API** | FastAPI, Uvicorn, YAKE, token + cost helpers *(tokenScope-backend, separate clone)* |

---

## Project structure

```
Hackzion-CodeShinobis/
├── frontend/
│   └── app.py              # TokenScope Pro — UI, session state, API client, CSS
├── backend/                # Optional / legacy FastAPI (OpenAI-oriented)
│   ├── main.py
│   ├── utils.py
│   └── requirements.txt
└── README.md
```

---

## Run it end-to-end

### 1. Start tokenScope-backend

Clone and run from **that** project’s root (sibling or separate folder—your choice):

```bash
cd path/to/tokenScope-backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health check: `GET http://127.0.0.1:8000/health`

### 2. Start TokenScope Pro (this repo)

```bash
cd Hackzion-CodeShinobis
pip install streamlit requests
streamlit run frontend/app.py
```

Streamlit opens in the browser; ensure **`TOKENSCOPE_API_BASE`** matches where uvicorn listens if you are not on port 8000.

### 3. Use it

1. Paste a **prompt** (required for the real API).
2. Optionally paste an **AI response** (used in the UI and for rough “response side” estimates; the friend’s backend scores the **prompt**).
3. Press **Analyze** or **Ctrl+Enter** in a text field.
4. Explore heatmap, savings, history, theme, and export.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| “Backend unavailable” / mock data | Start tokenScope-backend; check port and `TOKENSCOPE_API_BASE`. |
| `422` from FastAPI | Body must be `{"text": "...", "model": "..."}` — the shipped `app.py` already does this. |
| `ModuleNotFoundError: backend` | If using **this** repo’s `backend/` package, run uvicorn from the folder that **contains** the `backend` package (see that backend’s docs). |

---

## License

MIT

---

*Built as a capstone-style full-stack slice: serious token economics, a friend’s analysis engine, and a frontend that feels like a product—not a homework script.*
