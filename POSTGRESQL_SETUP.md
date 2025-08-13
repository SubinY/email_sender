# PostgreSQL 本地安装指南

## Windows 安装步骤

### 1. 下载 PostgreSQL
访问 [PostgreSQL 官网](https://www.postgresql.org/download/windows/)，下载最新版本的 PostgreSQL 安装程序。

### 2. 安装 PostgreSQL
1. 运行下载的安装程序
2. 选择安装目录（建议使用默认）
3. 选择组件（保持默认选项）
4. 设置数据目录（建议使用默认）
5. **设置超级用户密码**（请记住这个密码，默认用户名是 `postgres`）
6. 设置端口号（默认 5432）
7. 选择语言环境（默认）
8. 完成安装

### 3. 验证安装
打开命令提示符或 PowerShell，输入：
```bash
psql --version
```

### 4. 连接数据库
```bash
psql -U postgres -h localhost
```
输入您在安装时设置的密码。

### 5. 创建项目数据库
连接成功后，创建项目数据库：
```sql
CREATE DATABASE email_system;
\q
```

### 6. 更新环境变量
更新您的 `.env.local` 文件：
```env
DATABASE_URL="postgresql://postgres:您的密码@localhost:5432/email_system"
```

### 7. 测试连接
在项目目录中运行：
```bash
pnpm run db:push
```

如果看到类似以下信息说明连接成功：
```
✅ Your database is now in sync with your schema
```

## 常见问题

### 连接被拒绝 (ECONNREFUSED)
- 确保 PostgreSQL 服务正在运行
- 检查端口 5432 是否被占用
- 确认用户名和密码正确

### 启动 PostgreSQL 服务
**Windows:**
```bash
# 启动服务
net start postgresql-x64-15

# 停止服务  
net stop postgresql-x64-15
```

### pgAdmin 管理工具
PostgreSQL 安装时会包含 pgAdmin 图形界面管理工具，您可以通过它来管理数据库。

## 安装完成后

1. 确保 PostgreSQL 服务正在运行
2. 更新 `.env.local` 文件中的数据库连接字符串
3. 运行 `pnpm run db:push` 创建表结构
4. 运行 `pnpm run db:seed` 填充测试数据

完成这些步骤后，您就可以正常使用完整的后端功能了！ 