import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { questionId, answer } = await request.json();

    if (!questionId || !answer) {
      return NextResponse.json({ error: "Soru ID ve cevap gerekli" }, { status: 400 });
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Soruyu bul ve maçın durumunu kontrol et
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        match: true,
      },
    });

    if (!question) {
      return NextResponse.json({ error: "Soru bulunamadı" }, { status: 404 });
    }

    // Maç bitmişse cevap verilemez
    if (question.match.isFinished) {
      return NextResponse.json({ error: "Maç bitmiş, cevap veremezsiniz" }, { status: 400 });
    }

    // Daha önce cevap verilmiş mi kontrol et
    const existingAnswer = await prisma.questionAnswer.findFirst({
      where: {
        questionId,
        userId: user.id,
      },
    });

    if (existingAnswer) {
      return NextResponse.json({ error: "Bu soruya zaten cevap verdiniz" }, { status: 400 });
    }

    // Cevabı kaydet
    const questionAnswer = await prisma.questionAnswer.create({
      data: {
        questionId,
        userId: user.id,
        answer,
        points: 0, // Başlangıçta 0 puan, doğru cevap girilince güncellenir
      },
    });

    return NextResponse.json({ answer: questionAnswer });
  } catch (error) {
    console.error("Error answering question:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
} 