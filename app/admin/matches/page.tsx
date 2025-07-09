"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useRef } from "react"
import { formatDate, isMatchStarted, getCurrentTurkeyDate, formatInputDateLocal } from "@/lib/utils"

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  weekNumber: number
  year: number
  homeScore: number | null
  awayScore: number | null
  isActive: boolean
  isFinished: boolean
  createdAt: string
  updatedAt: string
  _count: {
    predictions: number
    questions: number
  }
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number>(0)
  const [selectedYear, setSelectedYear] = useState<number>(0)
  const [nextWeek, setNextWeek] = useState<number>(1)
  const [nextYear, setNextYear] = useState<number>(getCurrentTurkeyDate().getFullYear())
  const [formData, setFormData] = useState({
    homeTeam: "",
    awayTeam: "",
    matchDate: "",
    weekNumber: 1
  })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [updatingResult, setUpdatingResult] = useState<string | null>(null)
  const [resultForm, setResultForm] = useState<{[key: string]: {homeScore: string, awayScore: string}}>({})
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)
  const addModalRef = useRef<HTMLDivElement>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editModalRef, setEditModalRef] = useState<any>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editForm, setEditForm] = useState({
    homeTeam: "",
    awayTeam: "",
    matchDate: "",
    weekNumber: 1,
    homeScore: "",
    awayScore: ""
  })
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")
  const [updating, setUpdating] = useState(false)

  // Hafta numarası hesaplama
  const getWeekNumber = (date: Date): number => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  // Aktif sezonu kontrol et
  const [activeSeason, setActiveSeason] = useState<any>(null)

  // Maçları getir
  const fetchMatches = async () => {
    try {
      // Önce aktif sezonu kontrol et
      const seasonResponse = await fetch("/api/admin/seasons?status=ACTIVE")
      if (seasonResponse.ok) {
        const seasonData = await seasonResponse.json()
        if (seasonData.seasons.length > 0) {
          const currentActiveSeason = seasonData.seasons[0]
          setActiveSeason(currentActiveSeason)
          
          const url = selectedWeek > 0 
            ? `/api/admin/seasons/${currentActiveSeason.id}/matches?week=${selectedWeek}`
            : `/api/admin/seasons/${currentActiveSeason.id}/matches`
          const response = await fetch(url)
          
          if (!response.ok) {
            if (response.status === 403) {
              router.push("/")
              return
            }
            throw new Error("Maçlar getirilemedi")
          }
          
          const data = await response.json()
          setMatches(data.matches)
          
          // En son haftayı bul ve bir sonraki haftayı hesapla
          if (data.matches.length > 0) {
            const lastMatch = data.matches[data.matches.length - 1]
            const nextWeekNumber = lastMatch.weekNumber + 1
            
            setNextWeek(nextWeekNumber)
            
            // Form verilerini de güncelle
            setFormData(prev => ({
              ...prev,
              weekNumber: nextWeekNumber
            }))
          }
        } else {
          setError("Aktif sezon bulunamadı. Önce bir sezon başlatın.")
        }
      } else {
        setError("Sezon bilgileri getirilemedi")
      }
    } catch (error) {
      setError("Maçlar yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [selectedWeek, selectedYear])

  // Modal dışında tıklayınca kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addModalRef.current && !addModalRef.current.contains(event.target as Node)) {
        setShowAddModal(false)
      }
    }
    if (showAddModal) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showAddModal])

  // Modal dışında tıklayınca kapat (edit)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editModalRef && editModalRef.current && !editModalRef.current.contains(event.target as Node)) {
        setShowEditModal(false)
      }
    }
    if (showEditModal) {
      document.addEventListener("mousedown", handleClickOutside)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showEditModal, editModalRef])

  // Yeni maç oluştur
  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    setSuccess("")

    if (!activeSeason) {
      setError("Aktif sezon bulunamadı. Önce bir sezon başlatın.")
      setCreating(false)
      return
    }

    try {
      const response = await fetch(`/api/admin/seasons/${activeSeason.id}/matches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Maç oluşturulamadı")
      }

      setSuccess("Maç başarıyla oluşturuldu!")
      setFormData({
        homeTeam: "",
        awayTeam: "",
        matchDate: "",
        weekNumber: nextWeek + 1
      })
      fetchMatches() // Maç listesini yenile
      setShowAddModal(false) // Modalı kapat
    } catch (error: any) {
      setError(error.message || "Maç oluşturulurken hata oluştu")
    } finally {
      setCreating(false)
    }
  }

  // Maç tarihi değiştiğinde hafta numarasını otomatik hesapla
  const handleDateChange = (date: string) => {
    const selectedDate = new Date(date)
    const weekNumber = getWeekNumber(selectedDate)
    setFormData({
      ...formData,
      matchDate: date,
      weekNumber
    })
  }

  // Maç sil
  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm("Bu maçı silmek istediğinizden emin misiniz?")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Maç silinemedi")
      }

      setSuccess("Maç başarıyla silindi!")
      fetchMatches()
    } catch (error: any) {
      setError(error.message || "Maç silinirken hata oluştu")
    }
  }

  // Maç sonucunu güncelle
  const handleUpdateResult = async (matchId: string) => {
    const matchResult = resultForm[matchId]
    if (!matchResult?.homeScore || !matchResult?.awayScore) {
      setError("Lütfen her iki skoru da girin")
      return
    }

    setUpdatingResult(matchId)
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/result`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          homeScore: parseInt(matchResult.homeScore),
          awayScore: parseInt(matchResult.awayScore),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Sonuç güncellenemedi")
      }

      const result = await response.json()
      setSuccess(`Maç sonucu güncellendi! ${result.predictionsUpdated} tahmin değerlendirildi.`)
      
      // Formu temizle
      setResultForm(prev => {
        const newForm = { ...prev }
        delete newForm[matchId]
        return newForm
      })
      
      fetchMatches()
    } catch (error: any) {
      setError(error.message || "Sonuç güncellenirken hata oluştu")
    } finally {
      setUpdatingResult(null)
    }
  }

  const openEditModal = (match: Match) => {
    setEditingMatch(match)
    setEditForm({
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: formatInputDateLocal(match.matchDate),
      weekNumber: match.weekNumber,
      homeScore: match.homeScore !== null ? match.homeScore.toString() : "",
      awayScore: match.awayScore !== null ? match.awayScore.toString() : ""
    })
    setEditError("")
    setEditSuccess("")
    setShowEditModal(true)
  }

  const handleEditMatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMatch) return
    setUpdating(true)
    setEditError("")
    setEditSuccess("")
    try {
      const homeScoreVal = editForm.homeScore === "" ? null : parseInt(editForm.homeScore)
      const awayScoreVal = editForm.awayScore === "" ? null : parseInt(editForm.awayScore)
      const body: any = {
        ...editForm,
        homeScore: homeScoreVal,
        awayScore: awayScoreVal
      }
      if (homeScoreVal !== null && awayScoreVal !== null) {
        body.isFinished = true
      } else if (homeScoreVal === null || awayScoreVal === null) {
        body.isFinished = false
        body.isActive = true
      }
      const response = await fetch(`/api/admin/matches/${editingMatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Güncellenemedi")
      setEditSuccess("Maç başarıyla güncellendi!")
      setShowEditModal(false)
      fetchMatches()
    } catch (err: any) {
      setEditError(err.message || "Güncellenirken hata oluştu")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
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
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Yeni Maç Ekle
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Admin Paneli
            </Link>
          </div>
        </div>

        {/* Maç Ekleme Modalı */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div ref={addModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-lg relative">
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Kapat"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Yeni Maç Ekle</h2>
              <form onSubmit={handleCreateMatch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="homeTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Ev Sahibi Takım
                    </label>
                    <input
                      type="text"
                      id="homeTeam"
                      required
                      value={formData.homeTeam}
                      onChange={(e) => setFormData({ ...formData, homeTeam: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Ev sahibi takım"
                    />
                  </div>
                  <div>
                    <label htmlFor="awayTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Deplasman Takımı
                    </label>
                    <input
                      type="text"
                      id="awayTeam"
                      required
                      value={formData.awayTeam}
                      onChange={(e) => setFormData({ ...formData, awayTeam: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Deplasman takımı"
                    />
                  </div>
                  <div>
                    <label htmlFor="matchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maç Tarihi
                    </label>
                    <input
                      type="datetime-local"
                      id="matchDate"
                      required
                      value={formData.matchDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="weekNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Hafta
                    </label>
                    <input
                      type="number"
                      id="weekNumber"
                      min="1"
                      value={formData.weekNumber}
                      onChange={(e) => setFormData({ ...formData, weekNumber: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                {error && (
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">{error}</div>
                )}
                {success && (
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-sm">{success}</div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                    disabled={creating}
                  >
                    {creating ? "Ekleniyor..." : "Ekle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Aktif Sezon Kontrolü */}
        {!activeSeason && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Aktif Sezon Bulunamadı
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Maç eklemek için önce bir sezon başlatmanız gerekiyor.</p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/admin/seasons"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    Sezon Yönetimi
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Filtreler
          </h3>
          <div className="flex gap-4">
            <div>
              <label htmlFor="filterWeek" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hafta
              </label>
              <input
                type="number"
                id="filterWeek"
                min="0"
                max="53"
                value={selectedWeek || ""}
                onChange={(e) => setSelectedWeek(parseInt(e.target.value) || 0)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Tüm haftalar"
              />
            </div>

          </div>
        </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Maç
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Hafta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Skor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tahminler
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Sonuç
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    İşlemler
                  </th>
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
                      {match.isFinished ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                          Bitti
                        </span>
                      ) : match.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {match._count.predictions} tahmin
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {match.isFinished ? (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {match.homeScore} - {match.awayScore}
                        </span>
                      ) : isMatchStarted(match.matchDate) ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Devam Ediyor
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          Bekliyor
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {!isMatchStarted(match.matchDate) && (
                          <button
                            onClick={() => openEditModal(match)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Düzenle
                          </button>
                        )}
                        <Link
                          href={`/admin/matches/${match.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Detay
                        </Link>
                        {new Date(match.matchDate) > new Date() && (
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Sil
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div ref={editModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Kapat"
            >
              ×
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Maçı Düzenle</h2>
            <form onSubmit={handleEditMatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="editHomeTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ev Sahibi Takım
                  </label>
                  <input
                    type="text"
                    id="editHomeTeam"
                    required
                    value={editForm.homeTeam}
                    onChange={(e) => setEditForm({ ...editForm, homeTeam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ev sahibi takım"
                  />
                </div>
                <div>
                  <label htmlFor="editAwayTeam" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deplasman Takımı
                  </label>
                  <input
                    type="text"
                    id="editAwayTeam"
                    required
                    value={editForm.awayTeam}
                    onChange={(e) => setEditForm({ ...editForm, awayTeam: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Deplasman takımı"
                  />
                </div>
                <div>
                  <label htmlFor="editMatchDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maç Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    id="editMatchDate"
                    required
                    value={editForm.matchDate}
                    onChange={(e) => setEditForm({ ...editForm, matchDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="editWeekNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Hafta
                  </label>
                  <input
                    type="number"
                    id="editWeekNumber"
                    min="1"
                    value={editForm.weekNumber}
                    onChange={(e) => setEditForm({ ...editForm, weekNumber: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="editHomeScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ev Sahibi Skor
                  </label>
                  <input
                    type="number"
                    id="editHomeScore"
                    min="0"
                    value={editForm.homeScore}
                    onChange={(e) => setEditForm({ ...editForm, homeScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Ev sahibi skor"
                  />
                </div>
                <div>
                  <label htmlFor="editAwayScore" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Deplasman Skor
                  </label>
                  <input
                    type="number"
                    id="editAwayScore"
                    min="0"
                    value={editForm.awayScore}
                    onChange={(e) => setEditForm({ ...editForm, awayScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Deplasman skor"
                  />
                </div>
              </div>
              {editError && (
                <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">{editError}</div>
              )}
              {editSuccess && (
                <div className="p-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded text-sm">{editSuccess}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  disabled={updating}
                >
                  {updating ? "Güncelleniyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 