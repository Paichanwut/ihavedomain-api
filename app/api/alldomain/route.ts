import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) { 
    try {
        // รับค่าจาก body ของ request
        const body = await request.json();
        const { limit = 10, start_limit, isus } = body;

        // กำหนดค่าเริ่มต้น
        const takeValue = isus === 'aished' || isus === 'antoine' ? undefined : !isus ? 10 : limit;

        const skipValue = isus === 'aished' || isus === 'antoine' ? undefined : start_limit || 0; // ถ้าเป็น 'aished'/'antoine' ให้เอาทั้งหมด (undefined), ไม่งั้นใช้ start_limit หรือ 0
        
        
        // เงื่อนไขในการดึงข้อมูล
        const where: Prisma.ihavedomain_dbWhereInput = {
            // เงื่อนไขเดิม: end_time >= วันที่ปัจจุบัน
            domain_matches: {
                path: ['end_time'],
                gte: new Date().toISOString(),
            }
        };

        // ถ้า isus เป็น 'aished' หรือ 'antoine'
        if (isus === 'aished' || isus === 'antoine') {
            // ดึงทั้งหมด โดยไม่มี limit/skip และไม่ต้องเพิ่มเงื่อนไข where เพิ่มเติม (แต่เงื่อนไข end_time ยังอยู่)
            // คุณอาจต้องการเพิ่มเงื่อนไขที่เกี่ยวกับ userLevel ถ้ามี field ใน db
            // เช่น: whereCondition.user_level = isus;
        } 
        
        // ถ้า isus เป็น null หรือค่าอื่น ๆ ที่ไม่ใช่ 'aished'/'antoine'
        // จะมีการใช้ take/skip เพื่อจำกัด 10 ตัวแรก หรือตามค่า limit/start_limit ที่ส่งมา

        // ดึงข้อมูลจากฐานข้อมูล
        const domain = await prisma.ihavedomain_db?.findMany({
            where,
            take: takeValue, 
            skip: skipValue, 
        });

        const count = domain.length;
        
        // ส่งผลลัพธ์กลับ
        return NextResponse.json({ code: 200, data: domain, total_retrieved: count }, { status: 200 });

    } catch (error) {
        console.error("Database or Server Error:", error);
        // ใช้ NextResponse.json เพื่อความสม่ำเสมอในการตอบกลับ
        return NextResponse.json({ code: 500, error: "Internal Server Error" }, { status: 500 });
    }
}