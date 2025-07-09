import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Sezonu bitir
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

    // Sezonu bul
    const season = await prisma.season.findUnique({ where: { id: params.id } })
    if (!season) {
      return NextResponse.json(
        { error: "Sezon bulunamadı" },
        { status: 404 }
      )
    }
    if (season.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Sadece aktif sezon bitirilebilir" },
        { status: 400 }
      )
    }

    // Sezonu bitir
    await prisma.season.update({
      where: { id: params.id },
      data: {
        status: "FINISHED",
        endDate: new Date()
      }
    })

    // Sezondaki tüm maçları bitir
    await prisma.match.updateMany({
      where: { seasonId: params.id, isFinished: false },
      data: { isFinished: true, isActive: false }
    })

    // Sezon sıralamasını getir
    const rankings = await prisma.seasonScore.findMany({
      where: { seasonId: params.id },
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [
        { totalPoints: "desc" },
        { user: { name: "asc" } }
      ]
    })

    return NextResponse.json({
      message: "Sezon başarıyla sonlandırıldı.",
      rankings
    })
  } catch (error) {
    console.error("Finish season error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 