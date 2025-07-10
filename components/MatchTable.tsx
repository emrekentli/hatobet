import React, { Fragment } from "react";
import { Match, Question } from "@/types/all-types";
import MatchRow from "./MatchRow";

interface MatchTableProps {
  matches: Match[];
  selectedWeek: number;
  openQuestions: { [matchId: string]: boolean };
  toggleQuestions: (matchId: string) => void;
  predictions: { [key: string]: { homeScore: string; awayScore: string } };
  setPredictions: React.Dispatch<React.SetStateAction<{ [key: string]: { homeScore: string; awayScore: string } }>>;
  handleMakePrediction: (matchId: string) => void;
  predicting: string | null;
  successStates: { [key: string]: boolean };
  questionAnswers: { [key: string]: string };
  setQuestionAnswers: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  submittingAnswer: { [key: string]: boolean };
  answerError: { [key: string]: string };
  answerSuccess: { [key: string]: string };
  expandAll: () => void;
  collapseAll: () => void;
  openMatchModalHandler: (match: Match) => void;
  session: any;
  getMatchStatus: (match: Match) => string;
  getMatchStatusColor: (match: Match) => string;
  formatDate: (date: string) => string;
  handleAnswerQuestion: (questionId: string, answer: string) => void;
}

const MatchTable: React.FC<MatchTableProps> = ({
  matches,
  selectedWeek,
  openQuestions,
  toggleQuestions,
  predictions,
  setPredictions,
  handleMakePrediction,
  predicting,
  successStates,
  questionAnswers,
  setQuestionAnswers,
  submittingAnswer,
  answerError,
  answerSuccess,
  expandAll,
  collapseAll,
  openMatchModalHandler,
  session,
  getMatchStatus,
  getMatchStatusColor,
  formatDate,
  handleAnswerQuestion,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Maçlar</h2>
        <div className="space-x-2">
          <button onClick={expandAll} className="text-sm text-blue-600 hover:underline">+ Tümünü Aç</button>
          <button onClick={collapseAll} className="text-sm text-blue-600 hover:underline">- Tümünü Kapat</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ev Sahibi</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Skor</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Deplasman</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tarih</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Durum</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tahmin</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {matches.filter(match => selectedWeek === 0 || match.weekNumber === selectedWeek).map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                open={!!openQuestions[match.id]}
                toggleQuestions={toggleQuestions}
                predictions={predictions}
                setPredictions={setPredictions}
                handleMakePrediction={handleMakePrediction}
                predicting={predicting}
                successStates={successStates}
                questionAnswers={questionAnswers}
                setQuestionAnswers={setQuestionAnswers}
                submittingAnswer={submittingAnswer}
                answerError={answerError}
                answerSuccess={answerSuccess}
                openMatchModalHandler={openMatchModalHandler}
                session={session}
                getMatchStatus={getMatchStatus}
                getMatchStatusColor={getMatchStatusColor}
                formatDate={formatDate}
                handleAnswerQuestion={handleAnswerQuestion}
              />
            ))}
            {matches.filter(match => selectedWeek === 0 || match.weekNumber === selectedWeek).length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500 dark:text-gray-400">
                  Bu haftada maç bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MatchTable; 