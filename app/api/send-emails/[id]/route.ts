import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { updateSendEmailSchema } from '@/lib/validations/send-email';
import { encrypt } from '@/lib/utils/encryption';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import { getDatabase } from '@/lib/db';
import { sendEmails } from '@/lib/db/schema';
import { eq, and, isNull, not } from 'drizzle-orm';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET - 获取单个发送邮箱
export async function GET(request: NextRequest, { params }: RouteContext) {
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
    const { id } = await params;

    const [sendEmail] = await db
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
      .where(
        and(
          eq(sendEmails.id, id),
          isNull(sendEmails.deletedAt)
        )
      )
      .limit(1);

    if (!sendEmail) {
      return notFoundResponse('发送邮箱');
    }

    logger.debug('Send email fetched', { userId: user.userId, emailId: id });

    return successResponse(sendEmail);

  } catch (error) {
    logger.error('Get send email error', error);
    return errorResponse('INTERNAL_ERROR', '获取发送邮箱详情失败', error, 500);
  }
}

// PUT - 更新发送邮箱
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'send-emails:write')) {
      return forbiddenResponse();
    }

    const db = getDatabase();
    const { id } = await params;
    const body = await request.json();

    // 验证请求数据
    const validation = updateSendEmailSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const { password, ...updateData } = validation.data;

    // 检查记录是否存在
    const [existingRecord] = await db
      .select({ id: sendEmails.id })
      .from(sendEmails)
      .where(
        and(
          eq(sendEmails.id, id),
          isNull(sendEmails.deletedAt)
        )
      )
      .limit(1);

    if (!existingRecord) {
      return notFoundResponse('发送邮箱');
    }

    // 如果更新邮箱地址，检查是否与其他记录冲突
    if (updateData.emailAccount) {
      const [conflictingEmail] = await db
        .select({ id: sendEmails.id })
        .from(sendEmails)
        .where(
          and(
            eq(sendEmails.emailAccount, updateData.emailAccount),
            // 不是当前记录
            not(eq(sendEmails.id, id)),
            isNull(sendEmails.deletedAt)
          )
        )
        .limit(1);

      if (conflictingEmail) {
        return errorResponse('EMAIL_EXISTS', '该邮箱已存在', null, 409);
      }
    }

    // 准备更新数据
    const updateValues: any = {
      ...updateData,
      updatedAt: new Date()
    };

    // 处理密码更新
    if (password) {
      try {
        updateValues.passwordEncrypted = encrypt(password);
      } catch (error) {
        return errorResponse('ENCRYPTION_ERROR', '密码加密失败', error, 500);
      }
    }

    // 更新记录
    const [updatedSendEmail] = await db
      .update(sendEmails)
      .set(updateValues)
      .where(eq(sendEmails.id, id))
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

    logger.info('Send email updated', { 
      userId: user.userId,
      emailId: id,
      updatedFields: Object.keys(updateData)
    });

    return successResponse(updatedSendEmail);

  } catch (error) {
    logger.error('Update send email error', error);
    return errorResponse('INTERNAL_ERROR', '更新发送邮箱失败', error, 500);
  }
}

// DELETE - 删除发送邮箱 (软删除)
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'send-emails:delete')) {
      return forbiddenResponse();
    }

    const db = getDatabase();
    const { id } = await params;

    // 检查记录是否存在
    const [existingRecord] = await db
      .select({
        id: sendEmails.id,
        emailAccount: sendEmails.emailAccount
      })
      .from(sendEmails)
      .where(
        and(
          eq(sendEmails.id, id),
          isNull(sendEmails.deletedAt)
        )
      )
      .limit(1);

    if (!existingRecord) {
      return notFoundResponse('发送邮箱');
    }

    // 软删除记录
    await db
      .update(sendEmails)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(sendEmails.id, id));

    logger.info('Send email deleted', { 
      userId: user.userId,
      emailId: id,
      emailAccount: existingRecord.emailAccount
    });

    return successResponse({ 
      message: '发送邮箱删除成功',
      deletedId: id
    });

  } catch (error) {
    logger.error('Delete send email error', error);
    return errorResponse('INTERNAL_ERROR', '删除发送邮箱失败', error, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 