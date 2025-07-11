"use client";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      setInitialLoading(true);
      fetch("/api/users/profile")
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setName(data.user.name || "");
            setUsername(data.user.username || "");
            setEmail(data.user.email || "");
          }
        })
        .finally(() => setInitialLoading(false));
    }
  }, [status]);

  if (status === "loading" || initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  if (status !== "authenticated") {
    return <div className="p-8 text-center">Profil bilgilerinizi görmek için giriş yapmalısınız.</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, email, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Profil başarıyla güncellendi.");
        setCurrentPassword("");
        setNewPassword("");
        update && update();
      } else {
        setError(data.error || "Bir hata oluştu.");
      }
    } catch (err) {
      setError("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Profilini Düzenle</h1>
        <div className="max-w-lg mx-auto bg-white dark:bg-gray-800 p-8 rounded shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Ad Soyad</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Kullanıcı Adı</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 dark:text-gray-200 mb-1">E-posta</label>
              <input
                type="email"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
              <label className="block text-gray-700 dark:text-gray-200 mb-1">Şifre Değiştir</label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white mb-2"
                placeholder="Mevcut Şifre"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <input
                type="password"
                className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:text-white"
                placeholder="Yeni Şifre"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
              disabled={loading}
            >
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </button>
            {message && <div className="mt-2 text-center text-sm text-green-600 dark:text-green-400">{message}</div>}
            {error && <div className="mt-2 text-center text-sm text-red-600 dark:text-red-400">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
} 