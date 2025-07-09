import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createPredictionSchema = z.object({
  matchId: z.string().min(1, "Maç ID gereklidir"),
  homeScore: z.number().int().min(0, "Ev sahibi skoru 0'dan küçük olamaz"),
  awayScore: z.number().int().min(0, "Deplasman skoru 0'dan küçük olamaz"),
})

// Tahmin oluştur
export async function POST(request: NextRequest) {
  try {
    // Kullanıcı girişi kontrolü
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { matchId, homeScore, awayScore } = createPredictionSchema.parse(body)

    // Maçı kontrol et
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { season: true }
    })

    if (!match) {
      return NextResponse.json(
        { error: "Maç bulunamadı" },
        { status: 404 }
      )
    }

    // Maç başlamış mı kontrol et
    if (new Date(match.matchDate) <= new Date()) {
      return NextResponse.json(
        { error: "Maç başladıktan sonra tahmin yapılamaz" },
        { status: 400 }
      )
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    // Kullanıcının bu maç için daha önce tahmin yapmış mı kontrol et
    const existingPrediction = await prisma.prediction.findFirst({
      where: {
        userId: user.id,
        matchId: matchId
      }
    })

    // Kazananı hesapla
    const winner: "HOME" | "AWAY" | "DRAW" = homeScore > awayScore ? "HOME" : awayScore > homeScore ? "AWAY" : "DRAW"

    let prediction
    if (existingPrediction) {
      // Mevcut tahmini güncelle
      prediction = await prisma.prediction.update({
        where: { id: existingPrediction.id },
        data: {
          homeScore,
          awayScore,
          winner,
          points: 0, // Maç bitiminde hesaplanacak
        }
      })
    } else {
      // Yeni tahmin oluştur
      prediction = await prisma.prediction.create({
        data: {
          userId: user.id,
          matchId: matchId,
          homeScore,
          awayScore,
          winner,
          points: 0, // Maç bitiminde hesaplanacak
        }
      })
    }

    return NextResponse.json({
      prediction,
      message: existingPrediction ? "Tahmin başarıyla güncellendi" : "Tahmin başarıyla kaydedildi"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Create prediction error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Kullanıcının tahminlerini getir
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı girişi kontrolü
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const matchId = searchParams.get("matchId")
    const seasonId = searchParams.get("seasonId")

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    const where: any = {
      userId: user.id
    }
    
    if (matchId) {
      where.matchId = matchId
    }
    
    if (seasonId) {
      where.match = {
        seasonId: seasonId
      }
    }

    const predictions = await prisma.prediction.findMany({
      where,
      include: {
        match: {
          select: {
            id: true,
            homeTeam: true,
            awayTeam: true,
            matchDate: true,
            weekNumber: true,
            homeScore: true,
            awayScore: true,
            isFinished: true,
            season: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { match: { weekNumber: "asc" } },
        { match: { matchDate: "asc" } }
      ]
    })

    return NextResponse.json({ predictions })
  } catch (error) {
    console.error("Get predictions error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 