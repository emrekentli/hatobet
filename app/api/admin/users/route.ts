import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const createUserSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
})

// Rastgele şifre oluşturma fonksiyonu
function generatePassword(length: number = 8): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let password = ""
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

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
    const { username, email, role } = createUserSchema.parse(body)

    // Kullanıcı adı ve e-posta kontrolü
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Bu e-posta veya kullanıcı adı zaten kullanılıyor" },
        { status: 400 }
      )
    }

    // Otomatik şifre oluştur
    const plainPassword = generatePassword(10)
    const hashedPassword = await bcrypt.hash(plainPassword, 12)

    // Kullanıcıyı oluştur
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role
      }
    })

    // Kullanıcı bilgilerini döndür (şifre hariç)
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      plainPassword, // Admin'e gösterilecek geçici şifre
      message: "Kullanıcı başarıyla oluşturuldu"
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Geçersiz veri formatı" },
        { status: 400 }
      )
    }

    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
}

// Tüm kullanıcıları listele
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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Şifre alanını dahil etmiyoruz
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 