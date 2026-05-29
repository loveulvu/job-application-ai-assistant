"use client";

import { useEffect, useState } from "react";

const emptyForm = {
  name: "",
  target_position: "",
  skills: "",
  projects: "",
  summary: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState("加载中");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setStatus("加载中");
    setError("");

    try {
      const response = await fetch("/api/resume-profile", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "读取 profile 失败");
      }

      setForm({
        name: data.name || "",
        target_position: data.target_position || "",
        skills: Array.isArray(data.skills) ? data.skills.join("\n") : "",
        projects: Array.isArray(data.projects) ? data.projects.join("\n") : "",
        summary: data.summary || "",
      });
      setStatus("已加载");
    } catch (err) {
      setError(err.message);
      setStatus("加载失败");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus("保存中");

    const payload = {
      name: form.name,
      target_position: form.target_position,
      skills: splitLines(form.skills),
      projects: splitLines(form.projects),
      summary: form.summary,
    };

    try {
      const response = await fetch("/api/resume-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "保存 profile 失败");
      }

      setForm({
        name: data.name || "",
        target_position: data.target_position || "",
        skills: Array.isArray(data.skills) ? data.skills.join("\n") : "",
        projects: Array.isArray(data.projects) ? data.projects.join("\n") : "",
        summary: data.summary || "",
      });
      setStatus("已保存");
    } catch (err) {
      setError(err.message);
      setStatus("保存失败");
    } finally {
      setSaving(false);
    }
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  return (
    <main className="shell">
      <nav className="top-nav">
        <a href="/">首页</a>
        <a href="/applications">投递记录</a>
      </nav>

      <section className="page-heading">
        <p className="eyebrow">Profile</p>
        <h1>个人简历信息</h1>
        <p className="intro">维护给 AI 分析岗位时使用的默认 profile。</p>
      </section>

      <form className="form-panel" onSubmit={saveProfile}>
        <div className="form-status">
          <strong>{status}</strong>
          {error ? <span>{error}</span> : null}
        </div>

        <label>
          姓名
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label>
          目标岗位
          <input
            value={form.target_position}
            onChange={(event) => updateField("target_position", event.target.value)}
          />
        </label>

        <label>
          技能
          <textarea
            rows={6}
            value={form.skills}
            onChange={(event) => updateField("skills", event.target.value)}
            placeholder="一行一个技能"
          />
        </label>

        <label>
          项目
          <textarea
            rows={8}
            value={form.projects}
            onChange={(event) => updateField("projects", event.target.value)}
            placeholder="一行一个项目"
          />
        </label>

        <label>
          简介
          <textarea
            rows={5}
            value={form.summary}
            onChange={(event) => updateField("summary", event.target.value)}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? "保存中" : "保存 profile"}
        </button>
      </form>
    </main>
  );
}

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
