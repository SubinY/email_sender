import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { createReceiveEmailSchema } from '@/lib/validations/receive-email';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { receiveEmails } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

// 定义Excel数据格式
interface ExcelRowData {
  学校: string;
  学院: string;
  联系人: string;
  邮箱: string;
  电话: string;
  备注: string;
}

// POST - 批量导入接收邮箱
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:create')) {
      return forbiddenResponse();
    }

    // 获取上传的文件
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return validationErrorResponse({
        file: ['请选择要上传的文件']
      });
    }

    // 验证文件类型
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/)) {
      return validationErrorResponse({
        file: ['只支持Excel文件(.xlsx, .xls)']
      });
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    
    // 获取第一个工作表
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return errorResponse('INVALID_FILE', '文件格式错误，没有找到有效的工作表', null, 400);
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // 将工作表转换为JSON数据
    const jsonData = XLSX.utils.sheet_to_json<ExcelRowData>(worksheet, {
      header: 1 // 使用第一行作为表头
    });

    if (jsonData.length < 2) {
      return errorResponse('INVALID_FILE', '文件内容为空或只有表头', null, 400);
    }

    // 获取表头行和数据行
    const headers = (jsonData[0] as unknown) as any[];
    const dataRows = (jsonData.slice(1) as unknown) as any[][];

    // 验证表头格式
    const expectedHeaders = ['学校', '学院', '联系人', '邮箱', '电话', '备注'];
    const headerMap: Record<string, number> = {};
    const requiredHeaders = ['学校', '邮箱'];

    for (const header of expectedHeaders) {
      const index = headers.findIndex(h => String(h).trim() === header);
      if (index === -1 && requiredHeaders.includes(header)) {
        return errorResponse('INVALID_FORMAT', `缺少必需的列: ${header}`, null, 400);
      }
      headerMap[header] = index;
    }

    // 解析数据行
    const importData: any[] = [];
    const errors: Record<number, string[]> = {};

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = i + 2; // Excel行号从2开始（第1行是表头）

      // 跳过空行
      if (!row || row.every(cell => !cell)) {
        continue;
      }

      const rowData = {
        universityName: row[headerMap['学校']]?.toString().trim() || '',
        collegeName: row[headerMap['学院']]?.toString().trim() || '',
        contactPerson: row[headerMap['联系人']]?.toString().trim() || '',
        email: row[headerMap['邮箱']]?.toString().trim() || '',
        phone: row[headerMap['电话']]?.toString().trim() || '',
        responsibility: row[headerMap['备注']]?.toString().trim() || '',
        isBlacklisted: false
      };

      // 验证必填字段
      const rowErrors: string[] = [];
      if (!rowData.universityName) {
        rowErrors.push('学校名称不能为空');
      }
      if (!rowData.email) {
        rowErrors.push('邮箱地址不能为空');
      }

      // 验证邮箱格式
      if (rowData.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rowData.email)) {
          rowErrors.push('邮箱格式不正确');
        }
      }

      if (rowErrors.length > 0) {
        errors[rowNum] = rowErrors;
        continue;
      }

      // 使用现有的验证schema
      const validation = createReceiveEmailSchema.safeParse(rowData);
      if (!validation.success) {
        const validationErrors = validation.error.errors.map(err => err.message);
        errors[rowNum] = validationErrors;
        continue;
      }

      importData.push(rowData);
    }

    // 如果有验证错误，返回错误信息
    if (Object.keys(errors).length > 0) {
      return errorResponse('VALIDATION_ERROR', '数据验证失败', {
        errors,
        message: '部分行数据存在错误，请检查后重新上传'
      }, 400);
    }

    if (importData.length === 0) {
      return errorResponse('NO_VALID_DATA', '没有找到有效的数据行', null, 400);
    }

    // 检查重复邮箱（数据库中已存在的）
    const emailsToCheck = importData.map(item => item.email);
    const existingEmails = await db
      .select({ email: receiveEmails.email })
      .from(receiveEmails)
      .where(inArray(receiveEmails.email, emailsToCheck));

    const duplicateEmails = existingEmails.map((item: { email: string }) => item.email);

    if (duplicateEmails.length > 0) {
      return errorResponse('DUPLICATE_EMAILS', '存在重复的邮箱地址', {
        duplicateEmails,
        message: `以下邮箱已存在: ${duplicateEmails.join(', ')}`
      }, 409);
    }

    // 批量插入数据
    const insertedRecords = await db
      .insert(receiveEmails)
      .values(importData)
      .returning();

    logger.info('Bulk import completed', {
      userId: user.userId,
      importCount: insertedRecords.length,
      fileName: file.name
    });

    return successResponse({
      message: '批量导入成功',
      importCount: insertedRecords.length,
      data: insertedRecords
    });

  } catch (error) {
    logger.error('Bulk import error', error);
    return errorResponse('INTERNAL_ERROR', '批量导入失败', error, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 