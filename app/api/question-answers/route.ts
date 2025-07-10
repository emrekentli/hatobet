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

    // Check if user already answered this question
    const existingAnswer = await prisma.questionAnswer.findUnique({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: questionId,
        },
      },
    });

    if (existingAnswer) {
      return NextResponse.json({ error: "You have already answered this question" }, { status: 400 });
    }

    // Get the question to check if it's still active
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        match: true,
      },
    });

    if (!question || !question.isActive) {
      return NextResponse.json({ error: "Question not found or inactive" }, { status: 404 });
    }

    // Check if match is still active (not finished)
    if (question.match.isFinished) {
      return NextResponse.json({ error: "Match is finished, cannot submit answer" }, { status: 400 });
    }

    // Create the answer
    const newAnswer = await prisma.questionAnswer.create({
      data: {
        userId: session.user.id,
        questionId: questionId,
        answer: answer,
        points: 0, // Will be calculated when match ends
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        question: true,
      },
    });

    return NextResponse.json({ success: true, answer: newAnswer });
  } catch (error) {
    console.error("Error submitting answer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Get answers for a question (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get("questionId");

    if (!questionId) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const answers = await prisma.questionAnswer.findMany({
      where: {
        questionId: questionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        question: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ answers });
  } catch (error) {
    console.error("Error fetching answers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 