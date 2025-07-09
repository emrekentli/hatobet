import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Belirli bir maç için yapılan tüm tahminleri getir
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Kullanıcı girişi kontrolü
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    const matchId = params.id

    // Maçı kontrol et ve özel soruları da getir
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { 
        season: true,
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
    })

    if (!match) {
      return NextResponse.json(
        { error: "Maç bulunamadı" },
        { status: 404 }
      )
    }

    // Maçın tüm tahminlerini getir
    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { points: "desc" },
        { createdAt: "asc" }
      ]
    })

    return NextResponse.json({
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        matchDate: match.matchDate,
        weekNumber: match.weekNumber,
        isFinished: match.isFinished,
        season: match.season,
        questions: match.questions
      },
      predictions
    })
  } catch (error) {
    console.error("Get match predictions error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 