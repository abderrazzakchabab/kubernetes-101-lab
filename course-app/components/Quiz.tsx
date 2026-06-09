"use client";
import { useState } from "react";
import type { Question } from "@/lib/quiz";

export function Quiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = questions.reduce((n, q) => n + (answers[q.id] === q.answer ? 1 : 0), 0);
  const allAnswered = questions.every((q) => answers[q.id] !== undefined);

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => {
        const picked = answers[q.id];
        const correct = q.answer;
        return (
          <div key={q.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <div className="text-xs font-mono text-muted mb-2">Q{qi + 1}</div>
            <div className="font-medium mb-3">{q.prompt}</div>
            <div className="space-y-2">
              {q.choices.map((choice, i) => {
                const isPicked = picked === i;
                const showCorrect = submitted && i === correct;
                const showWrong = submitted && isPicked && i !== correct;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                    className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors duration-200 cursor-pointer
                      ${showCorrect ? "border-accent/60 bg-accent/10 text-accent" : ""}
                      ${showWrong ? "border-danger/60 bg-danger/10 text-rose-300" : ""}
                      ${!submitted && isPicked ? "border-accent2/60 bg-accent2/10 text-accent2" : ""}
                      ${!submitted && !isPicked ? "border-slate-700 hover:border-slate-500" : ""}
                      ${submitted && !showCorrect && !showWrong ? "border-slate-800 text-slate-500" : ""}`}
                  >
                    <span className="font-mono text-xs mr-2 opacity-70">{String.fromCharCode(65 + i)}</span>
                    {choice}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <div className="mt-3 text-sm text-slate-400 border-l-2 border-accent/40 pl-3">
                {q.explanation}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-4">
        {!submitted ? (
          <button
            type="button"
            disabled={!allAnswered}
            onClick={() => setSubmitted(true)}
            className="cursor-pointer px-5 py-2.5 rounded-xl bg-accent text-slate-900 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors duration-200"
          >
            Submit answers
          </button>
        ) : (
          <>
            <div className="text-lg">
              Score: <span className="font-mono text-accent">{score}</span> / {questions.length}
            </div>
            <button
              type="button"
              onClick={() => { setSubmitted(false); setAnswers({}); }}
              className="cursor-pointer px-4 py-2 rounded-xl border border-slate-700 hover:border-accent2/60 transition-colors duration-200 text-sm"
            >
              Retake
            </button>
          </>
        )}
      </div>
    </div>
  );
}
