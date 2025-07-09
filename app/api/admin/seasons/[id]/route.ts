import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Sezon detayını getir
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

    const season = await prisma.season.findUnique({
      where: { id: params.id },
      include: {
        matches: {
          include: {
            _count: {
              select: {
                predictions: true,
              }
            }
          },
          orderBy: [
            { weekNumber: "asc" },
            { matchDate: "asc" }
          ]
        },
        seasonScores: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              }
            }
          },
          orderBy: {
            totalPoints: "desc"
          }
        },
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          }
        }
      }
    })

    if (!season) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      )
    }

    return NextResponse.json({ season })
  } catch (error) {
    console.error("Get season error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Sezon güncelle
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
    const { name, endDate, status } = body

    // Sezonu bul
    const existingSeason = await prisma.season.findUnique({
      where: { id: params.id }
    })

    if (!existingSeason) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      )
    }

    // Güncelleme verilerini hazırla
    const updateData: any = {}
    if (name) updateData.name = name
    if (endDate) updateData.endDate = new Date(endDate)
    if (status) updateData.status = status

    // Sezon güncelle
    const season = await prisma.season.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          }
        }
      }
    })

    return NextResponse.json({
      season,
      message: "Sezon başarıyla güncellendi"
    })
  } catch (error) {
    console.error("Update season error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 