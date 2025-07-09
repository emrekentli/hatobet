import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateMatchResultSchema = z.object({
  homeScore: z.number().int().min(0, "Ev sahibi skoru 0'dan küçük olamaz"),
  awayScore: z.number().int().min(0, "Deplasman skoru 0'dan küçük olamaz"),
})

// Maç sonucunu güncelle
export async function PUT(
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

    // Maçı kontrol et
    const match = await prisma.match.findUnique({
      where: { id: params.id },
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
        }
      }
    })

    if (!match) {
      return NextResponse.json(
        { error: "Maç bulunamadı" },
        { status: 404 }
      )
    }

    if (match.isFinished) {
      return NextResponse.json(
        { error: "Bu maç zaten bitmiş" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { homeScore, awayScore } = updateMatchResultSchema.parse(body)

    // Kazananı hesapla
    let actualWinner: "HOME" | "AWAY" | "DRAW"
    if (homeScore > awayScore) {
      actualWinner = "HOME"
    } else if (awayScore > homeScore) {
      actualWinner = "AWAY"
    } else {
      actualWinner = "DRAW"
    }

    // Maç sonucunu güncelle
    const updatedMatch = await prisma.match.update({
      where: { id: params.id },
      data: {
        homeScore,
        awayScore,
        isFinished: true,
        isActive: false,
      }
    })

    // Tahminleri değerlendir ve puanları hesapla
    const predictionUpdates = match.predictions.map(prediction => {
      let points = 0

      // Kazanan tahmini kontrolü (1 puan)
      if (prediction.winner === actualWinner) {
        points += 1
      }

      // Skor tahmini kontrolü (2 puan)
      if (prediction.homeScore === homeScore && prediction.awayScore === awayScore) {
        points += 2
      }

      return {
        predictionId: prediction.id,
        userId: prediction.user.id,
        points
      }
    })

    // Tahminleri güncelle
    for (const update of predictionUpdates) {
      await prisma.prediction.update({
        where: { id: update.predictionId },
        data: { points: update.points }
      })
    }

    // Haftalık skorları güncelle
    const weeklyScoreUpdates = new Map<string, number>()
    
    for (const update of predictionUpdates) {
      const currentScore = weeklyScoreUpdates.get(update.userId) || 0
      weeklyScoreUpdates.set(update.userId, currentScore + update.points)
    }

    for (const [userId, points] of weeklyScoreUpdates) {
      await prisma.weeklyScore.upsert({
        where: {
          userId_seasonId_weekNumber: {
            userId,
            seasonId: match.seasonId,
            weekNumber: match.weekNumber
          }
        },
        update: {
          totalPoints: {
            increment: points
          }
        },
        create: {
          userId,
          seasonId: match.seasonId,
          weekNumber: match.weekNumber,
          totalPoints: points
        }
      })
    }

    // Sezon skorlarını da güncelle
    for (const [userId, points] of weeklyScoreUpdates) {
      await prisma.seasonScore.upsert({
        where: {
          userId_seasonId: {
            userId,
            seasonId: match.seasonId
          }
        },
        update: {
          totalPoints: {
            increment: points
          }
        },
        create: {
          userId,
          seasonId: match.seasonId,
          totalPoints: points
        }
      })
    }

    return NextResponse.json({
      match: updatedMatch,
      predictionsUpdated: predictionUpdates.length,
      message: "Maç sonucu başarıyla güncellendi ve puanlar hesaplandı"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Update match result error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 