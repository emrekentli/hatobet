import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calculateMatchPoints } from "@/lib/rankings";

/**
 * currentWeek:
 * - En son tüm maçları tamamlanmış haftanın bir fazlası.
 * - Eğer o haftada maç yoksa, maç olan en son haftayı döner.
 * - Hiç maç yoksa 1.
 */
async function calculateCurrentWeek(seasonId: string) {
  const allMatches = await prisma.match.findMany({
    where: { seasonId },
    select: { weekNumber: true, isFinished: true },
    orderBy: { weekNumber: "asc" },
  });
  if (!allMatches.length) return 1;

  // Haftalara grupla
  const weekStatus: Record<number, boolean[]> = {};
  for (const match of allMatches) {
    if (!weekStatus[match.weekNumber]) weekStatus[match.weekNumber] = [];
    weekStatus[match.weekNumber].push(match.isFinished);
  }
  const allWeeks = Object.keys(weekStatus).map(Number).sort((a, b) => a - b);

  // En son tüm maçları tamamlanan hafta
  let lastCompleteWeek = 0;
  for (const w of allWeeks) {
    if (weekStatus[w].every(Boolean)) lastCompleteWeek = w;
    else break;
  }

  // Bir sonraki haftada maç var mı?
  const nextWeek = lastCompleteWeek + 1;
  const hasNextWeekMatch = !!weekStatus[nextWeek];

  // Eğer bir sonraki haftada hiç maç yoksa en son maç olan haftayı döneriz.
  const latestMatchWeek = allWeeks[allWeeks.length - 1];
  if (!hasNextWeekMatch) {
    return latestMatchWeek || 1;
  }
  return nextWeek;
}

