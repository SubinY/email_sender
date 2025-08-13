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

// 临时模拟数据
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

    // 验证查询参数
    const { searchParams } = new URL(request.url);
    const queryValidation = sendEmailQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      companyName: searchParams.get('companyName'),
      isEnabled: searchParams.get('isEnabled')
    });

    console.log(queryValidation, searchParams, 'searchParamssearchParams')

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

    // 过滤数据
    let filteredData = [...MOCK_SEND_EMAILS];

    if (search) {
      filteredData = filteredData.filter(item =>
        item.emailAccount.toLowerCase().includes(search.toLowerCase()) ||
        item.companyName.toLowerCase().includes(search.toLowerCase()) ||
        item.senderName.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (companyName) {
      filteredData = filteredData.filter(item => 
        item.companyName.toLowerCase().includes(companyName.toLowerCase())
      );
    }

    if (isEnabled !== undefined) {
      filteredData = filteredData.filter(item => item.isEnabled === isEnabled);
    }

    // 分页
    const total = filteredData.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // 移除密码字段
    const safeData = paginatedData.map(({ passwordEncrypted, ...rest }) => rest);

    const pagination = calculatePagination(page, limit, total);

    logger.info('Send emails fetched', { 
      userId: user.userId, 
      count: paginatedData.length,
      total 
    });

    return successResponse(safeData, pagination);

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

    // 权限检查
    if (!checkPermission(user.role, 'send-emails:write')) {
      return forbiddenResponse();
    }

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
    const existingEmail = MOCK_SEND_EMAILS.find(item => item.emailAccount === data.emailAccount);
    if (existingEmail) {
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
    const newSendEmail = {
      id: (MOCK_SEND_EMAILS.length + 1).toString(),
      ...data,
      passwordEncrypted,
      isEnabled: true,
      createdBy: user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    MOCK_SEND_EMAILS.push(newSendEmail);

    // 返回时移除密码字段
    const { passwordEncrypted: _, ...safeData } = newSendEmail;

    logger.info('Send email created', { 
      userId: user.userId,
      emailId: newSendEmail.id,
      emailAccount: newSendEmail.emailAccount
    });

    return successResponse(safeData, undefined, 201);

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