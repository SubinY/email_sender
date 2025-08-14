/**
 * 邮件发送任务计算引擎
 * 负责根据任务参数计算发送周期和生成发送计划
 */

export interface TaskParams {
  sendEmailIds: string[];       // 发送邮箱ID数组
  receiveEmailCount: number;    // 接收邮箱总数
  emailsPerHour: number;        // 每个邮箱每小时发送数量 (P)
  emailsPerTeacherPerDay: number; // 每个接收方每天收到不同企业邮件数量 (O)
  workingHours?: number;        // 工作小时数，默认24小时
}

export interface TaskCalculationResult {
  totalEmails: number;          // 总邮件数
  calculatedDays: number;       // 计算得出的发送天数
  dailySendLimit: number;       // 每天发送上限
  dailyReceiveLimit: number;    // 每天接收上限
  effectiveDailyRate: number;   // 每天有效发送率
  sendingSchedule: DaySchedule[];// 每天发送计划
  statusMatrix: EmailStatusMatrix; // 状态矩阵
}

export interface DaySchedule {
  day: number;
  sendEmails: Array<{
    sendEmailId: string;
    receiveEmailIds: string[];
    plannedSendTime: string[];   // 每小时发送时间
  }>;
  totalEmailsForDay: number;
}

export interface EmailStatusMatrix {
  [receiveEmailId: string]: {
    [sendEmailId: string]: 'pending' | 'sent' | 'failed';
  };
}

/**
 * 邮件发送任务计算器
 */
export class TaskCalculator {
  
  /**
   * 计算发送任务周期和计划
   */
  static calculateTask(params: TaskParams): TaskCalculationResult {
    const {
      sendEmailIds,
      receiveEmailCount,
      emailsPerHour,
      emailsPerTeacherPerDay,
      workingHours = 24
    } = params;

    const sendEmailCount = sendEmailIds.length;
    
    // 1. 基础计算
    const totalEmails = sendEmailCount * receiveEmailCount;
    const dailySendLimit = sendEmailCount * emailsPerHour * workingHours;
    const dailyReceiveLimit = receiveEmailCount * emailsPerTeacherPerDay;
    
    // 2. 有效发送率（取较小值）
    const effectiveDailyRate = Math.min(dailySendLimit, dailyReceiveLimit);
    
    // 3. 计算发送天数（向上取整）
    const calculatedDays = Math.ceil(totalEmails / effectiveDailyRate);
    
    // 4. 生成发送计划
    const sendingSchedule = this.generateSchedule(
      params,
      calculatedDays,
      effectiveDailyRate
    );
    
    // 5. 初始化状态矩阵 - 只为实际发送的邮件创建状态
    const statusMatrix = this.initializeStatusMatrix(sendingSchedule);

    return {
      totalEmails,
      calculatedDays,
      dailySendLimit,
      dailyReceiveLimit,
      effectiveDailyRate,
      sendingSchedule,
      statusMatrix
    };
  }

