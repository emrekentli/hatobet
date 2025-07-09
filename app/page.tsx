"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import { formatDate, isMatchStarted, isMatchFinished } from "@/lib/utils"

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  weekNumber: number
  homeScore: number | null
  awayScore: number | null
  isActive: boolean
  isFinished: boolean
  userPrediction?: {
    homeScore: number
    awayScore: number
    points?: number
    userId: string; // Added userId to the interface
  }
  questions?: {
    id: string;
    question: string;
    questionType: "MULTIPLE_CHOICE" | "YES_NO" | "TEXT";
    options?: string[];
    points: number;
    questionAnswers?: {
      answer: string;
      points: number;
    }[];
  }[];
}

interface Season {
  id: string
  name: string
  status: string
  totalWeeks: number
}

export default function HomePage() {
  const { data: session, status } = useSession()
  const [matches, setMatches] = useState<Match[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<number>(0)
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [predicting, setPredicting] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<{[key: string]: {homeScore: string, awayScore: string}}>({})
  const [successStates, setSuccessStates] = useState<{[key: string]: boolean}>({})

  // Özel soru cevapları için state
  const [questionAnswers, setQuestionAnswers] = useState<{[key: string]: string}>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<{[key: string]: boolean}>({});
  const [answerError, setAnswerError] = useState<{[key: string]: string}>({});
  const [answerSuccess, setAnswerSuccess] = useState<{[key: string]: string}>({});

  // Maç detay modalı için state
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [matchPredictions, setMatchPredictions] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Aktif sezonu ve maçları getir
  const fetchActiveSeasonAndMatches = async () => {
    try {
      // Kullanıcı maçlarını getir (aktif sezon ve tahminler dahil)
      const matchesResponse = await fetch("/api/matches")
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json()
        setMatches(matchesData.matches)
        setSeason(matchesData.season)
        
        // Mevcut haftaları hesapla
        const weeks = [...new Set(matchesData.matches.map((m: Match) => m.weekNumber))] as number[]
        setAvailableWeeks(weeks.sort((a, b) => a - b))
        
        if (weeks.length > 0) {
          setSelectedWeek(weeks[0]) // İlk haftayı seç
        }
      }
    } catch (error) {
      console.error("Veri getirilemedi:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchActiveSeasonAndMatches()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status])

  // Tahmin yap
  const handleMakePrediction = async (matchId: string) => {
    const matchPrediction = predictions[matchId]
    if (!matchPrediction?.homeScore || !matchPrediction?.awayScore) {
      alert("Lütfen her iki skoru da girin")
      return
    }

    setPredicting(matchId)
    try {
      const response = await fetch(`/api/predictions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          matchId,
          homeScore: parseInt(matchPrediction.homeScore),
          awayScore: parseInt(matchPrediction.awayScore),
        }),
      })

      if (response.ok) {
        // Maçları yenile
        fetchActiveSeasonAndMatches()
        // Bu maçın tahminini temizle
        setPredictions(prev => {
          const newPredictions = { ...prev }
          delete newPredictions[matchId]
          return newPredictions
        })
        setPredicting(null)
        
        // Başarı durumunu göster
        setSuccessStates(prev => ({ ...prev, [matchId]: true }))
        setTimeout(() => {
          setSuccessStates(prev => ({ ...prev, [matchId]: false }))
        }, 2000)
      } else {
        const data = await response.json()
        alert(data.error || "Tahmin yapılamadı")
      }
    } catch (error) {
      alert("Tahmin yapılırken hata oluştu")
    } finally {
      setPredicting(null)
    }
  }

  // Özel soruya cevap gönderme fonksiyonu
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
      if (!res.ok) throw new Error(data.error || "Cevap gönderilemedi");
      setAnswerSuccess(prev => ({ ...prev, [questionId]: "Cevabınız kaydedildi!" }));
      setQuestionAnswers(prev => ({ ...prev, [questionId]: answer }));
      // Maçları tekrar yükle
      fetchActiveSeasonAndMatches();
    } catch (err: any) {
      setAnswerError(prev => ({ ...prev, [questionId]: err.message }));
    } finally {
      setSubmittingAnswer(prev => ({ ...prev, [questionId]: false }));
    }
  };

  // Maç detaylarını getir
  const fetchMatchDetails = async (matchId: string) => {
    setLoadingPredictions(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/predictions`);
      if (res.ok) {
        const data = await res.json();
        setMatchPredictions(data.predictions);
      }
    } catch (error) {
      console.error("Maç detayları getirilemedi:", error);
    } finally {
      setLoadingPredictions(false);
    }
  };

  // Maç modalını aç
  const openMatchModal = async (match: any) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
    await fetchMatchDetails(match.id);
  };

  // Maç durumunu getir
  const getMatchStatus = (match: Match) => {
    if (match.isFinished) {
      return "Tamamlandı"
    } else if (isMatchStarted(match.matchDate)) {
      return "Devam Ediyor"
    } else {
      return "Bekliyor"
    }
  }

  // Maç durumu rengini getir
  const getMatchStatusColor = (match: Match) => {
    if (match.isFinished) {
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
    } else if (isMatchStarted(match.matchDate)) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
    } else {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
  }

  // Tarih formatını düzenle - artık utils'den geliyor
  // const formatDate fonksiyonunu kaldır

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              HatoBet
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Maç tahmin oyununa hoş geldiniz
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <button
              onClick={() => signIn()}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Giriş Yap
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!season ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aktif Sezon Bulunamadı
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Henüz aktif bir sezon başlatılmamış.
            </p>
          </div>
        ) : (
          <>
            {/* Hafta Seçici */}
            {availableWeeks.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hafta:
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {availableWeeks.map((week) => (
                      <option key={week} value={week}>
                        {week}. Hafta
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Maç Listesi */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Maçlar
                </h2>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {matches
                  .filter(match => selectedWeek === 0 || match.weekNumber === selectedWeek)
                  .map((match) => (
                    <div key={match.id} className="p-6">
                                              <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4">
                              <div className="text-center flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {match.homeTeam}
                                </div>
                                {match.homeScore !== null && (
                                  <div className="text-2xl font-bold text-blue-600">
                                    {match.homeScore}
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-center">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(match.matchDate)}
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  {match.weekNumber}. Hafta
                                </div>
                                {match.isFinished && (
                                  <div className="mt-1">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                      Tamamlandı
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="text-center flex-1">
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {match.awayTeam}
                                </div>
                                {match.awayScore !== null && (
                                  <div className="text-2xl font-bold text-blue-600">
                                    {match.awayScore}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        {/* Tahmin formu ve sonuç gösterimi */}
                        <div className="flex items-center gap-4 min-w-[320px]">
                          {(match.isFinished || isMatchStarted(match.matchDate)) ? (
                            // Maç tamamlandı veya başladı - sonuç veya uyarı göster
                            <div className="flex flex-col items-end space-y-2">
                              {match.isFinished ? (
                                match.userPrediction && match.userPrediction.userId === session?.user?.id ? (
                                  <div className="text-right">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      Tahmininiz: <span className="font-semibold text-gray-900 dark:text-white">{match.userPrediction.homeScore} - {match.userPrediction.awayScore}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      Puanınız: <span className={`font-bold ${match.userPrediction.points && match.userPrediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{match.userPrediction.points || 0}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    Tahmin yapmadınız
                                  </div>
                                )
                              ) : (
                                <div className="text-sm text-yellow-600 dark:text-yellow-400">
                                  Tahmin süresi doldu
                                </div>
                              )}
                              {match.isFinished && (
                                <button
                                  onClick={() => openMatchModal(match)}
                                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                                >
                                  Tüm tahminleri gör
                                </button>
                              )}
                            </div>
                          ) : (
                            // Maç henüz tamamlanmadı - tahmin formu
                            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0 w-full max-w-xs justify-end">
                              <div className="flex items-center space-x-2 w-full">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  placeholder="0"
                                  value={
                                    predictions[match.id]?.homeScore ??
                                    (typeof match.userPrediction?.homeScore === 'number' ? match.userPrediction.homeScore : "")
                                  }
                                  onChange={(e) => setPredictions(prev => ({
                                    ...prev,
                                    [match.id]: {
                                      homeScore: e.target.value,
                                      awayScore: prev[match.id]?.awayScore ?? (typeof match.userPrediction?.awayScore === 'number' ? String(match.userPrediction.awayScore) : "")
                                    }
                                  }))}
                                  className="w-12 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <span className="text-gray-500">-</span>
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  placeholder="0"
                                  value={
                                    predictions[match.id]?.awayScore ??
                                    (typeof match.userPrediction?.awayScore === 'number' ? match.userPrediction.awayScore : "")
                                  }
                                  onChange={(e) => setPredictions(prev => ({
                                    ...prev,
                                    [match.id]: {
                                      homeScore: prev[match.id]?.homeScore ?? (typeof match.userPrediction?.homeScore === 'number' ? String(match.userPrediction.homeScore) : ""),
                                      awayScore: e.target.value
                                    }
                                  }))}
                                  className="w-12 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleMakePrediction(match.id)}
                                  disabled={predicting === match.id}
                                  className={`px-3 py-1 text-white text-sm rounded disabled:opacity-50 transition-colors duration-200 ${
                                    successStates[match.id]
                                      ? "bg-green-600 hover:bg-green-700"
                                      : "bg-blue-600 hover:bg-blue-700"
                                  }`}
                                >
                                  {predicting === match.id
                                    ? "Gönderiliyor..."
                                    : successStates[match.id]
                                      ? "✓ Kaydedildi"
                                      : "Tahmin Yap"
                                  }
                                </button>
                              </div>
                              {match.userPrediction && match.userPrediction.userId === session?.user?.id && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 md:ml-4 md:mt-0 mt-1 text-right w-full">
                                  Tahmininiz: <span className="font-semibold text-gray-700 dark:text-gray-200">{match.userPrediction.homeScore} - {match.userPrediction.awayScore}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!match.isFinished && !isMatchStarted(match.matchDate) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              Bekliyor
                            </span>
                          )}
                        </div>
                        {match.questions && match.questions.length > 0 && (
                          <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Özel Sorular</h4>
                            <div className="space-y-4">
                              {match.questions.map((q: any) => {
                                const userAnswer = q.questionAnswers && q.questionAnswers[0];
                                const hasAnswered = !!userAnswer;
                                return (
                                  <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                                    <div className="font-medium text-gray-900 dark:text-white mb-1 text-sm">{q.question}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Puan: {q.points}</div>
                                    {hasAnswered ? (
                                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
                                        <div className="text-xs text-green-800 dark:text-green-200">
                                          <strong>Cevabınız:</strong> {userAnswer.answer}
                                        </div>
                                        {userAnswer.points > 0 && (
                                          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            +{userAnswer.points} puan kazandınız!
                                          </div>
                                        )}
                                      </div>
                                    ) : match.isFinished ? (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Maç bitmiş, cevap veremezsiniz.
                                      </div>
                                    ) : (
                                      <div>
                                        {q.questionType === "MULTIPLE_CHOICE" && (
                                          <div className="space-y-1">
                                            {q.options.map((option: string, idx: number) => (
                                              <label key={idx} className="flex items-center">
                                                <input
                                                  type="radio"
                                                  name={`question-${q.id}`}
                                                  value={option}
                                                  onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                  className="mr-2"
                                                />
                                                <span className="text-xs text-gray-700 dark:text-gray-300">{option}</span>
                                              </label>
                                            ))}
                                          </div>
                                        )}
                                        {q.questionType === "YES_NO" && (
                                          <div className="space-y-1">
                                            <label className="flex items-center">
                                              <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                value="Evet"
                                                onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                className="mr-2"
                                              />
                                              <span className="text-xs text-gray-700 dark:text-gray-300">Evet</span>
                                            </label>
                                            <label className="flex items-center">
                                              <input
                                                type="radio"
                                                name={`question-${q.id}`}
                                                value="Hayır"
                                                onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                className="mr-2"
                                              />
                                              <span className="text-xs text-gray-700 dark:text-gray-300">Hayır</span>
                                            </label>
                                          </div>
                                        )}
                                        {q.questionType === "TEXT" && (
                                          <input
                                            type="text"
                                            placeholder="Cevabınızı yazın..."
                                            value={questionAnswers[q.id] || ""}
                                            onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                            className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs"
                                          />
                                        )}
                                        <button
                                          onClick={() => handleAnswerQuestion(q.id, questionAnswers[q.id] || "")}
                                          disabled={!questionAnswers[q.id] || submittingAnswer[q.id]}
                                          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                                        >
                                          {submittingAnswer[q.id] ? "Gönderiliyor..." : "Cevabı Gönder"}
                                        </button>
                                        {answerError[q.id] && (
                                          <div className="mt-1 text-xs text-red-600 dark:text-red-400">{answerError[q.id]}</div>
                                        )}
                                        {answerSuccess[q.id] && (
                                          <div className="mt-1 text-xs text-green-600 dark:text-green-400">{answerSuccess[q.id]}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )})}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                
                {matches.filter(match => selectedWeek === 0 || match.weekNumber === selectedWeek).length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Bu haftada maç bulunamadı.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Maç detay modalı */}
      {showMatchModal && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setShowMatchModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Kapat"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
              </h3>
              <div className="text-center text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedMatch.homeScore} - {selectedMatch.awayScore}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                {formatDate(selectedMatch.matchDate)} • {selectedMatch.weekNumber}. Hafta
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Skor Tahminleri */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skor Tahminleri</h4>
                
                {loadingPredictions ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Tahminler yükleniyor...</p>
                  </div>
                ) : matchPredictions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sıra
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Kullanıcı
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tahmin
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Puan
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {matchPredictions.map((prediction, index) => (
                          <tr key={prediction.id} className={prediction.user.email === session?.user?.email ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {prediction.user.name || prediction.user.email}
                              {prediction.user.email === session?.user?.email && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-1 py-0.5 rounded">
                                  Siz
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {prediction.homeScore} - {prediction.awayScore}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              <span className={`font-bold ${prediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                {prediction.points}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Bu maç için henüz tahmin yapılmamış.
                  </div>
                )}
              </div>

              {/* Özel Sorular */}
              {selectedMatch.questions && selectedMatch.questions.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Özel Sorular</h4>
                  <div className="space-y-4">
                    {selectedMatch.questions.map((question: any) => (
                      <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="font-medium text-gray-900 dark:text-white mb-2">{question.question}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Puan: {question.points}</div>
                        
                        {question.correctAnswer && (
                          <div className="text-sm text-green-600 dark:text-green-400 mb-3">
                            <strong>Doğru Cevap:</strong> {question.correctAnswer}
                          </div>
                        )}
                        
                        {question.questionAnswers && question.questionAnswers.length > 0 ? (
                          <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Kullanıcı Cevapları:</div>
                            {question.questionAnswers.map((answer: any) => (
                              <div key={answer.id} className={`flex justify-between items-center p-2 rounded text-sm ${
                                answer.userId === session?.user?.id ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-700"
                              }`}>
                                <div className="flex items-center">
                                  <span className="text-gray-900 dark:text-white">
                                    {answer.user?.name || answer.user?.email}
                                  </span>
                                  {answer.userId === session?.user?.id && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-1 py-0.5 rounded">
                                      Siz
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-gray-700 dark:text-gray-300">{answer.answer}</span>
                                  <span className={`font-bold text-xs ${
                                    answer.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {answer.points > 0 ? `+${answer.points}` : '0'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Bu soruya henüz cevap verilmemiş.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
