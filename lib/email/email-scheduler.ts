/**
 * 邮件发送调度器
 * 负责定时执行邮件发送任务，管理发送状态和队列
 */

import { TaskCalculationResult, DaySchedule } from './task-calculator';
import { MockSMTPService } from './mock-smtp-service';
import { logger } from '@/lib/utils/logger';

export interface SchedulerTask {
  taskId: string;
  calculation: TaskCalculationResult;
  currentDay: number;
  isRunning: boolean;
  startedAt?: Date;
  completedAt?: Date;
  statistics: TaskStatistics;
}

export interface TaskStatistics {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  successRate: number;
  currentProgress: number; // 0-100
}

export interface EmailJob {
  id: string;
  taskId: string;
  sendEmailId: string;
  receiveEmailId: string;
  scheduledTime: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  errorMessage?: string;
  sentAt?: Date;
}

/**
 * 邮件发送调度器类
 * 
 * 功能特性：
 * - 定时任务管理
 * - 邮件队列处理
 * - 发送状态跟踪
 * - 错误重试机制
 * - 反垃圾邮件优化
 * - 内存状态管理
 */
export class EmailScheduler {
  private tasks: Map<string, SchedulerTask> = new Map();
  private emailJobs: Map<string, EmailJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private jobTimers: Map<string, NodeJS.Timeout> = new Map(); // 邮件作业定时器
  private smtpService: MockSMTPService;

  constructor() {
    this.smtpService = new MockSMTPService();
  }

