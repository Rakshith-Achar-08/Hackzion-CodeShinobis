# TokenScope

> Analyze, visualize, and optimize your LLM prompt tokens. See exactly what each word costs.

A full-stack web application that helps you understand token usage, visualize word importance via TF-IDF scoring, and get optimized (trimmed) prompts that reduce cost without losing meaning.

---

## Screenshots

- **Dark mode** with token importance highlighting
- **Side-by-side** original vs. trimmed prompt comparison
- **Animated** stats cards with live token/cost counters

---

## Tech Stack

| Layer    | Technologies                                          |
|----------|-------------------------------------------------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS v4, Framer Motion, Lucide Icons, Axios |
| Backend  | Python 3.11+, FastAPI, Uvicorn, tiktoken, scikit-learn, OpenAI SDK |

---

## Project Structure

```
/token-scope
├── backend/
│   ├── main.py             # FastAPI app with /analyze endpoint
│   ├── utils.py             # Token counting, TF-IDF, trimming logic
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main application component
│   │   ├── main.tsx          # React entry point
│   │   ├── index.css         # Global styles + Tailwind
│   │   ├── components/       # Header, StatsCard, HighlightedPrompt, etc.
│   │   └── lib/api.ts        # API client
│   ├── vite.config.ts        # Vite config with proxy
│   └── index.html            # HTML shell
└── README.md
```

---

## Getting Started

### Prerequisites

- **Python 3.11+** installed
- **Node.js 18+** and npm installed
- **OpenAI API Key** (get one at [platform.openai.com/api-keys](https://platform.openai.com/api-keys))

### 1. Backend Setup

```bash
cd backend

# Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### 3. CORS

CORS is configured to allow all origins (`*`) in development. The Vite dev server also proxies `/analyze` and `/health` to `http://localhost:8000`, so API calls work seamlessly.

---

## How It Works

1. **Enter your prompt** in the textarea
2. **Select a model** (GPT-3.5 Turbo or GPT-4o Mini)
3. **Enter your OpenAI API key** (saved locally in your browser)
4. **Click "Analyze Prompt"** (or press `Ctrl/⌘ + Enter`)
5. **View results:**
   - Token counts + estimated USD cost
   - Token importance heatmap (TF-IDF based)
   - Full LLM response
   - Suggested trimmed prompt with savings breakdown

### Token Importance (TF-IDF)

- Uses `TfidfVectorizer` from scikit-learn on a two-document corpus: `[prompt, response]`
- Each word in the prompt gets a normalized importance score (0–1)
- Words are color-coded: orange (high), amber (medium), gray (low)

### Prompt Trimming

- Removes words with importance score below 0.35
- Preserves structural/grammatical words for readability
- Shows exact token reduction and dollar savings

---

## OpenAI Pricing (used for cost estimation)

| Model          | Input (per 1K tokens) | Output (per 1K tokens) |
|----------------|----------------------|------------------------|
| gpt-3.5-turbo  | $0.0005              | $0.0015                |
| gpt-4o-mini    | $0.00015             | $0.0006                |

---

## Features

- ✅ Accurate token counting via `tiktoken`
- ✅ TF-IDF word importance visualization
- ✅ Smart prompt trimming with savings
- ✅ Dark/Light mode with smooth transitions
- ✅ Framer Motion animations throughout
- ✅ Keyboard shortcut (Ctrl/⌘ + Enter)
- ✅ Copy buttons with toast notifications
- ✅ Session history (last 3 analyses)
- ✅ Mobile-responsive layout
- ✅ Loading skeletons
- ✅ Error handling with friendly messages

---

## License

MIT
