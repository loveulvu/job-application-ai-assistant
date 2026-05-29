# job-application-ai-assistant

一个面向实习投递场景的 AI 半自动求职助手，用于帮助用户分析岗位 JD 与个人简历 profile 的匹配程度，识别技能缺口，生成投递沟通建议，并管理投递记录。

项目基于 Go + Next.js + SQLite + Tampermonkey + OpenAI-compatible API 实现。用户仍然自己登录招聘平台、自己浏览岗位、自己决定是否投递；工具只负责“读取当前岗位页可见文本 + 本地分析 + 记录管理”，不做自动投递。

## 项目简介

在 BOSS 直聘岗位详情页中，Tampermonkey 脚本读取当前页面可见的岗位信息和 JD 文本，发送到本地 Go 后端。后端读取 SQLite 中维护的个人 profile，调用 OpenAI-compatible API 进行结构化匹配分析，并将分析结果保存为投递记录。

系统会输出：

- 岗位匹配分
- 风险等级
- 匹配点
- 技能缺口
- 简历优化建议
- 投递沟通语
- JD 技术关键词统计
- 投递状态记录

## 项目背景

实习投递时，岗位 JD 数量多、信息密度高，手动判断岗位是否适合自己很耗时。这个项目的目标不是替用户“自动投递”，而是帮助用户更快回答几个问题：

- 这个岗位和我的当前技能栈匹配吗？
- JD 中反复出现哪些技术关键词？
- 我的简历应该突出哪些项目经历？
- 投递前的沟通语可以怎么写？
- 投递后的状态如何记录和跟踪？

## 安全边界

这个项目不是爬虫，也不是自动投递工具。

明确不做：

- 不自动登录招聘平台
- 不批量爬取岗位
- 不自动投递
- 不自动填写聊天框
- 不点击“立即沟通”“投递”“发送”等按钮
- 不使用 Selenium
- 不绕过平台权限或风控

API Key 只允许放在 Go 后端环境变量中：

- 不写入前端代码
- 不写入 Tampermonkey 脚本
- 不写入数据库
- 不提交真实 `.env`

## 核心功能

### 个人 profile 管理

通过 Next.js `/profile` 页面维护个人信息：

- 姓名
- 目标岗位
- 技能列表
- 项目经历
- 个人简介

这些信息会保存到 SQLite，并作为岗位分析时的候选人上下文。

### 岗位匹配分析

Tampermonkey 脚本在 BOSS 直聘岗位详情页提供右侧浮层。点击“分析当前岗位”后：

1. 读取当前页面可见岗位信息；
2. 提取公司、岗位、JD 文本；
3. 调用本地 Go 后端 `/api/analyze-job`；
4. 后端结合个人 profile 调用 LLM；
5. 返回结构化 JSON；
6. 在当前页面展示分析结果。

### 投递记录管理

通过 `/applications` 页面查看历史岗位分析记录：

- 公司
- 岗位
- 匹配分
- 风险等级
- 投递状态
- 匹配点
- 缺失点
- 简历优化建议
- 沟通语
- 原始 JD 文本

支持修改投递状态：

- 待投递
- 已投递
- 已沟通
- 面试
- 拒绝

### 岗位技术关键词统计

通过 `/keywords` 页面查看已分析 JD 中出现的高频技术关键词。

关键词统计不使用 LLM，而是使用固定词典 + 文本匹配 + 归一化，保证结果稳定、可解释。它用于辅助判断当前实习岗位市场中更常见的技能要求，例如 Go、Redis、MySQL、Docker、Kubernetes、微服务、分布式等。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 后端 | Go `net/http` |
| 数据库 | SQLite |
| 前端 | Next.js |
| 页面脚本 | Tampermonkey |
| AI 能力 | OpenAI-compatible API |
| 数据格式 | JSON |

## 架构说明

```text
BOSS 岗位详情页
  ↓
Tampermonkey 脚本读取当前页面可见文本
  ↓
POST http://localhost:8083/api/analyze-job
  ↓
Go net/http 后端
  ↓
读取 SQLite 中的 resume profile
  ↓
组装 prompt 并调用 OpenAI-compatible API
  ↓
解析结构化 JSON
  ↓
保存 job_applications 和 job_keywords
  ↓
返回分析结果给脚本和前端页面
```

前端 Next.js 主要用于管理页面：

- `/profile`：个人 profile 管理
- `/applications`：投递记录管理
- `/keywords`：岗位关键词统计

前端通过 Next.js rewrite 将 `/api/*` 转发到本地 Go 后端：

```text
http://localhost:8083/api/*
```

## 本地启动

### 1. 启动后端

PowerShell 示例：

```powershell
cd backend
go mod tidy

$env:AI_API_KEY = "your_api_key_here"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"

go run .
```

默认后端地址：

```text
http://localhost:8083
```

SQLite 默认数据库文件：

```text
backend/data/app.db
```

### 2. 启动前端

PowerShell 示例：

