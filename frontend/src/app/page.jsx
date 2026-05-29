export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">MVP v1.0</p>
        <h1>AI 半自动求职助手</h1>
        <p className="intro">
          用 Tampermonkey 读取当前 BOSS 岗位页，交给本地 Go 后端结合个人 profile
          进行结构化分析，并保存投递记录。
        </p>
      </section>

      <section className="action-grid" aria-label="管理入口">
        <a href="/profile">
          <span>Profile</span>
          <strong>管理个人简历信息</strong>
        </a>
        <a href="/applications">
          <span>Applications</span>
          <strong>查看投递分析记录</strong>
        </a>
      </section>
    </main>
  );
}
