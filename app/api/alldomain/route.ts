import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      limit: bodyLimit,
      start_limit: bodyStartLimit,
      isus: bodyIsus,
    } = body;

    const limit = parseInt(bodyLimit) || 10;
    const start_limit = parseInt(bodyStartLimit) || 0;
    const isus = bodyIsus || null;

    // 2. กำหนดตัวแปรสำหรับ Query และ Parameters
    const queryParams: any[] = [];

    // เงื่อนไขใหม่:
    // 1. id.status != 9 (และ handle null)
    // 2. OR Logic:
    //    Case A: มีราคา BIN (USD หรือ THB) -> ไม่เช็คเวลา
    //    Case B: ไม่มีราคา BIN -> เช็คเวลา (auction_end_time >= NOW())

    const combinedWhereClause = `
      (id.status IS NULL OR id.status != 9)
      AND
      (
        -- Case A: ถ้ามีราคาทันที (Buy-It-Now) อย่างใดอย่างหนึ่ง
        (
            (id.domain_matches ->> 'buy_it_now_amount_display' IS NOT NULL AND id.domain_matches ->> 'buy_it_now_amount_display' != '')
            OR
            (id.domain_matches ->> 'buy_it_now_amount_display_usd' IS NOT NULL AND id.domain_matches ->> 'buy_it_now_amount_display_usd' != '')
        )
        OR
        -- Case B: ถ้าไม่มีราคาทันที (Buy-It-Now) ทั้งคู่ จะต้องผ่านการเช็คเวลา
        (
            (id.domain_matches ->> 'buy_it_now_amount_display' IS NULL OR id.domain_matches ->> 'buy_it_now_amount_display' = '')
            AND
            (id.domain_matches ->> 'buy_it_now_amount_display_usd' IS NULL OR id.domain_matches ->> 'buy_it_now_amount_display_usd' = '')
            AND
            (id.domain_matches ->> 'auction_end_time')::timestamp WITH TIME ZONE >= NOW()
        )
      )
    `;

    const whereClause = `WHERE ${combinedWhereClause}`;

    let takeValue = limit;
    let skipValue = start_limit;

    // 4. จัดการ Logic ตามค่า isus
    if (isus === "aished" || isus === "antoine") {
      // ดึงทั้งหมด (ไม่ใส่ LIMIT/OFFSET)
      takeValue = 0;
      skipValue = 0;
    }

    let currentParamIndex = queryParams.length; // เริ่มต้น 0

    let limitOffsetClause = "";
    if (takeValue > 0) {
      limitOffsetClause = `
          ORDER BY id DESC 
          LIMIT $${currentParamIndex + 1}
          OFFSET $${currentParamIndex + 2}
        `;
      // เพิ่มค่าสำหรับ LIMIT และ OFFSET
      queryParams.push(takeValue); // $1
      queryParams.push(skipValue); // $2
    }

    // 5. สร้าง Query สุดท้าย
    const sqlQuery = `
      SELECT
         *
      FROM
         ihavedomain_db id 
      ${whereClause}
      ${limitOffsetClause}
    `;

    // 6. รัน Query
    const result = await prisma.$queryRawUnsafe<any[]>(
      sqlQuery,
      ...queryParams
    );

    // 7. ส่งข้อมูลกลับ
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
