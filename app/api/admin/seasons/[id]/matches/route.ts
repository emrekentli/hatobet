import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createMatchSchema = z.object({
  homeTeam: z.string().min(1, "Ev sahibi takım gereklidir"),
  awayTeam: z.string().min(1, "Deplasman takımı gereklidir"),
  matchDate: z.string().min(1, "Maç tarihi gereklidir"),
  weekNumber: z.number().int().min(1),
})

// Sezon içinde maç oluştur
export async function POST(
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

    // Sezonu kontrol et
    const season = await prisma.season.findUnique({
      where: { id: params.id }
    })

    if (!season) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      )
    }

    if (season.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif sezonlara maç eklenebilir" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { homeTeam, awayTeam, matchDate, weekNumber } = createMatchSchema.parse(body)

    // Hafta numarasını kontrol et
    if (weekNumber > season.totalWeeks) {
      return NextResponse.json(
        { error: `Hafta numarası ${season.totalWeeks}'den büyük olamaz` },
        { status: 400 }
      )
    }

    // Tarih formatını düzelt (YYYY-MM-DDTHH:mm -> YYYY-MM-DDTHH:mm:ss.sssZ)
    let formattedMatchDate = matchDate
    if (matchDate.includes('T') && !matchDate.includes('Z')) {
      formattedMatchDate = matchDate + ':00.000Z'
    } else if (!matchDate.includes('T')) {
      formattedMatchDate = matchDate + 'T00:00:00.000Z'
    }

    // Maç tarihini kontrol et
    const matchDateTime = new Date(formattedMatchDate)
    if (matchDateTime <= new Date()) {
      return NextResponse.json(
        { error: "Maç tarihi gelecekte olmalıdır" },
        { status: 400 }
      )
    }

    // Aynı haftada aynı takımların maçı var mı kontrol et
    const existingMatch = await prisma.match.findFirst({
      where: {
        seasonId: params.id,
        weekNumber,
        OR: [
          { homeTeam, awayTeam },
          { homeTeam: awayTeam, awayTeam: homeTeam }
        ]
      }
    })

    if (existingMatch) {
      return NextResponse.json(
        { error: "Bu haftada aynı takımlar arasında zaten maç var" },
        { status: 400 }
      )
    }

    // Maç oluştur
    const match = await prisma.match.create({
      data: {
        seasonId: params.id,
        homeTeam,
        awayTeam,
        matchDate: matchDateTime,
        weekNumber,
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

// Sezon içindeki maçları listele
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const { params } = context;
  try {
    // Admin yetkisi kontrolü
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Yetkisiz erişim" },
        { status: 403 }
      )
    }
    const season = await prisma.season.findUnique({
      where: { id: params.id }
    })

    if (!season) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week")

    const where: any = {
      seasonId: params.id
    }
    
    if (week && week !== "0") {
      where.weekNumber = parseInt(week)
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
        { weekNumber: "asc" },
        { matchDate: "asc" }
      ]
    })

    return NextResponse.json({ 
      matches,
      season: {
        id: season.id,
        name: season.name,
        status: season.status,
        totalWeeks: season.totalWeeks
      }
    })
  } catch (error) {
    console.error("Get matches error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 