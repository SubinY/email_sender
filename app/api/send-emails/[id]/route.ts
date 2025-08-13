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

// 使用与父路由相同的模拟数据
const MOCK_SEND_EMAILS = [
  {
    id: '1',
    companyName: '腾讯科技',
    referralCode: 'TX2024',
    referralLink: 'https://tencent.com/jobs',
    emailAccount: 'hr@tencent.com',
    passwordEncrypted: 'encrypted_password_1',
    smtpServer: 'smtp.tencent.com',
    port: 465,
    sslTls: true,
    senderName: '腾讯招聘团队',
    description: '腾讯招聘邮件模板',
    isEnabled: true,
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    companyName: '阿里巴巴',
    referralCode: 'ALI2024',
    referralLink: 'https://alibaba.com/careers',
    emailAccount: 'recruit@alibaba.com',
    passwordEncrypted: 'encrypted_password_2',
    smtpServer: 'smtp.alibaba.com',
    port: 587,
    sslTls: false,
    senderName: '阿里巴巴人力资源',
    description: '阿里巴巴内推招聘',
    isEnabled: false,
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

interface RouteContext {
  params: {
    id: string;
  };
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

    const { id } = params;
    const sendEmail = MOCK_SEND_EMAILS.find(item => item.id === id);

    if (!sendEmail) {
      return notFoundResponse('发送邮箱');
    }

    // 返回时移除密码字段
    const { passwordEncrypted, ...safeData } = sendEmail;

    logger.debug('Send email fetched', { userId: user.userId, emailId: id });

    return successResponse(safeData);

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

    const { id } = params;
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
    const sendEmailIndex = MOCK_SEND_EMAILS.findIndex(item => item.id === id);

    if (sendEmailIndex === -1) {
      return notFoundResponse('发送邮箱');
    }

    // 如果更新邮箱地址，检查是否与其他记录冲突
    if (updateData.emailAccount) {
      const existingEmail = MOCK_SEND_EMAILS.find(
        item => item.emailAccount === updateData.emailAccount && item.id !== id
      );
      if (existingEmail) {
        return errorResponse('EMAIL_EXISTS', '该邮箱已存在', null, 409);
      }
    }

    // 处理密码更新
    let passwordEncrypted: string | undefined;
    if (password) {
      try {
        passwordEncrypted = encrypt(password);
      } catch (error) {
        return errorResponse('ENCRYPTION_ERROR', '密码加密失败', error, 500);
      }
    }

    // 更新记录
    const updatedSendEmail = {
      ...MOCK_SEND_EMAILS[sendEmailIndex],
      ...updateData,
      ...(passwordEncrypted && { passwordEncrypted }),
      updatedAt: new Date().toISOString()
    };

    MOCK_SEND_EMAILS[sendEmailIndex] = updatedSendEmail;

    // 返回时移除密码字段
    const { passwordEncrypted: _, ...safeData } = updatedSendEmail;

    logger.info('Send email updated', { 
      userId: user.userId,
      emailId: id,
      updatedFields: Object.keys(updateData)
    });

    return successResponse(safeData);

  } catch (error) {
    logger.error('Update send email error', error);
    return errorResponse('INTERNAL_ERROR', '更新发送邮箱失败', error, 500);
  }
}

// DELETE - 删除发送邮箱
export async function DELETE(request: NextRequest, { params }: RouteContext) {
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

    const { id } = params;
    const sendEmailIndex = MOCK_SEND_EMAILS.findIndex(item => item.id === id);

    if (sendEmailIndex === -1) {
      return notFoundResponse('发送邮箱');
    }

    // 删除记录（在实际应用中可能是软删除）
    const deletedSendEmail = MOCK_SEND_EMAILS[sendEmailIndex];
    MOCK_SEND_EMAILS.splice(sendEmailIndex, 1);

    logger.info('Send email deleted', { 
      userId: user.userId,
      emailId: id,
      emailAccount: deletedSendEmail.emailAccount
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