import db from './index';
import { users, receiveEmails, sendEmails } from './schema';
import { hashPassword } from '../auth/password';

async function seed() {
  console.log('🌱 开始数据库种子数据初始化...');

  try {
    // 创建管理员用户
    console.log('👤 创建管理员用户...');
    const adminPasswordHash = await hashPassword('Admin123!');
    
    const adminUser = await db.insert(users).values({
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ 管理员用户创建成功:', adminUser[0].username);

    // 创建操作员用户
    console.log('👤 创建操作员用户...');
    const operatorPasswordHash = await hashPassword('Operator123!');
    
    const operatorUser = await db.insert(users).values({
      username: 'operator',
      email: 'operator@example.com',
      passwordHash: operatorPasswordHash,
      role: 'operator',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    console.log('✅ 操作员用户创建成功:', operatorUser[0].username);

    // 创建测试接收邮箱
    console.log('📧 创建测试接收邮箱...');
    const testReceiveEmails = [
      {
        universityName: '北京大学',
        collegeName: '计算机学院',
        contactPerson: '张教授',
        province: '北京',
        email: 'zhang@pku.edu.cn',
        phone: '010-12345678',
        responsibility: '学术合作',
        isBlacklisted: false,
        createdBy: adminUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        universityName: '清华大学',
        collegeName: '软件学院',
        contactPerson: '李教授',
        province: '北京',
        email: 'li@tsinghua.edu.cn',
        phone: '010-87654321',
        responsibility: '人才培养',
        isBlacklisted: false,
        createdBy: adminUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        universityName: '复旦大学',
        collegeName: '信息学院',
        contactPerson: '王教授',
        province: '上海',
        email: 'wang@fudan.edu.cn',
        phone: '021-12345678',
        responsibility: '技术交流',
        isBlacklisted: false,
        createdBy: adminUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const createdReceiveEmails = await db.insert(receiveEmails).values(testReceiveEmails).returning();
    console.log(`✅ 创建了 ${createdReceiveEmails.length} 个测试接收邮箱`);

    // 创建测试发送邮箱
    console.log('📤 创建测试发送邮箱...');
    const testSendEmails = [
      {
        companyName: '示例公司1',
        referralCode: 'DEMO001',
        referralLink: 'https://example.com/referral/DEMO001',
        emailAccount: 'demo1@example.com',
        passwordEncrypted: 'encrypted_password_1',
        smtpServer: 'smtp.example.com',
        port: 465,
        sslTls: true,
        senderName: '示例公司1',
        description: '测试发送邮箱1',
        isEnabled: true,
        createdBy: adminUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        companyName: '示例公司2',
        referralCode: 'DEMO002',
        referralLink: 'https://example.com/referral/DEMO002',
        emailAccount: 'demo2@example.com',
        passwordEncrypted: 'encrypted_password_2',
        smtpServer: 'smtp.example.com',
        port: 587,
        sslTls: true,
        senderName: '示例公司2',
        description: '测试发送邮箱2',
        isEnabled: true,
        createdBy: adminUser[0].id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const createdSendEmails = await db.insert(sendEmails).values(testSendEmails).returning();
    console.log(`✅ 创建了 ${createdSendEmails.length} 个测试发送邮箱`);

    console.log('🎉 数据库种子数据初始化完成！');
    console.log('');
    console.log('📋 登录信息:');
    console.log('管理员账户:');
    console.log('  用户名: admin');
    console.log('  密码: Admin123!');
    console.log('');
    console.log('操作员账户:');
    console.log('  用户名: operator');
    console.log('  密码: Operator123!');

  } catch (error) {
    console.error('❌ 数据库种子数据初始化失败:', error);
    throw error;
  }
}

// 运行种子脚本
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ 种子脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 种子脚本执行失败:', error);
      process.exit(1);
    });
}

export default seed; 