import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { calculateMatchPoints } from "@/lib/rankings";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    // Maç bilgilerini getir
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
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
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Puan hesaplama mantığını test et
    const actualWinner = match.homeScore && match.awayScore ? 
      (match.homeScore > match.awayScore ? 'HOME' : 
       match.awayScore > match.homeScore ? 'AWAY' : 'DRAW') : null;

    const predictionAnalysis = match.predictions.map(prediction => {
      let expectedPoints = 0;
      let analysis = [];

      if (match.homeScore !== null && match.awayScore !== null) {
        // Doğru skor kontrolü (3 puan - skor + sonuç)
        if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
          expectedPoints += 3;
          analysis.push("Doğru skor (+3 puan - skor + sonuç)");
        } else {
          analysis.push("Yanlış skor (0 puan)");
        }

        // Doğru sonuç kontrolü (1 puan) - sadece skor doğru değilse
        if (prediction.winner === actualWinner && 
            !(prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore)) {
          expectedPoints += 1;
          analysis.push("Doğru sonuç (+1 puan)");
        } else if (prediction.winner !== actualWinner && 
                   !(prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore)) {
          analysis.push("Yanlış sonuç (0 puan)");
        }
      }

      return {
        user: prediction.user,
        prediction: `${prediction.homeScore} - ${prediction.awayScore}`,
        winner: prediction.winner,
        actualWinner,
        actualScore: match.homeScore !== null && match.awayScore !== null ? 
          `${match.homeScore} - ${match.awayScore}` : "Henüz oynanmadı",
        currentPoints: prediction.points,
        expectedPoints,
        analysis,
        isCorrect: prediction.points === expectedPoints
      };
    });

    const questionAnalysis = match.questions.map(question => {
      return {
        question: question.question,
        correctAnswer: question.correctAnswer,
        points: question.points,
        answers: question.questionAnswers.map(answer => ({
          user: answer.user,
          answer: answer.answer,
          currentPoints: answer.points,
          expectedPoints: answer.answer === question.correctAnswer ? question.points : 0,
          isCorrect: answer.answer === question.correctAnswer
        }))
      };
    });

    return NextResponse.json({
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        isFinished: match.isFinished,
        actualWinner
      },
      predictionAnalysis,
      questionAnalysis,
      summary: {
        totalPredictions: match.predictions.length,
        correctPredictions: predictionAnalysis.filter(p => p.isCorrect).length,
        incorrectPredictions: predictionAnalysis.filter(p => !p.isCorrect).length,
        totalQuestions: match.questions.length,
        totalQuestionAnswers: match.questions.reduce((sum, q) => sum + q.questionAnswers.length, 0)
      }
    });

  } catch (error) {
    console.error("Error debugging points:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    // Puanları yeniden hesapla
    await calculateMatchPoints(matchId);

    return NextResponse.json({ 
      success: true, 
      message: "Points recalculated successfully" 
    });

  } catch (error) {
    console.error("Error recalculating points:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 