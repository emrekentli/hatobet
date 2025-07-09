import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// Kullanıcı profil bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    // Kullanıcı girişi kontrolü
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      )
    }

    // Kullanıcıyı bul
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        predictions: {
          include: {
            match: {
              include: {
                season: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        questionAnswers: {
          include: {
            question: {
              include: {
                match: {
                  include: {
                    season: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        weeklyScores: {
          include: {
            season: true
          },
          orderBy: [
            { season: { startDate: "desc" } },
            { weekNumber: "desc" }
          ]
        },
        seasonScores: {
          include: {
            season: true
          },
          orderBy: {
            season: { startDate: "desc" }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: "Kullanıcı bulunamadı" },
        { status: 404 }
      )
    }

    // Aktif sezonu bul
    const activeSeason = await prisma.season.findFirst({
      where: { status: "ACTIVE" }
    })

    // Aktif sezon puanlarını hesapla
    let activeSeasonStats = null
    if (activeSeason) {
      const activeSeasonScore = user.seasonScores.find(score => score.seasonId === activeSeason.id)
      const activeWeeklyScores = user.weeklyScores.filter(score => score.seasonId === activeSeason.id)
      
      activeSeasonStats = {
        seasonId: activeSeason.id,
        seasonName: activeSeason.name,
        totalPoints: activeSeasonScore?.totalPoints || 0,
        rank: activeSeasonScore?.rank || null,
        weeklyScores: activeWeeklyScores.map(score => ({
          weekNumber: score.weekNumber,
          points: score.totalPoints
        }))
      }
    }

    // Genel istatistikler
    const totalPredictions = user.predictions.length
    const totalQuestionsAnswered = user.questionAnswers.length
    const totalPointsFromPredictions = user.predictions.reduce((sum, pred) => sum + pred.points, 0)
    const totalPointsFromQuestions = user.questionAnswers.reduce((sum, ans) => sum + ans.points, 0)
    const totalPoints = totalPointsFromPredictions + totalPointsFromQuestions

    // Son aktiviteler
    const recentPredictions = user.predictions.slice(0, 5)
    const recentQuestionAnswers = user.questionAnswers.slice(0, 5)

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      stats: {
        totalPredictions,
        totalQuestionsAnswered,
        totalPointsFromPredictions,
        totalPointsFromQuestions,
        totalPoints
      },
      activeSeason: activeSeasonStats,
      recentActivity: {
        predictions: recentPredictions,
        questionAnswers: recentQuestionAnswers
      }
    })
  } catch (error) {
    console.error("Get user profile error:", error)
    return NextResponse.json(
      { error: "Sunucu hatası" },
      { status: 500 }
    )
  }
} 