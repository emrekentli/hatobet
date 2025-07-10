"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import CommonModal from "@/components/CommonModal";
import CommonButton from "@/components/CommonButton";
import { formatDate } from "@/lib/utils";

import { Season } from "@/types/all-types"

export default function AdminSeasonsPage() {
  const { data: session, status } = useSession()
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editSeason, setEditSeason] = useState<Season | null>(null)
  const [formData, setFormData] = useState({ name: "", startDate: "", totalWeeks: 34, status: "ACTIVE" as "ACTIVE" | "FINISHED" | "CANCELLED" })
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const router = useRouter()

  // Sezonları getir
  const fetchSeasons = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append("search", search)
      if (statusFilter) params.append("status", statusFilter)
      
      const response = await fetch(`/api/seasons?${params}`)
      if (!response.ok) {
        router.push("/")
        return
      }
      const data = await response.json()
      setSeasons(data.seasons)
    } catch (error) {
      setError("Sezonlar yüklenirken hata oluştu")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSeasons()
  }, [search, statusFilter])

  // Modal işlemleri
  const openModal = (season?: Season) => {
    if (season) {
      setEditSeason(season)
      setFormData({ 
        name: season.name || "", 
        startDate: season.startDate || "", 
        totalWeeks: season.totalWeeks || 34,
        status: (season.status as "ACTIVE" | "FINISHED" | "CANCELLED") || "ACTIVE"
      })
    } else {
      setEditSeason(null)
      setFormData({ name: "", startDate: "", totalWeeks: 34, status: "ACTIVE" })
    }
    setError("")
    setSuccess("")
    setModalOpen(true)
  }
  const closeModal = () => {
    setModalOpen(false)
    setEditSeason(null)
    setFormData({ name: "", startDate: "", totalWeeks: 34, status: "ACTIVE" })
    setError("")
    setSuccess("")
  }

  // Ekle/Düzenle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")
    setSuccess("")
    try {
      const method = editSeason ? "PUT" : "POST"
      const url = "/api/seasons"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSeason ? { ...formData, id: editSeason.id } : formData),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "İşlem başarısız")
      setSuccess(editSeason ? "Sezon güncellendi!" : "Sezon eklendi!")
      fetchSeasons()
      setTimeout(() => closeModal(), 900)
    } catch (error: any) {
      setError(error.message || "İşlem başarısız")
    } finally {
      setCreating(false)
    }
  }

  // Sezon sil
  const handleDeleteSeason = async (seasonId: string) => {
    setError("")
    setSuccess("")
    try {
      const response = await fetch(`/api/seasons?id=${seasonId}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Sezon silinemedi")
      setSuccess("Sezon başarıyla silindi!")
      fetchSeasons()
    } catch (error: any) {
      setError(error.message || "Sezon silinemedi")
    }
  }

  // Sezonu bitir
  const handleFinishSeason = async (season: Season) => {
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/seasons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: season.id, status: "FINISHED" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sezon bitirilemedi");
      setSuccess("Sezon başarıyla bitirildi!");
      fetchSeasons();
    } catch (error: any) {
      setError(error.message || "Sezon bitirilemedi");
    }
  };

  // Sezon durumu renkleri
  const getStatusText = (status: string) =>
    status === "ACTIVE" ? "Aktif"
      : status === "FINISHED" ? "Bitmiş"
      : status === "CANCELLED" ? "İptal"
      : status

  const getStatusColor = (status: string) =>
    status === "ACTIVE" ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      : status === "FINISHED" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      : status === "CANCELLED" ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"

  // Modal Component
  function SimpleModal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-w-[320px] relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white text-xl"
            aria-label="Kapat"
          >
            ×
          </button>
          {children}
        </div>
      </div>
    )
  }

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sezon Yönetimi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sezonları oluşturun ve yönetin
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + Ekle
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Admin Paneli
            </Link>
          </div>
        </div>

        {/* Modal for Create/Edit */}
        <CommonModal open={modalOpen} onClose={closeModal}>
          <h2 className="text-lg font-semibold mb-4">{editSeason ? "Sezonu Düzenle" : "Yeni Sezon Ekle"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sezon Adı</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="2024-2025 Sezonu"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Toplam Hafta</label>
              <input
                type="number"
                min={1}
                max={52}
                required
                value={formData.totalWeeks}
                onChange={e => setFormData({ ...formData, totalWeeks: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durum</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "FINISHED" | "CANCELLED" })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="ACTIVE">Aktif</option>
                <option value="FINISHED">Bitmiş</option>
                <option value="CANCELLED">İptal</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <CommonButton type="button" color="gray" onClick={closeModal}>
                İptal
              </CommonButton>
              <CommonButton type="submit" color="blue" disabled={creating}>
                {creating ? "Kaydediliyor..." : (editSeason ? "Kaydet" : "Ekle")}
              </CommonButton>
            </div>
            {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
            {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}
          </form>
        </CommonModal>

        {/* Sezon Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Sezon Listesi ({seasons.length})
              </h2>
              
              {/* Arama ve Filtreleme */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Sezon ara..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="FINISHED">Bitmiş</option>
                  <option value="CANCELLED">İptal</option>
                </select>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Sezon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Başlangıç</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bitiş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Hafta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Maçlar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {seasons.map((season) => (
                  <tr key={season.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{season.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.startDate ? formatDate(season.startDate) : "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.endDate ? formatDate(season.endDate) : "-"}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season.totalWeeks} hafta</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(season.status || "ACTIVE")}`}>{getStatusText(season.status || "ACTIVE")}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{season._count?.matches || 0} maç</td>
                    <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                      <CommonButton
                        type="button"
                        color="blue"
                        size="sm"
                        onClick={() => openModal(season)}
                      >
                        Düzenle
                      </CommonButton>
                      <CommonButton
                        type="button"
                        color="red"
                        size="sm"
                        onClick={() => handleDeleteSeason(season.id)}
                      >
                        Sil
                      </CommonButton>
                      {season.status === "ACTIVE" && (
                        <CommonButton
                          type="button"
                          color="gray"
                          size="sm"
                          onClick={() => handleFinishSeason(season)}
                        >
                          Sezonu Bitir
                        </CommonButton>
                      )}
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
