import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  calculatePagination
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { sendTasks, taskSendEmails, sendEmails } from '@/lib/db/schema';
import { eq, desc, count } from 'drizzle-orm';
import { z } from 'zod';

// 创建任务验证schema
const createTaskSchema = z.object({
  taskName: z.string().min(1, '任务名称不能为空').max(200, '任务名称不能超过200字符'),
  sendEmailIds: z.array(z.string().uuid()).min(1, '请选择至少一个发送邮箱'),
  emailsPerHour: z.number().int().min(1).max(200, '每小时发送数量必须在1-200之间'),
  emailsPerTeacherPerDay: z.number().int().min(1).max(20, '每天接收数量必须在1-20之间'),
  durationDays: z.number().int().min(1, '持续天数必须大于0')
});

/**
 * GET - 获取发送任务列表
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetch send tasks request started');
    
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    // if (!checkPermission(user.role, 'send-emails:read')) {
    //   return forbiddenResponse();
    // }

    // 验证查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // 获取任务总数
    const [totalResult] = await db
      .select({ count: count() })
      .from(sendTasks);

    const total = totalResult.count;
    const pagination = calculatePagination(page, limit, total);

    // 获取任务列表
    const tasks = await db
      .select()
      .from(sendTasks)
      .orderBy(desc(sendTasks.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset);

    // 为每个任务获取关联的发送邮箱
    const tasksWithEmails = await Promise.all(
      tasks.map(async (task) => {
        const taskEmails = await db
          .select({
            sendEmail: sendEmails
          })
          .from(taskSendEmails)
          .innerJoin(sendEmails, eq(taskSendEmails.sendEmailId, sendEmails.id))
          .where(eq(taskSendEmails.taskId, task.id));

        return {
          ...task,
          sendEmails: taskEmails.map(te => ({
            id: te.sendEmail.id,
            companyName: te.sendEmail.companyName,
            emailAccount: te.sendEmail.emailAccount,
            senderName: te.sendEmail.senderName
          }))
        };
      })
    );

    return successResponse({
      tasks: tasksWithEmails,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages
    }, {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: pagination.totalPages
    });

  } catch (error) {
    logger.error('Fetch send tasks failed', error);
    return errorResponse(
      'FETCH_ERROR', 
      '获取任务列表失败',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * POST - 创建发送任务
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Create send task request started');
    
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
    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Create task validation failed', validation.error.errors);
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const { taskName, sendEmailIds, emailsPerHour, emailsPerTeacherPerDay, durationDays } = validation.data;

    // 验证发送邮箱是否存在且启用
    const sendEmailsData = await db
      .select()
      .from(sendEmails)
      .where(eq(sendEmails.isEnabled, true));

    // 检查是否所有请求的邮箱都存在且启用
    const validEmailIds = sendEmailsData.map(email => email.id);
    const invalidEmailIds = sendEmailIds.filter(id => !validEmailIds.includes(id));
    
    if (invalidEmailIds.length > 0) {
      return errorResponse('INVALID_SEND_EMAILS', '部分发送邮箱不存在或已被禁用');
    }

    // 使用事务创建任务
    const result = await db.transaction(async (tx) => {
      // 创建任务
      const [newTask] = await tx
        .insert(sendTasks)
        .values({
          taskName,
          status: 'initialized',
          emailsPerHour,
          emailsPerTeacherPerDay,
          durationDays,
          createdBy: user.id,
        })
        .returning();

      // 创建任务和发送邮箱的关联
      for (const sendEmailId of sendEmailIds) {
        await tx
          .insert(taskSendEmails)
          .values({
            taskId: newTask.id,
            sendEmailId,
          });
      }

      return newTask;
    });

    logger.info(`Task created successfully: ${result.id}`);

    // 获取完整的任务信息（包含发送邮箱）
    const taskEmails = await db
      .select({
        sendEmail: sendEmails
      })
      .from(taskSendEmails)
      .innerJoin(sendEmails, eq(taskSendEmails.sendEmailId, sendEmails.id))
      .where(eq(taskSendEmails.taskId, result.id));

    return successResponse({
      task: {
        ...result,
        sendEmails: taskEmails.map(te => ({
          id: te.sendEmail.id,
          companyName: te.sendEmail.companyName,
          emailAccount: te.sendEmail.emailAccount,
          senderName: te.sendEmail.senderName
        }))
      }
    }, undefined, 201);

  } catch (error) {
    logger.error('Create send task failed', error);
    return errorResponse(
      'CREATE_ERROR', 
      '创建任务失败',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
} 