export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">MVP v1.0 / Step 1</p>
        <h1>半自动简历投递辅助器</h1>
        <p className="intro">
          当前已完成基础项目结构：Next.js 前端可以启动，Go 后端提供
          <code>/api/health</code> 健康检查。
        </p>
      </section>

      <section className="status-grid" aria-label="当前模块状态">
        <div>
          <span>Frontend</span>
          <strong>Next.js ready</strong>
        </div>
        <div>
          <span>Backend</span>
          <strong>Go net/http ready</strong>
        </div>
        <div>
          <span>Next</span>
          <strong>SQLite profile</strong>
        </div>
      </section>
    </main>
  );
}
