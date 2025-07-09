import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateMatchSchema = z.object({
  homeTeam: z.string().min(1).optional(),
  awayTeam: z.string().min(1).optional(),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  weekNumber: z.number().int().min(1).optional(),
  isFinished: z.boolean().optional(),
  isActive: z.boolean().optional(),
  matchDate: z.string().optional(), // daha esnek
})

// Maç güncelle
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

    const body = await request.json()
    const updateData = updateMatchSchema.parse(body)
    const prismaUpdateData: any = { ...updateData }
    if (updateData.matchDate) {
      prismaUpdateData.matchDate = new Date(updateData.matchDate)
    }

    // Maçı bul
    const existingMatch = await prisma.match.findUnique({
      where: { id: params.id }
    })

    if (!existingMatch) {
      return NextResponse.json(
        { error: "Maç bulunamadı" },
        { status: 404 }
      )
    }

    // Maç güncellendiğinde puanları yeniden hesapla
    const match = await prisma.match.update({
      where: { id: params.id },
      data: prismaUpdateData,
      include: {
        predictions: true,
        questions: true,
      }
    })

    // Eğer maç bitti ve skor girildiyse puanları hesapla
    if (match.isFinished && match.homeScore !== null && match.awayScore !== null) {
      await calculateMatchPoints(match.id)
    }

    return NextResponse.json({
      match,
      message: "Maç başarıyla güncellendi"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Update match error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Maç sil
export async function DELETE(
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

    // Maçı bul
    const existingMatch = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        predictions: true,
        questions: true,
      }
    })

    if (!existingMatch) {
      return NextResponse.json(
        { error: "Maç bulunamadı" },
        { status: 404 }
      )
    }

    // Maç başladıysa silmeye izin verme
    if (existingMatch.matchDate <= new Date()) {
      return NextResponse.json(
        { error: "Başlamış maçlar silinemez" },
        { status: 400 }
      )
    }

    // Maçı sil (ilişkili tahminler ve sorular da silinecek)
    await prisma.match.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      message: "Maç başarıyla silindi"
    })
  } catch (error) {
    console.error("Delete match error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Maç detayını getir
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

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        predictions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              }
            }
          }
        },
        questions: {
          include: {
            questionAnswers: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            predictions: true,
            questions: true,
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

    return NextResponse.json({ match })
  } catch (error) {
    console.error("Get match error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Maç puanlarını hesapla
async function calculateMatchPoints(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      predictions: true
    }
  })

  if (!match || match.homeScore === null || match.awayScore === null) {
    return
  }

  // Gerçek kazananı belirle
  let actualWinner: "HOME" | "AWAY" | "DRAW"
  if (match.homeScore > match.awayScore) {
    actualWinner = "HOME"
  } else if (match.awayScore > match.homeScore) {
    actualWinner = "AWAY"
  } else {
    actualWinner = "DRAW"
  }

  // Her tahmin için puan hesapla
  for (const prediction of match.predictions) {
    let points = 0

    // Kazanan tahmini kontrolü (1 puan)
    if (prediction.winner === actualWinner) {
      points += 1
    }

    // Skor tahmini kontrolü (2 puan)
    if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
      points += 2
    }

    // Puanı güncelle
    await prisma.prediction.update({
      where: { id: prediction.id },
      data: { points }
    })
  }
} 