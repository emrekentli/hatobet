import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createSeasonSchema = z.object({
  name: z.string().min(1, "Sezon adı gereklidir"),
  startDate: z.string().min(1, "Başlangıç tarihi gereklidir"),
  totalWeeks: z.number().int().min(1, "Toplam hafta sayısı en az 1 olmalıdır"),
})

const updateSeasonSchema = z.object({
  name: z.string().min(1).optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["ACTIVE", "FINISHED", "CANCELLED"]).optional(),
})

// Sezon oluştur
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
    const { name, startDate, totalWeeks } = createSeasonSchema.parse(body)

    // Aktif sezon var mı kontrol et
    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" }
    })

    if (activeSeason) {
      return NextResponse.json(
        { error: "Zaten aktif bir sezon bulunmaktadır. Önce mevcut sezonu bitirin." },
        { status: 400 }
      )
    }

    // Tarih formatını düzelt (YYYY-MM-DD -> YYYY-MM-DDTHH:mm:ss.sssZ)
    const formattedStartDate = new Date(startDate + 'T00:00:00.000Z')

    // Sezon oluştur
    const season = await prisma.season.create({
      data: {
        name,
        startDate: formattedStartDate,
        totalWeeks,
        status: "ACTIVE",
      }
    })

    return NextResponse.json({
      season,
      message: "Sezon başarıyla oluşturuldu"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Create season error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Sezonları listele
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
    const status = searchParams.get("status")

    const where: any = {}
    
    if (status) {
      where.status = status
    }

    const seasons = await prisma.season.findMany({
      where,
      include: {
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          }
        }
      },
      orderBy: [
        { status: "asc" }, // Aktif sezonlar önce
        { startDate: "desc" }
      ]
    })

    return NextResponse.json({ seasons })
  } catch (error) {
    console.error("Get seasons error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 