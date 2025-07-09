import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
    }

    const questionId = params.id;

    // Önce sorunun var olup olmadığını kontrol et
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json({ error: "Soru bulunamadı" }, { status: 404 });
    }

    // Soruya verilen cevapları da sil
    await prisma.questionAnswer.deleteMany({
      where: { questionId },
    });

    // Soruyu sil
    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({ message: "Soru başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
} 