/**
 * 模拟SMTP邮件发送服务
 * 在没有真实SMTP服务器的情况下模拟邮件发送过程
 */

import { logger } from '@/lib/utils/logger';

export interface EmailContent {
  sendEmailId: string;
  receiveEmailId: string;
  subject: string;
  content: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

/**
 * 模拟SMTP服务类
 * 
 * 功能特性：
 * - 模拟邮件发送延迟
 * - 模拟发送成功/失败率
 * - 反垃圾邮件保护模拟
 * - 发送日志记录
 */
export class MockSMTPService {
  private sendHistory: Array<{
    timestamp: Date;
    sendEmailId: string;
    count: number;
  }> = [];

  private readonly CONFIG = {
    // 模拟发送延迟 (ms)
    sendDelay: {
      min: 100,
      max: 1000
    },
    
    // 模拟成功率 (0-1)
    successRate: 0.95,
    
    // 反垃圾邮件限制
    antiSpam: {
      maxEmailsPerHour: 100,    // 每小时最大发送数
      maxEmailsPerMinute: 10,   // 每分钟最大发送数
      cooldownPeriod: 60 * 1000 // 冷却期 (ms)
    }
  };

  /**
   * 发送邮件
   */
  async sendEmail(email: EmailContent): Promise<EmailSendResult> {
    logger.info(`Sending email from ${email.sendEmailId} to ${email.receiveEmailId}`);
    
    try {
      // 1. 检查反垃圾邮件限制
      this.checkAntiSpamLimits(email.sendEmailId);
      
      // 2. 模拟发送延迟
      await this.simulateSendDelay();
      
      // 3. 模拟发送结果
      const result = this.simulateSendResult();
      
      if (result.success) {
        // 记录发送历史
        this.recordSendHistory(email.sendEmailId);
        
        logger.info(`Email sent successfully: ${result.messageId}`);
        return result;
      } else {
        logger.warn(`Email send failed: ${result.errorMessage}`);
        return result;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Email send error: ${errorMessage}`);
      
      return {
        success: false,
        errorMessage
      };
    }
  }

  /**
   * 检查反垃圾邮件限制
   */
  private checkAntiSpamLimits(sendEmailId: string): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    // 清理过期历史记录
    this.sendHistory = this.sendHistory.filter(
      record => record.timestamp > oneHourAgo
    );
    
    // 检查每小时限制
    const hourlyCount = this.sendHistory
      .filter(record => 
        record.sendEmailId === sendEmailId && 
        record.timestamp > oneHourAgo
      )
      .reduce((sum, record) => sum + record.count, 0);
    
    if (hourlyCount >= this.CONFIG.antiSpam.maxEmailsPerHour) {
      throw new Error(`Anti-spam limit exceeded: ${hourlyCount} emails in last hour`);
    }
    
    // 检查每分钟限制
    const minutelyCount = this.sendHistory
      .filter(record => 
        record.sendEmailId === sendEmailId && 
        record.timestamp > oneMinuteAgo
      )
      .reduce((sum, record) => sum + record.count, 0);
    
    if (minutelyCount >= this.CONFIG.antiSpam.maxEmailsPerMinute) {
      throw new Error(`Anti-spam limit exceeded: ${minutelyCount} emails in last minute`);
    }
  }

  /**
   * 模拟发送延迟
   */
  private async simulateSendDelay(): Promise<void> {
    const delay = Math.random() * 
      (this.CONFIG.sendDelay.max - this.CONFIG.sendDelay.min) + 
      this.CONFIG.sendDelay.min;
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟发送结果
   */
  private simulateSendResult(): EmailSendResult {
    const isSuccess = Math.random() < this.CONFIG.successRate;
    
    if (isSuccess) {
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      const errorMessages = [
        'Recipient mailbox full',
        'Temporary server error',
        'Invalid recipient address',
        'Message blocked by spam filter'
      ];
      
      return {
        success: false,
        errorMessage: errorMessages[Math.floor(Math.random() * errorMessages.length)]
      };
    }
  }

  /**
   * 记录发送历史
   */
  private recordSendHistory(sendEmailId: string): void {
    const now = new Date();
    const existingRecord = this.sendHistory.find(
      record => 
        record.sendEmailId === sendEmailId && 
        now.getTime() - record.timestamp.getTime() < this.CONFIG.antiSpam.cooldownPeriod
    );
    
    if (existingRecord) {
      existingRecord.count++;
    } else {
      this.sendHistory.push({
        timestamp: now,
        sendEmailId,
        count: 1
      });
    }
  }

  /**
   * 获取发送统计
   */
  getSendStatistics(sendEmailId?: string): {
    totalSent: number;
    lastHourCount: number;
    lastMinuteCount: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    const relevantHistory = sendEmailId 
      ? this.sendHistory.filter(record => record.sendEmailId === sendEmailId)
      : this.sendHistory;
    
    return {
      totalSent: relevantHistory.reduce((sum, record) => sum + record.count, 0),
      lastHourCount: relevantHistory
        .filter(record => record.timestamp > oneHourAgo)
        .reduce((sum, record) => sum + record.count, 0),
      lastMinuteCount: relevantHistory
        .filter(record => record.timestamp > oneMinuteAgo)
        .reduce((sum, record) => sum + record.count, 0)
    };
  }

  /**
   * 重置发送历史（用于测试）
   */
  resetHistory(): void {
    this.sendHistory = [];
  }
} 