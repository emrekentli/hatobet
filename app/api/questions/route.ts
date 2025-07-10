import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET - Get questions for a match
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    const questions = await prisma.question.findMany({
      where: {
        matchId: matchId,
        isActive: true,
      },
      include: {
        questionAnswers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new question
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { matchId, question, questionType, options, points, correctAnswer } = body;

    if (!matchId || !question || !questionType || !points) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newQuestion = await prisma.question.create({
      data: {
        matchId,
        question,
        questionType,
        options: options || [],
        points: parseInt(points),
        correctAnswer: correctAnswer || null,
      },
      include: {
        questionAnswers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update a question
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, question, questionType, options, points, correctAnswer } = body;

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    const updatedQuestion = await prisma.question.update({
      where: { id },
      data: {
        question,
        questionType,
        options: options || [],
        points: parseInt(points),
        correctAnswer: correctAnswer || null,
      },
      include: {
        questionAnswers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete a question
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Question ID is required" }, { status: 400 });
    }

    await prisma.question.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 