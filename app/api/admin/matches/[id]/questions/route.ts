import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {auth} from "@/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { question, questionType, options, points } = await request.json();

    const match = await prisma.match.findUnique({
      where: { id: params.id },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const newQuestion = await prisma.question.create({
      data: {
        question,
        questionType,
        options: questionType === "MULTIPLE_CHOICE" ? options : [],
        points,
        matchId: params.id,
      },
    });

    return NextResponse.json({ question: newQuestion });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { questionId, question, questionType, options, points, correctAnswer } = await request.json();

    // Soruyu güncelle
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        question,
        questionType,
        options: questionType === "MULTIPLE_CHOICE" ? options : [],
        points,
        correctAnswer: correctAnswer || null,
      },
    });

    // Eğer doğru cevap girildiyse, tüm kullanıcı cevaplarını kontrol et ve puanları güncelle
    if (correctAnswer) {
      const questionAnswers = await prisma.questionAnswer.findMany({
        where: { questionId },
        include: { 
          user: true,
          question: {
            include: { match: true }
          }
        }
      });

      for (const answer of questionAnswers) {
        let earnedPoints = 0;
        
        if (answer.answer === correctAnswer) {
          earnedPoints = points;
        }

        // Puanı güncelle
        await prisma.questionAnswer.update({
          where: { id: answer.id },
          data: { points: earnedPoints }
        });

        // Eğer puan kazanıldıysa haftalık ve sezon skorlarını güncelle
        if (earnedPoints > 0) {
          // Haftalık skoru güncelle
          await prisma.weeklyScore.upsert({
            where: {
              userId_seasonId_weekNumber: {
                userId: answer.userId,
                seasonId: answer.question.match.seasonId,
                weekNumber: answer.question.match.weekNumber
              }
            },
            update: {
              totalPoints: {
                increment: earnedPoints
              }
            },
            create: {
              userId: answer.userId,
              seasonId: answer.question.match.seasonId,
              weekNumber: answer.question.match.weekNumber,
              totalPoints: earnedPoints
            }
          });

          // Sezon skorunu güncelle
          await prisma.seasonScore.upsert({
            where: {
              userId_seasonId: {
                userId: answer.userId,
                seasonId: answer.question.match.seasonId
              }
            },
            update: {
              totalPoints: {
                increment: earnedPoints
              }
            },
            create: {
              userId: answer.userId,
              seasonId: answer.question.match.seasonId,
              totalPoints: earnedPoints
            }
          });
        }
      }
    }

    return NextResponse.json({ question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 