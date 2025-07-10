import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: matchId } = await params;
    if (!matchId) {
      return NextResponse.json({ error: "Match ID is required" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        season: true,
        predictions: {
          include: { 
            user: { 
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: "desc" },
        },
        questions: {
          where: { isActive: true },
          include: {
            questionAnswers: {
              include: { 
                user: { select: { id: true, name: true, email: true } }
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { predictions: true, questions: true } },
      },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    return NextResponse.json({ match });
  } catch (error) {
    console.error("Error fetching match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 