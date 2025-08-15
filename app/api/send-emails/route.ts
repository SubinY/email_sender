import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { createSendEmailSchema, sendEmailQuerySchema } from '@/lib/validations/send-email';
import { encrypt } from '@/lib/utils/encryption';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  calculatePagination
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import { getDatabase } from '@/lib/db';
import { sendEmails } from '@/lib/db/schema';
import { eq, ilike, and, isNull, count, desc, or } from 'drizzle-orm';

// GET - 获取发送邮箱列表
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'send-emails:read')) {
      return forbiddenResponse();
    }

    const db = getDatabase();

    // 验证查询参数
    const { searchParams } = new URL(request.url);
    const queryValidation = sendEmailQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      companyName: searchParams.get('companyName'),
      isEnabled: searchParams.get('isEnabled')
    });

    if (!queryValidation.success) {
      return validationErrorResponse(
        queryValidation.error.errors.reduce((acc, error) => {
          const field = error.path.join('.');
          if (!acc[field]) acc[field] = [];
          acc[field].push(error.message);
          return acc;
        }, {} as Record<string, string[]>)
      );
    }

    const { page, limit, search, companyName, isEnabled } = queryValidation.data;

    // 构建查询条件
    const conditions = [
      isNull(sendEmails.deletedAt) // 只查询未删除的记录
    ];

    if (search) {
      conditions.push(
        // 使用 or 实现多字段搜索
        or(
          ilike(sendEmails.emailAccount, `%${search}%`),
          ilike(sendEmails.companyName, `%${search}%`),
          ilike(sendEmails.senderName, `%${search}%`)
        )!
      );
    }

    if (companyName) {
      conditions.push(
        ilike(sendEmails.companyName, `%${companyName}%`)
      );
    }

    // if (isEnabled !== undefined) {
    //   conditions.push(eq(sendEmails.isEnabled, isEnabled));
    // }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取总数
    const totalResult = await db
      .select({ count: count() })
      .from(sendEmails)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    // 获取分页数据
    const data = await db
      .select({
        id: sendEmails.id,
        companyName: sendEmails.companyName,
        referralCode: sendEmails.referralCode,
        referralLink: sendEmails.referralLink,
        emailAccount: sendEmails.emailAccount,
        smtpServer: sendEmails.smtpServer,
        port: sendEmails.port,
        sslTls: sendEmails.sslTls,
        senderName: sendEmails.senderName,
        description: sendEmails.description,
        isEnabled: sendEmails.isEnabled,
        createdAt: sendEmails.createdAt,
        updatedAt: sendEmails.updatedAt
        // 注意：不返回 passwordEncrypted 字段
      })
      .from(sendEmails)
      .where(whereClause)
      .orderBy(desc(sendEmails.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const pagination = calculatePagination(page, limit, total);

    logger.info('Send emails fetched', {
      userId: user.userId,
      count: data.length,
      total
    });

    return successResponse(data, pagination);

  } catch (error) {
    logger.error('Get send emails error', error);
    return errorResponse('INTERNAL_ERROR', '获取发送邮箱列表失败', error, 500);
  }
}

// POST - 创建发送邮箱
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // // 权限检查
    // if (!checkPermission(user.role, 'send-emails:write')) {
    //   return forbiddenResponse();
    // }

    const db = getDatabase();
    const body = await request.json();

    // 验证请求数据
    const validation = createSendEmailSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);

      return validationErrorResponse(errors);
    }

    const { password, ...data } = validation.data;

    // 检查邮箱是否已存在
    const existingEmail = await db
      .select()
      .from(sendEmails)
      .where(
        and(
          eq(sendEmails.emailAccount, data.emailAccount),
          isNull(sendEmails.deletedAt)
        )
      )
      .limit(1);

    if (existingEmail.length > 0) {
      return errorResponse('EMAIL_EXISTS', '该邮箱已存在', null, 409);
    }

    // 加密密码
    let passwordEncrypted: string;
    try {
      passwordEncrypted = encrypt(password);
    } catch (error) {
      return errorResponse('ENCRYPTION_ERROR', '密码加密失败', error, 500);
    }

    // 创建新记录
    const [newSendEmail] = await db
      .insert(sendEmails)
      .values({
        ...data,
        passwordEncrypted,
        isEnabled: true,
        createdBy: user.userId
      })
      .returning({
        id: sendEmails.id,
        companyName: sendEmails.companyName,
        referralCode: sendEmails.referralCode,
        referralLink: sendEmails.referralLink,
        emailAccount: sendEmails.emailAccount,
        smtpServer: sendEmails.smtpServer,
        port: sendEmails.port,
        sslTls: sendEmails.sslTls,
        senderName: sendEmails.senderName,
        description: sendEmails.description,
        isEnabled: sendEmails.isEnabled,
        createdAt: sendEmails.createdAt,
        updatedAt: sendEmails.updatedAt
        // 注意：不返回 passwordEncrypted 字段
      });

    logger.info('Send email created', {
      userId: user.userId,
      emailId: newSendEmail.id,
      emailAccount: newSendEmail.emailAccount
    });

    return successResponse(newSendEmail, undefined, 201);

  } catch (error) {
    logger.error('Create send email error', error);
    return errorResponse('INTERNAL_ERROR', '创建发送邮箱失败', error, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 