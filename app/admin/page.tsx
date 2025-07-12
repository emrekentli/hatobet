"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"

interface Stats {
  totalUsers: number
  totalMatches: number
  totalPredictions: number
  totalQuestions: number
}

interface Season {
  id: string
  name: string
  status: string
  startDate: string
  endDate?: string
  totalWeeks: number
  _count: {
    matches: number
    seasonScores: number
  }
}

export default function AdminPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<Stats | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [recalculatingSeason, setRecalculatingSeason] = useState(false)
  const router = useRouter()

  const fetchStats = async () => {
    try {
      // Fetch stats from API
      const [usersResponse, matchesResponse, predictionsResponse, seasonsResponse] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/matches'),
        fetch('/api/predictions'),
        fetch('/api/seasons')
      ]);
      
      const usersData = await usersResponse.json();
      const matchesData = await matchesResponse.json();
      const predictionsData = await predictionsResponse.json();
      const seasonsData = await seasonsResponse.json();
      
      setStats({
        totalUsers: usersData.users?.length || 0,
        totalMatches: matchesData.matches?.length || 0,
        totalPredictions: predictionsData.predictions?.length || 0,
        totalQuestions: 15 // Mock value for now
      });

      setSeasons(seasonsData.seasons || []);
      if (seasonsData.seasons?.length > 0) {
        setSelectedSeasonId(seasonsData.seasons[0].id);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalUsers: 0,
        totalMatches: 0,
        totalPredictions: 0,
        totalQuestions: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [])

  const handleRecalculateAllPoints = async () => {
    if (!confirm('Tüm maçların puanlarını yeniden hesaplamak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    setRecalculating(true);
    try {
      const response = await fetch('/api/recalculate-all-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Başarılı! ${result.message}`);
        // İstatistikleri yenile
        fetchStats();
      } else {
        alert(`Hata: ${result.error}`);
      }
    } catch (error) {
      console.error('Error recalculating points:', error);
      alert('Puanları yeniden hesaplarken bir hata oluştu.');
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateSeasonPoints = async () => {
    if (!selectedSeasonId) {
      alert('Lütfen bir sezon seçin.');
      return;
    }

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);
    if (!selectedSeason) {
      alert('Seçilen sezon bulunamadı.');
      return;
    }

    if (!confirm(`${selectedSeason.name} sezonunun tüm puanlarını yeniden hesaplamak istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
      return;
    }

    setRecalculatingSeason(true);
    try {
      const response = await fetch('/api/recalculate-season-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seasonId: selectedSeasonId }),
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Başarılı! ${result.message}`);
        // İstatistikleri yenile
        fetchStats();
      } else {
        alert(`Hata: ${result.error}`);
      }
    } catch (error) {
      console.error('Error recalculating season points:', error);
      alert('Sezon puanlarını yeniden hesaplarken bir hata oluştu.');
    } finally {
      setRecalculatingSeason(false);
    }
  };

  // Authentication kontrolü
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || session?.user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Bu sayfaya erişmek için admin yetkisine sahip olmanız gerekiyor.</p>
          <Link href="/" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    )
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Admin Paneli
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                HatoBet yönetim paneli
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Ana Sayfa
            </Link>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Kullanıcı</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.totalUsers || 0}</p>
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
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.totalMatches || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Tahmin</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.totalPredictions || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Soru</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats?.totalQuestions || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Puanları Yeniden Hesaplama Bölümü */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Puan Yönetimi
            </h3>
            
            {/* Tüm Puanları Hesaplama */}
            <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Tüm Maçlar
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Tüm sezonlardaki maçların puanlarını baştan hesaplayın.
                  </p>
                </div>
                <button
                  onClick={handleRecalculateAllPoints}
                  disabled={recalculating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recalculating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Hesaplanıyor...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Tüm Puanları Yeniden Hesapla
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sezon Bazlı Puan Hesaplama */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                    Sezon Bazlı Hesaplama
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Belirli bir sezonun puanlarını yeniden hesaplayın.
                  </p>
                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedSeasonId}
                      onChange={(e) => setSelectedSeasonId(e.target.value)}
                      className="block w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name} ({season._count.matches} maç)
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleRecalculateSeasonPoints}
                      disabled={recalculatingSeason || !selectedSeasonId}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {recalculatingSeason ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Hesaplanıyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Sezon Puanlarını Hesapla
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Yönetim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Kullanıcı Yönetimi */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                Kullanıcı Yönetimi
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Kullanıcıları ekleyin, düzenleyin ve yönetin. Yeni kullanıcılar için otomatik şifre oluşturun.
            </p>
            <Link
              href="/admin/users"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Kullanıcıları Yönet
            </Link>
          </div>

          {/* Sezon Yönetimi */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                Sezon Yönetimi
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Sezonları başlatın ve yönetin. Aktif sezon içinde haftalık maçları ekleyin.
            </p>
            <Link
              href="/admin/seasons"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Sezonları Yönet
            </Link>
          </div>

          {/* Maç Yönetimi */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
                Maç Yönetimi
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Aktif sezon içinde maçları ekleyin, düzenleyin ve sonuçları girin.
            </p>
            <Link
              href="/admin/matches"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Maçları Yönet
            </Link>
          </div>



          

       
        </div>
      </div>
    </div>
  )
} 