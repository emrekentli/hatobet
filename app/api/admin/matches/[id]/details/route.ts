import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Maç detayları (tahminler, puanlar, sorular, istatistikler)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Admin yetkisi kontrolü
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      )
    }

    // Maçı getir
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        season: true,
        predictions: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: [
            { points: "desc" },
            { createdAt: "asc" }
          ]
        },
        questions: {
          include: {
            questionAnswers: {
              include: {
                user: { select: { id: true, name: true, email: true } }
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

    // İstatistikler
    const totalPredictions = match.predictions.length
    const correctScore = match.predictions.filter(p =>
      match.homeScore !== null && match.awayScore !== null &&
      p.homeScore === match.homeScore && p.awayScore === match.awayScore
    ).length
    const correctWinner = match.predictions.filter(p =>
      match.homeScore !== null && match.awayScore !== null &&
      ((match.homeScore > match.awayScore && p.winner === "HOME") ||
       (match.homeScore < match.awayScore && p.winner === "AWAY") ||
       (match.homeScore === match.awayScore && p.winner === "DRAW"))
    ).length

    // Skor dağılımı
    const scoreMap: Record<string, number> = {}
    match.predictions.forEach(p => {
      const key = `${p.homeScore}-${p.awayScore}`
      scoreMap[key] = (scoreMap[key] || 0) + 1
    })
    const scoreDistribution = Object.entries(scoreMap).map(([score, count]) => ({ score, count }))

    return NextResponse.json({
      match,
      stats: {
        totalPredictions,
        correctScore,
        correctWinner,
        scoreDistribution
      }
    })
  } catch (error) {
    console.error("Match details error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 