import { getDatabase } from './index';
import { users, receiveEmails, sendEmails } from './schema';
import { hashPassword } from '../auth/password';
import { sql } from 'drizzle-orm';

async function createTablesIfNotExists() {
  const db = getDatabase();
  
  console.log('🔨 检查并创建数据库表结构...');
  
  try {
    // 创建枚举类型（如果不存在）
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('initialized', 'running', 'paused', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE email_log_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 创建用户表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        username varchar(50) NOT NULL UNIQUE,
        email varchar(100) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role user_role DEFAULT 'operator' NOT NULL,
        is_active boolean DEFAULT true NOT NULL,
        last_login_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      );
    `);

    // 创建接收邮箱表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS receive_emails (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        university_name varchar(200) NOT NULL,
        college_name varchar(200),
        contact_person varchar(100),
        province varchar(50),
        email varchar(100) NOT NULL,
        phone varchar(20),
        responsibility text,
        is_blacklisted boolean DEFAULT false NOT NULL,
        created_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      );
    `);

    // 创建发送邮箱表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS send_emails (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name varchar(200) NOT NULL,
        referral_code varchar(100),
        referral_link text,
        email_account varchar(100) NOT NULL UNIQUE,
        password_encrypted text NOT NULL,
        smtp_server varchar(200) NOT NULL,
        port integer DEFAULT 587 NOT NULL,
        ssl_tls boolean DEFAULT true NOT NULL,
        sender_name varchar(100),
        description text,
        is_enabled boolean DEFAULT true NOT NULL,
        created_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      );
    `);

    // 创建发送任务表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS send_tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_name varchar(200) NOT NULL,
        status task_status DEFAULT 'initialized' NOT NULL,
        start_time timestamp,
        end_time timestamp,
        duration_days integer,
        emails_per_hour integer DEFAULT 50 NOT NULL,
        emails_per_teacher_per_day integer DEFAULT 2 NOT NULL,
        created_by uuid REFERENCES users(id),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL,
        deleted_at timestamp
      );
    `);

    // 创建任务发送邮箱关联表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS task_send_emails (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES send_tasks(id) ON DELETE CASCADE,
        send_email_id uuid NOT NULL REFERENCES send_emails(id) ON DELETE CASCADE,
        created_at timestamp DEFAULT now() NOT NULL,
        UNIQUE(task_id, send_email_id)
      );
    `);

    // 创建邮件发送日志表
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        task_id uuid NOT NULL REFERENCES send_tasks(id),
        send_email_id uuid NOT NULL REFERENCES send_emails(id),
        receive_email_id uuid NOT NULL REFERENCES receive_emails(id),
        status email_log_status DEFAULT 'pending' NOT NULL,
        sent_at timestamp,
        error_message text,
        retry_count integer DEFAULT 0 NOT NULL,
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);

    console.log('✅ 数据库表结构创建完成');
    
  } catch (error) {
    console.error('❌ 创建表结构失败:', error);
    throw error;
  }
}

async function seed() {
  console.log('🌱 开始数据库种子数据初始化...');

  try {
    // 首先创建表结构
    await createTablesIfNotExists();

    const db = getDatabase();

    // 检查是否已经有用户数据
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log('✅ 数据库已经有数据，跳过种子数据初始化');
      return;
    }

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