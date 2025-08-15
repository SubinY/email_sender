import { NextResponse } from 'next/server';

export async function GET() {
  // 只在开发环境或有特殊权限时显示环境变量信息
  const isDev = process.env.NODE_ENV === 'development';
  const hasDebugAuth = process.env.DEBUG_SECRET === 'debug_2024';

  if (!isDev && !hasDebugAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  const setupSecret = process.env.SETUP_SECRET;

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasDatabase: !!databaseUrl,
    databaseUrlStart: databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'NOT_SET',
    hasJwtSecret: !!jwtSecret,
    hasSetupSecret: !!setupSecret,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const { debugSecret } = await request.json();
    
    if (debugSecret !== process.env.DEBUG_SECRET) {
      return NextResponse.json({ error: 'Invalid debug secret' }, { status: 401 });
    }

    const databaseUrl = process.env.DATABASE_URL;
    
    return NextResponse.json({
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasDatabase: !!databaseUrl,
      databaseUrlMasked: databaseUrl 
        ? `${databaseUrl.substring(0, 15)}...${databaseUrl.substring(databaseUrl.length - 10)}`
        : 'NOT_SET',
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSetupSecret: !!process.env.SETUP_SECRET,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
} 