import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domains } = body;

    // Input validation
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input: domains array is required",
          updated_count: 0,
        },
        { status: 400 }
      );
    }

    // Direct update: Set status = 9 for all domains in the list
    const result = await prisma.ihavedomain_db.updateMany({
      where: {
        domain_name: {
          in: domains,
        },
      },
      data: {
        status: 9,
      },
    });

    return NextResponse.json({
      success: true,
      updated_count: result.count,
      message: `Marks ${result.count} domains as sold (status 9).`,
    });
  } catch (error: any) {
    console.error("Database Error:", error);
    return NextResponse.json(
      {
        error: true,
        message: `Server Error: ${
          error.message || "Database operation failed."
        }`,
      },
      { status: 500 }
    );
  }
}
