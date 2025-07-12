"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import CommonModal from "@/components/CommonModal"
import CommonButton from "@/components/CommonButton"
import { formatDate } from "@/lib/utils"
import { Match, Season } from "@/types/all-types"

interface SpecialQuestion {
  id: number
  question: string
  type: "TEXT" | "MULTIPLE_CHOICE" | "YES_NO"
  options: string[]
  answer: string | null
  points: number
}

function toDatetimeLocal(dateString: string) {
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function AdminMatchesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editMatch, setEditMatch] = useState<Match | null>(null)
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    matchDate: "",
    weekNumber: 1,
    seasonId: "",
    homeScore: "",
    awayScore: "",
    specialQuestions: [] as SpecialQuestion[]
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("")
  const [selectedWeek, setSelectedWeek] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [currentWeek, setCurrentWeek] = useState<number>(1)
  const [availableSeasons, setAvailableSeasons] = useState<Season[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Authentication check
  useEffect(() => {
    if (status === "loading") return
    
    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/auth/login")
      return
    }
    
    fetchMatches()
  }, [session, status, router])

  // Maçları getir
  const fetchMatches = async () => {
    if (!session?.user || session.user.role !== "ADMIN") return
    
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedSeasonId) params.append("seasonId", selectedSeasonId)
      if (selectedWeek > 0) params.append("week", selectedWeek.toString())
      if (searchTerm.trim()) params.append("search", searchTerm.trim())
      
      console.log('API request params:', params.toString())
      const response = await fetch(`/api/matches?${params}`)
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Maçlar yüklenirken hata oluştu")
      }
      const data = await response.json()
      setMatches(data.matches)
      setCurrentSeason(data.currentSeason)
      setCurrentWeek(data.currentWeek)
      setAvailableSeasons(data.availableSeasons)
      setAvailableWeeks(data.availableWeeks)
      
      // İlk yüklemede mevcut sezon ve haftayı seç (sadece bir kez)
      if (!isInitialized) {
        if (!selectedSeasonId && data.currentSeason) {
          setSelectedSeasonId(data.currentSeason.id)
          setFormData(prev => ({ ...prev, seasonId: data.currentSeason.id }))
        }
        if (selectedWeek === 0 && data.currentWeek) {
          setSelectedWeek(data.currentWeek)
          setFormData(prev => ({ ...prev, weekNumber: data.currentWeek }))
        }
        setIsInitialized(true)
      }
    } catch (error: any) {
      setError(error.message || "Maçlar yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === "ADMIN" && isInitialized) {
      console.log('Fetching matches with:', { selectedSeasonId, selectedWeek, searchTerm })
      fetchMatches()
    }
  }, [selectedSeasonId, selectedWeek, searchTerm])

  // Modal işlemleri
  const openModal = (match?: Match) => {
    if (match) {
      setEditMatch(match)
      setFormData({
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        matchDate: toDatetimeLocal(match.matchDate),
        weekNumber: match.weekNumber,
        seasonId: selectedSeasonId,
        homeScore: match.homeScore?.toString() || "",
        awayScore: match.awayScore?.toString() || "",
        specialQuestions: match.questions?.map((q, idx) => ({
          id: Number.isNaN(Number(q.id)) ? Date.now() + idx : Number(q.id),
          question: q.question,
          type: q.questionType as "TEXT" | "MULTIPLE_CHOICE" | "YES_NO",
          options: q.options || [],
          answer: q.correctAnswer || null,
          points: q.points
        })) || []
      })
    } else {
      setEditMatch(null)
      setFormData({
        homeTeam: "",
        awayTeam: "",
        matchDate: "",
        weekNumber: selectedWeek || currentWeek,
        seasonId: selectedSeasonId,
        homeScore: "",
        awayScore: "",
        specialQuestions: []
      })
    }
    setError("")
    setSuccess("")
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditMatch(null)
    setFormData({
      homeTeam: "",
      awayTeam: "",
      matchDate: "",
      weekNumber: selectedWeek || currentWeek,
      seasonId: selectedSeasonId,
      homeScore: "",
      awayScore: "",
      specialQuestions: []
    })
    setError("")
    setSuccess("")
  }

  // Maç tarihi değiştiğinde sadece tarihi güncelle
  const handleDateChange = (date: string) => {
    setFormData({
      ...formData,
      matchDate: date
    })
  }

  // Özel soru ekle
  const addSpecialQuestion = () => {
    const newQuestion: SpecialQuestion = {
      id: Date.now(),
      question: "",
      type: "TEXT",
      options: [],
      answer: null,
      points: 5
    }
    setFormData(prev => ({
      ...prev,
      specialQuestions: [...prev.specialQuestions, newQuestion]
    }))
  }

  // Özel soru güncelle
  const updateSpecialQuestion = (questionId: number, field: keyof SpecialQuestion, value: any) => {
    setFormData(prev => ({
      ...prev,
      specialQuestions: prev.specialQuestions.map(q => 
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }))
  }

  // Özel soru sil
  const removeSpecialQuestion = (questionId: number) => {
    setFormData(prev => ({
      ...prev,
      specialQuestions: prev.specialQuestions.filter(q => q.id !== questionId)
    }))
  }

  // Seçenek ekle
  const addOption = (questionId: number) => {
    setFormData(prev => ({
      ...prev,
      specialQuestions: prev.specialQuestions.map(q => 
        q.id === questionId ? { ...q, options: [...q.options, ""] } : q
      )
    }))
  }

  // Seçenek güncelle
  const updateOption = (questionId: number, optionIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      specialQuestions: prev.specialQuestions.map(q => 
        q.id === questionId ? {
          ...q,
          options: q.options.map((opt, idx) => idx === optionIndex ? value : opt)
        } : q
      )
    }))
  }

  // Seçenek sil
  const removeOption = (questionId: number, optionIndex: number) => {
    setFormData(prev => ({
      ...prev,
      specialQuestions: prev.specialQuestions.map(q => 
        q.id === questionId ? {
          ...q,
          options: q.options.filter((_, idx) => idx !== optionIndex)
        } : q
      )
    }))
  }

  // Form validation
  const validateForm = () => {
    if (!formData.homeTeam.trim()) {
      setError("Ev sahibi takım adı gereklidir")
      return false
    }
    if (!formData.awayTeam.trim()) {
      setError("Deplasman takımı adı gereklidir")
      return false
    }
    if (!formData.matchDate) {
      setError("Maç tarihi gereklidir")
      return false
    }
    if (!formData.seasonId) {
      setError("Sezon seçimi gereklidir")
      return false
    }
    if (formData.weekNumber < 1) {
      setError("Hafta numarası 1'den küçük olamaz")
      return false
    }
    
    // Special questions validation
    for (const question of formData.specialQuestions) {
      if (!question.question.trim()) {
        setError("Tüm özel soruların metni doldurulmalıdır")
        return false
      }
      if (question.type === "MULTIPLE_CHOICE" && question.options.length < 2) {
        setError("Çoktan seçmeli sorular için en az 2 seçenek gereklidir")
        return false
      }
      if (question.points < 1) {
        setError("Soru puanları 1'den küçük olamaz")
        return false
      }
    }
    
    return true
  }

  // Ekle/Düzenle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setCreating(true)
    setError("")
    setSuccess("")
    try {
      const method = editMatch ? "PUT" : "POST"
      const url = "/api/matches"
      const localDate = formData.matchDate; // "2025-07-01T16:21"
      const utcString = new Date(localDate).toISOString(); // "2025-07-01T13:21:00.000Z" (Türkiye'de seçildiyse)

      const body = editMatch
          ? { ...formData, matchDate: utcString, id: editMatch.id }
          : { ...formData, matchDate: utcString };
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "İşlem başarısız")
      setSuccess(editMatch ? "Maç güncellendi!" : "Maç eklendi!")
      fetchMatches()
      setTimeout(() => closeModal(), 900)
    } catch (error: any) {
      setError(error.message || "İşlem başarısız")
    } finally {
      setCreating(false)
    }
  }

  // Maç sil
  const handleDeleteMatch = async (matchId: string) => {
    const matchToDelete = matches.find(m => m.id === matchId)
    if (!matchToDelete) return
    
    const confirmMessage = `"${matchToDelete.homeTeam} vs ${matchToDelete.awayTeam}" maçını silmek istediğinizden emin misiniz?\n\nBu işlem geri alınamaz ve tüm tahminler de silinecektir.`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/matches?id=${matchId}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Maç silinemedi")
      setSuccess("Maç başarıyla silindi!")
      fetchMatches()
    } catch (error: any) {
      setError(error.message || "Maç silinemedi")
    }
  }

  // Maç durumu renkleri
  const getStatusText = (match: Match) => {
    if (match.isFinished) return "Bitti"
    if (new Date(match.matchDate) > new Date()) return "Bekliyor"
    return "Devam Ediyor"
  }

  const getStatusColor = (match: Match) => {
    if (match.isFinished) return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
    if (new Date(match.matchDate) > new Date()) return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Maç Yönetimi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Maçları ekleyin ve yönetin
            </p>
          </div>
          <div className="flex gap-2">
            <CommonButton
              type="button"
              color="blue"
              onClick={() => openModal()}
            >
              + Yeni Maç Ekle
            </CommonButton>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Admin Paneli
            </Link>
          </div>
        </div>

        {/* Error/Success Messages */}
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

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Filtreler
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arama
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Takım adı ara..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sezon
              </label>
              <select
                value={selectedSeasonId}
                onChange={e => setSelectedSeasonId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tüm Sezonlar</option>
                {availableSeasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hafta
              </label>
              <select
                value={selectedWeek === 0 ? "" : selectedWeek}
                onChange={e => {
                  const value = e.target.value
                  setSelectedWeek(value === "" ? 0 : parseInt(value))
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tüm Haftalar</option>
                {availableWeeks.map((week) => (
                  <option key={week} value={week}>
                    {week}. Hafta
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(searchTerm || selectedSeasonId || selectedWeek > 0) && (
            <div className="mt-4">
              <CommonButton
                type="button"
                color="gray"
                size="sm"
                onClick={() => {
                  setSearchTerm("")
                  setSelectedSeasonId("")
                  setSelectedWeek(0)
                }}
              >
                Filtreleri Temizle
              </CommonButton>
            </div>
          )}
        </div>

        {/* Modal for Create/Edit */}
        <CommonModal open={modalOpen} onClose={closeModal}>
          <h2 className="text-lg font-semibold mb-4">{editMatch ? "Maçı Düzenle" : "Yeni Maç Ekle"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Sezon ve Hafta Seçimi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sezon</label>
                <select
                  required
                  value={formData.seasonId}
                  onChange={e => setFormData({ ...formData, seasonId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Sezon Seçin</option>
                  {availableSeasons.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hafta</label>
                <select
                  required
                  value={formData.weekNumber}
                  onChange={e => setFormData({ ...formData, weekNumber: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {availableWeeks.map((week) => (
                    <option key={week} value={week}>
                      {week}. Hafta
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Takım İsimleri */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ev Sahibi Takım</label>
                <input
                  type="text"
                  required
                  value={formData.homeTeam}
                  onChange={e => setFormData({ ...formData, homeTeam: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Ev sahibi takım"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deplasman Takımı</label>
                <input
                  type="text"
                  required
                  value={formData.awayTeam}
                  onChange={e => setFormData({ ...formData, awayTeam: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Deplasman takımı"
                />
              </div>
            </div>

            {/* Maç Tarihi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maç Tarihi ve Saati</label>
              <input
                type="datetime-local"
                required
                value={formData.matchDate}
                onChange={e => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Maç Sonucu */}
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Maç Sonucu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formData.homeTeam || "Ev Sahibi"} Skor
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.homeScore}
                    onChange={e => setFormData({ ...formData, homeScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {formData.awayTeam || "Deplasman"} Skor
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.awayScore}
                    onChange={e => setFormData({ ...formData, awayScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Özel Sorular */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-md font-medium text-gray-900 dark:text-white">Özel Sorular</h3>
                <CommonButton
                  type="button"
                  color="gray"
                  size="sm"
                  onClick={addSpecialQuestion}
                >
                  + Özel Soru Ekle
                </CommonButton>
              </div>
              <div className="space-y-3">
                {formData.specialQuestions.map((question, index) => (
                  <div key={question.id || index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Soru {index + 1}
                      </span>
                      <CommonButton
                        type="button"
                        color="red"
                        size="sm"
                        onClick={() => removeSpecialQuestion(question.id)}
                      >
                        Sil
                      </CommonButton>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={question.question}
                        onChange={e => updateSpecialQuestion(question.id, "question", e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Soru metni..."
                      />
                      <div className="flex gap-2">
                        <select
                          value={question.type}
                          onChange={e => updateSpecialQuestion(question.id, "type", e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="TEXT">Metin</option>
                          <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                          <option value="YES_NO">Evet/Hayır</option>
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={question.points}
                          onChange={e => updateSpecialQuestion(question.id, "points", parseInt(e.target.value) || 1)}
                          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Puan"
                        />
                      </div>
                       {question.type === "MULTIPLE_CHOICE" && (
                         <div className="space-y-2">
                           <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seçenekler</span>
                             <CommonButton
                               type="button"
                               color="gray"
                               size="sm"
                               onClick={() => addOption(question.id)}
                             >
                               + Seçenek Ekle
                             </CommonButton>
                           </div>
                           <div className="space-y-2">
                             {question.options.map((option, optionIndex) => (
                               <div key={optionIndex} className="flex items-center gap-2">
                                 <input
                                   type="text"
                                   value={option}
                                   onChange={e => updateOption(question.id, optionIndex, e.target.value)}
                                   className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                   placeholder={`Seçenek ${optionIndex + 1}...`}
                                 />
                                 <CommonButton
                                   type="button"
                                   color="red"
                                   size="sm"
                                   onClick={() => removeOption(question.id, optionIndex)}
                                 >
                                   Sil
                                 </CommonButton>
                               </div>
                             ))}
                             {question.options.length === 0 && (
                               <p className="text-sm text-gray-500 dark:text-gray-400">
                                 Henüz seçenek eklenmemiş. "+ Seçenek Ekle" butonuna tıklayarak seçenek ekleyin.
                               </p>
                             )}
                           </div>
                         </div>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <CommonButton type="button" color="gray" onClick={closeModal}>
                İptal
              </CommonButton>
              <CommonButton type="submit" color="blue" disabled={creating}>
                {creating ? "Kaydediliyor..." : (editMatch ? "Kaydet" : "Ekle")}
              </CommonButton>
            </div>
            {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}
          </form>
        </CommonModal>

        {/* Maç Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Maç Listesi ({matches.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Maç</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hafta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Skor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahminler</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {matches.map((match) => (
                  <tr key={match.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {match.homeTeam} vs {match.awayTeam}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDate(match.matchDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {match.weekNumber}. Hafta
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {match.homeScore !== null && match.awayScore !== null 
                        ? `${match.homeScore} - ${match.awayScore}`
                        : "Henüz oynanmadı"
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(match)}`}>
                        {getStatusText(match)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>{match._count?.predictions || 0} tahmin</div>
                      {match.questions && match.questions.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {match.questions.length} özel soru
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                      <CommonButton
                        type="button"
                        color="blue"
                        size="sm"
                        onClick={() => openModal(match)}
                      >
                        Düzenle
                      </CommonButton>
                      <Link
                        href={`/admin/matches/${match.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                      >
                        Detay
                      </Link>
                      <CommonButton
                        type="button"
                        color="red"
                        size="sm"
                        onClick={() => handleDeleteMatch(match.id)}
                      >
                        Sil
                      </CommonButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 