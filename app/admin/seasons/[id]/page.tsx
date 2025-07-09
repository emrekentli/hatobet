"use client"

import { useState, useEffect } from "react"
import { formatDate } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"

interface Season {
  id: string
  name: string
  startDate: string
  endDate: string | null
  status: "ACTIVE" | "FINISHED" | "CANCELLED"
  totalWeeks: number
  createdAt: string
  updatedAt: string
  matches: Match[]
  seasonScores: SeasonScore[]
  _count: {
    matches: number
    seasonScores: number
  }
}

interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  matchDate: string
  weekNumber: number
  isActive: boolean
  isFinished: boolean
  homeScore: number | null
  awayScore: number | null
  _count: {
    predictions: number
  }
}

interface SeasonScore {
  id: string
  userId: string
  totalPoints: number
  rank: number | null
  user: {
    id: string
    username: string
  }
}

export default function SeasonDetailPage() {
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const params = useParams()
  const seasonId = params.id as string

  // Sezon detayını getir
  const fetchSeasonDetail = async () => {
    try {
      const response = await fetch(`/api/admin/seasons/${seasonId}`)
      if (!response.ok) {
        if (response.status === 403) {
          router.push("/")
          return
        }
        throw new Error("Sezon detayı getirilemedi")
      }
      const data = await response.json()
      setSeason(data.season)
    } catch (error) {
      setError("Sezon detayı yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (seasonId) {
      fetchSeasonDetail()
    }
  }, [seasonId])

  // Sezon durumunu getir
  const getStatusText = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Aktif"
      case "FINISHED":
        return "Bitmiş"
      case "CANCELLED":
        return "İptal"
      default:
        return status
    }
  }

  // Sezon durumu rengini getir
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "FINISHED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
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

  if (!season) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Sezon bulunamadı</p>
          <Link
            href="/admin/seasons"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Sezonlara Dön
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {season.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Sezon detayları ve istatistikler
              </p>
            </div>
            <div className="flex space-x-3">
              {season.status === "ACTIVE" && (
                <Link
                  href={`/admin/seasons/${season.id}/matches`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Maçları Yönet
                </Link>
              )}
              <Link
                href="/admin/seasons"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Sezonlara Dön
              </Link>
            </div>
          </div>
        </div>

        {/* Sezon Bilgileri */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Durum</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getStatusText(season.status)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Maç</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {season._count.matches}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Hafta</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {season.totalWeeks}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Katılımcı</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {season._count.seasonScores}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sezon Detayları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maç Listesi */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Maçlar ({season.matches.length})
              </h2>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {season.matches.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Henüz maç eklenmemiş
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {season.matches.map((match) => (
                    <div key={match.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {match.homeTeam} vs {match.awayTeam}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {match.weekNumber}. Hafta • {new Date(match.matchDate).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div className="text-right">
                          {match.isFinished ? (
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {match.homeScore} - {match.awayScore}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {match._count.predictions} tahmin
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Puan Tablosu */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Puan Tablosu ({season.seasonScores.length})
              </h2>
            </div>
            
            <div className="overflow-y-auto max-h-96">
              {season.seasonScores.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Henüz puan yok
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {season.seasonScores
                    .sort((a, b) => b.totalPoints - a.totalPoints)
                    .map((score, index) => (
                    <div key={score.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-8">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {score.user.username}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {score.totalPoints} puan
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 