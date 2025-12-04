import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // 1. รับค่าและกำหนดค่า Default
        const { limit: bodyLimit, start_limit: bodyStartLimit, isus: bodyIsus, type: bodyType } = body;

        const limit = parseInt(bodyLimit) || 10;
        const start_limit = parseInt(bodyStartLimit) || 0;
        const isus = bodyIsus || null;
        const type = bodyType || null;

        // 3. กำหนดตัวแปรสำหรับ Query และ Parameters
        // Prisma queryRawUnsafe uses parameters differently, but we can pass them as an array.
        // However, for dynamic SQL construction with Prisma, we need to be careful.
        // We will use $1, $2, etc. and pass values in the second argument array.

        const queryParams: any[] = [];

        // สร้าง Where Clause ตาม type
        let whereClause = '';

        if (type === 'buynow') {
            whereClause = `
        WHERE (
          (id.domain_matches ->> 'buy_it_now_amount_display' IS NOT NULL AND id.domain_matches ->> 'buy_it_now_amount_display' != '')
          OR
          (id.domain_matches ->> 'buy_it_now_amount_display_usd' IS NOT NULL AND id.domain_matches ->> 'buy_it_now_amount_display_usd' != '')
        )
      `;
        } else if (type === 'auction') {
            whereClause = `
        WHERE (
          (id.domain_matches ->> 'buy_it_now_amount_display' IS NULL OR id.domain_matches ->> 'buy_it_now_amount_display' = '')
          OR
          (id.domain_matches ->> 'buy_it_now_amount_display_usd' IS NULL OR id.domain_matches ->> 'buy_it_now_amount_display_usd' = '')
        )
      `;
        }

        let takeValue = limit;
        let skipValue = start_limit;

        // 4. จัดการ Logic ตามค่า isus
        // ถ้า isus เป็น null ให้บังคับ limit แค่ 10
        if (!isus) {
            takeValue = 10;
        }

        let currentParamIndex = queryParams.length; // เริ่มต้น 0

        let limitOffsetClause = '';
        if (takeValue > 0) {
            // Note: Prisma raw query parameters are 1-based ($1, $2, ...)
            // We need to cast LIMIT and OFFSET to integer in SQL or ensure they are passed as numbers
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
        // queryRawUnsafe returns an array of objects
        const result = await prisma.$queryRawUnsafe<any[]>(sqlQuery, ...queryParams);

        // Since we can't easily get rowCount from a simple SELECT in Prisma raw without a separate count query or checking array length,
        // and the original code used result.rowCount (from pg driver), we will use result.length.
        // However, if there is pagination, result.length is just the page size.
        // The original code returned `count: result.rowCount`. In 'pg' driver, rowCount is the number of rows processed/returned.
        // So result.length is equivalent for SELECT.

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
