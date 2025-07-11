"use client";
import { useEffect, useState } from "react";
import CommonModal from "@/components/CommonModal";
import CommonButton from "@/components/CommonButton";
import type { Season, Question as BaseQuestion } from "@/types/all-types";

// Timed question için ek alanlar
type TimedQuestion = BaseQuestion & {
  deadline: string;
  seasonId: string;
};

const emptyForm = {
  id: "",
  question: "",
  questionType: "MULTIPLE_CHOICE",
  options: ["", ""],
  deadline: "",
  points: 10,
  seasonId: "",
};

// UTC tarihini datetime-local input formatına çevirir
function toDatetimeLocal(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function AdminTimedQuestionsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [questions, setQuestions] = useState<TimedQuestion[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<TimedQuestion | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Sezonları çek
  useEffect(() => {
    fetch("/api/seasons")
      .then((res) => res.json())
      .then((data) => setSeasons(data.seasons || []));
  }, []);

  // Soruları çek
  const fetchQuestions = () => {
    setLoading(true);
    let url = "/api/timed-questions?";
    if (selectedSeasonId) url += `seasonId=${selectedSeasonId}&`;
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => setQuestions(data.questions || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchQuestions();
  }, [selectedSeasonId, searchTerm]);

  // Modal işlemleri
  const openModal = (question?: TimedQuestion) => {
    if (question) {
      setEditQuestion(question);
      setForm({
        ...question,
        options: question.options && question.options.length ? question.options : ["", ""],
        deadline: toDatetimeLocal(question.deadline),
      });
    } else {
      setEditQuestion(null);
      setForm({ ...emptyForm, seasonId: selectedSeasonId });
    }
    setError("");
    setSuccess("");
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false);
    setEditQuestion(null);
    setForm({ ...emptyForm, seasonId: selectedSeasonId });
    setError("");
    setSuccess("");
  };

  // Form işlemleri
  const handleFormChange = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleOptionChange = (idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === idx ? value : opt)),
    }));
  };
  const addOption = () => setForm((prev) => ({ ...prev, options: [...prev.options, ""] }));
  const removeOption = (idx: number) => setForm((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== idx) }));

  // Form validasyonu
  const validateForm = () => {
    if (!form.question.trim()) {
      setError("Soru metni gereklidir");
      return false;
    }
    if (!form.seasonId) {
      setError("Sezon seçimi gereklidir");
      return false;
    }
    if (!form.deadline) {
      setError("Bitiş tarihi gereklidir");
      return false;
    }
    if (form.questionType === "MULTIPLE_CHOICE" && form.options.filter(opt => opt.trim()).length < 2) {
      setError("Çoktan seçmeli sorular için en az 2 seçenek gereklidir");
      return false;
    }
    if (form.points < 1) {
      setError("Puan 1'den küçük olamaz");
      return false;
    }
    return true;
  };

  // Ekle/Düzenle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const method = editQuestion ? "PUT" : "POST";
      const url = "/api/timed-questions";
      const body = editQuestion ? { ...form, id: editQuestion.id } : form;
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "İşlem başarısız");
      setSuccess(editQuestion ? "Soru güncellendi!" : "Soru eklendi!");
      fetchQuestions();
      setTimeout(() => closeModal(), 900);
    } catch (error: any) {
      setError(error.message || "İşlem başarısız");
    } finally {
      setCreating(false);
    }
  };

  // Soru sil
  const handleDelete = async (id: string) => {
    if (!confirm("Bu soruyu silmek istediğinizden emin misiniz?")) return;
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/timed-questions?id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Soru silinemedi");
      setSuccess("Soru silindi!");
      fetchQuestions();
    } catch (error: any) {
      setError(error.message || "Soru silinemedi");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Zamanlı Soru Yönetimi
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Sezona bağlı zamanlı soruları ekleyin ve yönetin
            </p>
          </div>
          <div className="flex gap-2">
            <CommonButton type="button" color="blue" onClick={() => openModal()}>
              + Yeni Soru Ekle
            </CommonButton>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Arama
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Soru metni ara..."
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
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} {season.status ? `(${season.status})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(searchTerm || selectedSeasonId) && (
            <div className="mt-4">
              <CommonButton
                type="button"
                color="gray"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSeasonId("");
                }}
              >
                Filtreleri Temizle
              </CommonButton>
            </div>
          )}
        </div>

        {/* Modal for Create/Edit */}
        <CommonModal open={modalOpen} onClose={closeModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{editQuestion ? "Soruyu Düzenle" : "Yeni Zamanlı Soru Ekle"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sezon</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={form.seasonId}
                    onChange={e => handleFormChange("seasonId", e.target.value)}
                    required
                  >
                    <option value="">Sezon seçin</option>
                    {seasons.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Puan</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={form.points}
                    onChange={e => handleFormChange("points", Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Metni</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={form.question}
                  onChange={e => handleFormChange("question", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Tipi</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={form.questionType}
                    onChange={e => handleFormChange("questionType", e.target.value)}
                  >
                    <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                    <option value="YES_NO">Evet/Hayır</option>
                    <option value="TEXT">Metin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bitiş Tarihi</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={form.deadline}
                    onChange={e => handleFormChange("deadline", e.target.value)}
                    required
                  />
                </div>
              </div>
              {form.questionType === "MULTIPLE_CHOICE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seçenekler</label>
                  {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center mb-2">
                      <input
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        value={opt}
                        onChange={e => handleOptionChange(idx, e.target.value)}
                        required
                      />
                      {form.options.length > 2 && (
                        <CommonButton type="button" color="red" size="sm" className="ml-2" onClick={() => removeOption(idx)}>Sil</CommonButton>
                      )}
                    </div>
                  ))}
                  <CommonButton type="button" color="gray" size="sm" onClick={addOption}>+ Seçenek Ekle</CommonButton>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <CommonButton type="button" color="gray" onClick={closeModal}>İptal</CommonButton>
                <CommonButton type="submit" color="blue" disabled={creating}>
                  {creating ? "Kaydediliyor..." : (editQuestion ? "Kaydet" : "Ekle")}
                </CommonButton>
              </div>
              {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}
              {success && <div className="text-green-600 dark:text-green-400 text-sm">{success}</div>}
            </form>
          </div>
        </CommonModal>

        {/* Soru Listesi */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Soru Listesi ({questions.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Soru</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tip</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bitiş</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Puan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {questions.map((q) => (
                  <tr key={q.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {q.question}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {q.questionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {"deadline" in q && q.deadline ? new Date(q.deadline).toLocaleString() : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {q.points}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                      <CommonButton
                        type="button"
                        color="blue"
                        size="sm"
                        onClick={() => openModal(q)}
                      >
                        Düzenle
                      </CommonButton>
                      <CommonButton
                        type="button"
                        color="red"
                        size="sm"
                        onClick={() => handleDelete(q.id)}
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
  );
} 