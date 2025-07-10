import { prisma } from "./prisma";

// Maç bittiğinde puanları hesapla ve güncelle
export async function calculateMatchPoints(matchId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        predictions: {
          include: {
            user: true
          }
        },
        questions: {
          include: {
            questionAnswers: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!match || !match.isFinished || match.homeScore === null || match.awayScore === null) {
      return;
    }

    const actualWinner = match.homeScore > match.awayScore ? 'HOME' : 
                        match.awayScore > match.homeScore ? 'AWAY' : 'DRAW';

    // Tahminleri güncelle
    for (const prediction of match.predictions) {
      let points = 0;

      // Doğru sonuç kontrolü
      if (prediction.winner === actualWinner) {
        points += 3;
      }

      // Doğru skor kontrolü
      if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
        points += 10;
      }

      // Tahmin puanını güncelle
      await prisma.prediction.update({
        where: { id: prediction.id },
        data: { points }
      });
    }

    // Özel soru puanlarını hesapla
    for (const question of match.questions) {
      if (question.correctAnswer) {
        for (const answer of question.questionAnswers) {
          let points = 0;
          if (answer.answer === question.correctAnswer) {
            points = question.points;
          }

          // Cevap puanını güncelle
          await prisma.questionAnswer.update({
            where: { id: answer.id },
            data: { points }
          });
        }
      }
    }

    // Haftalık ve sezonluk skorları güncelle
    await updateWeeklyScores(match.seasonId, match.weekNumber);
    await updateSeasonScores(match.seasonId);

  } catch (error) {
    console.error('Error calculating match points:', error);
  }
}

// Haftalık skorları güncelle
async function updateWeeklyScores(seasonId: string, weekNumber: number) {
  try {
    // O haftadaki tüm maçları getir
    const matches = await prisma.match.findMany({
      where: {
        seasonId,
        weekNumber,
        isFinished: true
      },
      include: {
        predictions: {
          include: {
            user: true
          }
        },
        questions: {
          include: {
            questionAnswers: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    // Kullanıcı puanlarını hesapla
    const userScores = new Map();

    for (const match of matches) {
      // Tahmin puanları
      for (const prediction of match.predictions) {
        const userId = prediction.user.id;
        if (!userScores.has(userId)) {
          userScores.set(userId, {
            totalPoints: 0,
            correctScores: 0,
            correctResults: 0,
            specialQuestionPoints: 0
          });
        }

        const userScore = userScores.get(userId);
        userScore.totalPoints += prediction.points;

        if (prediction.points >= 10) {
          userScore.correctScores++;
        } else if (prediction.points >= 3) {
          userScore.correctResults++;
        }
      }

      // Özel soru puanları
      for (const question of match.questions) {
        for (const answer of question.questionAnswers) {
          const userId = answer.user.id;
          if (!userScores.has(userId)) {
            userScores.set(userId, {
              totalPoints: 0,
              correctScores: 0,
              correctResults: 0,
              specialQuestionPoints: 0
            });
          }

          const userScore = userScores.get(userId);
          userScore.specialQuestionPoints += answer.points;
          userScore.totalPoints += answer.points;
        }
      }
    }

    // WeeklyScore kayıtlarını güncelle
    for (const [userId, scores] of userScores) {
      await prisma.weeklyScore.upsert({
        where: {
          userId_seasonId_weekNumber: {
            userId,
            seasonId,
            weekNumber
          }
        },
        update: {
          totalPoints: scores.totalPoints,
          correctScores: scores.correctScores,
          correctResults: scores.correctResults,
          specialQuestionPoints: scores.specialQuestionPoints
        },
        create: {
          userId,
          seasonId,
          weekNumber,
          totalPoints: scores.totalPoints,
          correctScores: scores.correctScores,
          correctResults: scores.correctResults,
          specialQuestionPoints: scores.specialQuestionPoints
        }
      });
    }

  } catch (error) {
    console.error('Error updating weekly scores:', error);
  }
}

// Sezonluk skorları güncelle
async function updateSeasonScores(seasonId: string) {
  try {
    // Tüm haftalık skorları topla
    const weeklyScores = await prisma.weeklyScore.findMany({
      where: { seasonId },
      include: {
        user: true
      }
    });

    // Kullanıcı bazında toplam puanları hesapla
    const userTotals = new Map();

    for (const weeklyScore of weeklyScores) {
      const userId = weeklyScore.userId;
      if (!userTotals.has(userId)) {
        userTotals.set(userId, {
          user: weeklyScore.user,
          totalPoints: 0,
          correctScores: 0,
          correctResults: 0,
          specialQuestionPoints: 0
        });
      }

      const userTotal = userTotals.get(userId);
      userTotal.totalPoints += weeklyScore.totalPoints;
      userTotal.correctScores += weeklyScore.correctScores;
      userTotal.correctResults += weeklyScore.correctResults;
      userTotal.specialQuestionPoints += weeklyScore.specialQuestionPoints;
    }

    // SeasonScore kayıtlarını güncelle
    const seasonScores = [];
    for (const [userId, totals] of userTotals) {
      const seasonScore = await prisma.seasonScore.upsert({
        where: {
          userId_seasonId: {
            userId,
            seasonId
          }
        },
        update: {
          totalPoints: totals.totalPoints,
          correctScores: totals.correctScores,
          correctResults: totals.correctResults,
          specialQuestionPoints: totals.specialQuestionPoints
        },
        create: {
          userId,
          seasonId,
          totalPoints: totals.totalPoints,
          correctScores: totals.correctScores,
          correctResults: totals.correctResults,
          specialQuestionPoints: totals.specialQuestionPoints
        }
      });
      seasonScores.push(seasonScore);
    }

    // Sıralama güncelle
    seasonScores.sort((a, b) => b.totalPoints - a.totalPoints);
    for (let i = 0; i < seasonScores.length; i++) {
      await prisma.seasonScore.update({
        where: { id: seasonScores[i].id },
        data: { rank: i + 1 }
      });
    }

  } catch (error) {
    console.error('Error updating season scores:', error);
  }
} 