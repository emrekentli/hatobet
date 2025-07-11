import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Sezona göre zamanlı soruları listele
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const search = searchParams.get("search") || "";
    const where: any = { isTimed: true };
    if (seasonId) where.seasonId = seasonId;
    if (search) {
      where.question = { contains: search, mode: "insensitive" };
    }
    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ questions });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Yeni zamanlı soru ekle
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { seasonId, question, questionType, options, deadline, points } = body;
    if (!seasonId || !question || !questionType || !deadline || !points) {
      return NextResponse.json({ error: "Eksik alanlar" }, { status: 400 });
    }
    const newQuestion = await prisma.question.create({
      data: {
        seasonId: seasonId,
        question,
        questionType,
        options: options || [],
        deadline: new Date(deadline),
        points: Number(points),
        isTimed: true,
        isActive: true,
      },
    });
    return NextResponse.json({ question: newQuestion });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT: Soru güncelle
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { id, seasonId, question, questionType, options, deadline, points } = body;
    if (!id || !seasonId || !question || !questionType || !deadline || !points) {
      return NextResponse.json({ error: "Eksik alanlar" }, { status: 400 });
    }
    const updated = await prisma.question.update({
      where: { id },
      data: {
        seasonId: seasonId,
        question,
        questionType,
        options: options || [],
        deadline: new Date(deadline),
        points: Number(points),
        isTimed: true,
      },
    });
    return NextResponse.json({ question: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Soru sil
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Eksik id" }, { status: 400 });
    await prisma.question.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 