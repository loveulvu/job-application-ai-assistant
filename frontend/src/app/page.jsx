const labels = {
  title: "\u0041\u0049 \u534a\u81ea\u52a8\u6c42\u804c\u52a9\u624b",
  intro:
    "\u7528 Tampermonkey \u8bfb\u53d6\u5f53\u524d BOSS \u5c97\u4f4d\u9875\uff0c\u4ea4\u7ed9\u672c\u5730 Go \u540e\u7aef\u7ed3\u5408\u4e2a\u4eba profile \u8fdb\u884c\u7ed3\u6784\u5316\u5206\u6790\uff0c\u5e76\u4fdd\u5b58\u6295\u9012\u8bb0\u5f55\u3002",
  profile: "\u7ba1\u7406\u4e2a\u4eba\u7b80\u5386\u4fe1\u606f",
  applications: "\u67e5\u770b\u6295\u9012\u5206\u6790\u8bb0\u5f55",
  keywords: "\u67e5\u770b\u5c97\u4f4d\u6280\u672f\u5173\u952e\u8bcd",
};

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">MVP v1.0 / Step 6</p>
        <h1>{labels.title}</h1>
        <p className="intro">{labels.intro}</p>
      </section>

      <section className="action-grid" aria-label="管理入口">
        <a href="/profile">
          <span>Profile</span>
          <strong>{labels.profile}</strong>
        </a>
        <a href="/applications">
          <span>Applications</span>
          <strong>{labels.applications}</strong>
        </a>
        <a href="/keywords">
          <span>Keywords</span>
          <strong>{labels.keywords}</strong>
        </a>
      </section>
    </main>
  );
}
