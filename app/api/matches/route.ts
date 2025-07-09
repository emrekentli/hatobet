import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Kullanıcılar için maç listesi
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı girişi kontrolü
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    // Kullanıcıyı email ile bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    // Aktif sezonu getir
    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" }
    })

    if (!activeSeason) {
      return NextResponse.json({
        matches: [],
        season: null,
        message: "Aktif sezon bulunamadı"
      })
    }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get("week")

    const where: any = {
      seasonId: activeSeason.id
    }
    
    if (week && week !== "0") {
      where.weekNumber = parseInt(week)
    }

    // Maçları ve kullanıcının tahminlerini getir
    const matches = await prisma.match.findMany({
      where,
      include: {
        predictions: {
          where: {
            userId: user.id
          },
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            winner: true,
            points: true,
            userId: true
          }
        },
        questions: {
          include: {
            questionAnswers: {
              where: { userId: user.id },
              select: { id: true, answer: true, points: true, userId: true }
            }
          }
        },
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

    // Maçları düzenle - kullanıcının tahminini ayrı alan olarak ekle
    const formattedMatches = matches.map(match => ({
      ...match,
      userPrediction: match.predictions[0] || null,
      predictions: undefined // Tahminleri gizle
    }))

    return NextResponse.json({ 
      matches: formattedMatches,
      season: {
        id: activeSeason.id,
        name: activeSeason.name,
        status: activeSeason.status,
        totalWeeks: activeSeason.totalWeeks
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