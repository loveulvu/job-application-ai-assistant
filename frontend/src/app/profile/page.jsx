"use client";

import { useEffect, useState } from "react";

const labels = {
  home: "\u9996\u9875",
  applications: "\u6295\u9012\u8bb0\u5f55",
  keywords: "\u5173\u952e\u8bcd\u7edf\u8ba1",
  title: "\u4e2a\u4eba\u7b80\u5386\u4fe1\u606f",
  intro: "\u7ef4\u62a4\u7ed9 \u0041\u0049 \u5206\u6790\u5c97\u4f4d\u65f6\u4f7f\u7528\u7684\u9ed8\u8ba4 profile\u3002",
  loading: "\u52a0\u8f7d\u4e2d",
  loaded: "\u5df2\u52a0\u8f7d",
  failed: "\u52a0\u8f7d\u5931\u8d25",
  saving: "\u4fdd\u5b58\u4e2d",
  saved: "\u5df2\u4fdd\u5b58",
  saveFailed: "\u4fdd\u5b58\u5931\u8d25",
  name: "\u59d3\u540d",
  target: "\u76ee\u6807\u5c97\u4f4d",
  skills: "\u6280\u80fd",
  projects: "\u9879\u76ee",
  summary: "\u7b80\u4ecb",
  skillPlaceholder: "\u4e00\u884c\u4e00\u4e2a\u6280\u80fd",
  projectPlaceholder: "\u4e00\u884c\u4e00\u4e2a\u9879\u76ee",
  save: "\u4fdd\u5b58 profile",
};

const emptyForm = {
  name: "",
  target_position: "",
  skills: "",
  projects: "",
  summary: "",
};

export default function ProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState(labels.loading);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setStatus(labels.loading);
    setError("");

    try {
      const response = await fetch("/api/resume-profile", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "\u8bfb\u53d6 profile \u5931\u8d25");
      }

      setForm({
        name: data.name || "",
        target_position: data.target_position || "",
        skills: Array.isArray(data.skills) ? data.skills.join("\n") : "",
        projects: Array.isArray(data.projects) ? data.projects.join("\n") : "",
        summary: data.summary || "",
      });
      setStatus(labels.loaded);
    } catch (err) {
      setError(err.message);
      setStatus(labels.failed);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setStatus(labels.saving);

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
        throw new Error(data.error || "\u4fdd\u5b58 profile \u5931\u8d25");
      }

      setForm({
        name: data.name || "",
        target_position: data.target_position || "",
        skills: Array.isArray(data.skills) ? data.skills.join("\n") : "",
        projects: Array.isArray(data.projects) ? data.projects.join("\n") : "",
        summary: data.summary || "",
      });
      setStatus(labels.saved);
    } catch (err) {
      setError(err.message);
      setStatus(labels.saveFailed);
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
        <a href="/">{labels.home}</a>
        <a href="/applications">{labels.applications}</a>
        <a href="/keywords">{labels.keywords}</a>
      </nav>

      <section className="page-heading">
        <p className="eyebrow">Profile</p>
        <h1>{labels.title}</h1>
        <p className="intro">{labels.intro}</p>
      </section>

      <form className="form-panel" onSubmit={saveProfile}>
        <div className="form-status">
          <strong>{status}</strong>
          {error ? <span>{error}</span> : null}
        </div>

        <label>
          {labels.name}
          <input value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label>
          {labels.target}
          <input
            value={form.target_position}
            onChange={(event) => updateField("target_position", event.target.value)}
          />
        </label>

        <label>
          {labels.skills}
          <textarea
            rows={6}
            value={form.skills}
            onChange={(event) => updateField("skills", event.target.value)}
            placeholder={labels.skillPlaceholder}
          />
        </label>

        <label>
          {labels.projects}
          <textarea
            rows={8}
            value={form.projects}
            onChange={(event) => updateField("projects", event.target.value)}
            placeholder={labels.projectPlaceholder}
          />
        </label>

        <label>
          {labels.summary}
          <textarea
            rows={5}
            value={form.summary}
            onChange={(event) => updateField("summary", event.target.value)}
          />
        </label>

        <button type="submit" disabled={saving}>
          {saving ? labels.saving : labels.save}
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
