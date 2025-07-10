import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../auth'
import { prisma } from '../../../lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Admin yetkisi kontrolü
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { seasonId } = body

    if (!seasonId) {
      return NextResponse.json({ error: 'Season ID is required' }, { status: 400 })
    }

    // Sezonun var olduğunu kontrol et
    const season = await prisma.season.findUnique({
      where: { id: seasonId }
    })

    if (!season) {
      return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    }

    // Sezona ait tüm maçları al
    const matches = await prisma.match.findMany({
      where: {
        seasonId: seasonId,
        homeScore: { not: null },
        awayScore: { not: null }
      },
      include: {
        predictions: {
          include: {
            user: true
          }
        },
        questions: {
          include: {
            questionAnswers: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    let totalRecalculated = 0
    let totalPoints = 0

    // Her maç için puanları yeniden hesapla
    for (const match of matches) {
      // Maç sonucunu belirle (null kontrolü ile)
      if (match.homeScore === null || match.awayScore === null) continue
      
      const matchResult = match.homeScore > match.awayScore ? 'HOME' : 
                         match.homeScore < match.awayScore ? 'AWAY' : 'DRAW'

      // Tahminler için puanları hesapla
      for (const prediction of match.predictions) {
        let points = 0

        // Maç sonucu tahmini
        if (prediction.winner === matchResult) {
          points += 3
        }

        // Skor tahmini
        if (prediction.homeScore === match.homeScore && 
            prediction.awayScore === match.awayScore) {
          points += 5
        }

        // Puanı güncelle
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { points }
        })

        totalPoints += points
      }

      // Özel sorular için puanları hesapla
      for (const question of match.questions) {
        for (const answer of question.questionAnswers) {
          let points = 0

          // Doğru cevap kontrolü
          if (answer.answer === question.correctAnswer) {
            points = question.points || 3
          }

          // Puanı güncelle
          await prisma.questionAnswer.update({
            where: { id: answer.id },
            data: { points }
          })

          totalPoints += points
        }
      }

      totalRecalculated++
    }

    return NextResponse.json({
      success: true,
      message: `${season.name} sezonu için ${totalRecalculated} maçın puanları yeniden hesaplandı. Toplam ${totalPoints} puan dağıtıldı.`,
      seasonName: season.name,
      totalRecalculated,
      totalPoints
    })

  } catch (error) {
    console.error('Error recalculating season points:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 