import React from "react";

interface LeaderboardFiltersProps {
  rankingType: "season" | "week";
  setRankingType: (type: "season" | "week") => void;
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  availableWeeks: number[];
  search: string;
  setSearch: (s: string) => void;
}

const LeaderboardFilters: React.FC<LeaderboardFiltersProps> = ({
  rankingType,
  setRankingType,
  selectedWeek,
  setSelectedWeek,
  availableWeeks,
  search,
  setSearch,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:space-x-6 space-y-2 md:space-y-0 mb-6">
      {/* Sıralama Tipi */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sıralama Tipi</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="week"
              checked={rankingType === "week"}
              onChange={() => setRankingType("week")}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Haftalık</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="season"
              checked={rankingType === "season"}
              onChange={() => setRankingType("season")}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Sezonluk</span>
          </label>
        </div>
      </div>
      {/* Hafta Seçici */}
      {rankingType === "week" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hafta</label>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {availableWeeks.map((week) => (
              <option key={week} value={week}>{week}. Hafta</option>
            ))}
          </select>
        </div>
      )}
      {/* Arama Kutusu */}
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanıcı Ara</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ad veya email ile ara..."
          className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
};

export default LeaderboardFilters; 