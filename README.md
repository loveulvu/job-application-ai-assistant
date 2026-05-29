# job-application-ai-assistant

AI 半自动求职助手 MVP v1。

用户自己登录招聘平台并打开岗位详情页，Tampermonkey 脚本读取当前页面可见岗位信息，发送到本地 Go 后端。后端结合 SQLite 中的个人 profile 调用 OpenAI-compatible API，输出结构化岗位匹配分析，保存投递记录，并基于固定关键词词典统计 JD 中常见技术要求。第一版不自动登录、不自动批量爬取、不自动投递。

## 技术栈

- Backend: Go `net/http`
- Database: SQLite
- Frontend: Next.js
- Browser script: Tampermonkey
- AI: OpenAI-compatible API

## 功能范围

已完成：

- `GET /api/health`
- `GET /api/resume-profile`
- `PUT /api/resume-profile`
- `POST /api/analyze-job`
- `GET /api/applications`
- `GET /api/applications/{id}`
- `PATCH /api/applications/{id}/status`
- `GET /api/keyword-stats`
- `GET /api/applications/{id}/keywords`
- `/profile` profile 管理页
- `/applications` 投递记录管理页
- `/keywords` 岗位关键词统计页
- BOSS 直聘页面 Tampermonkey 分析浮层

明确不做：

- 自动登录招聘平台
- 自动批量爬取岗位
- 自动投递
- 自动填写聊天框
- 自动点击立即沟通、投递或发送按钮
- Selenium

## Step 6：岗位关键词统计

关键词统计用于查看已分析 JD 中高频出现的技术要求，辅助判断当前实习岗位市场更常要求哪些技能，从而调整学习优先级和投递方向。

第一版不使用 LLM 提取关键词，而是使用固定关键词词典 + 文本匹配 + 归一化，保证统计结果稳定、可解释。

词典分类包括：

- `language`
- `backend`
- `database`
- `cache`
- `middleware`
- `devops`
- `network`
- `fundamentals`
- `concurrency`
- `system`
- `ai`

## 环境变量

后端读取这些环境变量：

```text
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
PORT=8083
```

说明：

- `AI_API_KEY` 必填，只能放在后端环境变量中。
- `AI_BASE_URL` 为空时默认 `https://api.openai.com/v1`。
- `AI_MODEL` 为空时默认 `gpt-4.1-mini`。
- `PORT` 为空时默认 `8083`。
- 根目录 `.env.example` 只提供占位示例，不要提交真实 `.env`。

## 启动后端

```powershell
cd backend
go mod tidy

$env:AI_API_KEY = "your_api_key_here"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"

go run .
```

默认地址：

```text
http://localhost:8083
```

SQLite 默认数据库文件：

```text
backend/data/app.db
```

## 启动前端

```powershell
cd frontend
npm install
npm run dev
```

默认地址：

```text
http://localhost:3000
```

前端通过 Next.js rewrite 把 `/api/*` 转发到：

```text
http://localhost:8083/api/*
```

## 安装 Tampermonkey 脚本

脚本文件：

```text
scripts/boss-job-analyzer.user.js
```

安装步骤：

1. 浏览器安装 Tampermonkey 扩展。
2. 打开 Tampermonkey 管理面板。
3. 新建脚本。
4. 删除默认内容。
5. 复制 `scripts/boss-job-analyzer.user.js` 的完整内容并粘贴保存。

更新脚本时，重新复制该文件内容覆盖 Tampermonkey 中的旧脚本即可。

脚本只访问本地后端：

```text
http://localhost:8083/api/analyze-job
```

脚本中不包含 `AI_API_KEY`。

## 验证流程

### 1. 更新 profile

打开：

```text
http://localhost:3000/profile
```

填写姓名、目标岗位、技能、项目和简介，点击保存。技能和项目是一行一个条目。

### 2. 在 BOSS 页面分析岗位

1. 保持本地 Go 后端运行。
2. 用户自己登录 BOSS 直聘。
3. 打开一个岗位详情页。
4. 页面右侧出现「AI 岗位分析」浮层。
5. 点击「分析当前岗位」。
6. 等待状态变为「分析完成」。

