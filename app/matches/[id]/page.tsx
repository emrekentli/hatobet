"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { formatDate } from "@/lib/utils";

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  homeScore: number | null;
  awayScore: number | null;
  isFinished: boolean;
  isActive: boolean;
  weekNumber: number;
  season: {
    id: string;
    name: string;
  };
  questions: Array<{
    id: string;
    question: string;
    questionType: string;
    options: string[];
    points: number;
    correctAnswer: string | null;
    questionAnswers: Array<{
      id: string;
      answer: string;
      points: number;
      userId: string;
    }>;
  }>;
  predictions: Array<{
    id: string;
    homeScore: number;
    awayScore: number;
    points: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { data: session } = useSession();
  
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Tahmin formu
  const [predictionForm, setPredictionForm] = useState({
    homeScore: "",
    awayScore: ""
  });
  const [submittingPrediction, setSubmittingPrediction] = useState(false);
  const [predictionError, setPredictionError] = useState("");
  const [predictionSuccess, setPredictionSuccess] = useState("");
  
  // Özel soru cevapları
  const [questionAnswers, setQuestionAnswers] = useState<{[key: string]: string}>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<{[key: string]: boolean}>({});
  const [answerError, setAnswerError] = useState<{[key: string]: string}>({});
  const [answerSuccess, setAnswerSuccess] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const fetchMatch = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Maç yüklenemedi");
      
      setMatch(data.match);
      
      // Kullanıcının mevcut tahminini form'a doldur
      if (data.match.predictions) {
        const userPrediction = data.match.predictions.find((p: any) => p.user.email === session?.user?.email);
        if (userPrediction) {
          setPredictionForm({
            homeScore: userPrediction.homeScore.toString(),
            awayScore: userPrediction.awayScore.toString()
          });
        }
      }
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    
    setSubmittingPrediction(true);
    setPredictionError("");
    setPredictionSuccess("");
    
    try {
      const res = await fetch(`/api/matches/${matchId}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: parseInt(predictionForm.homeScore),
          awayScore: parseInt(predictionForm.awayScore)
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Tahmin gönderilemedi");
      
      setPredictionSuccess("Tahmininiz kaydedildi!");
      fetchMatch(); // Maç verilerini tekrar yükle
      
    } catch (err: any) {
      setPredictionError(err.message);
    } finally {
      setSubmittingPrediction(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    if (!answer.trim()) return;
    
    setSubmittingAnswer(prev => ({ ...prev, [questionId]: true }));
    setAnswerError(prev => ({ ...prev, [questionId]: "" }));
    setAnswerSuccess(prev => ({ ...prev, [questionId]: "" }));
    
    try {
      const res = await fetch("/api/questions/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Cevap gönderilemedi");
      }
      
      setAnswerSuccess(prev => ({ ...prev, [questionId]: "Cevabınız kaydedildi!" }));
      setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
      
      // Maç verilerini tekrar yükle
      fetchMatch();
      
    } catch (err: any) {
      setAnswerError(prev => ({ ...prev, [questionId]: err.message }));
    } finally {
      setSubmittingAnswer(prev => ({ ...prev, [questionId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || "Maç bulunamadı"}
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const userPrediction = match.predictions?.find(p => p.user.email === session?.user?.email);
  const canPredict = !match.isFinished && match.isActive;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Maç Başlığı */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {match.homeTeam} vs {match.awayTeam}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {formatDate(match.matchDate)}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {match.season.name} - Hafta {match.weekNumber}
            </p>
          </div>
        </div>

        {/* Maç Sonucu */}
        {match.isFinished && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Maç Sonucu</h2>
            <div className="text-center text-2xl font-bold text-gray-900 dark:text-white">
              {match.homeScore} - {match.awayScore}
            </div>
          </div>
        )}

        {/* Tahmin Formu */}
        {session?.user?.email && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tahmininiz</h2>
            
            {userPrediction ? (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                    {userPrediction.homeScore} - {userPrediction.awayScore}
                  </div>
                  {userPrediction.points > 0 && (
                    <div className="text-green-600 dark:text-green-400 font-medium">
                      +{userPrediction.points} puan kazandınız!
                    </div>
                  )}
                </div>
              </div>
            ) : canPredict ? (
              <form onSubmit={handlePrediction} className="space-y-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {match.homeTeam}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={predictionForm.homeScore}
                      onChange={(e) => setPredictionForm({ ...predictionForm, homeScore: e.target.value })}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center"
                    />
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">-</div>
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {match.awayTeam}
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={predictionForm.awayScore}
                      onChange={(e) => setPredictionForm({ ...predictionForm, awayScore: e.target.value })}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center"
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <button
                    type="submit"
                    disabled={submittingPrediction}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingPrediction ? "Gönderiliyor..." : "Tahmin Gönder"}
                  </button>
                </div>
                
                {predictionError && (
                  <div className="text-center text-red-600 dark:text-red-400">{predictionError}</div>
                )}
                
                {predictionSuccess && (
                  <div className="text-center text-green-600 dark:text-green-400">{predictionSuccess}</div>
                )}
              </form>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                {match.isFinished ? "Maç bitmiş, tahmin yapamazsınız." : "Maç henüz aktif değil."}
              </div>
            )}
          </div>
        )}

        {/* Özel Sorular */}
        {match.questions && match.questions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Özel Sorular</h3>
            <div className="space-y-4">
              {match.questions.map((q: any) => {
                const userAnswer = q.questionAnswers?.find((a: any) => a.userId === session?.user?.id);
                const hasAnswered = !!userAnswer;
                
                return (
                  <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">{q.question}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Puan: {q.points}</div>
                    
                    {hasAnswered ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                        <div className="text-sm text-green-800 dark:text-green-200">
                          <strong>Cevabınız:</strong> {userAnswer.answer}
                        </div>
                        {userAnswer.points > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                            +{userAnswer.points} puan kazandınız!
                          </div>
                        )}
                      </div>
                    ) : match.isFinished ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Maç bitmiş, cevap veremezsiniz.
                      </div>
                    ) : (
                      <div>
                        {q.questionType === "MULTIPLE_CHOICE" && (
                          <div className="space-y-2">
                            {q.options.map((option: string, idx: number) => (
                              <label key={idx} className="flex items-center">
                                <input
                                  type="radio"
                                  name={`question-${q.id}`}
                                  value={option}
                                  onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {q.questionType === "YES_NO" && (
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value="Evet"
                                onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Evet</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="radio"
                                name={`question-${q.id}`}
                                value="Hayır"
                                onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">Hayır</span>
                            </label>
                          </div>
                        )}
                        
                        {q.questionType === "TEXT" && (
                          <input
                            type="text"
                            placeholder="Cevabınızı yazın..."
                            value={questionAnswers[q.id] || ""}
                            onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        )}
                        
                        <button
                          onClick={() => handleAnswerQuestion(q.id, questionAnswers[q.id] || "")}
                          disabled={!questionAnswers[q.id] || submittingAnswer[q.id]}
                          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {submittingAnswer[q.id] ? "Gönderiliyor..." : "Cevabı Gönder"}
                        </button>
                        
                        {answerError[q.id] && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">{answerError[q.id]}</div>
                        )}
                        
                        {answerSuccess[q.id] && (
                          <div className="mt-2 text-sm text-green-600 dark:text-green-400">{answerSuccess[q.id]}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tüm Tahminler */}
        {match.predictions && match.predictions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tüm Tahminler</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tahmin
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Puan
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {match.predictions.map((prediction: any) => (
                    <tr key={prediction.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {prediction.user.name || prediction.user.email}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {prediction.homeScore} - {prediction.awayScore}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {prediction.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 