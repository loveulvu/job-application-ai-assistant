# job-application-ai-assistant

半自动简历投递辅助器 MVP v1.0。

当前方向：用户自己登录招聘平台并打开岗位详情页，由 Tampermonkey 脚本读取当前页面可见岗位信息，发送到本地 Go 后端分析。第一版只做 AI 分析、结果展示、投递记录和沟通语复制，不做自动登录、自动批量爬取、自动投递、Selenium 或浏览器插件。

## 技术栈

- Frontend: Next.js
- Backend: Go `net/http`
- Database: SQLite
- AI: OpenAI-compatible API
- Browser script: Tampermonkey userscript

## 五步计划

1. 项目骨架和 `/api/health`，已完成。
2. SQLite + resume profile `GET / PUT`，已完成。
3. `/api/analyze-job` + LLM 调用 + `job_applications` 落库，已完成。
4. Tampermonkey 脚本读取当前岗位页文本，并调用本地 Go 后端分析。
5. 投递记录管理、状态修改、README、简历描述。

## 环境变量

后端读取这些环境变量：

```text
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
PORT=8083
```

说明：

- `AI_API_KEY` 必填，不能写进代码、前端文件、Tampermonkey 脚本或数据库。
- `AI_BASE_URL` 为空时默认 `https://api.openai.com/v1`。
- `AI_MODEL` 为空时默认 `gpt-4.1-mini`。
- `PORT` 为空时默认 `8083`。

也可以参考根目录的 `.env.example`，但当前 Go 后端不会自动加载 `.env` 文件，需要在终端里设置环境变量。

## 本地运行

前端：

```bash
cd frontend
npm install
npm run dev
```

默认地址：http://localhost:3000

后端：

```powershell
cd backend
go mod tidy

$env:AI_API_KEY = "your_api_key_here"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"

go run .
```

默认地址：http://localhost:8083

SQLite 默认数据库文件：`backend/data/app.db`。

## UTF-8 说明

后端响应头已设置为：

```text
Content-Type: application/json; charset=utf-8
```

后端使用 Go 标准库 `json.NewDecoder` 读取请求体，不做额外转码；SQLite 的 `TEXT` 字段也直接保存 Go 字符串和 JSON 字符串，不做额外编码转换。

如果在 Windows PowerShell 中用 `curl -d` 直接拼中文 JSON，中文可能在发送前被 PowerShell 编码成 `???`。推荐使用 `ConvertTo-Json` + UTF-8 bytes 写法。

## 验证 Step 2

健康检查：

```powershell
curl.exe http://localhost:8083/api/health
```

用 Windows PowerShell 发送中文 profile：

```powershell
$body = @{
  name = "王某某"
  target_position = "Go 后端开发实习"
  skills = @("Go", "REST API", "SQLite", "Redis", "Docker")
  projects = @(
    "fund-tracking：Go 后端重构，REST API，JWT，Redis 缓存",
    "nail-salon-system：Go + SQLite 门店前台管理系统"
  )
  summary = "本科计算机专业在读，主要方向为 Go 后端开发。"
} | ConvertTo-Json -Depth 5

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod `
  -Uri "http://localhost:8083/api/resume-profile" `
  -Method PUT `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes
```

再次读取，确认中文没有变成 `???`：

```powershell
Invoke-RestMethod -Uri "http://localhost:8083/api/resume-profile"
```

## 验证 Step 3

先确认已经设置 `AI_API_KEY`，并且 profile 不是空的。

```powershell
$env:AI_API_KEY = "your_api_key_here"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"
go run .
```

另开一个 PowerShell 终端：

```powershell
$body = @{
  company = "某公司"
  position = "Go 后端开发实习"
  jd_text = "岗位职责：负责后端接口开发，熟悉 Go、SQLite、Redis，有 REST API 项目经验优先。"
} | ConvertTo-Json -Depth 5

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod `
  -Uri "http://localhost:8083/api/analyze-job" `
  -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body $bytes
```

确认 `job_applications` 已保存记录：

```powershell
sqlite3 .\data\app.db "select id, company, position, match_score, risk_level, status, created_at from job_applications order by id desc limit 5;"
```

## 使用 Step 4 Tampermonkey 脚本

脚本文件：

```text
scripts/boss-job-analyzer.user.js
```

安装方式：

1. 在浏览器安装 Tampermonkey 扩展。
2. 打开 Tampermonkey 管理面板。
3. 新建脚本。
4. 删除默认内容。
5. 复制 `scripts/boss-job-analyzer.user.js` 的完整内容粘贴进去并保存。

使用前先启动本地 Go 后端：

```powershell
cd backend
$env:AI_API_KEY = "your_api_key_here"
$env:AI_BASE_URL = "https://api.openai.com/v1"
$env:AI_MODEL = "gpt-4.1-mini"
go run .
```

然后：

1. 用户自己登录 BOSS 直聘。
2. 打开一个岗位详情页。
3. 页面右侧会出现「AI 岗位分析」浮层。
4. 点击「分析当前岗位」。
5. 脚本只读取当前页面可见文本，调用 `http://localhost:8083/api/analyze-job`。
6. 分析完成后，浮层会展示 `company`、`position`、`match_score`、`risk_level`、`matched_points`、`missing_points`、`resume_suggestions`、`message_draft`。
7. 点击「复制沟通语」会把 `message_draft` 复制到剪贴板。

限制：

- 不自动登录。
- 不自动批量爬取。
- 不自动打开新岗位。
- 不自动填写输入框。
- 不自动点击投递或发送按钮。
- 不包含 `AI_API_KEY`，密钥只放在本地 Go 后端环境变量里。
