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
  // 新增字段，提供更详细的分组信息
  groupInfo: {
    totalGroups: number;              // 企业分组总数
    daysPerGroup: number;             // 每组执行天数
    companiesPerGroup: number;        // 每组企业数量
    companyDailyCapacity: number;     // 单个企业每天发送能力
    currentGroupDailyCapacity: number; // 当前企业组每天发送能力
  };
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
    
    // 1. 企业分组串行计算（新算法）
    const companiesPerGroup = emailsPerTeacherPerDay; // R：每老师每天收企业数
    const totalGroups = Math.ceil(sendEmailCount / companiesPerGroup); // 企业分组数
    const companyDailyCapacity = emailsPerHour * workingHours; // 每企业每天发送能力
    
    // 2. 每组执行天数计算
    const daysPerGroup = Math.ceil(receiveEmailCount / companyDailyCapacity);
    
    // 3. 总完成天数（企业组串行执行）
    const calculatedDays = totalGroups * daysPerGroup;
    
    // 4. 其他统计信息
    const totalEmails = sendEmailCount * receiveEmailCount;
    const currentGroupSize = Math.min(companiesPerGroup, sendEmailCount);
    const currentGroupDailyCapacity = currentGroupSize * companyDailyCapacity;
    
    // 5. 兼容性字段（保持与原接口一致）
    const dailySendLimit = sendEmailCount * emailsPerHour * workingHours; // 理论总发送能力
    const dailyReceiveLimit = receiveEmailCount * emailsPerTeacherPerDay; // 理论总接收能力
    const effectiveDailyRate = Math.min(currentGroupDailyCapacity, dailyReceiveLimit); // 当前企业组有效发送率
    
    // 6. 生成发送计划
    const sendingSchedule = this.generateSchedule(
      params,
      calculatedDays,
      totalGroups,
      daysPerGroup,
      companyDailyCapacity
    );
    
    // 7. 初始化状态矩阵 - 只为实际发送的邮件创建状态
    const statusMatrix = this.initializeStatusMatrix(sendingSchedule);

    return {
      totalEmails,
      calculatedDays,
      dailySendLimit,
      dailyReceiveLimit,
      effectiveDailyRate,
      sendingSchedule,
      statusMatrix,
      // 新增字段，提供更详细的分组信息
      groupInfo: {
        totalGroups,
        daysPerGroup,
        companiesPerGroup,
        companyDailyCapacity,
        currentGroupDailyCapacity
      }
    };
  }

  /**
   * 生成企业分组串行发送计划
   */
  private static generateSchedule(
    params: TaskParams,
    calculatedDays: number,
    totalGroups: number,
    daysPerGroup: number,
    companyDailyCapacity: number
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
    
    // 企业分组
    const companiesPerGroup = emailsPerTeacherPerDay;
    const senderGroups = this.createSenderGroups(sendEmailIds, companiesPerGroup);
    
    // 按企业组串行生成调度计划
    for (let day = 1; day <= calculatedDays; day++) {
      const daySchedule: DaySchedule = {
        day,
        sendEmails: [],
        totalEmailsForDay: 0
      };
      
      // 确定当前是第几组企业在执行
      const currentGroupIndex = Math.floor((day - 1) / daysPerGroup);
      const dayInGroup = ((day - 1) % daysPerGroup) + 1;
      
      // 如果超出了企业组数量，跳过（理论上不应该发生）
      if (currentGroupIndex >= senderGroups.length) {
        break;
      }
      
      const currentGroup = senderGroups[currentGroupIndex];
      
      // 为当前企业组的每个企业分配发送任务
      for (const sendEmailId of currentGroup) {
        // 计算这个企业今天要发送的邮件数
        let emailsForThisCompany = 0;
        let startReceiveIndex = 0;
        
        // 每个企业在其执行期间需要给所有30个老师各发1封邮件
        const totalEmailsPerCompany = receiveEmailCount; // 30封
        const emailsAlreadySent = (dayInGroup - 1) * companyDailyCapacity;
        const remainingEmailsForCompany = Math.max(0, totalEmailsPerCompany - emailsAlreadySent);
        
        if (remainingEmailsForCompany > 0) {
          // 今天这个企业实际发送数量
          emailsForThisCompany = Math.min(companyDailyCapacity, remainingEmailsForCompany);
          // 从哪个老师开始发（基于这个企业已发送的进度）
          startReceiveIndex = emailsAlreadySent;
        }
        
        if (emailsForThisCompany > 0) {
          // 分配接收方ID - 确保不重复且按顺序
          const receiveEmailsForThisCompany: string[] = [];
          for (let i = 0; i < emailsForThisCompany; i++) {
            const actualReceiveIndex = startReceiveIndex + i;
            if (actualReceiveIndex < receiveEmailIds.length) {
              receiveEmailsForThisCompany.push(receiveEmailIds[actualReceiveIndex]);
            }
          }
          
          // 生成每小时发送时间
          const plannedSendTime = this.generateHourlySendTimes(
            emailsForThisCompany,
            emailsPerHour,
            workingHours
          );
          
          // 安全检查：确保两个数组长度相同
          if (plannedSendTime.length !== receiveEmailsForThisCompany.length) {
            console.error(`Array length mismatch in generateSchedule`, {
              day,
              sendEmailId,
              plannedSendTimeLength: plannedSendTime.length,
              receiveEmailsLength: receiveEmailsForThisCompany.length,
              emailsForThisCompany,
              startReceiveIndex,
              dayInGroup,
              currentGroupIndex
            });
            
            // 补齐或截断plannedSendTime数组
            while (plannedSendTime.length < receiveEmailsForThisCompany.length) {
              const lastTime = plannedSendTime[plannedSendTime.length - 1] || '00:00';
              plannedSendTime.push(lastTime);
            }
            
            if (plannedSendTime.length > receiveEmailsForThisCompany.length) {
              plannedSendTime.splice(receiveEmailsForThisCompany.length);
            }
          }
          
          daySchedule.sendEmails.push({
            sendEmailId,
            receiveEmailIds: receiveEmailsForThisCompany,
            plannedSendTime
          });
          
          daySchedule.totalEmailsForDay += emailsForThisCompany;
        }
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

  /**
   * 验证算法正确性的测试方法
   * 用于开发和调试阶段验证计算逻辑
   */
  static verifyAlgorithm(): void {
    console.log('🧪 开始验证TaskCalculator算法...');
    
    // 测试场景1：6企业，30老师，每小时1封，每老师每天收2个企业
    const testParams1: TaskParams = {
      sendEmailIds: ['A', 'B', 'C', 'D', 'E', 'F'],
      receiveEmailCount: 30,
      emailsPerHour: 1,
      emailsPerTeacherPerDay: 2,
      workingHours: 24
    };
    
    const result1 = this.calculateTask(testParams1);
    
    console.log('📊 测试场景1结果:', {
      参数: '6企业, 30老师, 1封/小时, 每老师每天收2企业',
      总邮件数: result1.totalEmails,
      预计天数: result1.calculatedDays,
      企业分组数: result1.groupInfo.totalGroups,
      每组天数: result1.groupInfo.daysPerGroup,
      每企业每天能力: result1.groupInfo.companyDailyCapacity,
      验证结果: result1.calculatedDays === 6 ? '✅ 正确' : '❌ 错误'
    });
    
    // 测试场景2：4企业，30老师，每小时2封，每老师每天收2个企业
    const testParams2: TaskParams = {
      sendEmailIds: ['A', 'B', 'C', 'D'],
      receiveEmailCount: 30,
      emailsPerHour: 2,
      emailsPerTeacherPerDay: 2,
      workingHours: 24
    };
    
    const result2 = this.calculateTask(testParams2);
    
    console.log('📊 测试场景2结果:', {
      参数: '4企业, 30老师, 2封/小时, 每老师每天收2企业',
      总邮件数: result2.totalEmails,
      预计天数: result2.calculatedDays,
      企业分组数: result2.groupInfo.totalGroups,
      每组天数: result2.groupInfo.daysPerGroup,
      每企业每天能力: result2.groupInfo.companyDailyCapacity,
      预期结果: 'ceil(4/2) × ceil(30/48) = 2 × 1 = 2天',
      验证结果: result2.calculatedDays === 2 ? '✅ 正确' : '❌ 错误'
    });
    
    // 测试场景3：6企业，30老师，每小时0.5封，每老师每天收3个企业
    const testParams3: TaskParams = {
      sendEmailIds: ['A', 'B', 'C', 'D', 'E', 'F'],
      receiveEmailCount: 30,
      emailsPerHour: 0.5,
      emailsPerTeacherPerDay: 3,
      workingHours: 24
    };
    
    const result3 = this.calculateTask(testParams3);
    
    console.log('📊 测试场景3结果:', {
      参数: '6企业, 30老师, 0.5封/小时, 每老师每天收3企业',
      总邮件数: result3.totalEmails,
      预计天数: result3.calculatedDays,
      企业分组数: result3.groupInfo.totalGroups,
      每组天数: result3.groupInfo.daysPerGroup,
      每企业每天能力: result3.groupInfo.companyDailyCapacity,
      预期结果: 'ceil(6/3) × ceil(30/12) = 2 × 3 = 6天',
      验证结果: result3.calculatedDays === 6 ? '✅ 正确' : '❌ 错误'
    });
    
    console.log('✅ 算法验证完成！');
  }
} 