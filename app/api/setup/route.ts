import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import seed from '@/lib/db/seed';

export async function POST(request: Request) {
  try {
    // 先检查请求体是否存在
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { 
          error: 'Content-Type 必须是 application/json',
          received: contentType || 'none'
        },
        { status: 400 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { 
          error: 'JSON 解析失败',
          details: jsonError instanceof Error ? jsonError.message : 'Invalid JSON format',
          hint: '请确保请求体是有效的 JSON 格式，例如: {"authorization": "your-secret"}'
        },
        { status: 400 }
      );
    }

    const { authorization } = body;
    
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
    
    // 更详细的错误信息
    let errorDetails = '请检查数据库连接和环境变量配置';
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        errorDetails = '数据库连接被拒绝，请检查 DATABASE_URL 环境变量是否正确设置';
      } else if (error.message.includes('fetch failed')) {
        errorDetails = '网络连接失败，请检查数据库服务是否可用';
      }
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : '初始化失败',
        details: errorDetails,
        environment: process.env.NODE_ENV,
        hasDatabase: !!process.env.DATABASE_URL,
        databaseHint: process.env.DATABASE_URL ? 'DATABASE_URL 已设置' : 'DATABASE_URL 未设置'
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