"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import Link from "next/link"

interface Ranking {
  id: string
  rank: number
  totalPoints: number
  user: {
    id: string
    name: string
    email: string
  }
}

interface Season {
  id: string
  name: string
  status: string
  totalWeeks: number
}

export default function RankingsPage() {
  const { data: session, status } = useSession()
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)
  const [rankingType, setRankingType] = useState<"weekly" | "season">("weekly")
  const [selectedWeek, setSelectedWeek] = useState<number>(1)
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([])

  // Sıralamaları getir
  const fetchRankings = async () => {
    try {
      const url = rankingType === "weekly" 
        ? `/api/rankings?type=weekly&week=${selectedWeek}`
        : `/api/rankings?type=season`
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setRankings(data.rankings)
        setSeason(data.season)
        
        // Haftaları oluştur
        if (data.season) {
          const weeks = Array.from({ length: data.season.totalWeeks }, (_, i) => i + 1)
          setAvailableWeeks(weeks)
        }
      }
    } catch (error) {
      console.error("Sıralamalar getirilemedi:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchRankings()
    } else if (status === "unauthenticated") {
      setLoading(false)
    }
  }, [status, rankingType, selectedWeek])

  // Sıralama rengini getir
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case 2:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      case 3:
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
    }
  }

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
              Sıralamalar
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Sıralamaları görmek için giriş yapın
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sıralamalar
              </h1>
              {season && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {season.name}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Ana Sayfa
              </Link>
            </div>
          </div>
        </div>
      </div>

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
            {/* Filtreler */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center space-x-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sıralama Tipi
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="weekly"
                        checked={rankingType === "weekly"}
                        onChange={(e) => setRankingType(e.target.value as "weekly" | "season")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Haftalık</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="season"
                        checked={rankingType === "season"}
                        onChange={(e) => setRankingType(e.target.value as "weekly" | "season")}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Sezonluk</span>
                    </label>
                  </div>
                </div>

                {rankingType === "weekly" && (
                  <div>
                    <label htmlFor="weekSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Hafta
                    </label>
                    <select
                      id="weekSelect"
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                      className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {availableWeeks.map((week) => (
                        <option key={week} value={week}>
                          {week}. Hafta
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Sıralama Listesi */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {rankingType === "weekly" ? `${selectedWeek}. Hafta Sıralaması` : "Sezon Sıralaması"}
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Sıra
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Kullanıcı
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Puan
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {rankings.length > 0 ? (
                      rankings.map((ranking) => (
                        <tr key={ranking.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRankColor(ranking.rank)}`}>
                              {ranking.rank}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {ranking.user.name || ranking.user.email}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className="font-semibold">{ranking.totalPoints}</span> puan
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                          {rankingType === "weekly" 
                            ? `${selectedWeek}. hafta için henüz puan bulunmuyor.`
                            : "Sezon için henüz puan bulunmuyor."
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
} 