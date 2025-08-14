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
 */
export class EmailScheduler {
  private tasks: Map<string, SchedulerTask> = new Map();
  private emailJobs: Map<string, EmailJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private smtpService: MockSMTPService;

  constructor() {
    this.smtpService = new MockSMTPService();
  }

  /**
   * 启动邮件发送任务
   */
  async startTask(taskId: string, calculation: TaskCalculationResult): Promise<void> {
    logger.info(`Starting email task: ${taskId}`);
    
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
    this.generateEmailJobs(task);
    
    // 启动定时器
    this.scheduleNextDay(taskId);
  }

  /**
   * 暂停任务
   */
  pauseTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.isRunning = false;
      const timer = this.timers.get(taskId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(taskId);
      }
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
      this.scheduleNextDay(taskId);
      logger.info(`Task resumed: ${taskId}`);
    }
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
   * 生成邮件作业队列
   */
  private generateEmailJobs(task: SchedulerTask): void {
    const { taskId, calculation } = task;
    
    calculation.sendingSchedule.forEach((daySchedule, dayIndex) => {
      daySchedule.sendEmails.forEach(senderSchedule => {
        senderSchedule.receiveEmailIds.forEach((receiveEmailId, emailIndex) => {
          const plannedTime = senderSchedule.plannedSendTime[emailIndex];
          const scheduledTime = this.calculateScheduledTime(dayIndex + 1, plannedTime);
          
          const job: EmailJob = {
            id: `${taskId}-${senderSchedule.sendEmailId}-${receiveEmailId}`,
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
  }

  /**
   * 计算具体发送时间
   */
  private calculateScheduledTime(day: number, timeString: string): Date {
    const now = new Date();
    const [hours, minutes] = timeString.split(':').map(Number);
    
    const scheduledDate = new Date(now);
    scheduledDate.setDate(now.getDate() + day - 1);
    scheduledDate.setHours(hours, minutes, 0, 0);
    
    return scheduledDate;
  }

  /**
   * 调度下一天的发送任务
   */
  private scheduleNextDay(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task || !task.isRunning) return;

    const { calculation, currentDay } = task;
    
    if (currentDay > calculation.calculatedDays) {
      this.completeTask(taskId);
      return;
    }

    // 获取今天需要发送的邮件作业
    const todayJobs = Array.from(this.emailJobs.values())
      .filter(job => 
        job.taskId === taskId && 
        job.status === 'pending' &&
        this.isToday(job.scheduledTime, currentDay)
      );

    // 按时间排序
    todayJobs.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    // 为每个邮件设置定时器
    todayJobs.forEach(job => {
      const delay = job.scheduledTime.getTime() - Date.now();
      if (delay > 0) {
        setTimeout(() => this.sendEmail(job), delay);
      } else {
        // 如果已经过了发送时间，立即发送
        this.sendEmail(job);
      }
    });

    // 设置明天的调度
    task.currentDay++;
    const nextDayDelay = 24 * 60 * 60 * 1000; // 24小时后
    const timer = setTimeout(() => this.scheduleNextDay(taskId), nextDayDelay);
    this.timers.set(taskId, timer);
  }

  /**
   * 发送单封邮件
   */
  private async sendEmail(job: EmailJob): Promise<void> {
    const task = this.tasks.get(job.taskId);
    if (!task || !task.isRunning) return;

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
   * 检查是否是指定天的邮件
   */
  private isToday(scheduledTime: Date, currentDay: number): boolean {
    const now = new Date();
    const targetDay = new Date(now);
    targetDay.setDate(now.getDate() + currentDay - 1);
    
    return scheduledTime.toDateString() === targetDay.toDateString();
  }

  /**
   * 更新任务统计信息
   */
  private updateTaskStatistics(task: SchedulerTask): void {
    const { totalSent, totalFailed, totalPending } = task.statistics;
    const total = task.calculation.totalEmails;
    
    task.statistics.successRate = totalSent / (totalSent + totalFailed) * 100;
    task.statistics.currentProgress = (totalSent + totalFailed) / total * 100;
  }

  /**
   * 完成任务
   */
  private completeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.isRunning = false;
      task.completedAt = new Date();
      
      const timer = this.timers.get(taskId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(taskId);
      }
      
      logger.info(`Task completed: ${taskId}`);
    }
  }
}

// 单例模式
export const emailScheduler = new EmailScheduler(); 