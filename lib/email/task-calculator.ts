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
    
    // 5. 初始化状态矩阵
    const statusMatrix = this.initializeStatusMatrix(
      sendEmailIds,
      receiveEmailCount
    );

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
   * 生成每天的发送计划
   */
  private static generateSchedule(
    params: TaskParams,
    calculatedDays: number,
    effectiveDailyRate: number
  ): DaySchedule[] {
    const schedule: DaySchedule[] = [];
    const { sendEmailIds, receiveEmailCount, emailsPerHour, workingHours = 24 } = params;
    
    const emailsPerSenderPerHour = emailsPerHour;
    const emailsPerSenderPerDay = emailsPerSenderPerHour * workingHours;
    
    // 生成接收方ID数组（模拟）
    const receiveEmailIds = Array.from({ length: receiveEmailCount }, (_, i) => `receive-${i + 1}`);
    
    let remainingEmails = receiveEmailCount;
    let receiveEmailIndex = 0;
    
    for (let day = 1; day <= calculatedDays; day++) {
      const daySchedule: DaySchedule = {
        day,
        sendEmails: [],
        totalEmailsForDay: 0
      };
      
      // 为每个发送方安排今天的发送计划
      for (const sendEmailId of sendEmailIds) {
        if (remainingEmails <= 0) break;
        
        const emailsToSendToday = Math.min(emailsPerSenderPerDay, remainingEmails);
        const receiveEmailsForThisSender = receiveEmailIds.slice(
          receiveEmailIndex,
          receiveEmailIndex + emailsToSendToday
        );
        
        // 生成每小时发送时间
        const plannedSendTime = this.generateHourlySendTimes(
          emailsToSendToday,
          emailsPerSenderPerHour,
          workingHours
        );
        
        daySchedule.sendEmails.push({
          sendEmailId,
          receiveEmailIds: receiveEmailsForThisSender,
          plannedSendTime
        });
        
        daySchedule.totalEmailsForDay += emailsToSendToday;
        receiveEmailIndex += emailsToSendToday;
        remainingEmails -= emailsToSendToday;
      }
      
      schedule.push(daySchedule);
    }
    
    return schedule;
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
   * 初始化邮件状态矩阵
   */
  private static initializeStatusMatrix(
    sendEmailIds: string[],
    receiveEmailCount: number
  ): EmailStatusMatrix {
    const matrix: EmailStatusMatrix = {};
    
    for (let i = 0; i < receiveEmailCount; i++) {
      const receiveEmailId = `receive-${i + 1}`;
      matrix[receiveEmailId] = {};
      
      for (const sendEmailId of sendEmailIds) {
        matrix[receiveEmailId][sendEmailId] = 'pending';
      }
    }
    
    return matrix;
  }
} 