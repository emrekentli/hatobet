import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getCurrentIstanbulDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    // Parametreleri al
    const seasonId = searchParams.get('season');
    const type = searchParams.get('type') || 'season';
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : null;
    const search = searchParams.get('search') || '';

    // Aktif sezonu bul
    let currentSeason;
    if (seasonId) {
      currentSeason = await prisma.season.findUnique({
        where: { id: seasonId }
      });
    } else {
      currentSeason = await prisma.season.findFirst({
        where: { status: 'ACTIVE' }
      });
    }

    if (!currentSeason) {
      currentSeason = await prisma.season.findFirst({});
    }

    const now = getCurrentIstanbulDate();
    const seasonStart = currentSeason!.startDate;
    const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const currentWeek = Math.max(1, Math.min(currentSeason!.totalWeeks, weeksSinceStart + 1));
    const selectedWeek = week || currentWeek;

    // Tüm sezonları getir
    const seasons = await prisma.season.findMany({
      orderBy: { startDate: 'desc' }
    });

    // Kullanıcıları ve puanlarını getir
    let rankings = [];

    if (type === 'week') {
      // Haftalık sıralama
      rankings = await getWeeklyRankings(currentSeason!.id, selectedWeek, search);
    } else {
      // Sezonluk sıralama
      rankings = await getSeasonRankings(currentSeason!.id, search);
    }

    // Mevcut haftaları getir
    const availableWeeks = await getAvailableWeeks(currentSeason!.id);

    return NextResponse.json({
      rankings,
      seasons,
      currentSeason: currentSeason!.id,
      currentWeek,
      availableWeeks
    });

  } catch (error) {
    console.error("Error fetching rankings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Haftalık sıralama hesaplama
async function getWeeklyRankings(seasonId: string, week: number, search: string) {
  // Önce tüm kullanıcıları getir
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true
    }
  });

  // O haftadaki maçları getir
  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      weekNumber: week,
      isFinished: true
    },
    include: {
      predictions: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true
            }
          }
        }
      },
      questions: {
        include: {
          questionAnswers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true
                }
              }
            }
          }
        }
      }
    }
  });

  // Tüm kullanıcılar için başlangıç skorları oluştur
  const userScores = new Map();
  
  for (const user of allUsers) {
    userScores.set(user.id, {
      user: user,
      totalPoints: 0,
      correctScores: 0,
      correctResults: 0,
      specialQuestionPoints: 0
    });
  }

  // Maç sonuçlarına göre puanları hesapla
  for (const match of matches) {
    for (const prediction of match.predictions) {
      const userId = prediction.user.id;
      const userScore = userScores.get(userId);

      // Maç sonucu puanı hesapla
      if (match.homeScore !== null && match.awayScore !== null) {
        const actualWinner = match.homeScore > match.awayScore ? 'HOME' : 
                           match.awayScore > match.homeScore ? 'AWAY' : 'DRAW';
        
        if (prediction.winner === actualWinner) {
          userScore.correctResults++;
          userScore.totalPoints += 3; // Doğru sonuç için 3 puan
        }

        if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
          userScore.correctScores++;
          userScore.totalPoints += 10; // Doğru skor için 10 puan
        }
      }
    }

    // Özel soru puanlarını hesapla
    for (const question of match.questions) {
      for (const answer of question.questionAnswers) {
        const userId = answer.user.id;
        const userScore = userScores.get(userId);
        
        // Doğru cevap kontrolü
        if (question.correctAnswer && answer.answer === question.correctAnswer) {
          userScore.specialQuestionPoints += question.points;
          userScore.totalPoints += question.points;
        }
      }
    }
  }

  // Sıralama listesini oluştur
  let rankings = Array.from(userScores.values());

  // Arama filtresi
  if (search) {
    rankings = rankings.filter(r =>
      r.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.user.username?.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Puanlara göre sırala
  rankings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Sıra numaralarını ekle
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.id = `${ranking.user.id}-week-${week}`;
  });

  return rankings;
}

// Sezonluk sıralama hesaplama
async function getSeasonRankings(seasonId: string, search: string) {
  // Önce tüm kullanıcıları getir
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true
    }
  });

  // Sezonluk skorları getir
  const seasonScores = await prisma.seasonScore.findMany({
    where: { seasonId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true
        }
      }
    },
    orderBy: { totalPoints: 'desc' }
  });

  // Tüm kullanıcılar için skorları oluştur
  const userScoresMap = new Map();
  
  // Önce tüm kullanıcıları 0 puanla ekle
  for (const user of allUsers) {
    userScoresMap.set(user.id, {
      user: user,
      totalPoints: 0,
      correctScores: 0,
      correctResults: 0,
      specialQuestionPoints: 0
    });
  }

  // Mevcut skorları güncelle
  for (const score of seasonScores) {
    userScoresMap.set(score.userId, {
      user: score.user,
      totalPoints: score.totalPoints,
      correctScores: score.correctScores || 0,
      correctResults: score.correctResults || 0,
      specialQuestionPoints: score.specialQuestionPoints || 0
    });
  }

  let rankings = Array.from(userScoresMap.values());

  // Arama filtresi
  if (search) {
    rankings = rankings.filter(r =>
      r.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.user.email?.toLowerCase().includes(search.toLowerCase()) ||
      r.user.username?.toLowerCase().includes(search.toLowerCase())
    );
  }

  // Puanlara göre sırala
  rankings.sort((a, b) => b.totalPoints - a.totalPoints);

  // Sıra numaralarını ekle
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.id = `${ranking.user.id}-season`;
  });

  return rankings;
}

// Mevcut haftaları getir
async function getAvailableWeeks(seasonId: string) {
  const matches = await prisma.match.findMany({
    where: { seasonId },
    select: { weekNumber: true },
    distinct: ['weekNumber'],
    orderBy: { weekNumber: 'asc' }
  });

  return matches.map(m => m.weekNumber);
}