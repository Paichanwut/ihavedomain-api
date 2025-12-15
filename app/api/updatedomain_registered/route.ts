import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sold_domains, active_domains } = body;

    let soldCount = 0;
    let activeCount = 0;

    if (
      sold_domains &&
      Array.isArray(sold_domains) &&
      sold_domains.length > 0
    ) {
      const soldResult = await prisma.ihavedomain_db.updateMany({
        where: {
          domain_name: {
            in: sold_domains,
          },
        },
        data: {
          status: 9,
        },
      });
      soldCount = soldResult.count;
    }

    // 2. Process Active Domains: Set updatetime = NOW()
    if (
      active_domains &&
      Array.isArray(active_domains) &&
      active_domains.length > 0
    ) {
      // Note: We use updateMany even if we are not changing a unique value, to update the timestamp.
      // However, Prisma updateMany needs a `data` object.
      // If we just want to touch the `updatetime`, we can do:
      const activeResult = await prisma.ihavedomain_db.updateMany({
        where: {
          domain_name: {
            in: active_domains,
          },
        },
        data: {
          updatetime: new Date(),
        },
      });
      activeCount = activeResult.count;
    }

    return NextResponse.json({
      success: true,
      sold_count: soldCount,
      active_count: activeCount,
      message: `Processed updates: ${soldCount} marked sold, ${activeCount} timestamps updated.`,
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
