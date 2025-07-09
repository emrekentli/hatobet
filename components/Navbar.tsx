"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [userProfile, setUserProfile] = useState<any>(null);

  // Kullanıcı profil bilgilerini getir
  useEffect(() => {
    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [status]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Profil bilgileri getirilemedi:", error);
    }
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
              HatoBet
            </Link>
            <div className="hidden md:flex gap-4 ml-6">
              <Link href="/" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Ana Sayfa</Link>
              <Link href="/rankings" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Sıralama</Link>
              {isAdmin && (
                <>
                  <Link href="/admin" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Admin Paneli</Link>
                  <Link href="/admin/users" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Kullanıcılar</Link>
                  <Link href="/admin/seasons" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Sezonlar</Link>
                  <Link href="/admin/matches" className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium">Maçlar</Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                <span className="hidden md:inline text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {session.user?.name || session.user?.email}
                </span>
                {userProfile?.activeSeason && (
                  <span className="hidden md:inline text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded font-medium">
                    {userProfile.activeSeason.totalPoints} puan
                  </span>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <Link href="/auth/login" className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium">Giriş Yap</Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 