  /**
   * 启动邮件发送任务
   */
  async startTask(taskId: string, calculation: TaskCalculationResult): Promise<void> {
    logger.info(`Starting email task: ${taskId}`);
    
    // 清理可能存在的旧任务状态
    this.cleanupTask(taskId);
    
    // 验证计算结果的完整性
    if (!calculation.sendingSchedule || calculation.sendingSchedule.length === 0) {
      throw new Error(`Invalid calculation result: empty sending schedule for task ${taskId}`);
    }
    
    // 验证发送计划的数据完整性
    for (let dayIndex = 0; dayIndex < calculation.sendingSchedule.length; dayIndex++) {
      const daySchedule = calculation.sendingSchedule[dayIndex];
      
      for (let senderIndex = 0; senderIndex < daySchedule.sendEmails.length; senderIndex++) {
        const senderSchedule = daySchedule.sendEmails[senderIndex];
        
        if (senderSchedule.receiveEmailIds.length !== senderSchedule.plannedSendTime.length) {
          logger.error(`Data integrity check failed for task ${taskId}`, {
            day: dayIndex + 1,
            senderIndex,
            sendEmailId: senderSchedule.sendEmailId,
            receiveEmailIdsLength: senderSchedule.receiveEmailIds.length,
            plannedSendTimeLength: senderSchedule.plannedSendTime.length
          });
          
          throw new Error(`Data integrity error: receiveEmailIds and plannedSendTime length mismatch in task ${taskId}, day ${dayIndex + 1}`);
        }
      }
    }
    
    const task: SchedulerTask = {
      taskId,
      calculation,
      currentDay: 1,
      isRunning: true,
      startedAt: new Date(),
      statistics: {
        totalSent: 0,
        totalFailed: 0,
        totalPending: calculation.totalEmails,
        successRate: 0,
        currentProgress: 0
      }
    };

    this.tasks.set(taskId, task);
    
    // 生成所有邮件作业
    try {
      this.generateEmailJobs(task);
      logger.info(`Successfully generated ${this.emailJobs.size} email jobs for task ${taskId}`);
    } catch (error) {
      logger.error(`Failed to generate email jobs for task ${taskId}`, error);
      this.cleanupTask(taskId);
      throw error;
    }
    
    // 启动调度
    try {
      this.scheduleAllEmails(taskId);
      logger.info(`Successfully scheduled all emails for task ${taskId}`);
    } catch (error) {
      logger.error(`Failed to schedule emails for task ${taskId}`, error);
      this.cleanupTask(taskId);
      throw error;
    }
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.isRunning = false;
      this.clearTaskTimers(taskId);
      logger.info(`Task paused: ${taskId}`);
    }
  }

  /**
   * 恢复任务
   */
  resumeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task && !task.isRunning) {
      task.isRunning = true;
      // 重新调度未发送的邮件
      this.scheduleAllEmails(taskId);
      logger.info(`Task resumed: ${taskId}`);
    }
  }

  /**
   * 停止并清理任务
   */
  stopTask(taskId: string): void {
    this.cleanupTask(taskId);
    logger.info(`Task stopped and cleaned up: ${taskId}`);
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): SchedulerTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取邮件状态矩阵
   */
  getStatusMatrix(taskId: string): { [receiveId: string]: { [sendId: string]: string } } {
    const jobs = Array.from(this.emailJobs.values()).filter(job => job.taskId === taskId);
    const matrix: { [receiveId: string]: { [sendId: string]: string } } = {};
    
    jobs.forEach(job => {
      if (!matrix[job.receiveEmailId]) {
        matrix[job.receiveEmailId] = {};
      }
      matrix[job.receiveEmailId][job.sendEmailId] = job.status;
    });
    
    return matrix;
  }

  /**
   * 重置调度器状态 - 清理所有任务和定时器
   */
  reset(): void {
    logger.info('Resetting EmailScheduler state');
    
    // 清理所有定时器
    this.timers.forEach((timer, taskId) => {
      clearTimeout(timer);
    });
    this.jobTimers.forEach((timer, jobId) => {
      clearTimeout(timer);
    });
    
    // 清理所有数据
    this.tasks.clear();
    this.emailJobs.clear();
    this.timers.clear();
    this.jobTimers.clear();
    
    logger.info('EmailScheduler state reset completed');
  }

  /**
   * 生成邮件作业队列
   */
  private generateEmailJobs(task: SchedulerTask): void {
    const { taskId, calculation } = task;
    
    calculation.sendingSchedule.forEach((daySchedule, dayIndex) => {
      daySchedule.sendEmails.forEach(senderSchedule => {
        senderSchedule.receiveEmailIds.forEach((receiveEmailId, emailIndex) => {
          // 安全检查：确保plannedTime存在
          const plannedTime = senderSchedule.plannedSendTime[emailIndex];
          
          if (!plannedTime) {
            logger.error(`Missing planned time for email job`, {
              taskId,
              dayIndex: dayIndex + 1,
              sendEmailId: senderSchedule.sendEmailId,
              receiveEmailId,
              emailIndex,
              plannedSendTimeLength: senderSchedule.plannedSendTime.length,
              receiveEmailIdsLength: senderSchedule.receiveEmailIds.length
            });
            
            // 使用默认时间（当天第一个小时的第一分钟）
            const defaultTime = `${dayIndex.toString().padStart(2, '0')}:00`;
            logger.warn(`Using default time for job: ${defaultTime}`);
            
            const scheduledTime = this.calculateScheduledTime(dayIndex + 1, defaultTime);
            
            const job: EmailJob = {
              id: `${taskId}-${senderSchedule.sendEmailId}-${receiveEmailId}-${dayIndex}-${emailIndex}`,
              taskId,
              sendEmailId: senderSchedule.sendEmailId,
              receiveEmailId,
              scheduledTime,
              status: 'pending',
              attempts: 0
            };
            
            this.emailJobs.set(job.id, job);
            return;
          }
          
          const scheduledTime = this.calculateScheduledTime(dayIndex + 1, plannedTime);
          
          const job: EmailJob = {
            id: `${taskId}-${senderSchedule.sendEmailId}-${receiveEmailId}-${dayIndex}-${emailIndex}`,
            taskId,
            sendEmailId: senderSchedule.sendEmailId,
            receiveEmailId,
            scheduledTime,
            status: 'pending',
            attempts: 0
          };
          
          this.emailJobs.set(job.id, job);
        });
      });
    });
    
    logger.info(`Generated ${this.emailJobs.size} email jobs for task ${taskId}`);
  }

  /**
   * 调度所有邮件作业
   */
  private scheduleAllEmails(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.isRunning) return;

    // 获取所有未发送的作业
    const pendingJobs = Array.from(this.emailJobs.values())
      .filter(job => job.taskId === taskId && job.status === 'pending');

    logger.info(`Scheduling ${pendingJobs.length} pending email jobs for task ${taskId}`);

    // 为每个作业设置定时器
    pendingJobs.forEach(job => {
      const delay = job.scheduledTime.getTime() - Date.now();
      
      if (delay > 0) {
        // 未来时间，设置定时器
        const timer = setTimeout(() => this.sendEmail(job), delay);
        this.jobTimers.set(job.id, timer);
      } else {
        // 已过期时间，立即发送
        setTimeout(() => this.sendEmail(job), 0);
      }
    });

    // 设置任务完成检查定时器
    this.scheduleCompletionCheck(taskId);
  }

  /**
   * 设置任务完成检查定时器
   */
  private scheduleCompletionCheck(taskId: string): void {
    // 每分钟检查一次任务是否完成
    const checkInterval = 60 * 1000; // 1分钟
    
    const checkCompletion = () => {
      const task = this.tasks.get(taskId);
      if (!task || !task.isRunning) return;

      const pendingJobs = Array.from(this.emailJobs.values())
        .filter(job => job.taskId === taskId && job.status === 'pending').length;

      if (pendingJobs === 0) {
        this.completeTask(taskId);
      } else {
        // 继续检查
        const timer = setTimeout(checkCompletion, checkInterval);
        this.timers.set(`${taskId}-completion-check`, timer);
      }
    };

    const timer = setTimeout(checkCompletion, checkInterval);
    this.timers.set(`${taskId}-completion-check`, timer);
  }

  /**
   * 计算具体发送时间
   */
  private calculateScheduledTime(day: number, timeString: string): Date {
    // 安全检查：确保timeString有效
    if (!timeString || typeof timeString !== 'string') {
      logger.error(`Invalid timeString in calculateScheduledTime`, {
        day,
        timeString,
        timeStringType: typeof timeString
      });
      
      // 使用默认时间 00:00
      timeString = '00:00';
    }
    
    // 验证时间格式
    if (!/^\d{1,2}:\d{2}$/.test(timeString)) {
      logger.error(`Invalid time format in calculateScheduledTime`, {
        day,
        timeString
      });
      
      // 使用默认时间 00:00
      timeString = '00:00';
    }
    
    const now = new Date();
    const timeParts = timeString.split(':');
    
    if (timeParts.length !== 2) {
      logger.error(`Failed to split timeString`, {
        day,
        timeString,
        timeParts
      });
      
      // 使用默认时间
      const scheduledDate = new Date(now);
      scheduledDate.setDate(now.getDate() + day - 1);
      scheduledDate.setHours(0, 0, 0, 0);
      return scheduledDate;
    }
    
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    
    // 验证时间值的有效性
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      logger.error(`Invalid time values in calculateScheduledTime`, {
        day,
        timeString,
        hours,
        minutes
      });
      
      // 使用默认时间
      const scheduledDate = new Date(now);
      scheduledDate.setDate(now.getDate() + day - 1);
      scheduledDate.setHours(0, 0, 0, 0);
      return scheduledDate;
    }
    
    const scheduledDate = new Date(now);
    scheduledDate.setDate(now.getDate() + day - 1);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    return scheduledDate;
  }

  /**
   * 发送单封邮件
   */
  private async sendEmail(job: EmailJob): Promise<void> {
    const task = this.tasks.get(job.taskId);
    if (!task || !task.isRunning) return;

    // 清理该作业的定时器
    const timer = this.jobTimers.get(job.id);
    if (timer) {
      clearTimeout(timer);
      this.jobTimers.delete(job.id);
    }

    job.status = 'processing';
    job.attempts++;

    try {
      // 使用模拟SMTP服务发送邮件
      await this.smtpService.sendEmail({
        sendEmailId: job.sendEmailId,
        receiveEmailId: job.receiveEmailId,
        subject: `邮件发送任务 - ${task.taskId}`,
        content: '这是一封测试邮件内容'
      });

      job.status = 'sent';
      job.sentAt = new Date();
      task.statistics.totalSent++;
      task.statistics.totalPending--;
      
      logger.info(`Email sent successfully: ${job.id}`);
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      task.statistics.totalFailed++;
      task.statistics.totalPending--;
      
      logger.error(`Email send failed: ${job.id}`, error);
    }

    // 更新统计信息
    this.updateTaskStatistics(task);
  }

  /**
   * 更新任务统计信息
   */
  private updateTaskStatistics(task: SchedulerTask): void {
    const { totalSent, totalFailed, totalPending } = task.statistics;
    const total = task.calculation.totalEmails;
    
    const completed = totalSent + totalFailed;
    task.statistics.successRate = completed > 0 ? (totalSent / completed) * 100 : 0;
    task.statistics.currentProgress = (completed / total) * 100;
  }

  /**
   * 完成任务
   */
  private completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.isRunning = false;
      task.completedAt = new Date();
      
      // 清理定时器
      this.clearTaskTimers(taskId);
      
      logger.info(`Task completed: ${taskId}`, {
        statistics: task.statistics
      });
    }
  }

  /**
   * 清理任务相关的定时器
   */
  private clearTaskTimers(taskId: string): void {
    // 清理任务级定时器
    this.timers.forEach((timer, key) => {
      if (key.startsWith(taskId)) {
        clearTimeout(timer);
        this.timers.delete(key);
      }
    });

    // 清理作业级定时器
    this.jobTimers.forEach((timer, jobId) => {
      if (jobId.startsWith(taskId)) {
        clearTimeout(timer);
        this.jobTimers.delete(jobId);
      }
    });
  }

  /**
   * 清理任务状态
   */
  private cleanupTask(taskId: string): void {
    // 清理定时器
    this.clearTaskTimers(taskId);

    // 清理任务数据
    this.tasks.delete(taskId);

    // 清理邮件作业
    const jobsToDelete = Array.from(this.emailJobs.keys())
      .filter(jobId => jobId.startsWith(taskId));
    
    jobsToDelete.forEach(jobId => {
      this.emailJobs.delete(jobId);
    });
  }
}

// 单例模式
export const emailScheduler = new EmailScheduler(); 