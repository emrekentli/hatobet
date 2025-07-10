import React from "react";

interface WeekSelectorProps {
  selectedWeek: number;
  availableWeeks: number[];
  onWeekChange: (week: number) => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeek,
  availableWeeks,
  onWeekChange,
}) => {
  if (availableWeeks.length === 0) return null;

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hafta:</label>
      <select
        value={selectedWeek}
        onChange={(e) => onWeekChange(parseInt(e.target.value))}
        className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {availableWeeks.map((week) => (
          <option key={week} value={week}>{week}. Hafta</option>
        ))}
      </select>
    </div>
  );
};

export default WeekSelector; 