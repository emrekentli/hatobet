import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../auth'
import { prisma } from '../../../lib/prisma'

// Kullanıcının belirtilen sezon+hafta için DETAYLI skorunu hesaplar
async function calculateWeeklyStats(userId: string, seasonId: string, weekNumber: number) {
  const predictions = await prisma.prediction.findMany({
    where: {
      userId,
      match: { seasonId, weekNumber }
    },
    include: { match: true }
  })
  const questionAnswers = await prisma.questionAnswer.findMany({
    where: {
      userId,
      question: { match: { seasonId, weekNumber } }
    },
    include: { question: true }
  })
  let totalPoints = 0, correctScores = 0, correctResults = 0, specialQuestionPoints = 0

  for (const prediction of predictions) {
    if (
        prediction.homeScore === prediction.match.homeScore &&
        prediction.awayScore === prediction.match.awayScore
    ) {
      totalPoints += 3
      correctScores += 1
    } else if (
        prediction.match.homeScore !== null &&
        prediction.match.awayScore !== null
    ) {
      const actualWinner =
          prediction.match.homeScore > prediction.match.awayScore
              ? 'HOME'
              : prediction.match.awayScore > prediction.match.homeScore
                  ? 'AWAY'
                  : 'DRAW'
      if (prediction.winner === actualWinner) {
        totalPoints += 1
        correctResults += 1
      }
    }
  }

  for (const answer of questionAnswers) {
    if (
        typeof answer.answer === 'string' &&
        typeof answer.question.correctAnswer === 'string' &&
        answer.answer.trim().toLowerCase() === answer.question.correctAnswer.trim().toLowerCase()
    ) {
      totalPoints += answer.question.points || 3
      specialQuestionPoints += answer.question.points || 3
    }
  }
  return { totalPoints, correctScores, correctResults, specialQuestionPoints }
}

// Kullanıcının belirtilen sezon için DETAYLI skorunu hesaplar
async function calculateSeasonStats(userId: string, seasonId: string) {
  const predictions = await prisma.prediction.findMany({
    where: { userId, match: { seasonId } },
    include: { match: true }
  })
  const questionAnswers = await prisma.questionAnswer.findMany({
    where: { userId, question: { match: { seasonId } } },
    include: { question: true }
  })
  let totalPoints = 0, correctScores = 0, correctResults = 0, specialQuestionPoints = 0

  for (const prediction of predictions) {
    if (
        prediction.homeScore === prediction.match.homeScore &&
        prediction.awayScore === prediction.match.awayScore
    ) {
      totalPoints += 3
      correctScores += 1
    } else if (
        prediction.match.homeScore !== null &&
        prediction.match.awayScore !== null
    ) {
      const actualWinner =
          prediction.match.homeScore > prediction.match.awayScore
              ? 'HOME'
              : prediction.match.awayScore > prediction.match.homeScore
                  ? 'AWAY'
                  : 'DRAW'
      if (prediction.winner === actualWinner) {
        totalPoints += 1
        correctResults += 1
      }
    }
  }
  for (const answer of questionAnswers) {
    if (
        typeof answer.answer === 'string' &&
        typeof answer.question.correctAnswer === 'string' &&
        answer.answer.trim().toLowerCase() === answer.question.correctAnswer.trim().toLowerCase()
    ) {
      totalPoints += answer.question.points || 3
      specialQuestionPoints += answer.question.points || 3
    }
  }
  return { totalPoints, correctScores, correctResults, specialQuestionPoints }
}

export async function POST(request: NextRequest) {
  try {
    // Admin yetkisi kontrolü
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Eğer question points güncellemesi varsa, önce onları yap!
    if (Array.isArray(body.questions)) {
      for (const q of body.questions) {
        if (q.id && typeof q.points === 'number') {
          await prisma.question.update({
            where: { id: q.id },
            data: { points: q.points }
          })
        }
      }
    }

    // Tüm maçları al
    const matches = await prisma.match.findMany({
      where: { homeScore: { not: null }, awayScore: { not: null } },
      include: {
        predictions: { include: { user: true } },
        questions: {
          include: {
            questionAnswers: { include: { user: true } }
          }
        }
      }
    })

    let totalRecalculated = 0
    let totalPoints = 0

    const affectedWeeklyScores = new Set<string>()
    const affectedSeasonScores = new Set<string>()

    // Her maç için puanları yeniden hesapla
    for (const match of matches) {
      if (match.homeScore === null || match.awayScore === null) continue

      const matchResult = match.homeScore > match.awayScore ? 'HOME' :
          match.homeScore < match.awayScore ? 'AWAY' : 'DRAW'

      for (const prediction of match.predictions) {
        let points = 0
        if (prediction.homeScore === match.homeScore && prediction.awayScore === match.awayScore) {
          points += 3
        } else if (prediction.winner === matchResult) {
          points += 1
        }
        await prisma.prediction.update({
          where: { id: prediction.id },
          data: { points }
        })
        affectedWeeklyScores.add(`${prediction.userId}__${match.seasonId}__${match.weekNumber}`)
        affectedSeasonScores.add(`${prediction.userId}__${match.seasonId}`)
        totalPoints += points
      }

      // Özel sorular için: points'in en güncel halini almak için tekrar çek
      for (const question of match.questions) {
        const currentQuestion = await prisma.question.findUnique({
          where: { id: question.id }
        })
        for (const answer of question.questionAnswers) {
          let points = 0
          if (
              typeof answer.answer === "string" &&
              typeof currentQuestion?.correctAnswer === "string" &&
              answer.answer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase()
          ) {
            points = currentQuestion.points || 3
          }
          await prisma.questionAnswer.update({
            where: { id: answer.id },
            data: { points }
          })
          affectedWeeklyScores.add(`${answer.userId}__${match.seasonId}__${match.weekNumber}`)
          affectedSeasonScores.add(`${answer.userId}__${match.seasonId}`)
          totalPoints += points
        }
      }

      totalRecalculated++
    }

    // Weekly ve Season skorlarını (istatistiklerle birlikte) tekrar hesapla
    for (const wsKey of affectedWeeklyScores) {
      const [userId, seasonId, weekNumber] = wsKey.split('__')
      const stats = await calculateWeeklyStats(userId, seasonId, Number(weekNumber))
      await prisma.weeklyScore.upsert({
        where: {
          userId_seasonId_weekNumber: {
            userId,
            seasonId,
            weekNumber: Number(weekNumber),
          }
        },
        update: stats,
        create: { userId, seasonId, weekNumber: Number(weekNumber), ...stats }
      })
    }
    for (const ssKey of affectedSeasonScores) {
      const [userId, seasonId] = ssKey.split('__')
      const stats = await calculateSeasonStats(userId, seasonId)
      await prisma.seasonScore.upsert({
        where: {
          userId_seasonId: { userId, seasonId }
        },
        update: stats,
        create: { userId, seasonId, ...stats }
      })
    }

    return NextResponse.json({
      success: true,
      message: `${totalRecalculated} maç ve tüm özel sorular için puanlar yeniden hesaplandı. Toplam ${totalPoints} puan dağıtıldı.`,
      totalRecalculated,
      totalPoints
    })

  } catch (error) {
    console.error('Error recalculating points:', error)
    return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
    )
  }
}
