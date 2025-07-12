import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getCurrentIstanbulDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
      try {
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

    const { searchParams } = new URL(request.url);
    let userId = searchParams.get("userId");
    const matchId = searchParams.get("matchId");
    const week = searchParams.get("week");

    const where: any = {};

    // Kullanıcı ID'sini ayarla
    if (userId) {
      where.userId = userId;
    } else {
      where.userId = session?.user?.id;
    }

    if (matchId) {
      where.matchId = matchId;
    }

    // Week parametresi varsa, o haftadaki maçların tahminlerini getir
    if (week) {
      const weekNumber = parseInt(week);
      where.match = {
        weekNumber: weekNumber
      };
    }

    const predictions = await prisma.prediction.findMany({
      where,
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
    console.error("Error fetching predictions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { matchId, homeScore, awayScore } = body;

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json({ error: "Match ID, home score, and away score are required" }, { status: 400 });
    }

    // Check if match exists and is still active
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if(new Date(match.matchDate) <= getCurrentIstanbulDate()){
      return NextResponse.json({ error: "Match is started, cannot submit prediction" }, { status: 400 });
    }
    if (match.isFinished) {
      return NextResponse.json({ error: "Match is finished, cannot submit prediction" }, { status: 400 });
    }

    // Check if user already has a prediction for this match
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId: session.user.id,
          matchId: matchId,
        },
      },
    });

    let winner: "HOME" | "AWAY" | "DRAW";
    if (homeScore > awayScore) {
      winner = "HOME";
    } else if (awayScore > homeScore) {
      winner = "AWAY";
    } else {
      winner = "DRAW";
    }

    if (existingPrediction) {
      // Update existing prediction
      const updatedPrediction = await prisma.prediction.update({
        where: {
          userId_matchId: {
            userId: session.user.id,
            matchId: matchId,
          },
        },
        data: {
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
          winner,
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
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true,
              isFinished: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, prediction: updatedPrediction });
    } else {
      // Create new prediction
      const newPrediction = await prisma.prediction.create({
        data: {
          userId: session.user.id,
          matchId: matchId,
          homeScore: parseInt(homeScore),
          awayScore: parseInt(awayScore),
          winner,
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
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              homeScore: true,
              awayScore: true,
              isFinished: true,
            },
          },
        },
      });

      return NextResponse.json({ success: true, prediction: newPrediction });
    }
  } catch (error) {
    console.error("Error creating/updating prediction:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 