"use client";

import { useState, useEffect } from "react";
import { Match, Season, MatchPrediction } from "@/types/all-types";
import { formatDate } from "@/lib/utils";
import MatchTable from "@/components/MatchTable";
import PredictionModal from "@/components/PredictionModal";
import WeekSelector from "@/components/WeekSelector";
import { useSession } from "next-auth/react";

// API functions
const mapMatchData = (match: any): Match => ({
  id: match.id,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  matchDate: match.matchDate,
  weekNumber: match.weekNumber,
  homeScore: match.homeScore,
  awayScore: match.awayScore,
  isActive: match.isActive,
  isFinished: match.isFinished,
  userPrediction: undefined, // Will be fetched separately
  questions: (match.questions || []).map((q: any) => ({
    id: q.id,
    question: q.question,
    questionType: q.questionType,
    points: q.points,
    options: q.options || [],
    correctAnswer: q.correctAnswer,
    questionAnswers: q.questionAnswers || [],
  })),
});

const fetchUserPredictions = async (week: number = 1): Promise<MatchPrediction[]> => {
  try {
    const response = await fetch(`/api/predictions?week=${week}`);
    const data = await response.json();
    return data.predictions;
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return [];
  }
};

const savePrediction = async (prediction: any): Promise<boolean> => {
  try {
    const response = await fetch('/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        matchId: prediction.matchId,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
      }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error saving prediction:', error);
    return false;
  }
};

