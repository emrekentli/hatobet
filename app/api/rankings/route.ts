import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Sıralamaları getir
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
    const type = searchParams.get("type") || "weekly" // weekly veya season
    const week = searchParams.get("week")
    const seasonId = searchParams.get("seasonId")

    // Aktif sezonu getir
    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" }
    })

    if (!activeSeason) {
      return NextResponse.json({
        rankings: [],
        season: null,
        message: "Aktif sezon bulunamadı"
      })
    }

    let rankings = []

    if (type === "weekly") {
      // Haftalık sıralama
      const weekNumber = week ? parseInt(week) : activeSeason.totalWeeks

      rankings = await prisma.weeklyScore.findMany({
        where: {
          seasonId: seasonId || activeSeason.id,
          weekNumber: weekNumber
        },
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
          { totalPoints: "desc" },
          { user: { name: "asc" } }
        ]
      })

      // Sıralama numarası ekle
      rankings = rankings.map((score, index) => ({
        ...score,
        rank: index + 1
      }))

    } else {
      // Sezonluk sıralama
      rankings = await prisma.seasonScore.findMany({
        where: {
          seasonId: seasonId || activeSeason.id
        },
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
          { totalPoints: "desc" },
          { user: { name: "asc" } }
        ]
      })

      // Sıralama numarası ekle
      rankings = rankings.map((score, index) => ({
        ...score,
        rank: index + 1
      }))
    }

    return NextResponse.json({
      rankings,
      season: {
        id: activeSeason.id,
        name: activeSeason.name,
        status: activeSeason.status,
        totalWeeks: activeSeason.totalWeeks
      },
      type,
      week: type === "weekly" ? (week || activeSeason.totalWeeks) : null
    })
  } catch (error) {
    console.error("Get rankings error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 