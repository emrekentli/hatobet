"use client";
import { useEffect, useState } from "react";
import type { Season } from "@/types/all-types";
import CommonButton from "@/components/CommonButton";

interface TimedQuestion {
  id: string;
  question: string;
  questionType: string;
  options: string[];
  deadline: string;
  points: number;
  seasonId: string;
  userAnswer?: string;
}

export default function TimedQuestionsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [questions, setQuestions] = useState<TimedQuestion[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Sezonları çek
  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data) => setSeasons(data.seasons || []));
  }, []);

  // Soruları ve cevapları çek
  useEffect(() => {
    if (!selectedSeasonId) return;
    setLoading(true);
    fetch(`/api/timed-questions?seasonId=${selectedSeasonId}`)
      .then((res) => res.json())
      .then(async (data) => {
        setQuestions(data.questions || []);
        // Kullanıcının cevaplarını çek
        if (data.questions && data.questions.length > 0) {
          const ids = data.questions.map((q: any) => q.id).join(",");
          const ansRes = await fetch(`/api/question-answers?questionIds=${ids}`);
          const ansData = await ansRes.json();
          if (ansData.answers) {
            const answerMap: { [questionId: string]: string } = {};
            ansData.answers.forEach((a: any) => { answerMap[a.questionId] = a.answer; });
            setAnswers(answerMap);
          } else {
            setAnswers({});
          }
        } else {
          setAnswers({});
        }
      })
      .finally(() => setLoading(false));
  }, [selectedSeasonId]);

  // Cevap değişikliği
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Cevap kaydet (API'ya bağlı)
  const handleSave = async (question: TimedQuestion) => {
    setSaving(question.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/question-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: question.id, answer: answers[question.id] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cevap kaydedilemedi");
      setSuccess("Cevabınız kaydedildi!");
      setTimeout(() => setSuccess(""), 1500);
    } catch (error: any) {
      setError(error.message || "Cevap kaydedilemedi");
    } finally {
      setSaving(null);
    }
  };

  // Süre kontrolü
  const isLocked = (q: TimedQuestion) => {
    if (!q.deadline) return false;
    return new Date(q.deadline) < new Date();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Zamanlı Sorular
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sezona bağlı zamanlı soruları cevaplayın
            </p>
          </div>
        </div>

        {/* Filtreler */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Filtreler
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sezon
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={selectedSeasonId}
                onChange={e => setSelectedSeasonId(e.target.value)}
              >
                <option value="">Sezon seçin</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sorular */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-700 dark:text-gray-300">
            Bu sezonda zamanlı soru yok.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Soru Listesi ({questions.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map((q) => (
                <div key={q.id} className="px-6 py-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-gray-900 dark:text-white text-base">{q.question}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Bitiş: {q.deadline ? new Date(q.deadline).toLocaleString() : "-"}</div>
                  </div>
                  <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">Puan: {q.points}</div>
                  <div className="mb-2">
                    {q.questionType === "MULTIPLE_CHOICE" && (
                      <div className="space-y-2">
                        {q.options.map((opt, idx) => (
                          <label key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              disabled={isLocked(q)}
                              className="form-radio text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-200">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.questionType === "YES_NO" && (
                      <div className="flex gap-4">
                        {["Evet", "Hayır"].map((opt) => (
                          <label key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q_${q.id}`}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              disabled={isLocked(q)}
                              className="form-radio text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-900 dark:text-gray-200">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.questionType === "TEXT" && (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        value={answers[q.id] || ""}
                        onChange={e => handleAnswerChange(q.id, e.target.value)}
                        disabled={isLocked(q)}
                      />
                    )}
                  </div>
                  <div className="flex justify-end">
                    <CommonButton
                      type="button"
                      color="blue"
                      size="sm"
                      onClick={() => handleSave(q)}
                      disabled={isLocked(q) || !answers[q.id] || saving === q.id}
                    >
                      {isLocked(q)
                        ? "Süre Doldu"
                        : saving === q.id
                          ? "Kaydediliyor..."
                          : (answers[q.id] ? "Kaydet" : "Cevapla")}
                    </CommonButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {success && <div className="mt-6 text-green-600 dark:text-green-400 text-sm">{success}</div>}
        {error && <div className="mt-6 text-red-600 dark:text-red-400 text-sm">{error}</div>}
      </div>
    </div>
  );
} 