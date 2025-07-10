"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                HatoBet
              </span>
            </Link>
          </div>

          {/* Desktop Menü */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              Ana Sayfa
            </Link>
            <Link 
              href="/rankings" 
              className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
            >
              Sıralama
            </Link>
            {isAdmin && (
              <Link 
                href="/admin" 
                className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                Admin Paneli
              </Link>
            )}
          </div>

          {/* Sağ Taraf - Kullanıcı Menüsü */}
          <div className="flex items-center gap-4">
            {status === "authenticated" ? (
              <>
                {/* Desktop Kullanıcı Bilgileri */}
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {session.user?.name || session.user?.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-medium transition-colors duration-200"
                  >
                    Çıkış
                  </button>
                </div>
              </>
            ) : (
              <Link 
                href="/auth/login" 
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Giriş Yap
              </Link>
            )}

            {/* Mobil Menü Butonu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobil Menü */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="space-y-2">
              <Link 
                href="/" 
                className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ana Sayfa
              </Link>
              <Link 
                href="/rankings" 
                className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sıralama
              </Link>
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="block px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin Paneli
                </Link>
              )}
              
              {status === "authenticated" && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                    <div className="px-3 py-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {session.user?.name || session.user?.email}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 