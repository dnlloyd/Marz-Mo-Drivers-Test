# Mari's Missouri Driver's Practice Test


A React app to help my daughter practice for the Missouri driver’s written exam. It supports practice and mini-test modes, category filters, search, instant feedback, and a review queue that persists across sessions.

> Study aid distilled from the Missouri Driver Guide (Aug 2025). Always verify against the official guide and local laws.

---

## Features

- Practice mode with instant explanations  
- Test mode (15-question mini-tests) with scoring  
- Search and per-category filtering  
- “Wrong answers” review queue (saved in `localStorage`)  
- Question bank loaded from `public/questions.json`

---

## Tech Stack

- **Vite** + **React** + **TypeScript**  
- **Tailwind CSS v4**  
- **Framer Motion**

---

## Getting Started

### Prerequisites
- **Node 18+**
- A package manager: `pnpm`, `yarn`, or `npm`

### Install
```bash
# choose one
pnpm install
# or
yarn
# or
npm install
```

### Project Structure

```
your-project/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ public/
│  ├─ questions.json        # external question bank (see schema below)
│  └─ marz.png              # optional photo shown in header
└─ src/
   ├─ main.tsx
   ├─ App.tsx
   └─ main.css              # Tailwind v4 global stylesheet (see below)
```

### Questions: external JSON schema

Customize questions in `public/questions.json`. The app fetches it at runtime. IDs must be strings (don’t use uid() in JSON).

Schema

```json
[
  {
    "id": "q-exam-basics-1",
    "category": "Exam Basics",
    "prompt": "How many questions are on Missouri's written test, and how many must you answer correctly to pass?",
    "options": ["30 questions; 24 correct", "25 questions; 20 correct", "20 questions; 18 correct", "40 questions; 32 correct"],
    "answerIndex": 1,
    "explanation": "The written test has 25 multiple-choice questions; you must get 20 correct to pass.",
    "refs": "Ch. 1 – Driver Guide overview (25 Q, need 20 correct)"
  }
]
```

The app includes a fallback built-in bank so it still runs without public/questions.json. When questions.json exists, it will be loaded and normalized automatically.
