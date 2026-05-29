# job-application-ai-assistant

半自动简历投递辅助器 MVP v1.0。

当前方向：用户自己登录招聘平台并打开岗位详情页，由 Tampermonkey / 浏览器脚本读取当前页面可见岗位信息，发送到本地 Go 后端分析。第一版只做 AI 分析、结果展示、投递记录和沟通语复制，不做自动登录、自动批量爬取、自动投递、Selenium 或浏览器插件。

## 技术栈

- Frontend: Next.js
- Backend: Go `net/http`
- Database: SQLite
- AI: OpenAI-compatible API

## 五步计划

1. 项目骨架和 `/api/health`，已基本完成。
2. SQLite + resume profile `GET / PUT`。
3. `/api/analyze-job` + LLM 调用 + `job_applications` 落库。
4. Tampermonkey 脚本读取当前岗位页文本，并调用本地 Go 后端分析。
5. 投递记录管理、状态修改、README、简历描述。

## 本地运行

前端：

```bash
cd frontend
npm install
npm run dev
```

默认地址：http://localhost:3000

后端：

```bash
cd backend
go mod tidy
go run .
```

默认地址：http://localhost:8083

也可以通过环境变量指定端口：

```powershell
$env:PORT = "8090"
go run .
```

SQLite 默认数据库文件：`backend/data/app.db`。

## UTF-8 说明

后端响应头已设置为：

```text
Content-Type: application/json; charset=utf-8
```

后端使用 Go 标准库 `json.NewDecoder` 读取请求体，不做额外转码；SQLite 的 `TEXT` 字段也直接保存 Go 字符串和 JSON 字符串，不做额外编码转换。

如果在 Windows PowerShell 中用 `curl -d` 直接拼中文 JSON，中文可能在发送前被 PowerShell 编码成 `???`。推荐使用下面的 `ConvertTo-Json` + UTF-8 bytes 写法。

## 验证 Step 2

健康检查：

```powershell
curl.exe http://localhost:8083/api/health
```

读取默认简历 profile：

```powershell
curl.exe http://localhost:8083/api/resume-profile
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

验证自定义端口：

```powershell
$env:PORT = "8090"
go run .
```

另开一个终端访问：

```powershell
curl.exe http://localhost:8090/api/health
```
