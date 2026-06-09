import { Quiz } from "@/components/Quiz";
import { questions } from "@/lib/quiz";

export default function QuizPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Final Quiz</h1>
        <p className="text-slate-400 mt-2 max-w-2xl">
          {questions.length} questions across all chapters. Mix of beginner → expert.
        </p>
      </header>
      <Quiz questions={questions} />
    </div>
  );
}