浮层会展示公司、岗位、匹配分、风险等级、匹配点、缺失点、简历优化建议、技术关键词和沟通语。

### 3. 查看投递记录

打开：

```text
http://localhost:3000/applications
```

页面会展示历史分析记录列表。点击某条记录后，可以查看匹配点、缺失点、简历优化建议、技术关键词、沟通语和 JD 文本。

接口验证：

```powershell
Invoke-RestMethod -Uri "http://localhost:8083/api/applications?limit=20&offset=0"
Invoke-RestMethod -Uri "http://localhost:8083/api/applications/1"
Invoke-RestMethod -Uri "http://localhost:8083/api/applications/1/keywords"
```

### 4. 修改投递状态

在 `/applications` 页面详情区域选择状态即可。

状态只允许：

- 待投递
- 已投递
- 已沟通
- 面试
- 拒绝

PowerShell 验证：

```powershell
$body = @{ status = "已投递" } | ConvertTo-Json
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod `
  -Uri "http://localhost:8083/api/applications/1/status" `
  -Method PATCH `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes
```

### 5. 查看关键词统计

打开：

```text
http://localhost:3000/keywords
```

页面会展示关键词、分类和出现次数，并支持按分类筛选。

接口验证：

```powershell
Invoke-RestMethod -Uri "http://localhost:8083/api/keyword-stats"
Invoke-RestMethod -Uri "http://localhost:8083/api/keyword-stats?category=cache&limit=20"
```

## API 说明

### POST /api/analyze-job

请求：

```json
{
  "company": "某公司",
  "position": "Go 后端开发实习",
  "jd_text": "岗位 JD 文本"
}
```

返回中包含 `keywords`：

```json
{
  "id": 1,
  "company": "某公司",
  "position": "Go 后端开发实习",
  "match_score": 85,
  "risk_level": "low",
  "matched_points": [],
  "missing_points": [],
  "resume_suggestions": [],
  "message_draft": "...",
  "status": "待投递",
  "keywords": [
    { "keyword": "Go", "category": "language" },
    { "keyword": "Redis", "category": "cache" }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### GET /api/keyword-stats

支持查询参数：

- `limit`：默认 50，最大 100
- `category`：可选，按分类过滤

返回：

```json
{
  "items": [
    {
      "keyword": "Redis",
      "category": "cache",
      "count": 12
    }
  ],
  "count": 1
}
```

## 安全边界

- API Key 只放在 Go 后端环境变量。
- 不提交真实 `.env`。
- Tampermonkey 脚本不包含 API Key。
- 用户自己登录招聘平台。
- 脚本只读取当前页面可见文本。
- 不自动登录。
- 不自动投递。
- 不自动填写聊天框。
- 不自动点击立即沟通、投递或发送按钮。
- 不批量爬取。

## 简历描述草稿

一句话项目描述：

基于 Go + Next.js + SQLite + Tampermonkey + OpenAI-compatible API 实现 AI 半自动求职助手，支持从 BOSS 岗位页面提取 JD，结合个人 profile 调用大模型进行结构化匹配分析，并管理投递记录、状态和岗位技术关键词统计。

技术栈：

Go `net/http`、SQLite、Next.js、Tampermonkey、OpenAI-compatible API。

核心亮点：

- 设计 Go 后端 API，完成 profile 管理、岗位分析、投递记录查询、状态流转和关键词统计。
- 使用 SQLite 持久化个人 profile、AI 分析结果、沟通语、投递状态和岗位关键词。
- 接入 OpenAI-compatible API，约束模型输出合法 JSON，解析匹配分、风险等级、技能缺口、简历优化建议和沟通语。
- 编写 Tampermonkey 脚本读取当前 BOSS 岗位页可见文本，通过本地后端完成分析并在页面浮层展示结果。
- 使用固定关键词词典对 JD 做稳定匹配与归一化，不依赖 LLM 提取关键词，便于统计实习岗位技能需求。
- 明确安全边界：不保存 API Key、不自动登录、不自动投递、不批量爬取。
