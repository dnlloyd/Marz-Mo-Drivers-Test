// import React, { useEffect, useMemo, useState } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// -----------------------------
// Missouri Driver Practice App
// -----------------------------
// Notes:
// • Questions are now loaded from /public/questions.json (see bottom for quick steps).
// • Tailwind styling; practice/test modes; filters; search; score; review queue.

// Types
interface Question {
  id: string;
  category: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  refs: string;
}

// Tiny helpers
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Local storage keys
const LS_KEYS = {
  wrong: "mo_drivers_wrong_ids",
  lastMode: "mo_drivers_mode",
  lastFilters: "mo_drivers_filters",
};

const MARZ_URL = import.meta.env.BASE_URL + "marz.png";

function useLocalStorage<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState] as const;
}

export default function App() {
  // Load questions from /public/questions.json
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // const res = await fetch("/questions.json", { cache: "no-store" });
        const res = await fetch(import.meta.env.BASE_URL + "questions.json", { cache: "no-store" })
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error("Invalid questions.json format");
        // Minimal normalization
        const normalized: Question[] = json.map((q: any) => ({
          id: String(q.id ?? ""),
          category: String(q.category ?? "Misc"),
          prompt: String(q.prompt ?? ""),
          options: Array.isArray(q.options) ? q.options.map(String) : [],
          answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0,
          explanation: String(q.explanation ?? ""),
          refs: String(q.refs ?? ""),
        }));
        if (!cancelled) setQuestions(normalized);
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || "Failed to load questions.json");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // UI State
  const [mode, setMode] = useLocalStorage<"practice" | "test">(LS_KEYS.lastMode, "practice");
  const [query, setQuery] = useState("");
  const [selectedCats, setSelectedCats] = useLocalStorage<string[]>(LS_KEYS.lastFilters, []);
  const [wrongIds, setWrongIds] = useLocalStorage<string[]>(LS_KEYS.wrong, []);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const allCategories = useMemo(
    () => Array.from(new Set(questions.map((q) => q.category))).sort(),
    [questions]
  );

  // Build filtered question list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cats = new Set(selectedCats);
    return questions.filter((item) => {
      const inCat = cats.size === 0 || cats.has(item.category);
      const inText =
        !q ||
        item.prompt.toLowerCase().includes(q) ||
        item.options.some((o) => o.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);
      return inCat && inText;
    });
  }, [query, selectedCats, questions]);

  // Build test set when switching to test mode
  useEffect(() => {
    if (mode === "test") {
      const pool = filtered.length > 0 ? filtered : questions;
      const sampleCount = Math.min(15, pool.length);
      const sample = shuffle(pool).slice(0, sampleCount);
      setTestQuestions(sample);
      const seed: Record<string, number | null> = {};
      sample.forEach((q) => (seed[q.id] = null));
      setAnswers(seed);
      setSubmitted(false);
    }
  }, [mode, filtered, questions]);

  // Also allow manual reshuffle while already in test mode
  const newTest = () => {
    const pool = filtered.length > 0 ? filtered : questions;
    const sampleCount = Math.min(15, pool.length);
    const sample = shuffle(pool).slice(0, sampleCount);
    setTestQuestions(sample);
    const seed: Record<string, number | null> = {};
    sample.forEach((q) => (seed[q.id] = null));
    setAnswers(seed);
    setSubmitted(false);
    setMode("test");
  };

  // Handlers
  const toggleCat = (c: string) => {
    setSelectedCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const pick = (qid: string, idx: number) => {
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  };

  const score = useMemo(() => {
    const qs = mode === "test" ? testQuestions : filtered;
    let correct = 0;
    let total = 0;
    for (const q of qs) {
      const sel = answers[q.id];
      if (sel != null) {
        total += 1;
        if (sel === q.answerIndex) correct += 1;
      }
    }
    return { correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
  }, [answers, filtered, mode, testQuestions]);

  const onSubmitTest = () => {
    setSubmitted(true);
    const wrongNow = testQuestions
      .filter((q) => (answers[q.id] ?? -1) !== q.answerIndex)
      .map((q) => q.id);
    setWrongIds(Array.from(new Set([...wrongIds, ...wrongNow])));
  };

  const clearWrong = () => setWrongIds([]);

  // Build list to render based on mode
  const listToRender: Question[] = mode === "test" ? testQuestions : filtered;

  const HEADER_VIDEO_URL = import.meta.env.BASE_URL + "Marz-go-kart-crash.mp4";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">

    <header className="relative sticky top-0 z-20 overflow-hidden border-b border-slate-800">
      {/* Background video layer */}
      <div className="absolute inset-0 -z-10 pointer-events-none select-none">
        <video
          className="h-full w-full object-cover opacity-35 motion-safe:opacity-40 motion-reduce:hidden"
          src={HEADER_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        {/* Tint & readability veil */}
        <div className="absolute inset-0 bg-slate-950/50" />
      </div>

      {/* Foreground (your existing header content) */}
      <div className="max-w-5xl mx-auto">

        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">The Marz Missouri Driver Practice Test</h1>
            <p className="text-slate-400 text-sm md:text-base">
              Practice in bite-sized questions, then take a timed-style mini-test.
            </p>
            <p className="text-slate-300 text-xs">
              Download official <a className="underline underline-offset-2 hover:text-slate-100" href="https://dor.mo.gov/forms/Driver%20Guide.pdf">Missouri Driver Guide</a> (Aug 2025)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={MARZ_URL}
              alt="Marz — future Missouri driver"
              className="block h-12 w-12 rounded-full object-cover shadow-md ring-2 ring-emerald-500/40 border border-slate-700"
              loading="eager"
              decoding="async"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${mode === "practice" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}
                onClick={() => setMode("practice")}
              >Practice Mode</button>
              <button
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${mode === "test" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"}`}
                onClick={() => setMode("test")}
              >Test Mode</button>
            </div>
          </div>
        </div>
      </div>
    </header>


      {/* Header */}
      {/* <header className="sticky top-0 z-20 backdrop-blur bg-slate-950/70 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">The Marz Missouri Driver Practice Test</h1>
            <p className="text-slate-400 text-sm md:text-base">
              Practice in bite-sized questions, then take a timed-style mini-test.
            </p>
            <p className="text-slate-300 text-xs">
              Download official <a href="https://dor.mo.gov/forms/Driver%20Guide.pdf">Missouri Driver Guide</a> (Aug 2025)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={MARZ_URL}
              alt="Marz — future Missouri driver"
              className="block h-12 w-12 rounded-full object-cover shadow-md ring-2 ring-emerald-500/40 border border-slate-700"
              loading="eager"
              decoding="async"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <div className="flex gap-2">
              <button
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${mode === "practice" ? "bg-emerald-600 border-emerald-500" : "bg-slate-800 border-slate-700"}`}
                onClick={() => setMode("practice")}
              >Practice Mode</button>
              <button
                className={`px-3 py-2 rounded-xl text-sm font-semibold border ${mode === "test" ? "bg-indigo-600 border-indigo-500" : "bg-slate-800 border-slate-700"}`}
                onClick={() => setMode("test")}
              >Test Mode</button>
            </div>
          </div>
        </div>
      </header> */}

      {/* Controls */}
      <section className="max-w-5xl mx-auto px-4 py-4">
        <div className="grid md:grid-cols-3 gap-3 items-start">
          <div className="md:col-span-2 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keywords (e.g., bus, passing, curb, 100 feet)…"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            <div className="text-sm text-slate-300">
              Questions: <span className="font-semibold">{listToRender.length}</span>
            </div>
            <div className="text-sm text-slate-300">
              Score: <span className="font-semibold">{score.correct}/{score.total}</span>{" "}
              <span className="text-slate-400">({score.percent}%)</span>
            </div>
          </div>
        </div>

        {/* Category filters */}
        <div className="mt-3 flex flex-wrap gap-2">
          {allCategories.map((c) => (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs border ${
                selectedCats.includes(c) ? "bg-sky-600 border-sky-500" : "bg-slate-800 border-slate-700"
              }`}
              title={`Filter: ${c}`}
            >
              {c}
            </button>
          ))}
          {selectedCats.length > 0 && (
            <button
              onClick={() => setSelectedCats([])}
              className="px-3 py-1.5 rounded-full text-xs border bg-slate-700 border-slate-600"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Mode-specific actions */}
        {mode === "test" && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={newTest}
              className="px-3 py-2 rounded-xl text-sm font-semibold border bg-slate-800 border-slate-700"
            >
              New Test
            </button>
            <button
              onClick={onSubmitTest}
              className="px-3 py-2 rounded-xl text-sm font-semibold border bg-indigo-600 border-indigo-500"
            >
              Submit Test
            </button>
            {submitted && (
              <div className="text-sm text-slate-300">
                Result: <span className="font-semibold">{score.correct}/{listToRender.length}</span> correct
              </div>
            )}
          </div>
        )}

        {/* Review wrong answers */}
        {wrongIds.length > 0 && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-200 font-semibold">Review queue: {wrongIds.length} question(s)</div>
              <button onClick={clearWrong} className="text-xs px-2 py-1 rounded-lg border bg-slate-800 border-slate-700">
                Clear
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Questions you miss in Test Mode are saved here for focused practice.</p>
          </div>
        )}

        {loadError && (
          <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-rose-200 text-sm">
            Failed to load <code>public/questions.json</code>: {loadError}. Ensure the file exists and restart dev server if needed.
          </div>
        )}
      </section>

      {/* Questions */}
      <main className="max-w-5xl mx-auto px-4 pb-16">
        <AnimatePresence>
          {listToRender.map((q, i) => {
            const selected = answers[q.id] ?? null;
            const isCorrect = selected != null && selected === q.answerIndex;
            const showFeedback = mode === "practice" ? selected != null : submitted && selected != null;
            const wasWrong = submitted && selected != null && selected !== q.answerIndex;

            return (
              <motion.article
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={`mb-4 rounded-2xl border ${wasWrong ? "border-rose-700" : "border-slate-800"} bg-slate-900 overflow-hidden`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-xs mt-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap">{q.category}</div>
                    <h3 className="text-base md:text-lg font-semibold leading-snug">{i + 1}. {q.prompt}</h3>
                  </div>

                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt, idx) => {
                      const picked = selected === idx;
                      const correct = idx === q.answerIndex;
                      const canShowColor = showFeedback && (picked || correct);

                      return (
                        <button
                          key={idx}
                          disabled={mode === "test" ? submitted : false}
                          onClick={() => pick(q.id, idx)}
                          className={`text-left w-full px-3 py-2 rounded-xl border transition-colors ${
                            canShowColor
                              ? (correct ? "bg-emerald-900/40 border-emerald-700" : picked ? "bg-rose-900/40 border-rose-700" : "bg-slate-800 border-slate-700")
                              : picked
                              ? "bg-slate-800 border-slate-600"
                              : "bg-slate-800 border-slate-700 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className={`mt-1 inline-block h-2 w-2 rounded-full ${picked ? "bg-sky-400" : "bg-slate-600"}`} />
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback */}
                  {showFeedback && (
                    <div className={`mt-3 text-sm rounded-xl px-3 py-2 border ${isCorrect ? "bg-emerald-950/60 border-emerald-800 text-emerald-300" : "bg-rose-950/60 border-rose-800 text-rose-300"}`}>
                      {isCorrect ? "Correct!" : "Not quite."} <span className="text-slate-300">{q.explanation}</span>
                      <div className="text-xs text-slate-400 mt-1">Ref: {q.refs}</div>
                    </div>
                  )}

                  {/* Save wrong in practice too (optional) */}
                  {mode === "practice" && (answers[q.id] ?? null) != null && (answers[q.id] !== q.answerIndex) && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setWrongIds((prev) => (prev.includes(q.id) ? prev : [...prev, q.id]))}
                        className="text-xs px-2 py-1 rounded-lg border bg-slate-800 border-slate-700"
                      >
                        Save to Review
                      </button>
                      {wrongIds.includes(q.id) && <span className="text-xs text-slate-400 self-center">Saved ✓</span>}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {listToRender.length === 0 && !loadError && (
          <div className="text-slate-400 text-sm mt-8">No questions match your filters/search, or questions are still loading…</div>
        )}

        <footer className="mt-12 border-t border-slate-800 pt-6 pb-16 text-xs text-slate-400">
          <p>This educational practice tool is derived from <a href="https://dor.mo.gov/forms/Driver%20Guide.pdf">Missouri Driver Guide</a> content (August 2025). Always consult the official guide and local laws.</p>
        </footer>
      </main>
    </div>
  );
}
