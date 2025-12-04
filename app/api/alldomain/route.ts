import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. รับค่าและกำหนดค่า Default
        const { limit: bodyLimit, start_limit: bodyStartLimit, isus: bodyIsus } = body;

        const limit = parseInt(bodyLimit) || 10;
        const start_limit = parseInt(bodyStartLimit) || 0;
        const isus = bodyIsus || null;

        // 2. คำนวณวันที่และเวลา
        const currentISODate = new Date().toISOString();

        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        const isoDate30DaysAgo = date30DaysAgo.toISOString();

        // 3. กำหนดตัวแปรสำหรับ Query และ Parameters
        const queryParams: any[] = [];

        // ตรรกะเงื่อนไขที่ 1: รายการที่ยังไม่หมดอายุ และมีเงื่อนไขราคาเฉพาะ
        // (end_time >= $1) AND (BIN is empty OR BIN_USD is not empty)
        queryParams.push(currentISODate); // $1
        const condition1 = `
      (
        (id.domain_matches->>'end_time')::timestamp WITH TIME ZONE >= $1
        AND 
        (
          (id.domain_matches->>'buy_it_now_amount_display' IS NULL OR id.domain_matches->>'buy_it_now_amount_display' = '')
          OR
          (id.domain_matches->>'buy_it_now_amount_display_usd' IS NOT NULL AND id.domain_matches->>'buy_it_now_amount_display_usd' != '')
        )
      )
    `;

        // ตรรกะเงื่อนไขที่ 2: รายการที่มี Buy It Now และอยู่ในช่วงเวลา 30 วัน
        // (BIN is not empty OR BIN_USD is not empty) AND (end_time >= $2)
        queryParams.push(isoDate30DaysAgo); // $2
        const condition2 = `
      (
        (
          (id.domain_matches->>'buy_it_now_amount_display' IS NOT NULL AND id.domain_matches->>'buy_it_now_amount_display' != '')
          OR
          (id.domain_matches->>'buy_it_now_amount_display_usd' IS NOT NULL AND id.domain_matches->>'buy_it_now_amount_display_usd' != '')
        )
        AND
        (id.domain_matches->>'end_time')::timestamp WITH TIME ZONE >= $2
      )
    `;

        // รวมเงื่อนไข: (Condition 1) OR (Condition 2)
        const combinedWhereClause = `(${condition1} OR ${condition2})`;

        const whereClause = `WHERE ${combinedWhereClause}`;

        let takeValue = limit;
        let skipValue = start_limit;


        // 4. จัดการ Logic ตามค่า isus
        if (isus === 'aished' || isus === 'antoine') {
            // ดึงทั้งหมด (ไม่ใส่ LIMIT/OFFSET)
            takeValue = 0;
            skipValue = 0;
        }

        let currentParamIndex = queryParams.length; // ปัจจุบันคือ 2 ($1, $2)

        let limitOffsetClause = '';
        if (takeValue > 0) {
            limitOffsetClause = `
          ORDER BY id DESC 
          LIMIT $${currentParamIndex + 1}
          OFFSET $${currentParamIndex + 2}
        `;
            // เพิ่มค่าสำหรับ LIMIT และ OFFSET
            queryParams.push(takeValue); // $3
            queryParams.push(skipValue); // $4
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
        const result = await prisma.$queryRawUnsafe<any[]>(sqlQuery, ...queryParams);

        // 7. ส่งข้อมูลกลับ
        return NextResponse.json({
            success: true,
            data: result,
            count: result.length,
        });

    } catch (error: any) {
        console.error('Database Error:', error);

        return NextResponse.json({
            error: true,
            message: `Server Error: ${error.message || 'Database operation failed.'}`,
        }, { status: 500 });
    }
}