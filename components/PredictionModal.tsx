import React from "react";
import { Match, MatchPrediction, Question, QuestionAnswer } from "@/types/all-types";
import { formatDate } from "@/lib/utils";

interface PredictionModalProps {
  showMatchModal: boolean;
  setShowMatchModal: (show: boolean) => void;
  selectedMatch: Match | null;
  loadingPredictions: boolean;
  matchPredictions: MatchPrediction[];
  session: any;
}

const PredictionModal: React.FC<PredictionModalProps> = ({
  showMatchModal,
  setShowMatchModal,
  selectedMatch,
  loadingPredictions,
  matchPredictions,
  session,
}) => {
  if (!showMatchModal || !selectedMatch) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={() => setShowMatchModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Kapat"
        >
          ×
        </button>
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
          </h3>
          <div className="text-center text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {selectedMatch.homeScore} - {selectedMatch.awayScore}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {formatDate(selectedMatch.matchDate)} • {selectedMatch.weekNumber}. Hafta
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skor Tahminleri */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Skor Tahminleri</h4>
            {loadingPredictions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Tahminler yükleniyor...</p>
              </div>
            ) : matchPredictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kullanıcı</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tahmin</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Puan</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {matchPredictions.map((prediction, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prediction.user.name || prediction.user.email}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{prediction.homeScore} - {prediction.awayScore}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          <span className={`font-bold ${prediction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>{prediction.points}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">Bu maç için henüz tahmin yapılmamış.</div>
            )}
          </div>
          {/* Özel Sorular */}
          {selectedMatch.questions && selectedMatch.questions.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Özel Sorular</h4>
              <div className="space-y-4">
                {selectedMatch.questions.map((question: Question) => (
                  <div key={question.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="font-medium text-gray-900 dark:text-white mb-2">{question.question}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Puan: {question.points}</div>
                    {question.correctAnswer && (
                      <div className="text-sm text-green-600 dark:text-green-400 mb-3">
                        <strong>Doğru Cevap:</strong> {question.correctAnswer}
                      </div>
                    )}
                    {question.questionAnswers && question.questionAnswers.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Kullanıcı Cevapları:</div>
                        {question.questionAnswers.map((answer: QuestionAnswer) => (
                          <div key={answer.id} className={`flex justify-between items-center p-2 rounded text-sm ${answer.userId === (session?.user?.id) ? "bg-blue-50 dark:bg-blue-900/20" : "bg-gray-50 dark:bg-gray-700"}`}>
                            <div className="flex items-center">
                              <span className="text-gray-900 dark:text-white">{answer.user?.name || answer.user?.email}</span>
                              {answer.userId === (session?.user?.id) && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-1 py-0.5 rounded">Siz</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-700 dark:text-gray-300">{answer.answer}</span>
                              <span className={`font-bold text-xs ${answer.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>{answer.points > 0 ? `+${answer.points}` : '0'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 dark:text-gray-400">Bu soruya henüz cevap verilmemiş.</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionModal; 