// ========== GET ==========
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get("week");
    const seasonId = searchParams.get("seasonId");
    const search = searchParams.get("search");

    // En güncel sezonu bul (aktif yoksa en son başlayan)
    let currentSeason = null;
    if (seasonId) {
      currentSeason = await prisma.season.findUnique({ where: { id: seasonId } });
    } else {
      currentSeason = await prisma.season.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      }) || await prisma.season.findFirst({ orderBy: { startDate: "desc" } });
    }
    if (!currentSeason) {
      return NextResponse.json({ error: "Sezon bulunamadı" }, { status: 404 });
    }

    // Mevcut hafta hesapla (örneğin ekranda default olarak seçilecek hafta)
    const currentWeek = await calculateCurrentWeek(currentSeason.id);

    // Maçları getir
    const where: any = { seasonId: currentSeason.id };
    if (week && parseInt(week) > 0) where.weekNumber = parseInt(week);
    if (search) {
      where.OR = [
        { homeTeam: { contains: search, mode: 'insensitive' } },
        { awayTeam: { contains: search, mode: 'insensitive' } }
      ];
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        season: true,
        predictions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        questions: {
          where: { isActive: true },
          include: {
            questionAnswers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { predictions: true, questions: true } },
      },
      orderBy: { matchDate: "asc" },
    });

    // Sezon ve haftalar
    const availableSeasons = await prisma.season.findMany({ orderBy: { startDate: "desc" } });
    const availableWeeks = Array.from({ length: Math.max(currentSeason.totalWeeks, 1) }, (_, i) => i + 1);

    return NextResponse.json({ 
      matches,
      currentSeason,
      currentWeek,
      availableSeasons,
      availableWeeks,
    });
  } catch (error: any) {
    console.error("Error fetching matches:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}

// ========== POST ==========
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { homeTeam, awayTeam, matchDate, weekNumber, seasonId, homeScore, awayScore, specialQuestions } = body;
    if (!homeTeam || !awayTeam || !matchDate || !weekNumber || !seasonId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    // Maçı oluştur
    const newMatch = await prisma.match.create({
      data: {
        seasonId,
        homeTeam,
        awayTeam,
        matchDate: new Date(matchDate),
        weekNumber: parseInt(weekNumber),
        homeScore: homeScore ? parseInt(homeScore) : null,
        awayScore: awayScore ? parseInt(awayScore) : null,
        isFinished: !!(homeScore && awayScore),
        isActive: !(homeScore && awayScore),
      },
      include: {
        season: true,
        predictions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        questions: {
          include: {
            questionAnswers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { predictions: true, questions: true } },
      },
    });

    // Special questions (varsa) ekle
    if (specialQuestions && Array.isArray(specialQuestions) && specialQuestions.length > 0) {
      for (const q of specialQuestions) {
        await prisma.question.create({
          data: {
            matchId: newMatch.id,
            question: q.question,
            questionType: q.questionType,
            options: q.options || [],
            points: q.points || 5,
            correctAnswer: q.correctAnswer || null,
          },
        });
      }
    }

    // Maç skorla birlikte oluşturulduysa puanları hesapla
    if (newMatch.isFinished) {
      await calculateMatchPoints(newMatch.id);
    }

    return NextResponse.json({ success: true, match: newMatch });
  } catch (error: any) {
    console.error("Error creating match:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}

// ========== PUT ==========
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, homeTeam, awayTeam, matchDate, weekNumber, seasonId, homeScore, awayScore, specialQuestions } = body;
    if (!id) return NextResponse.json({ error: "Match ID is required" }, { status: 400 });

    // Güncelleme objesi
    const updateData: any = {};
    if (homeTeam) updateData.homeTeam = homeTeam;
    if (awayTeam) updateData.awayTeam = awayTeam;
    if (matchDate) updateData.matchDate = new Date(matchDate);
    if (weekNumber) updateData.weekNumber = parseInt(weekNumber);
    if (seasonId) updateData.seasonId = seasonId;

    // Skor güncellemesi
    let scoreUpdated = false;
    if (homeScore !== undefined && awayScore !== undefined) {
      const homeScoreNum = parseInt(homeScore);
      const awayScoreNum = parseInt(awayScore);
      updateData.homeScore = !isNaN(homeScoreNum) ? homeScoreNum : null;
      updateData.awayScore = !isNaN(awayScoreNum) ? awayScoreNum : null;
      if (!isNaN(homeScoreNum) && !isNaN(awayScoreNum)) {
        updateData.isFinished = true;
        updateData.isActive = false;
      }
      scoreUpdated = true;
    }

    // 1. Önce maçı güncelle
    await prisma.match.update({
      where: { id: String(id) },
      data: updateData,
    });

    // 2. Special questions (Özel sorular) sadece güncelle/ekle (asla silme)
    if (specialQuestions && Array.isArray(specialQuestions)) {
      for (const q of specialQuestions) {
        if (q.id) {
          // Güncelle (varsa)
          await prisma.question.update({
            where: { id: String(q.id) },
            data: {
              question: q.question,
              questionType: q.questionType,
              options: q.options || [],
              points: q.points || 5,
              correctAnswer: q.correctAnswer || null,
              isActive: true,
            }
          });
        } else {
          // Yeni ekle
          await prisma.question.create({
            data: {
              matchId: String(id),
              question: q.question,
              questionType: q.questionType,
              options: q.options || [],
              points: q.points || 5,
              correctAnswer: q.correctAnswer || null,
              isActive: true,
            }
          });
        }
      }
    }

    // 3. Skor güncellendiyse puanları hesapla
    if (scoreUpdated) {
      await calculateMatchPoints(String(id));
    }

    // 4. Güncel maçı tekrar çek (tüm değişikliklerle birlikte)
    const refreshedMatch = await prisma.match.findUnique({
      where: { id: String(id) },
      include: {
        season: true,
        predictions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        questions: {
          include: {
            questionAnswers: {
              include: { user: { select: { id: true, name: true, email: true } } },
            },
          },
        },
        _count: { select: { predictions: true, questions: true } },
      },
    });

    return NextResponse.json({ success: true, match: refreshedMatch });
  } catch (error: any) {
    console.error("Error updating match:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}

// ========== DELETE ==========
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Match ID is required" }, { status: 400 });

    await prisma.match.delete({ where: { id: String(id) } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting match:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
}
