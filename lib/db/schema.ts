import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

// 枚举类型定义
export const userRoleEnum = pgEnum('user_role', ['admin', 'manager', 'operator']);
export const taskStatusEnum = pgEnum('task_status', ['initialized', 'running', 'paused', 'completed', 'failed']);
export const emailLogStatusEnum = pgEnum('email_log_status', ['pending', 'sent', 'failed', 'bounced']);

// 用户表
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').default('operator').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

// 接收邮箱表
export const receiveEmails = pgTable('receive_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  universityName: varchar('university_name', { length: 200 }).notNull(),
  collegeName: varchar('college_name', { length: 200 }),
  contactPerson: varchar('contact_person', { length: 100 }),
  province: varchar('province', { length: 50 }),
  email: varchar('email', { length: 100 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  responsibility: text('responsibility'),
  isBlacklisted: boolean('is_blacklisted').default(false).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

// 发送邮箱表
export const sendEmails = pgTable('send_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 200 }).notNull(),
  referralCode: varchar('referral_code', { length: 50 }).notNull(),
  referralLink: text('referral_link').notNull(),
  emailAccount: varchar('email_account', { length: 100 }).notNull(),
  passwordEncrypted: text('password_encrypted').notNull(),
  smtpServer: varchar('smtp_server', { length: 100 }).notNull(),
  port: integer('port').default(465).notNull(),
  sslTls: boolean('ssl_tls').default(true).notNull(),
  senderName: varchar('sender_name', { length: 100 }).notNull(),
  description: text('description'),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

// 发送任务表
export const sendTasks = pgTable('send_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskName: varchar('task_name', { length: 200 }).notNull(),
  status: taskStatusEnum('status').default('initialized').notNull(),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  durationDays: integer('duration_days'),
  emailsPerHour: integer('emails_per_hour').notNull(),
  emailsPerTeacherPerDay: integer('emails_per_teacher_per_day').notNull(),
  maxEmailsPerDay: integer('max_emails_per_day').default(500).notNull(),
  maxBatchSize: integer('max_batch_size').default(20).notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at')
});

// 任务发送邮箱关联表
export const taskSendEmails = pgTable('task_send_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => sendTasks.id, { onDelete: 'cascade' }).notNull(),
  sendEmailId: uuid('send_email_id').references(() => sendEmails.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 邮件发送日志表
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').references(() => sendTasks.id),
  sendEmailId: uuid('send_email_id').references(() => sendEmails.id),
  receiveEmailId: uuid('receive_email_id').references(() => receiveEmails.id),
  subject: varchar('subject', { length: 500 }),
  status: emailLogStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 用户会话表（用于Token管理）
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 关系定义
export const usersRelations = relations(users, ({ many }) => ({
  receiveEmails: many(receiveEmails),
  sendEmails: many(sendEmails),
  sendTasks: many(sendTasks),
  sessions: many(userSessions)
}));

export const receiveEmailsRelations = relations(receiveEmails, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [receiveEmails.createdBy],
    references: [users.id]
  }),
  emailLogs: many(emailLogs)
}));

export const sendEmailsRelations = relations(sendEmails, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [sendEmails.createdBy],
    references: [users.id]
  }),
  taskSendEmails: many(taskSendEmails),
  emailLogs: many(emailLogs)
}));

export const sendTasksRelations = relations(sendTasks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [sendTasks.createdBy],
    references: [users.id]
  }),
  taskSendEmails: many(taskSendEmails),
  emailLogs: many(emailLogs)
}));

export const taskSendEmailsRelations = relations(taskSendEmails, ({ one }) => ({
  task: one(sendTasks, {
    fields: [taskSendEmails.taskId],
    references: [sendTasks.id]
  }),
  sendEmail: one(sendEmails, {
    fields: [taskSendEmails.sendEmailId],
    references: [sendEmails.id]
  })
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  task: one(sendTasks, {
    fields: [emailLogs.taskId],
    references: [sendTasks.id]
  }),
  sendEmail: one(sendEmails, {
    fields: [emailLogs.sendEmailId],
    references: [sendEmails.id]
  }),
  receiveEmail: one(receiveEmails, {
    fields: [emailLogs.receiveEmailId],
    references: [receiveEmails.id]
  })
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id]
  })
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertReceiveEmailSchema = createInsertSchema(receiveEmails);
export const selectReceiveEmailSchema = createSelectSchema(receiveEmails);

export const insertSendEmailSchema = createInsertSchema(sendEmails);
export const selectSendEmailSchema = createSelectSchema(sendEmails);

export const insertSendTaskSchema = createInsertSchema(sendTasks);
export const selectSendTaskSchema = createSelectSchema(sendTasks);

// 类型导出
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ReceiveEmail = typeof receiveEmails.$inferSelect;
export type NewReceiveEmail = typeof receiveEmails.$inferInsert;

export type SendEmail = typeof sendEmails.$inferSelect;
export type NewSendEmail = typeof sendEmails.$inferInsert;

export type SendTask = typeof sendTasks.$inferSelect;
export type NewSendTask = typeof sendTasks.$inferInsert;

export type TaskSendEmail = typeof taskSendEmails.$inferSelect;
export type NewTaskSendEmail = typeof taskSendEmails.$inferInsert;

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert; 