import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

// GET: Kullanıcı kendi profilini görür
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({ user });
}

// PUT: Kullanıcı kendi profilini günceller (ad, kullanıcı adı, e-posta, şifre)
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const body = await request.json();
  const { name, username, email, currentPassword, newPassword } = body;

  // Şifre güncelleme isteniyorsa mevcut şifreyi kontrol et
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Mevcut şifre gerekli" }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Mevcut şifre yanlış" }, { status: 400 });
    }
  }

  // Güncellenecek alanlar
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (username !== undefined) updateData.username = username;
  if (email !== undefined) updateData.email = email;
  if (newPassword) updateData.password = await bcrypt.hash(newPassword, 12);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    if (error.code === "P2002") {
      // Unique constraint failed
      return NextResponse.json({ error: "E-posta veya kullanıcı adı zaten kullanılıyor" }, { status: 400 });
    }
    return NextResponse.json({ error: "Bir hata oluştu" }, { status: 500 });
  }
} 