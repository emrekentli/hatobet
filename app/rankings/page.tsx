"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Ranking, Season } from "@/types/all-types";
import LeaderboardFilters from "@/components/LeaderboardFilters";
import LeaderboardTable from "@/components/LeaderboardTable";
import { useSession } from "next-auth/react";

export default function RankingsPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false); // Açılış yüklemesi tamam mı?
  const [initialLoad, setInitialLoad] = useState(false); // Sadece açılış için
  const [rankingType, setRankingType] = useState<"season" | "week">("season");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [rankings, setRankings] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [highlightRank, setHighlightRank] = useState<number | undefined>();

  // İlk açılışta güncel sezon/hafta fetch
  useEffect(() => {
    setLoading(true);
    fetch("/api/rankings")
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || []);
        setSeasons(data.seasons || []);
        setAvailableWeeks(data.availableWeeks || []);
        setSelectedSeasonId(data.currentSeason);
        setSelectedWeek(data.currentWeek);
        setRankingType("season");
        setInitialLoad(true); // İlk fetch tamam
      })
      .finally(() => {
        setLoading(false);
        setReady(true); // Filtreler çalışmaya hazır
      });
  }, []);

  // Açılıştan sonra, filtre değişiminde fetch at
  useEffect(() => {
    if (!initialLoad) return; // İlk açılış fetch'inden sonra devreye girsin
    if (!selectedSeasonId || selectedWeek === null) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.append("season", selectedSeasonId);
    params.append("type", rankingType);
    if (rankingType === "week") params.append("week", selectedWeek.toString());
    if (search) params.append("search", search);

    fetch(`/api/rankings?${params}`)
      .then(res => res.json())
      .then(data => {
        setRankings(data.rankings || []);
        setAvailableWeeks(data.availableWeeks || []);
      })
      .finally(() => setLoading(false));
  // *** initialLoad burada dependency! ***
  }, [initialLoad, selectedSeasonId, selectedWeek, rankingType, search]);

  // Kullanıcının kendi sırası (memo)
  const myRow = useMemo(
    () => rankings.find(r => r.user.id === session?.user?.id),
    [rankings, session?.user?.id]
  );

  // "Beni Göster" vurgusu
  const handleShowMe = () => {
    if (myRow) setHighlightRank(myRow.rank);
    setTimeout(() => setHighlightRank(undefined), 1500);
  };

  // Seçilen sezon objesi
  const selectedSeason = useMemo(
    () => seasons.find((s: any) => s.id === selectedSeasonId),
    [seasons, selectedSeasonId]
  );

  // Eğer açılış datası yoksa filtreyi disable tut
  const filtersDisabled = !ready || loading || !selectedSeasonId || selectedWeek === null;

  // Authentication kontrolü
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Giriş Yapın</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Sıralamaları görmek için giriş yapmanız gerekiyor.</p>
          <Link href="/auth/login" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Giriş Yap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sıralamalar</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedSeason?.name || "Aktif Sezon"}
            </div>
          </div>
          <Link href="/" className="text-blue-600 hover:underline text-sm">Ana sayfaya dön</Link>
        </div>

        {/* Sezon seçici */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Sezon Seç</label>
          <select
            value={selectedSeasonId || ""}
            onChange={e => setSelectedSeasonId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={filtersDisabled}
          >
            {seasons.map((season: any) => (
              <option key={season.id} value={season.id}>{season.name}</option>
            ))}
          </select>
        </div>

        {/* Filtreler (Hafta, Search) */}
        <LeaderboardFilters
          rankingType={rankingType}
          setRankingType={setRankingType}
          selectedWeek={selectedWeek || 1}
          setSelectedWeek={setSelectedWeek}
          availableWeeks={availableWeeks}
          search={search}
          setSearch={setSearch}
        />

        {/* Kullanıcıya özel özet */}
        <div className="mb-4">
          {myRow ? (
            <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-200">
              <span className="font-semibold">Sen {myRow.rank}.</span>
              <span>
                Bu {rankingType === "week" ? `${selectedWeek}. hafta` : "sezon"} toplam {myRow.totalPoints} puan topladın.
              </span>
              <button
                onClick={handleShowMe}
                className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
              >
                Beni Göster
              </button>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Henüz sıralamaya giremedin!
            </div>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
            </div>
          ) : (
            <LeaderboardTable
              rankings={rankings}
              currentUserId={session?.user?.id}
              search={search}
              highlightRank={highlightRank}
              onShowMe={handleShowMe}
            />
          )}
        </div>
      </div>
    </div>
  );
}
