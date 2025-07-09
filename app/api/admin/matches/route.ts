import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createMatchSchema = z.object({
  homeTeam: z.string().min(1, "Ev sahibi takım gereklidir"),
  awayTeam: z.string().min(1, "Deplasman takımı gereklidir"),
  matchDate: z.string().datetime(),
  weekNumber: z.number().int().min(1),
  seasonId: z.string().min(1, "Sezon ID gereklidir"),
})

const updateMatchSchema = z.object({
  homeScore: z.number().int().min(0).optional(),
  awayScore: z.number().int().min(0).optional(),
  isFinished: z.boolean().optional(),
  isActive: z.boolean().optional(),
})

// Hafta numarası hesaplama fonksiyonu
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}

// Maç oluştur
export async function POST(request: NextRequest) {
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
    const { homeTeam, awayTeam, matchDate, weekNumber, seasonId } = createMatchSchema.parse(body)

    // Maç tarihini kontrol et
    const matchDateTime = new Date(matchDate)
    if (matchDateTime <= new Date()) {
      return NextResponse.json(
        { error: "Maç tarihi gelecekte olmalıdır" },
        { status: 400 }
      )
    }

    // Maç oluştur
    const match = await prisma.match.create({
      data: {
        homeTeam,
        awayTeam,
        matchDate: matchDateTime,
        weekNumber,
        seasonId,
        isActive: true,
        isFinished: false,
      }
    })

    return NextResponse.json({
      match,
      message: "Maç başarıyla oluşturuldu"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Create match error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Maçları listele
export async function GET(request: NextRequest) {
  try {
    // Admin yetkisi kontrolü
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week")
    const seasonId = searchParams.get("seasonId")

    const where: any = {}
    
    // Eğer hafta ve sezon belirtilmişse filtrele, yoksa tüm maçları getir
    if (week && seasonId && week !== "0") {
      where.weekNumber = parseInt(week)
      where.seasonId = seasonId
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        _count: {
          select: {
            predictions: true,
            questions: true,
          }
        }
      },
      orderBy: [
        { weekNumber: "desc" },
        { matchDate: "asc" }
      ]
    })

    return NextResponse.json({ matches })
  } catch (error) {
    console.error("Get matches error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 