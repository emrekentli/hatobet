"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRef } from "react";
import { formatDate } from "@/lib/utils";

export default function AdminMatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [match, setMatch] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const questionModalRef = useRef<HTMLDivElement>(null);
  const [questionForm, setQuestionForm] = useState({
    question: "",
    questionType: "MULTIPLE_CHOICE",
    options: [""],
    points: 10
  });
  const [questionError, setQuestionError] = useState("");
  const [questionSuccess, setQuestionSuccess] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
  const editQuestionModalRef = useRef<HTMLDivElement>(null);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [editQuestionForm, setEditQuestionForm] = useState({
    question: "",
    questionType: "MULTIPLE_CHOICE",
    options: [""],
    points: 10,
    correctAnswer: ""
  });
  const [editQuestionError, setEditQuestionError] = useState("");
  const [editQuestionSuccess, setEditQuestionSuccess] = useState("");
  const [updatingQuestion, setUpdatingQuestion] = useState(false);

  useEffect(() => {
    if (!matchId) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/matches/${matchId}/details`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Detaylar getirilemedi");
        setMatch(data.match);
        setStats(data.stats);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [matchId]);

  // Modal dışında tıklayınca kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (questionModalRef.current && !questionModalRef.current.contains(event.target as Node)) {
        setShowQuestionModal(false);
      }
    }
    if (showQuestionModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showQuestionModal]);

  // Modal dışında tıklayınca kapat (edit)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editQuestionModalRef.current && !editQuestionModalRef.current.contains(event.target as Node)) {
        setShowEditQuestionModal(false);
      }
    }
    if (showEditQuestionModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEditQuestionModal]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingQuestion(true);
    setQuestionError("");
    setQuestionSuccess("");
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionForm.question,
          questionType: questionForm.questionType,
          options: questionForm.questionType === "MULTIPLE_CHOICE" ? questionForm.options.filter(opt => opt.trim() !== "") : [],
          points: questionForm.points
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Soru eklenemedi");
      setQuestionSuccess("Soru eklendi!");
      setShowQuestionModal(false);
      setQuestionForm({ question: "", questionType: "MULTIPLE_CHOICE", options: [""], points: 10 });
      // Soruları tekrar yükle
      const res2 = await fetch(`/api/admin/matches/${matchId}/details`);
      const data2 = await res2.json();
      if (res2.ok) setMatch(data2.match);
    } catch (err: any) {
      setQuestionError(err.message || "Soru eklenirken hata oluştu");
    } finally {
      setAddingQuestion(false);
    }
  };

  const openEditQuestionModal = (q: any) => {
    setEditingQuestion(q);
    setEditQuestionForm({
      question: q.question,
      questionType: q.questionType,
      options: q.options || [""],
      points: q.points,
      correctAnswer: q.correctAnswer || ""
    });
    setEditQuestionError("");
    setEditQuestionSuccess("");
    setShowEditQuestionModal(true);
  };

  const handleEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    setUpdatingQuestion(true);
    setEditQuestionError("");
    setEditQuestionSuccess("");
    try {
      const res = await fetch(`/api/admin/matches/${matchId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: editingQuestion.id,
          ...editQuestionForm,
          options: editQuestionForm.questionType === "MULTIPLE_CHOICE" ? editQuestionForm.options.filter(opt => opt.trim() !== "") : [],
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Soru güncellenemedi");
      setEditQuestionSuccess("Soru güncellendi!");
      setShowEditQuestionModal(false);
      // Soruları tekrar yükle
      const res2 = await fetch(`/api/admin/matches/${matchId}/details`);
      const data2 = await res2.json();
      if (res2.ok) setMatch(data2.match);
    } catch (err: any) {
      setEditQuestionError(err.message || "Soru güncellenirken hata oluştu");
    } finally {
      setUpdatingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Bu soruyu silmek istediğinizden emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Soru silinemedi");
      // Soruları tekrar yükle
      const res2 = await fetch(`/api/admin/matches/${matchId}/details`);
      const data2 = await res2.json();
      if (res2.ok) setMatch(data2.match);
    } catch (err) {
      alert("Soru silinirken hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }
  if (!match) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Maç Detayı
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {match.season?.name} &bull; {match.weekNumber}. Hafta
            </p>
          </div>
          <Link href="/admin/matches" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Maç Listesi</Link>
        </div>

        {/* Maç Bilgileri */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-8">
              <div className="text-center md:text-right flex-1">
                <div className="font-bold text-lg text-gray-900 dark:text-white">{match.homeTeam}</div>
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{new Date(match.matchDate).toLocaleString("tr-TR")}</div>
                <div className="text-2xl font-bold text-blue-600">
                  {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : "-"}
                </div>
                <div className="mt-1">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${match.isFinished ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400" : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"}`}>
                    {match.isFinished ? "Bitti" : "Bekliyor"}
                  </span>
                </div>
              </div>
              <div className="text-center md:text-left flex-1">
                <div className="font-bold text-lg text-gray-900 dark:text-white">{match.awayTeam}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tahminler */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kullanıcı Tahminleri</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kullanıcı</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahmin</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Puan</th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tarih</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {match.predictions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-gray-500 dark:text-gray-400">Henüz tahmin yok.</td>
                  </tr>
                ) : (
                  match.predictions.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{p.user?.name || p.user?.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">{p.homeScore} - {p.awayScore}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center text-sm font-semibold {p.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}">{p.points}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-center text-xs text-gray-500 dark:text-gray-400">{new Date(p.createdAt).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Özel Sorular */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Özel Sorular</h2>
          <button
            onClick={() => setShowQuestionModal(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Soru Ekle
          </button>
        </div>
        {match.questions && match.questions.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            {match.questions.map((q: any) => (
              <div key={q.id} className="mb-4">
                <div className="font-medium text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                  <span>{q.question}</span>
                  <div className="flex gap-2">
                    <button onClick={() => openEditQuestionModal(q)} className="text-yellow-600 hover:text-yellow-800 text-xs">Düzenle</button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-600 hover:text-red-800 text-xs">Sil</button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tip: {q.questionType}, Puan: {q.points}</div>
                {q.options && q.options.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Seçenekler: {q.options.join(", ")}</div>
                )}
                {q.correctAnswer && (
                  <div className="text-xs text-green-700 dark:text-green-400">Doğru Cevap: {q.correctAnswer}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* İstatistikler */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">İstatistikler</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-4 text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalPredictions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Toplam Tahmin</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded p-4 text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.correctScore}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Doğru Skor</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-4 text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.correctWinner}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Doğru Sonuç (Kazanan)</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Skor Dağılımı</h3>
              <div className="flex flex-wrap gap-2">
                {stats.scoreDistribution.map((s: any) => (
                  <span key={s.score} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {s.score} <span className="ml-1 text-blue-600 dark:text-blue-400">({s.count})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Soru ekleme modalı */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div ref={questionModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              onClick={() => setShowQuestionModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Kapat"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Özel Soru Ekle</h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Metni</label>
                <input
                  type="text"
                  required
                  value={questionForm.question}
                  onChange={e => setQuestionForm({ ...questionForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Örn: İlk golü kim atar?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Tipi</label>
                <select
                  value={questionForm.questionType}
                  onChange={e => setQuestionForm({ ...questionForm, questionType: e.target.value, options: e.target.value === "MULTIPLE_CHOICE" ? ["", ""] : [] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                  <option value="YES_NO">Evet/Hayır</option>
                  <option value="TEXT">Metin</option>
                </select>
              </div>
              {questionForm.questionType === "MULTIPLE_CHOICE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seçenekler</label>
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => setQuestionForm({ ...questionForm, options: questionForm.options.map((o, i) => i === idx ? e.target.value : o) })}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={`Seçenek ${idx + 1}`}
                      />
                      <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: questionForm.options.filter((_, i) => i !== idx) })} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setQuestionForm({ ...questionForm, options: [...questionForm.options, ""] })} className="text-blue-600 hover:underline text-sm mt-1">+ Seçenek Ekle</button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Puan</label>
                <input
                  type="number"
                  min={1}
                  value={questionForm.points}
                  onChange={e => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                  className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {questionError && <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">{questionError}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowQuestionModal(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={addingQuestion}>{addingQuestion ? "Ekleniyor..." : "Ekle"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Soru düzenle modalı */}
      {showEditQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div ref={editQuestionModalRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              onClick={() => setShowEditQuestionModal(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Kapat"
            >
              ×
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Soruyu Düzenle</h3>
            <form onSubmit={handleEditQuestion} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Metni</label>
                <input
                  type="text"
                  required
                  value={editQuestionForm.question}
                  onChange={e => setEditQuestionForm({ ...editQuestionForm, question: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soru Tipi</label>
                <select
                  value={editQuestionForm.questionType}
                  onChange={e => setEditQuestionForm({ ...editQuestionForm, questionType: e.target.value, options: e.target.value === "MULTIPLE_CHOICE" ? ["", ""] : [] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                  <option value="YES_NO">Evet/Hayır</option>
                  <option value="TEXT">Metin</option>
                </select>
              </div>
              {editQuestionForm.questionType === "MULTIPLE_CHOICE" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seçenekler</label>
                  {editQuestionForm.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2 mb-1">
                      <input
                        type="text"
                        value={opt}
                        onChange={e => setEditQuestionForm({ ...editQuestionForm, options: editQuestionForm.options.map((o, i) => i === idx ? e.target.value : o) })}
                        className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder={`Seçenek ${idx + 1}`}
                      />
                      <button type="button" onClick={() => setEditQuestionForm({ ...editQuestionForm, options: editQuestionForm.options.filter((_, i) => i !== idx) })} className="text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditQuestionForm({ ...editQuestionForm, options: [...editQuestionForm.options, ""] })} className="text-blue-600 hover:underline text-sm mt-1">+ Seçenek Ekle</button>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Puan</label>
                <input
                  type="number"
                  min={1}
                  value={editQuestionForm.points}
                  onChange={e => setEditQuestionForm({ ...editQuestionForm, points: parseInt(e.target.value) })}
                  className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              {/* Doğru cevap alanı */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doğru Cevap</label>
                {editQuestionForm.questionType === "MULTIPLE_CHOICE" && (
                  <select
                    value={editQuestionForm.correctAnswer}
                    onChange={e => setEditQuestionForm({ ...editQuestionForm, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seçiniz</option>
                    {editQuestionForm.options.filter(opt => opt.trim() !== "").map((opt, idx) => (
                      <option key={idx} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {editQuestionForm.questionType === "YES_NO" && (
                  <select
                    value={editQuestionForm.correctAnswer}
                    onChange={e => setEditQuestionForm({ ...editQuestionForm, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Seçiniz</option>
                    <option value="Evet">Evet</option>
                    <option value="Hayır">Hayır</option>
                  </select>
                )}
                {editQuestionForm.questionType === "TEXT" && (
                  <input
                    type="text"
                    value={editQuestionForm.correctAnswer}
                    onChange={e => setEditQuestionForm({ ...editQuestionForm, correctAnswer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Doğru cevabı girin"
                  />
                )}
              </div>
              {editQuestionError && <div className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-sm">{editQuestionError}</div>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowEditQuestionModal(false)} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600">İptal</button>
                <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={updatingQuestion}>{updatingQuestion ? "Güncelleniyor..." : "Kaydet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 