export default function HomePage() {
const { data: session, status } = useSession()
  const [matches, setMatches] = useState<Match[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(0);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [predicting, setPredicting] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<{ [key: string]: { homeScore: string; awayScore: string } }>({});
  const [successStates, setSuccessStates] = useState<{ [key: string]: boolean }>({});
  const [questionAnswers, setQuestionAnswers] = useState<{ [key: string]: string }>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<{ [key: string]: boolean }>({});
  const [answerError, setAnswerError] = useState<{ [key: string]: string }>({});
  const [answerSuccess, setAnswerSuccess] = useState<{ [key: string]: string }>({});
  const [openQuestions, setOpenQuestions] = useState<{ [matchId: string]: boolean }>({});
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchPredictions, setMatchPredictions] = useState<MatchPrediction[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  // Accordion helpers
  const expandAll = () => setOpenQuestions(Object.fromEntries(matches.map((m) => [m.id, true])));
  const collapseAll = () => setOpenQuestions({});
  const toggleQuestions = (matchId: string) => setOpenQuestions((prev) => ({ ...prev, [matchId]: !prev[matchId] }));

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // İlk yüklemede week query'si gönderme, API aktif haftayı bulsun
        const url = selectedWeek === 0 ? '/api/matches' : `/api/matches?week=${selectedWeek}`;
        const response = await fetch(url);
        const data = await response.json();
        setMatches((data.matches || []).map(mapMatchData));
        setAvailableWeeks(data.availableWeeks || []);
        setActiveWeek(data.activeWeek || 1);
        
        // İlk yüklemede API'den gelen currentWeek'i seç
        if (selectedWeek === 0) {
          setSelectedWeek(data.currentWeek || 1);
        }
        
        // Set season info from API data
        if (data.currentSeason) {
          setSeason({
            id: data.currentSeason.id,
            name: data.currentSeason.name,
            status: data.currentSeason.status,
            totalWeeks: data.currentSeason.totalWeeks || data.availableWeeks?.length || 34
          });
        } else {
          // Fallback season info
          setSeason({
            id: "default",
            name: "Aktif Sezon",
            status: "ACTIVE",
            totalWeeks: data.availableWeeks?.length || 34
          });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedWeek]);

  // Load predictions when week changes
  useEffect(() => {
    const loadPredictions = async () => {
      if (selectedWeek > 0) {
        const userPredictions = await fetchUserPredictions(selectedWeek);
        // Convert predictions to the format expected by the UI
        const predictionsMap: { [key: string]: any } = {};
        userPredictions.forEach((pred: any) => {
          predictionsMap[pred.matchId] = {
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
            points: pred.points,
            userId: pred.userId
          };
        });
        setPredictions(predictionsMap);
      }
    };
    
    loadPredictions();
  }, [selectedWeek]);

  // Tahmin gönderme
  const handleMakePrediction = async (matchId: string) => {
    const matchPrediction = predictions[matchId];
    if (
      matchPrediction?.homeScore === undefined ||
      matchPrediction?.awayScore === undefined ||
      matchPrediction.homeScore === "" ||
      matchPrediction.awayScore === ""
    ) {
      alert("Lütfen her iki skoru da girin");
      return;
    }
    
    setPredicting(matchId);
    
    try {
      const predictionData = {
        matchId: matchId,
        homeScore: parseInt(matchPrediction.homeScore.toString()),
        awayScore: parseInt(matchPrediction.awayScore.toString()),
        specialAnswers: {} // Will be handled separately
      };
      
      const success = await savePrediction(predictionData);
      
      if (success) {
        setSuccessStates((prev) => ({ ...prev, [matchId]: true }));
        setTimeout(() => setSuccessStates((prev) => ({ ...prev, [matchId]: false })), 2000);
        
        // Tahmin kaydedildikten sonra predictions listesini yenile
        const weekToFetch = selectedWeek === 0 ? 1 : selectedWeek;
        const updatedPredictions = await fetchUserPredictions(weekToFetch);
        const updatedPredictionsMap: { [key: string]: any } = {};
        updatedPredictions.forEach((pred: any) => {
          updatedPredictionsMap[pred.matchId] = {
            homeScore: pred.homeScore,
            awayScore: pred.awayScore,
            points: pred.points,
            userId: pred.userId
          };
        });
        setPredictions(updatedPredictionsMap);
      } else {
        alert("Tahmin kaydedilirken bir hata oluştu");
      }
    } catch (error) {
      console.error('Error saving prediction:', error);
      alert("Tahmin kaydedilirken bir hata oluştu");
    } finally {
      setPredicting(null);
    }
  };

  // Soruya cevap gönderme (gerçek API)
  const handleAnswerQuestion = async (questionId: string, answer: string) => {
    if (!answer.trim()) return;
    setSubmittingAnswer((prev) => ({ ...prev, [questionId]: true }));
    setAnswerError((prev) => ({ ...prev, [questionId]: "" }));
    setAnswerSuccess((prev) => ({ ...prev, [questionId]: "" }));
    try {
      const response = await fetch('/api/question-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer }),
      });
      const data = await response.json();
      if (data.success) {
        setAnswerSuccess((prev) => ({ ...prev, [questionId]: "Cevabınız kaydedildi!" }));
        setQuestionAnswers((prev) => ({ ...prev, [questionId]: answer }));
      } else {
        setAnswerError((prev) => ({ ...prev, [questionId]: data.error || "Bir hata oluştu" }));
      }
    } catch (error) {
      setAnswerError((prev) => ({ ...prev, [questionId]: "Bir hata oluştu" }));
    } finally {
      setSubmittingAnswer((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Maç detay modalı için tahminleri yükle (gerçek API)
  const fetchMatchDetails = async (matchId: string) => {
    setLoadingPredictions(true);
    try {
      const response = await fetch(`/api/predictions?matchId=${matchId}`);
      const data = await response.json();
      setMatchPredictions(data.predictions || []);
    } catch (error) {
      setMatchPredictions([]);
    } finally {
      setLoadingPredictions(false);
    }
  };
  const openMatchModalHandler = async (match: Match) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
    await fetchMatchDetails(match.id);
  };

  // Maç durumu helpers
  const getMatchStatus = (match: Match) =>
    match.isFinished ? "Tamamlandı" : match.isActive ? "Devam Ediyor" : "Bekliyor";
  const getMatchStatusColor = (match: Match) =>
    match.isFinished
      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      : match.isActive
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";

  // Yükleniyor durumu
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Kullanıcı giriş yapmamışsa bilgilendirici ekran
  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">HatoBet'e Hoş Geldiniz!</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Tahmin yapabilmek ve sıralamaya katılabilmek için lütfen giriş yapın.
          </p>
          <a
            href="/auth/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Giriş Yap
          </a>
        </div>
      </div>
    );
  }

  // Ana ekran
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Kullanıcı ve sezon bilgisi */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Merhaba{session?.user?.name ? `, ${session.user.name}` : ""}!</h2>
            {season && (
              <div className="mt-2 text-gray-700 dark:text-gray-300 text-sm">
                Aktif Sezon: <span className="font-semibold">{season.name}</span> ({season.status})<br />
                Toplam Hafta: <span className="font-semibold">{season.totalWeeks}</span>
              </div>
            )}
              </div>
          {/* Hafta seçici */}
          <WeekSelector
            selectedWeek={selectedWeek}
            availableWeeks={availableWeeks}
            onWeekChange={setSelectedWeek}
          />
                              </div>
                              
        {/* Maçlar Tablosu */}
        <MatchTable
          session={session}
          matches={matches}
          selectedWeek={selectedWeek}
          openQuestions={openQuestions}
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
          expandAll={expandAll}
          collapseAll={collapseAll}
          openMatchModalHandler={openMatchModalHandler}
          getMatchStatus={getMatchStatus}
          getMatchStatusColor={getMatchStatusColor}
          formatDate={formatDate}
          handleAnswerQuestion={handleAnswerQuestion}
        />

        {/* Maç detay modalı */}
        <PredictionModal
          session={session}
          showMatchModal={showMatchModal}
          setShowMatchModal={setShowMatchModal}
          selectedMatch={selectedMatch}
          loadingPredictions={loadingPredictions}
          matchPredictions={matchPredictions}
        />
      </div>
    </div>
  );
}