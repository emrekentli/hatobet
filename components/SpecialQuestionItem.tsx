import React from "react";
import { Question, QuestionAnswer } from "@/types/all-types";

interface SpecialQuestionItemProps {
  question: Question;
  match: any;
  questionAnswers: { [key: string]: string };
  setQuestionAnswers: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
  submittingAnswer: { [key: string]: boolean };
  answerError: { [key: string]: string };
  answerSuccess: { [key: string]: string };
  handleAnswerQuestion: (questionId: string, answer: string) => void;
  session: any;
}

const SpecialQuestionItem: React.FC<SpecialQuestionItemProps> = ({
  question,
  match,
  questionAnswers,
  setQuestionAnswers,
  submittingAnswer,
  answerError,
  answerSuccess,
  handleAnswerQuestion,
  session,
}) => {
  // Kullanıcı cevabı ve puanı (maç bitince veya öncesi)
  const questionAnswersArr = (question.questionAnswers || []) as QuestionAnswer[];
  const userAnswer: QuestionAnswer | undefined = questionAnswersArr.find((a: QuestionAnswer) => a.userId === (session?.user?.id));
  const hasAnswered = !!userAnswer;

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-800">
      <div className="font-medium text-gray-900 dark:text-white mb-1 text-sm">{question.question}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Puan: {question.points}</div>
      {!match.isFinished ? (
        <div>
          {question.questionType === "MULTIPLE_CHOICE" && (
            <div className="space-y-1">
              {question.options?.map((option: string, idx: number) => (
                <label key={idx} className="flex items-center">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={(questionAnswers[question.id] ?? userAnswer?.answer ?? "") === option}
                    onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          )}
          {question.questionType === "YES_NO" && (
            <div className="space-y-1">
              {["Evet", "Hayır"].map((option) => (
                <label key={option} className="flex items-center">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option}
                    checked={(questionAnswers[question.id] ?? userAnswer?.answer ?? "") === option}
                    onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{option}</span>
                </label>
              ))}
            </div>
          )}
          {question.questionType === "TEXT" && (
            <input
              type="text"
              placeholder="Cevabınızı yazın..."
              value={questionAnswers[question.id] ?? userAnswer?.answer ?? ""}
              onChange={(e) => setQuestionAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-xs"
            />
          )}
          <button
            onClick={() => handleAnswerQuestion(question.id, questionAnswers[question.id] ?? userAnswer?.answer ?? "")}
            disabled={!(questionAnswers[question.id] ?? userAnswer?.answer) || submittingAnswer[question.id]}
            className="mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
          >
            {submittingAnswer[question.id] ? "Gönderiliyor..." : "Cevabı Gönder"}
          </button>
          {answerError[question.id] && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">{answerError[question.id]}</div>
          )}
          {answerSuccess[question.id] && (
            <div className="mt-1 text-xs text-green-600 dark:text-green-400">{answerSuccess[question.id]}</div>
          )}
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-2">
          <div className="text-xs text-green-800 dark:text-green-200">
            <strong>Cevabınız:</strong> {userAnswer?.answer}
          </div>
          {userAnswer?.points && userAnswer.points > 0 && (
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{userAnswer.points} puan kazandınız!
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SpecialQuestionItem; 