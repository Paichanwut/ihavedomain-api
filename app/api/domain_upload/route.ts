import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domains } = body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input: domains array is required",
          data: [],
        },
        { status: 400 }
      );
    }

    const result = await prisma.ihavedomain_db.findMany({
      where: {
        domain_name: {
          in: domains,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
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
