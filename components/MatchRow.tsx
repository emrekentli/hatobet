import React, { Fragment } from "react";
import { Match, Question, QuestionAnswer } from "@/types/all-types";
import SpecialQuestionItem from "./SpecialQuestionItem";

interface MatchRowProps {
  match: Match;
  open: boolean;
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
  openMatchModalHandler: (match: Match) => void;
  session: any;
  getMatchStatus: (match: Match) => string;
  getMatchStatusColor: (match: Match) => string;
  formatDate: (date: string) => string;
  handleAnswerQuestion: (questionId: string, answer: string) => void;
}

const MatchRow: React.FC<MatchRowProps> = ({
  match,
  open,
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
  openMatchModalHandler,
  session,
  getMatchStatus,
  getMatchStatusColor,
  formatDate,
  handleAnswerQuestion,
}) => {
  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-900 transition">
        <td className="px-3 py-2 align-top">
          {match.questions && match.questions.length > 0 ? (
            <button onClick={() => toggleQuestions(match.id)} aria-label="Aç/Kapat" className="focus:outline-none">
              <svg className={`w-5 h-5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </td>
        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{match.homeTeam}</td>
        <td className="px-3 py-2 text-center text-lg font-bold text-blue-600">{match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : '-'}</td>
        <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">{match.awayTeam}</td>
        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(match.matchDate)}</td>
        <td className="px-3 py-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMatchStatusColor(match)}`}>{getMatchStatus(match)}</span>
        </td>
        <td className="px-3 py-2">
          {/* Tahmin formu veya sonucu */}
          {match.isFinished ? (
            <div className="flex flex-col items-end space-y-1">
              {match.userPrediction ? (
                <div className="text-right">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Tahmininiz: <span className="font-semibold text-gray-900 dark:text-white">{match.userPrediction.homeScore} - {match.userPrediction.awayScore}</span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Puanınız: <span className={`font-bold ${match.userPrediction.points && match.userPrediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{match.userPrediction.points || 0}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">Tahmin yapmadınız</div>
              )}
              <button onClick={() => openMatchModalHandler(match)} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">Tüm tahminleri gör</button>
            </div>
          ) : !match.isActive ? (
            <div className="text-xs text-gray-500 dark:text-gray-400">Maç henüz aktif değil</div>
          ) : new Date(match.matchDate) <= new Date() ? (
            <div className="flex flex-col items-end space-y-1">
              <div className="text-xs text-red-600 dark:text-red-400">Maç başladı, tahmin yapamazsınız</div>
              {match.userPrediction && (
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Tahmininiz: <span className="font-semibold text-gray-900 dark:text-white">{match.userPrediction.homeScore} - {match.userPrediction.awayScore}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                max="99"
                placeholder="0"
                value={String(predictions[match.id]?.homeScore ?? (typeof match.userPrediction?.homeScore === 'number' ? match.userPrediction.homeScore : ""))}
                onChange={(e) =>
                  setPredictions(prev => ({
                    ...prev,
                    [match.id]: {
                      homeScore: e.target.value,
                      awayScore: prev[match.id]?.awayScore ?? (typeof match.userPrediction?.awayScore === 'number' ? String(match.userPrediction.awayScore) : "")
                    }
                  }))
                }
                className="w-10 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                min="0"
                max="99"
                placeholder="0"
                value={String(predictions[match.id]?.awayScore ?? (typeof match.userPrediction?.awayScore === 'number' ? match.userPrediction.awayScore : ""))}
                onChange={(e) =>
                  setPredictions(prev => ({
                    ...prev,
                    [match.id]: {
                      homeScore: prev[match.id]?.homeScore ?? (typeof match.userPrediction?.homeScore === 'number' ? String(match.userPrediction.homeScore) : ""),
                      awayScore: e.target.value
                    }
                  }))
                }
                className="w-10 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={() => handleMakePrediction(match.id)}
                disabled={predicting === match.id}
                className={`px-2 py-1 text-white text-xs rounded disabled:opacity-50 transition-colors duration-200 ${successStates[match.id] ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {predicting === match.id ? "Gönderiliyor..." : successStates[match.id] ? "✓ Kaydedildi" : "Tahmin Yap"}
              </button>
            </div>
          )}
        </td>
      </tr>
      {/* Accordion satırı */}
      {match.questions && match.questions.length > 0 && (
        <tr>
          <td colSpan={7} className="p-0 border-t-0">
            <div className={`transition-all duration-300 overflow-hidden ${open ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="p-4 bg-gray-50 dark:bg-gray-900">
                <div className="font-semibold text-gray-800 dark:text-gray-200 mb-2 text-sm">Özel Sorular</div>
                <div className="space-y-4">
                  {match.questions.map((q: Question) => (
                    <SpecialQuestionItem
                      key={q.id}
                      question={q}
                      match={match}
                      questionAnswers={questionAnswers}
                      setQuestionAnswers={setQuestionAnswers}
                      submittingAnswer={submittingAnswer}
                      answerError={answerError}
                      answerSuccess={answerSuccess}
                      handleAnswerQuestion={handleAnswerQuestion}
                      session={session}
                    />
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default MatchRow; 