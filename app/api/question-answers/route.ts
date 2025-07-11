import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// POST - Submit an answer to a question
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { questionId, answer } = body;

    if (!questionId || !answer) {
      return NextResponse.json({ error: "Question ID and answer are required" }, { status: 400 });
    }

    // Get the question to check if it's still active and deadline
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: { id: true, deadline: true, isActive: true },
    });

    if (!question || !question.isActive) {
      return NextResponse.json({ error: "Question not found or inactive" }, { status: 404 });
    }

    // Deadline kontrolü
    if (question.deadline && new Date(question.deadline) < new Date()) {
      return NextResponse.json({ error: "Süreniz doldu, cevap değiştirilemez" }, { status: 400 });
    }

    // Cevap var mı kontrol et
    const existingAnswer = await prisma.questionAnswer.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: questionId,
        },
      },
    });

    let answerResult;
    if (existingAnswer) {
      // Update
      answerResult = await prisma.questionAnswer.update({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: questionId,
          },
        },
        data: { answer },
        include: {
          user: { select: { id: true, name: true, email: true } },
          question: true,
        },
      });
    } else {
      // Create
      answerResult = await prisma.questionAnswer.create({
        data: {
          userId: session.user.id,
          questionId: questionId,
          answer: answer,
          points: 0, // Will be calculated when match ends
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          question: true,
        },
      });
    }

    return NextResponse.json({ success: true, answer: answerResult });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get answers for a question (admin) veya birden fazla questionId için kullanıcının cevapları (user)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");
    const questionIds = searchParams.get("questionIds"); // Virgülle ayrılmış id listesi

    // Admin: tek sorunun tüm cevapları
    if (session?.user?.role === "ADMIN" && questionId) {
      const answers = await prisma.questionAnswer.findMany({
        where: { questionId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          question: true,
        },
        orderBy: { createdAt: "asc" },
      });
      return NextResponse.json({ answers });
    }

    // User: birden fazla questionId için kendi cevapları
    if (session?.user?.id && questionIds) {
      const ids = questionIds.split(",").map((id) => id.trim()).filter(Boolean);
      if (!ids.length) return NextResponse.json({ answers: [] });
      const answers = await prisma.questionAnswer.findMany({
        where: {
          questionId: { in: ids },
          userId: session.user.id,
        },
      });
      return NextResponse.json({ answers });
    }

    return NextResponse.json({ error: "Unauthorized or missing params" }, { status: 401 });
  } catch (error) {
    console.error("Error fetching answers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 