```powershell
cd frontend
npm install
npm run dev
```

默认前端地址：

```text
http://localhost:3000
```

### 3. 初始化个人 profile

打开：

```text
http://localhost:3000/profile
```

填写个人技能、项目和求职方向后保存。

## Tampermonkey 脚本使用方式

脚本文件：

```text
scripts/boss-job-analyzer.user.js
```

安装步骤：

1. 浏览器安装 Tampermonkey 扩展；
2. 打开 Tampermonkey 管理面板；
3. 新建脚本；
4. 删除默认内容；
5. 复制 `scripts/boss-job-analyzer.user.js` 的完整内容并保存；
6. 确认本地 Go 后端正在运行；
7. 用户自己登录 BOSS 直聘；
8. 打开岗位详情页；
9. 点击页面右侧浮层中的“分析当前岗位”。

脚本会把当前岗位页信息发送到：

```text
http://localhost:8083/api/analyze-job
```

脚本只读取当前页面可见文本，不会自动打开新岗位，不会自动填写输入框，不会点击投递或发送按钮。

## 环境变量

后端支持以下环境变量：

```text
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
PORT=8083
```

说明：

- `AI_API_KEY`：必填，只能放在后端环境变量中；
- `AI_BASE_URL`：可选，默认 `https://api.openai.com/v1`；
- `AI_MODEL`：可选，默认 `gpt-4.1-mini`；
- `PORT`：可选，默认 `8083`。

根目录提供 `.env.example` 作为占位示例，但当前 Go 后端不会自动加载 `.env`。真实 `.env` 不应提交到仓库。

## API 简要说明

### Health

```http
GET /api/health
```

### Resume Profile

```http
GET /api/resume-profile
PUT /api/resume-profile
```

### Analyze Job

```http
POST /api/analyze-job
```

请求示例：

```json
{
  "company": "某公司",
  "position": "Go 后端开发实习",
  "jd_text": "岗位 JD 文本"
}
```

返回中包含匹配分析结果和关键词：

```json
{
  "id": 1,
  "company": "某公司",
  "position": "Go 后端开发实习",
  "match_score": 85,
  "risk_level": "low",
  "matched_points": ["Go", "REST API"],
  "missing_points": ["Kafka"],
  "resume_suggestions": ["强化项目中的 Redis 缓存描述"],
  "message_draft": "您好，我想投递...",
  "status": "待投递",
  "keywords": [
    { "keyword": "Go", "category": "language" },
    { "keyword": "Redis", "category": "cache" }
  ],
  "created_at": "...",
  "updated_at": "..."
}
```

### Applications

```http
GET /api/applications?limit=20&offset=0
GET /api/applications/{id}
PATCH /api/applications/{id}/status
GET /api/applications/{id}/keywords
```

修改状态请求示例：

```json
{
  "status": "已投递"
}
```

### Keyword Stats

```http
GET /api/keyword-stats
GET /api/keyword-stats?category=cache&limit=20
```

返回示例：

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

## 项目亮点

- 使用 Go `net/http` 实现清晰的后端 API，覆盖 profile、岗位分析、投递记录、状态修改和关键词统计。
- 使用 SQLite 进行轻量持久化，适合本地个人工具场景。
- 将 AI 调用集中在后端，避免 API Key 暴露到前端或脚本。
- 要求 LLM 返回结构化 JSON，后端解析后再保存，降低自由文本不可控的问题。
- Tampermonkey 脚本只作为“当前页面入口”，不扩展为批量爬虫或自动化投递工具。
- 岗位关键词统计使用固定词典而非 LLM，结果更稳定、可解释。
- 前端提供 profile、投递记录和关键词统计三个管理页面，便于完整展示项目闭环。

## 简历可用描述

基于 Go + Next.js + SQLite + Tampermonkey + OpenAI-compatible API 实现 AI 半自动求职助手，支持从 BOSS 岗位详情页读取当前 JD，结合个人 profile 调用大模型进行结构化匹配分析，输出匹配分、风险等级、技能缺口、简历优化建议和投递沟通语，并支持投递记录管理、状态跟踪和岗位技术关键词统计。

可展开描述：

- 使用 Go `net/http` 设计 REST API，完成岗位分析、profile 管理、投递记录查询和状态更新；
- 使用 SQLite 持久化个人 profile、AI 分析结果、投递状态和关键词统计数据；
- 接入 OpenAI-compatible API，并通过 prompt 约束模型输出结构化 JSON；
- 编写 Tampermonkey 脚本读取当前岗位页可见文本，在页面浮层展示分析结果；
- 使用固定关键词词典对 JD 做稳定匹配与归一化，用于统计岗位技能需求；
- 明确安全边界，不自动登录、不自动投递、不批量爬取。

## 后续计划

- 继续优化岗位页面字段提取准确率；
- 增加更多可配置的关键词词典；
- 为关键词统计增加导出能力；
- 增加投递记录搜索和筛选；
- 增加更完善的错误提示和本地配置说明。
