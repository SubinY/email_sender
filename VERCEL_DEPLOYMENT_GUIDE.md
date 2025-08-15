# 🚀 Vercel 简化部署指南

## 📋 部署前准备

### 1. 准备 GitHub 仓库
确保您的代码已推送到 GitHub：
```bash
git add .
git commit -m "准备 Vercel 部署"
git push origin main
```

### 2. 获取必需的配置信息

#### 🗄️ 数据库配置 (DATABASE_URL)
**方式一：Vercel 原生集成 (推荐)**
1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入 **Integrations** 标签页
3. 点击 **Browse Marketplace**
4. 搜索并选择 **Neon**
5. 点击 **Install** 安装集成
6. 选择免费计划并创建数据库
7. 复制生成的连接字符串

**方式二：直接注册 Neon**
1. 访问 [Neon Console](https://console.neon.tech/)
2. 使用 GitHub 账户注册/登录
3. 点击 **Create a project**
4. 选择区域 (推荐: **Asia Pacific (Singapore)**，距离中国最近)
5. 设置项目名称: `email-system`
6. 创建完成后，在 **Dashboard** 找到连接字符串

连接字符串格式：
```
postgresql://username:password@hostname:5432/database?sslmode=require
```

#### 🔐 JWT 密钥 (JWT_SECRET)
生成一个强密码，推荐方式：

**在线生成工具:**
- 访问: https://generate-secret.now.sh/32
- 或者: https://randomkeygen.com/

**命令行生成:**
```bash
# macOS/Linux
openssl rand -base64 32

# 或者使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### 🛡️ 初始化密钥 (SETUP_SECRET)
设置一个用于保护数据库初始化的密码，例如：
```
email_system_setup_2024_secure
```

## 🚀 部署步骤

### 步骤 1: 在 Vercel 导入项目
1. 访问 [Vercel](https://vercel.com)
2. 点击 **New Project**
3. 选择您的 GitHub 仓库
4. 框架会自动识别为 **Next.js**
5. **不要立即部署**，先配置环境变量

### 步骤 2: 配置环境变量
在项目设置页面的 **Environment Variables** 部分添加：

| 变量名 | 值 | 用途 |
|--------|----|----|
| `DATABASE_URL` | `postgresql://...` | Neon 数据库连接 |
| `JWT_SECRET` | `生成的32位密钥` | JWT 认证密钥 |
| `SETUP_SECRET` | `自定义的强密码` | 数据库初始化保护 |

**重要:** 确保所有环境变量都设置正确！

### 步骤 3: 部署项目
1. 点击 **Deploy** 开始部署
2. 等待构建完成 (大约2-3分钟)
3. 记录部署后的URL，例如: `https://your-app.vercel.app`

### 步骤 4: 初始化数据库
部署完成后，需要初始化数据库：

**方法一: 使用浏览器访问**
1. 访问: `https://your-app.vercel.app/api/setup`
2. 会看到初始化指引

**方法二: 使用 curl 命令**
```bash
curl -X POST https://your-app.vercel.app/api/setup \
  -H "Content-Type: application/json" \
  -d '{"authorization": "your-setup-secret"}'
```

**方法三: 使用 Postman 或其他API工具**
- URL: `https://your-app.vercel.app/api/setup`
- 方法: `POST`
- Body: `{"authorization": "your-setup-secret"}`

### 步骤 5: 验证部署
初始化成功后：
1. 访问: `https://your-app.vercel.app`
2. 使用默认账户登录:
   - **管理员**: `admin` / `Admin123!`
   - **操作员**: `operator` / `Operator123!`

## ✅ 功能检查清单

部署完成后，请验证以下功能：

- [ ] 🏠 可以正常访问首页
- [ ] 🔐 可以使用默认账户登录
- [ ] 📧 接收邮箱管理功能正常
- [ ] 📤 发送邮箱管理功能正常  
- [ ] ⚙️ 发送任务管理功能正常
- [ ] 🚪 可以正常登出

## 🔧 常见问题排查

### 部署失败
- **检查**: GitHub 仓库是否包含所有必要文件
- **检查**: `package.json` 是否完整
- **查看**: Vercel 构建日志 (Functions 标签页)

### 数据库连接失败
- **检查**: `DATABASE_URL` 格式是否正确
- **检查**: Neon 数据库是否处于活跃状态
- **测试**: 在 Neon Console 中测试连接

### 初始化API返回401错误
- **检查**: `SETUP_SECRET` 环境变量是否设置
- **检查**: POST 请求中的 authorization 值是否匹配

### 页面显示异常
- **检查**: 浏览器控制台是否有 JavaScript 错误
- **检查**: Vercel 函数日志是否有错误信息

## 🎉 部署完成！

恭喜！您的批量邮件管理系统已成功部署到 Vercel！

**系统特性:**
- ✅ 现代化 UI 界面
- ✅ 完整的用户认证
- ✅ 邮箱管理功能
- ✅ 任务管理系统
- ✅ 企业级安全性

**技术亮点:**
- 🚀 Serverless 架构
- 📊 PostgreSQL 数据库
- 🔒 JWT 认证系统
- 🎨 响应式设计

---

如遇问题，请检查 Vercel 函数日志或 Neon 数据库连接状态。 