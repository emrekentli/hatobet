import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    if (!matchId) {
      return NextResponse.json({ error: "matchId parametresi gerekli" }, { status: 400 });
    }

    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            isFinished: true,
            weekNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Error fetching all predictions for match:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 