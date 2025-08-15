import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { TaskCalculator, TaskParams } from '@/lib/email/task-calculator';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { receiveEmails, sendEmails } from '@/lib/db/schema';
import { inArray, isNull, eq, count } from 'drizzle-orm';
import { z } from 'zod';

// 请求数据验证schema
const calculateTaskSchema = z.object({
  sendEmailIds: z.array(z.string().uuid()).min(1, '请选择至少一个发送邮箱'),
  emailsPerHour: z.number().int().min(1).max(200, '每小时发送数量不能超过200'),
  emailsPerTeacherPerDay: z.number().int().min(1).max(20, '每天接收数量不能超过20'),
  workingHours: z.number().int().min(1).max(24).optional()
});

/**
 * POST - 计算邮件发送任务
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Task calculation request started');
    
    // 🧪 临时添加算法验证（开发阶段）
    // TaskCalculator.verifyAlgorithm();
    
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    // if (!checkPermission(user.role, 'send-emails:write')) {
    //   return forbiddenResponse();
    // }

    const body = await request.json();
    
    // 验证请求数据
    const validation = calculateTaskSchema.safeParse(body);

    if (!validation.success) {
      logger.warn('Task calculation validation failed', validation.error.errors);
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const { sendEmailIds, emailsPerHour, emailsPerTeacherPerDay, workingHours = 24 } = validation.data;

    // 验证发送邮箱是否存在且启用
    const sendEmailsData = await db
      .select()
      .from(sendEmails)
      .where(
        inArray(sendEmails.id, sendEmailIds as any)
      );
    
    if (sendEmailsData.length !== sendEmailIds.length) {
      return errorResponse('INVALID_SEND_EMAILS', '部分发送邮箱不存在或已被删除');
    }

    const disabledEmails = sendEmailsData.filter(email => !email.isEnabled);
    if (disabledEmails.length > 0) {
      return errorResponse('DISABLED_SEND_EMAILS', '部分发送邮箱已被禁用');
    }

    // 获取接收邮箱总数（非黑名单且未删除）
    const receiveEmailsCount = await db
      .select({ count: count() })
      .from(receiveEmails)
      .where(
        eq(receiveEmails.isBlacklisted, false)
      );

    const totalReceiveEmails = receiveEmailsCount[0]?.count || 0;
    
    if (totalReceiveEmails === 0) {
      return errorResponse('NO_RECEIVE_EMAILS', '没有可用的接收邮箱');
    }

    // 计算任务参数
    const taskParams: TaskParams = {
      sendEmailIds,
      receiveEmailCount: totalReceiveEmails,
      emailsPerHour,
      emailsPerTeacherPerDay,
      workingHours
    };

    // 执行计算
    const calculationResult = TaskCalculator.calculateTask(taskParams);

    logger.info('Task calculation completed', {
      taskParams,
      result: {
        totalEmails: calculationResult.totalEmails,
        calculatedDays: calculationResult.calculatedDays,
        effectiveDailyRate: calculationResult.effectiveDailyRate
      }
    });

    // 返回计算结果，包含发送邮箱信息
    return successResponse({
      calculation: calculationResult,
      sendEmails: sendEmailsData.map(email => ({
        id: email.id,
        companyName: email.companyName,
        emailAccount: email.emailAccount,
        senderName: email.senderName
      })),
      receiveEmailCount: totalReceiveEmails,
      summary: {
        totalEmails: calculationResult.totalEmails,
        estimatedDays: calculationResult.calculatedDays,
        dailyCapacity: calculationResult.effectiveDailyRate,
        sendEmailCount: sendEmailIds.length,
        receiveEmailCount: totalReceiveEmails
      }
    });

  } catch (error) {
    logger.error('Task calculation failed', error);
    return errorResponse(
      'CALCULATION_ERROR', 
      '任务计算失败',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
} 