import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { updateReceiveEmailSchema } from '@/lib/validations/receive-email';
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
const MOCK_RECEIVE_EMAILS = [
  {
    id: '1',
    universityName: '北京大学',
    collegeName: '计算机学院',
    contactPerson: '张教授',
    province: '北京',
    email: 'zhang@pku.edu.cn',
    phone: '010-12345678',
    responsibility: '学术合作',
    isBlacklisted: false,
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    universityName: '清华大学',
    collegeName: '软件学院',
    contactPerson: '李教授',
    province: '北京',
    email: 'li@tsinghua.edu.cn',
    phone: '010-87654321',
    responsibility: '人才培养',
    isBlacklisted: true,
    createdBy: '1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    universityName: '复旦大学',
    collegeName: '信息学院',
    contactPerson: '王教授',
    province: '上海',
    email: 'wang@fudan.edu.cn',
    phone: '021-12345678',
    responsibility: '技术交流',
    isBlacklisted: false,
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

// GET - 获取单个接收邮箱
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:read')) {
      return forbiddenResponse();
    }
    console.log(params, 'paramsparams')
    const { id } = params;
    const receiveEmail = MOCK_RECEIVE_EMAILS.find(item => item.id === id);

    if (!receiveEmail) {
      return notFoundResponse('接收邮箱');
    }

    logger.debug('Receive email fetched', { userId: user.userId, emailId: id });

    return successResponse(receiveEmail);

  } catch (error) {
    logger.error('Get receive email error', error);
    return errorResponse('INTERNAL_ERROR', '获取接收邮箱详情失败', error, 500);
  }
}

// PUT - 更新接收邮箱
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:write')) {
      return forbiddenResponse();
    }

    const { id } = params;
    const body = await request.json();

    // 验证请求数据
    const validation = updateReceiveEmailSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const updateData = validation.data;
    const receiveEmailIndex = MOCK_RECEIVE_EMAILS.findIndex(item => item.id === id);

    if (receiveEmailIndex === -1) {
      return notFoundResponse('接收邮箱');
    }

    // 如果更新邮箱地址，检查是否与其他记录冲突
    if (updateData.email) {
      const existingEmail = MOCK_RECEIVE_EMAILS.find(
        item => item.email === updateData.email && item.id !== id
      );
      if (existingEmail) {
        return errorResponse('EMAIL_EXISTS', '该邮箱已存在', null, 409);
      }
    }

    // 更新记录
    const updatedReceiveEmail = {
      ...MOCK_RECEIVE_EMAILS[receiveEmailIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    MOCK_RECEIVE_EMAILS[receiveEmailIndex] = updatedReceiveEmail;

    logger.info('Receive email updated', { 
      userId: user.userId,
      emailId: id,
      updatedFields: Object.keys(updateData)
    });

    return successResponse(updatedReceiveEmail);

  } catch (error) {
    logger.error('Update receive email error', error);
    return errorResponse('INTERNAL_ERROR', '更新接收邮箱失败', error, 500);
  }
}

// DELETE - 删除接收邮箱
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:write')) {
      return forbiddenResponse();
    }

    const { id } = params;
    const receiveEmailIndex = MOCK_RECEIVE_EMAILS.findIndex(item => item.id === id);

    if (receiveEmailIndex === -1) {
      return notFoundResponse('接收邮箱');
    }

    // 删除记录（在实际应用中可能是软删除）
    const deletedReceiveEmail = MOCK_RECEIVE_EMAILS[receiveEmailIndex];
    MOCK_RECEIVE_EMAILS.splice(receiveEmailIndex, 1);

    logger.info('Receive email deleted', { 
      userId: user.userId,
      emailId: id,
      email: deletedReceiveEmail.email
    });

    return successResponse({ 
      message: '接收邮箱删除成功',
      deletedId: id
    });

  } catch (error) {
    logger.error('Delete receive email error', error);
    return errorResponse('INTERNAL_ERROR', '删除接收邮箱失败', error, 500);
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