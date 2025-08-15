import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import seed from '@/lib/db/seed';

export async function POST(request: Request) {
  try {
    const { authorization } = await request.json();
    
    // 简单的授权检查 - 生产环境应该使用更强的验证
    if (authorization !== process.env.SETUP_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - 请提供正确的 SETUP_SECRET' },
        { status: 401 }
      );
    }

    const db = getDatabase();

    // 检查是否已经初始化过
    try {
      const existingUsers = await db.select().from(users).limit(1);
      
      if (existingUsers.length > 0) {
        return NextResponse.json({
          success: true,
          message: '数据库已经初始化过了',
          alreadySetup: true,
          loginInfo: {
            admin: { username: 'admin', password: 'Admin123!' },
            operator: { username: 'operator', password: 'Operator123!' }
          }
        });
      }
    } catch (error) {
      // 表不存在，需要创建
      console.log('表不存在，开始创建表结构和初始化数据...');
    }

    // 运行种子数据（包含表结构创建）
    console.log('正在初始化数据库...');
    await seed();

    return NextResponse.json({
      success: true,
      message: '数据库初始化完成！',
      loginInfo: {
        admin: { username: 'admin', password: 'Admin123!' },
        operator: { username: 'operator', password: 'Operator123!' }
      }
    });

  } catch (error) {
    console.error('数据库初始化错误:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '初始化失败',
        details: '请检查数据库连接和环境变量配置'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: '数据库初始化 API',
    instructions: [
      '1. 确保已设置正确的环境变量（DATABASE_URL, SETUP_SECRET）',
      '2. 发送 POST 请求到此接口',
      '3. 请求体包含: {"authorization": "your-setup-secret"}',
      '4. 初始化成功后可使用 admin/Admin123! 登录'
    ]
  });
} 