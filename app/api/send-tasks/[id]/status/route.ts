import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { emailScheduler } from '@/lib/email/email-scheduler';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { sendTasks, taskSendEmails, sendEmails } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// 路由参数类型
interface RouteContext {
  params: {
    id: string;
  };
}

/**
 * GET - 获取邮件发送任务状态
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    // 等待 params
    const { id } = await params;
    logger.info(`Task status request for task: ${id}`);
    
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    // if (!checkPermission(user.role, 'send-emails:read')) {
    //   return forbiddenResponse();
    // }

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

    // 获取任务关联的发送邮箱
    const taskSendEmailsResult = await db
      .select({
        sendEmail: sendEmails
      })
      .from(taskSendEmails)
      .innerJoin(sendEmails, eq(taskSendEmails.sendEmailId, sendEmails.id))
      .where(eq(taskSendEmails.taskId, id));

    // 获取调度器状态
    const schedulerStatus = emailScheduler.getTaskStatus(id);
    
    // 获取状态矩阵
    const statusMatrix = emailScheduler.getStatusMatrix(id);

    // 计算状态统计
    const matrixStats = calculateMatrixStats(statusMatrix);

    return successResponse({
      task: {
        id: task.id,
        taskName: task.taskName,
        status: task.status,
        startTime: task.startTime,
        endTime: task.endTime,
        durationDays: task.durationDays,
        emailsPerHour: task.emailsPerHour,
        emailsPerTeacherPerDay: task.emailsPerTeacherPerDay,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      },
      sendEmails: taskSendEmailsResult.map(item => ({
        id: item.sendEmail.id,
        companyName: item.sendEmail.companyName,
        emailAccount: item.sendEmail.emailAccount,
        senderName: item.sendEmail.senderName
      })),
      schedulerStatus: schedulerStatus ? {
        isRunning: schedulerStatus.isRunning,
        currentDay: schedulerStatus.currentDay,
        startedAt: schedulerStatus.startedAt,
        completedAt: schedulerStatus.completedAt,
        statistics: schedulerStatus.statistics
      } : null,
      statusMatrix,
      matrixStats,
      realTimeStats: {
        isActive: task.status === 'running',
        progress: schedulerStatus?.statistics.currentProgress || 0,
        successRate: schedulerStatus?.statistics.successRate || 0,
        totalSent: schedulerStatus?.statistics.totalSent || 0,
        totalFailed: schedulerStatus?.statistics.totalFailed || 0,
        totalPending: schedulerStatus?.statistics.totalPending || 0
      }
    });

  } catch (error) {
    logger.error(`Task status failed for ${id}`, error);
    return errorResponse(
      'STATUS_ERROR', 
      '获取任务状态失败',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * 计算状态矩阵统计信息
 */
function calculateMatrixStats(matrix: { [receiveId: string]: { [sendId: string]: string } }) {
  let pending = 0;
  let sent = 0;
  let failed = 0;
  let processing = 0;

  Object.values(matrix).forEach(receiveRow => {
    Object.values(receiveRow).forEach(status => {
      switch (status) {
        case 'pending':
          pending++;
          break;
        case 'sent':
          sent++;
          break;
        case 'failed':
          failed++;
          break;
        case 'processing':
          processing++;
          break;
      }
    });
  });

  const total = pending + sent + failed + processing;

  return {
    pending,
    sent,
    failed,
    processing,
    total,
    successRate: total > 0 ? (sent / (sent + failed)) * 100 : 0,
    completionRate: total > 0 ? ((sent + failed) / total) * 100 : 0
  };
} 