  /**
   * 生成每天的发送计划 - 重写以正确实现接收方限制约束
   */
  private static generateSchedule(
    params: TaskParams,
    calculatedDays: number,
    effectiveDailyRate: number
  ): DaySchedule[] {
    const schedule: DaySchedule[] = [];
    const { 
      sendEmailIds, 
      receiveEmailCount, 
      emailsPerHour, 
      emailsPerTeacherPerDay,
      workingHours = 24 
    } = params;
    
    // 生成接收方ID数组
    const receiveEmailIds = Array.from({ length: receiveEmailCount }, (_, i) => `receive-${i + 1}`);
    
    // 关键修复：正确的邮件分配逻辑
    const totalEmails = sendEmailIds.length * receiveEmailCount;
    let processedEmails = 0;
    
    // 按天分组发送方，确保每个接收方每天最多收到指定数量不同企业邮件
    const sendersPerDay = Math.min(emailsPerTeacherPerDay, sendEmailIds.length);
    const senderGroups = this.createSenderGroups(sendEmailIds, sendersPerDay);
    
    for (let day = 1; day <= calculatedDays && processedEmails < totalEmails; day++) {
      const daySchedule: DaySchedule = {
        day,
        sendEmails: [],
        totalEmailsForDay: 0
      };
      
      // 获取当天的发送方组
      const todaySenders = senderGroups[(day - 1) % senderGroups.length];
      
      // 计算当天每个发送方最多可以发送多少邮件
      const maxEmailsPerSenderToday = Math.floor(effectiveDailyRate / todaySenders.length);
      const remainingDailyEmails = effectiveDailyRate - (maxEmailsPerSenderToday * todaySenders.length);
      
      let receiverIndex = 0;
      
      for (let senderIdx = 0; senderIdx < todaySenders.length; senderIdx++) {
        const sendEmailId = todaySenders[senderIdx];
        
        // 为这个发送方分配接收方
        let emailsForThisSender = maxEmailsPerSenderToday;
        
        // 分配剩余的邮件（如果有的话）
        if (senderIdx < remainingDailyEmails) {
          emailsForThisSender += 1;
        }
        
        // 确保不超过剩余邮件数
        const remainingEmails = totalEmails - processedEmails;
        emailsForThisSender = Math.min(emailsForThisSender, remainingEmails);
        
        if (emailsForThisSender <= 0) break;
        
        // 分配接收方ID（循环使用）
        const receiveEmailsForThisSender: string[] = [];
        for (let i = 0; i < emailsForThisSender; i++) {
          const receiveIdx = (receiverIndex + i) % receiveEmailIds.length;
          receiveEmailsForThisSender.push(receiveEmailIds[receiveIdx]);
        }
        receiverIndex = (receiverIndex + emailsForThisSender) % receiveEmailIds.length;
        
        // 生成每小时发送时间 - 确保数量与接收方ID匹配
        const plannedSendTime = this.generateHourlySendTimes(
          emailsForThisSender,
          emailsPerHour,
          workingHours
        );
        
        // 安全检查：确保两个数组长度相同
        if (plannedSendTime.length !== receiveEmailsForThisSender.length) {
          console.error(`Array length mismatch in generateSchedule`, {
            day,
            sendEmailId,
            plannedSendTimeLength: plannedSendTime.length,
            receiveEmailsLength: receiveEmailsForThisSender.length,
            emailsForThisSender,
            emailsPerHour,
            workingHours
          });
          
          // 补齐或截断plannedSendTime数组
          while (plannedSendTime.length < receiveEmailsForThisSender.length) {
            // 如果时间不够，复制最后一个时间
            const lastTime = plannedSendTime[plannedSendTime.length - 1] || '00:00';
            plannedSendTime.push(lastTime);
          }
          
          // 如果时间太多，截断
          if (plannedSendTime.length > receiveEmailsForThisSender.length) {
            plannedSendTime.splice(receiveEmailsForThisSender.length);
          }
        }
        
        daySchedule.sendEmails.push({
          sendEmailId,
          receiveEmailIds: receiveEmailsForThisSender,
          plannedSendTime
        });
        
        daySchedule.totalEmailsForDay += emailsForThisSender;
        processedEmails += emailsForThisSender;
      }
      
      schedule.push(daySchedule);
    }
    
    return schedule;
  }

  /**
   * 创建发送方分组，确保每天的发送方组合不同
   */
  private static createSenderGroups(sendEmailIds: string[], sendersPerDay: number): string[][] {
    const groups: string[][] = [];
    const totalSenders = sendEmailIds.length;
    
    if (sendersPerDay >= totalSenders) {
      // 如果每天可以用所有发送方，就直接返回一个包含所有发送方的组
      return [sendEmailIds];
    }
    
    // 创建轮换组合
    const totalGroups = Math.ceil(totalSenders / sendersPerDay);
    
    for (let groupIndex = 0; groupIndex < totalGroups; groupIndex++) {
      const group: string[] = [];
      
      for (let i = 0; i < sendersPerDay; i++) {
        const senderIndex = (groupIndex * sendersPerDay + i) % totalSenders;
        group.push(sendEmailIds[senderIndex]);
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * 生成每小时发送时间计划
   */
  private static generateHourlySendTimes(
    totalEmails: number,
    emailsPerHour: number,
    workingHours: number
  ): string[] {
    const times: string[] = [];
    let remainingEmails = totalEmails;
    
    for (let hour = 0; hour < workingHours && remainingEmails > 0; hour++) {
      const emailsThisHour = Math.min(emailsPerHour, remainingEmails);
      
      for (let i = 0; i < emailsThisHour; i++) {
        const minute = Math.floor((i / emailsThisHour) * 60);
        times.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
      
      remainingEmails -= emailsThisHour;
    }
    
    return times;
  }

  /**
   * 根据实际发送计划初始化邮件状态矩阵
   */
  private static initializeStatusMatrix(sendingSchedule: DaySchedule[]): EmailStatusMatrix {
    const matrix: EmailStatusMatrix = {};
    
    sendingSchedule.forEach(daySchedule => {
      daySchedule.sendEmails.forEach(senderSchedule => {
        senderSchedule.receiveEmailIds.forEach(receiveEmailId => {
          if (!matrix[receiveEmailId]) {
            matrix[receiveEmailId] = {};
          }
          matrix[receiveEmailId][senderSchedule.sendEmailId] = 'pending';
        });
      });
    });
    
    return matrix;
  }
} 