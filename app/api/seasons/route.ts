import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    // Filter by search term
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    const seasons = await prisma.season.findMany({
      where,
      include: {
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({ seasons });
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, totalWeeks } = body;

    if (!name || !startDate || !totalWeeks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If this is the first season or we're setting it as active, deactivate other seasons
    if (body.status === "ACTIVE") {
      await prisma.season.updateMany({
        where: {
          status: "ACTIVE",
        },
        data: {
          status: "FINISHED",
          endDate: new Date(),
        },
      });
    }

    const newSeason = await prisma.season.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: null,
        status: body.status || "ACTIVE",
        totalWeeks: parseInt(totalWeeks),
      },
      include: {
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, season: newSeason });
  } catch (error) {
    console.error("Error creating season:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, startDate, endDate, status, totalWeeks } = body;

    if (!id) {
      return NextResponse.json({ error: "Season ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (startDate) updateData.startDate = new Date(startDate);
    if (totalWeeks) updateData.totalWeeks = parseInt(totalWeeks);
    if (status) updateData.status = status;

    // Handle status changes
    if (status === "FINISHED") {
      updateData.endDate = new Date();
    } else if (status === "ACTIVE") {
      // Deactivate other active seasons
      await prisma.season.updateMany({
        where: {
          status: "ACTIVE",
          id: { not: id },
        },
        data: {
          status: "FINISHED",
          endDate: new Date(),
        },
      });
    }

    const updatedSeason = await prisma.season.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            matches: true,
            seasonScores: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, season: updatedSeason });
  } catch (error) {
    console.error("Error updating season:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Season ID is required" }, { status: 400 });
    }

    await prisma.season.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting season:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 