"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import CommonButton from "@/components/CommonButton"
import { formatDate, getCurrentIstanbulDate } from "@/lib/utils"
import { Season } from "@/types/all-types"

interface MatchDetail {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  weekNumber: number
  homeScore: number | null
  awayScore: number | null
  isActive: boolean
  isFinished: boolean
  season: Season
  predictions: Array<{
    id: string
    homeScore: number
    awayScore: number
    points: number
    createdAt: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  questions: Array<{
    id: string
    question: string
    questionType: "MULTIPLE_CHOICE" | "YES_NO" | "TEXT"
    options: string[]
    points: number
    correctAnswer: string | null
    questionAnswers: Array<{
      id: string
      answer: string
      points: number
      userId: string
      user: {
        id: string
        name: string
        email: string
      }
    }>
  }>
}

export default function AdminMatchDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [updatingScore, setUpdatingScore] = useState(false)
  const [scoreForm, setScoreForm] = useState({
    homeScore: "",
    awayScore: ""
  })
  const [predictionSearch, setPredictionSearch] = useState("")
  const [debugData, setDebugData] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  // Authentication check
  useEffect(() => {
    if (status === "loading") return
    
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/auth/login")
      return
    }
    
    fetchMatch()
  }, [session, status, router, matchId])

  const fetchMatch = async () => {
    if (!session?.user || session.user.role !== "ADMIN") return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/matches/${matchId}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Maç bulunamadı")
      }
      const data = await response.json()
      setMatch(data.match)
      setScoreForm({
        homeScore: data.match.homeScore?.toString() || "",
        awayScore: data.match.awayScore?.toString() || ""
      })
    } catch (error: any) {
      setError(error.message || "Maç yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingScore(true)
    setError("")
    
    try {
      const response = await fetch(`/api/matches`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: matchId,
          homeScore: scoreForm.homeScore,
          awayScore: scoreForm.awayScore
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Skor güncellenemedi")
      }
      
      await fetchMatch()
    } catch (error: any) {
      setError(error.message || "Skor güncellenirken hata oluştu")
    } finally {
      setUpdatingScore(false)
    }
  }

  const handleDebugPoints = async () => {
    try {
      const response = await fetch(`/api/debug-points?matchId=${matchId}`)
      if (response.ok) {
        const data = await response.json()
        setDebugData(data)
        setShowDebug(true)
      }
    } catch (error) {
      console.error('Error debugging points:', error)
    }
  }

  const handleRecalculatePoints = async () => {
    try {
      const response = await fetch(`/api/debug-points?matchId=${matchId}`, {
        method: 'POST'
      })
      if (response.ok) {
        await fetchMatch()
        alert('Puanlar yeniden hesaplandı!')
      }
    } catch (error) {
      console.error('Error recalculating points:', error)
    }
  }

  const getStatusText = (match: MatchDetail) => {
    if (match.isFinished) return "Bitti"
    if (new Date(match.matchDate) > getCurrentIstanbulDate()) return "Bekliyor"
    return "Devam Ediyor"
  }

  const getStatusColor = (match: MatchDetail) => {
    if (match.isFinished) return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    if (new Date(match.matchDate) > getCurrentIstanbulDate()) return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
  }

  // Loading state
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

  // Authentication check
  if (!session?.user || session.user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Yetkisiz Erişim
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              {error || "Maç bulunamadı"}
            </h1>
            <Link
              href="/admin/matches"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Maç Listesine Dön
            </Link>
                  </div>
      </div>

      {/* Debug Modal */}
      {showDebug && debugData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Puan Kontrolü - {debugData.match.homeTeam} vs {debugData.match.awayTeam}
              </h2>
              <button
                onClick={() => setShowDebug(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Maç Bilgileri */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Maç Bilgileri</h3>
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                  <p><strong>Skor:</strong> {debugData.match.homeScore} - {debugData.match.awayScore}</p>
                  <p><strong>Kazanan:</strong> {debugData.match.actualWinner}</p>
                  <p><strong>Toplam Tahmin:</strong> {debugData.summary.totalPredictions}</p>
                  <p><strong>Doğru Hesaplanan:</strong> {debugData.summary.correctPredictions}</p>
                  <p><strong>Yanlış Hesaplanan:</strong> {debugData.summary.incorrectPredictions}</p>
                </div>
              </div>

              {/* Tahmin Analizi */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tahmin Analizi</h3>
                <div className="space-y-2">
                  {debugData.predictionAnalysis.map((pred: any, index: number) => (
                    <div key={index} className={`border rounded p-3 ${pred.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{pred.user.name || pred.user.email}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tahmin: {pred.prediction} | Gerçek: {pred.actualScore}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Mevcut Puan: {pred.currentPoints} | Beklenen: {pred.expectedPoints}
                          </p>
                        </div>
                        <span className={`text-sm font-medium ${pred.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                          {pred.isCorrect ? '✓ Doğru' : '✗ Yanlış'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-500">Analiz:</p>
                        <ul className="text-xs text-gray-600 dark:text-gray-400">
                          {pred.analysis.map((item: string, i: number) => (
                            <li key={i}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Özel Soru Analizi */}
              {debugData.questionAnalysis.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Özel Soru Analizi</h3>
                  <div className="space-y-3">
                    {debugData.questionAnalysis.map((question: any, index: number) => (
                      <div key={index} className="border rounded p-3">
                        <p className="font-medium mb-2">{question.question}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Doğru Cevap: {question.correctAnswer} | Puan: {question.points}
                        </p>
                        <div className="space-y-1">
                          {question.answers.map((answer: any, aIndex: number) => (
                            <div key={aIndex} className={`text-sm p-2 rounded ${answer.isCorrect ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700'}`}>
                              <p>{answer.user.name || answer.user.email}: {answer.answer}</p>
                              <p className="text-xs text-gray-500">
                                Mevcut: {answer.currentPoints} | Beklenen: {answer.expectedPoints}
                              </p>
                            </div>
                          ))}
                        </div>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Maç Detayı
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {match.homeTeam} vs {match.awayTeam}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/matches"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Maç Listesi
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Admin Paneli
            </Link>
            {match.isFinished && (
              <div className="flex gap-2">
                <CommonButton
                  type="button"
                  color="gray"
                  size="sm"
                  onClick={handleDebugPoints}
                >
                  Puanları Kontrol Et
                </CommonButton>
                <CommonButton
                  type="button"
                  color="blue"
                  size="sm"
                  onClick={handleRecalculatePoints}
                >
                  Puanları Yeniden Hesapla
                </CommonButton>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Kolon - Maç Bilgileri */}
          <div className="space-y-6">
            {/* Maç Bilgileri */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Maç Bilgileri</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Takımlar:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.homeTeam} vs {match.awayTeam}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tarih:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDate(match.matchDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hafta:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.weekNumber}. Hafta
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Sezon:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {match.season.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Durum:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(match)}`}>
                    {getStatusText(match)}
                  </span>
                </div>
              </div>
            </div>

            {/* Skor Güncelleme */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Skor Güncelle</h2>
              <form onSubmit={handleUpdateScore} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {match.homeTeam} Skor
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreForm.homeScore}
                      onChange={e => setScoreForm({ ...scoreForm, homeScore: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {match.awayTeam} Skor
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={scoreForm.awayScore}
                      onChange={e => setScoreForm({ ...scoreForm, awayScore: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
                <CommonButton
                  type="submit"
                  color="blue"
                  disabled={updatingScore}
                >
                  {updatingScore ? "Güncelleniyor..." : "Skoru Güncelle"}
                </CommonButton>
              </form>
            </div>

            {/* Özel Sorular */}
            {match.questions && match.questions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Özel Sorular</h2>
                <div className="space-y-4">
                  {match.questions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          Soru {index + 1}: {question.question}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {question.points} puan
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Tip: {question.questionType === "MULTIPLE_CHOICE" ? "Çoktan Seçmeli" : 
                              question.questionType === "YES_NO" ? "Evet/Hayır" : "Metin"}
                      </div>
                      {question.correctAnswer && (
                        <div className="text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Doğru Cevap:</span>
                          <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                            {question.correctAnswer}
                          </span>
                        </div>
                      )}
                      {question.questionAnswers && question.questionAnswers.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cevaplar ({question.questionAnswers.length})
                          </h4>
                          <div className="space-y-1">
                            {question.questionAnswers.slice(0, 3).map((answer) => (
                              <div key={answer.id} className="text-xs text-gray-600 dark:text-gray-400">
                                {answer.user.name}: {answer.answer} ({answer.points} puan)
                              </div>
                            ))}
                            {question.questionAnswers.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ... ve {question.questionAnswers.length - 3} cevap daha
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sağ Kolon - Tahminler */}
          <div className="space-y-6">
            {/* Tahmin İstatistikleri */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tahmin İstatistikleri</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {match.predictions.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Toplam Tahmin</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {match.predictions.filter(p => p.points > 0).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Puan Alan</div>
                </div>
              </div>
            </div>

            {/* Tahmin Listesi */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Tahminler</h2>
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={predictionSearch}
                  onChange={e => setPredictionSearch(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {match.predictions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    Henüz tahmin yapılmamış
                  </p>
                ) : (
                  match.predictions
                    .filter(prediction => 
                      predictionSearch === "" || 
                      prediction.user.name?.toLowerCase().includes(predictionSearch.toLowerCase()) ||
                      prediction.user.email?.toLowerCase().includes(predictionSearch.toLowerCase())
                    )
                    .map((prediction) => (
                    <div key={prediction.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {prediction.user.name || prediction.user.email}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Tahmin: <span className="font-medium">{prediction.homeScore} - {prediction.awayScore}</span>
                        </div>
                        {prediction.user.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {prediction.user.email}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(prediction.createdAt).toLocaleString('tr-TR')}
                        </div>
                      </div>
                                              <div className="text-right">
                          <div className={`font-bold ${prediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            {prediction.points} puan
                          </div>
                          <div className={`text-xs font-medium ${prediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {prediction.points > 0 ? '✓ Doğru' : '✗ Yanlış'}
                          </div>
                        </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 