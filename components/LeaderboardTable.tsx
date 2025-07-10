import React, { useRef, useEffect } from "react";
import { Ranking } from "@/types/all-types";

interface LeaderboardTableProps {
  rankings: Ranking[];
  currentUserId?: string;
  search: string;
  highlightRank?: number;
  onShowMe?: () => void;
}

// Mock stats for demonstration
const MOCK_STATS = {
  correctScore: [5, 4, 3, 2, 1],
  correctResult: [10, 8, 7, 5, 3],
  specialQuestion: [7, 6, 5, 3, 2],
};

const getMedal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
};

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  rankings,
  currentUserId,
  search,
  highlightRank,
  onShowMe,
}) => {
  const myRowRef = useRef<HTMLTableRowElement>(null);

  // Scroll to my row if needed
  useEffect(() => {
    if (highlightRank && myRowRef.current) {
      myRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightRank]);

  // Filter by search
  const filtered = rankings.filter(r =>
    r.user.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.user.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Sıra</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kupa</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kullanıcı</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Puan</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Doğru Skor</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Doğru Sonuç</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Özel Soru</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={4} className="p-6 text-center text-gray-500 dark:text-gray-400">Aramanıza uygun kullanıcı bulunamadı.</td>
            </tr>
          ) : (
            filtered.map((ranking, idx) => {
              const isMe = currentUserId && ranking.user.id === currentUserId;
              const isTop3 = ranking.rank <= 3;
              return (
                <tr
                  key={ranking.id}
                  ref={isMe ? myRowRef : undefined}
                  className={
                    isMe
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : isTop3
                      ? ranking.rank === 1
                        ? "bg-yellow-50 dark:bg-yellow-900/20"
                        : ranking.rank === 2
                        ? "bg-gray-100 dark:bg-gray-800/40"
                        : "bg-orange-50 dark:bg-orange-900/20"
                      : ""
                  }
                >
                  <td className="px-3 py-2 font-bold text-lg text-center">{ranking.rank}</td>
                  <td className="px-3 py-2 text-center text-2xl">{getMedal(ranking.rank)}</td>
                  <td className="px-3 py-2 flex items-center space-x-2">
                    {/* Profil fotoğrafı yoksa default avatar */}
                    <span className="inline-block w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 flex items-center justify-center font-bold">
                      {ranking.user.name?.[0] || ranking.user.email?.[0] || "?"}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white">{ranking.user.name || ranking.user.email}</span>
                    {isMe && <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-1 py-0.5 rounded">Siz</span>}
                  </td>
                  <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{ranking.totalPoints}</td>
                  <td className="px-3 py-2 text-center">{ranking.correctScores ?? 0}</td>
                  <td className="px-3 py-2 text-center">{ranking.correctResults ?? 0}</td>
                  <td className="px-3 py-2 text-center">{ranking.specialQuestionPoints ?? 0}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {onShowMe && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onShowMe}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
          >
            Beni Göster
          </button>
        </div>
      )}
    </div>
  );
};

export default LeaderboardTable; 