import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { emailScheduler } from '@/lib/email/email-scheduler';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { sendTasks, taskSendEmails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// 路由参数类型
interface RouteContext {
  params: {
    id: string;
  };
}

// 请求数据验证schema
const controlTaskSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'stop'], {
    required_error: '请指定操作类型'
  }),
  calculationResult: z.object({
    totalEmails: z.number(),
    calculatedDays: z.number(),
    dailySendLimit: z.number(),
    dailyReceiveLimit: z.number(),
    effectiveDailyRate: z.number(),
    sendingSchedule: z.array(z.any()),
    statusMatrix: z.any()
  }).optional()
});

/**
 * POST - 控制邮件发送任务
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    // 等待 params
    const { id } = await params;
    logger.info(`Task control request started for task: ${id}`);
    
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
    const validation = controlTaskSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Task control validation failed', validation.error.errors);
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const { action, calculationResult } = validation.data;

    // 验证任务是否存在
    const taskResult = await db
      .select()
      .from(sendTasks)
      .where(eq(sendTasks.id, id))
      .limit(1);

    const task = taskResult[0];
    if (!task) {
      return errorResponse('TASK_NOT_FOUND', '任务不存在');
    }

    // 根据操作类型执行相应逻辑
    switch (action) {
      case 'start':
        if (!calculationResult) {
          return errorResponse('CALCULATION_REQUIRED', '启动任务需要计算结果');
        }
        
        // 确保statusMatrix存在
        if (!calculationResult.statusMatrix) {
          return errorResponse('MISSING_STATUS_MATRIX', '缺少状态矩阵数据');
        }
        
        try {
          // 更新任务状态为运行中
          await db
            .update(sendTasks)
            .set({ 
              status: 'running',
              startTime: new Date(),
              durationDays: calculationResult.calculatedDays
            })
            .where(eq(sendTasks.id, id));

          // 启动邮件调度器
          await emailScheduler.startTask(id, calculationResult);
          
          logger.info(`Task started successfully: ${id}`);
        } catch (schedulerError) {
          // 如果调度器启动失败，回滚数据库状态
          logger.error(`Scheduler start failed for task ${id}, rolling back`, schedulerError);
          
          try {
            await db
              .update(sendTasks)
              .set({ 
                status: 'failed',
                startTime: null
              })
              .where(eq(sendTasks.id, id));
          } catch (rollbackError) {
            logger.error(`Failed to rollback task status for ${id}`, rollbackError);
          }
          
          return errorResponse(
            'SCHEDULER_START_FAILED',
            '启动调度器失败',
            schedulerError instanceof Error ? schedulerError.message : 'Unknown scheduler error'
          );
        }
        
        break;

      case 'pause':
        // 更新任务状态为暂停
        await db
          .update(sendTasks)
          .set({ status: 'paused' })
          .where(eq(sendTasks.id, id));

        // 暂停邮件调度器
        emailScheduler.pauseTask(id);
        
        logger.info(`Task paused: ${id}`);
        break;

      case 'resume':
        // 更新任务状态为运行中
        await db
          .update(sendTasks)
          .set({ status: 'running' })
          .where(eq(sendTasks.id, id));

        // 恢复邮件调度器
        emailScheduler.resumeTask(id);
        
        logger.info(`Task resumed: ${id}`);
        break;

      case 'stop':
        // 更新任务状态为初始化（可以重新开始）
        await db
          .update(sendTasks)
          .set({ 
            status: 'initialized',
            startTime: null,
            endTime: null
          })
          .where(eq(sendTasks.id, id));

        // 停止并清理邮件调度器
        emailScheduler.stopTask(id);
        
        logger.info(`Task stopped: ${id}`);
        break;

      default:
        return errorResponse('INVALID_ACTION', '无效的操作类型');
    }

    // 获取更新后的任务状态
    const updatedTaskResult = await db
      .select()
      .from(sendTasks)
      .where(eq(sendTasks.id, id))
      .limit(1);

    const updatedTask = updatedTaskResult[0];
    
    // 获取调度器状态
    const schedulerStatus = emailScheduler.getTaskStatus(id);

    const actionMessages = {
      start: '启动',
      pause: '暂停', 
      resume: '恢复',
      stop: '停止'
    };

    return successResponse({
      task: {
        id: updatedTask.id,
        taskName: updatedTask.taskName,
        status: updatedTask.status,
        startTime: updatedTask.startTime,
        durationDays: updatedTask.durationDays
      },
      schedulerStatus: schedulerStatus ? {
        isRunning: schedulerStatus.isRunning,
        currentDay: schedulerStatus.currentDay,
        statistics: schedulerStatus.statistics
      } : null,
      message: `任务${actionMessages[action]}成功`
    });

  } catch (error) {
    logger.error(`Task control failed for ${params.id}`, error);
    return errorResponse(
      'CONTROL_ERROR', 
      '任务控制失败',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
} 