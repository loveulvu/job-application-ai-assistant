// ==UserScript==
// @name         AI Job Analyzer
// @namespace    local.job-application-ai-assistant
// @version      0.1.0
// @description  Analyze the current BOSS Zhipin job page with a local Go backend.
// @match        https://www.zhipin.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const API_URL = "http://localhost:8083/api/analyze-job";
  const MAX_JD_LENGTH = 8000;

  const state = {
    status: "未分析",
    error: "",
    data: null,
  };

  const selectors = {
    position: [
      ".job-title",
      ".job-banner .name",
      ".info-primary .name",
      ".job-name",
      "[class*='job-title']",
      "h1",
    ],
    company: [
      ".company-info .name",
      ".company-name",
      ".job-company",
      ".sider-company .company-name",
      ".company-banner .name",
      "a[href*='/gongsi/']",
      "[class*='company-name']",
    ],
    jd: [
      ".job-sec-text",
      ".job-detail",
      ".detail-content",
      ".job-detail-section",
      ".job-detail-body",
      ".job-primary",
      "main",
    ],
  };

  function createPanel() {
    const panel = document.createElement("section");
    panel.id = "ai-job-analyzer-panel";
    panel.innerHTML = `
      <div class="aja-header">
        <div>
          <h2>AI 岗位分析</h2>
          <p data-role="status">未分析</p>
        </div>
      </div>
      <div class="aja-actions">
        <button type="button" data-action="analyze">分析当前岗位</button>
        <button type="button" data-action="copy" disabled>复制沟通语</button>
      </div>
      <div class="aja-error" data-role="error" hidden></div>
      <dl class="aja-fields">
        <dt>company</dt><dd data-field="company">-</dd>
        <dt>position</dt><dd data-field="position">-</dd>
        <dt>match_score</dt><dd data-field="match_score">-</dd>
        <dt>risk_level</dt><dd data-field="risk_level">-</dd>
      </dl>
      <div class="aja-list"><h3>matched_points</h3><ul data-field="matched_points"></ul></div>
      <div class="aja-list"><h3>missing_points</h3><ul data-field="missing_points"></ul></div>
      <div class="aja-list"><h3>resume_suggestions</h3><ul data-field="resume_suggestions"></ul></div>
      <div class="aja-message">
        <h3>message_draft</h3>
        <p data-field="message_draft">-</p>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #ai-job-analyzer-panel {
        position: fixed;
        top: 88px;
        right: 20px;
        z-index: 2147483647;
        width: 360px;
        max-height: calc(100vh - 120px);
        overflow: auto;
        padding: 16px;
        border: 1px solid #d9ded4;
        border-radius: 8px;
        background: #ffffff;
        color: #17201a;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
        font: 14px/1.5 Arial, "Microsoft YaHei", sans-serif;
      }
      #ai-job-analyzer-panel * { box-sizing: border-box; }
      #ai-job-analyzer-panel h2,
      #ai-job-analyzer-panel h3,
      #ai-job-analyzer-panel p,
      #ai-job-analyzer-panel dl,
      #ai-job-analyzer-panel ul { margin: 0; }
      #ai-job-analyzer-panel h2 { font-size: 18px; line-height: 1.2; }
      #ai-job-analyzer-panel h3 {
        margin: 14px 0 8px;
        color: #5f675f;
        font-size: 12px;
        text-transform: uppercase;
      }
      #ai-job-analyzer-panel [data-role="status"] {
        margin-top: 4px;
        color: #0f766e;
        font-size: 13px;
        font-weight: 700;
      }
      #ai-job-analyzer-panel .aja-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 14px 0;
      }
      #ai-job-analyzer-panel button {
        min-height: 36px;
        border: 0;
        border-radius: 6px;
        background: #0f766e;
        color: #ffffff;
        cursor: pointer;
        font-weight: 700;
      }
      #ai-job-analyzer-panel button:disabled {
        background: #c7ccc4;
        color: #68706a;
        cursor: not-allowed;
      }
      #ai-job-analyzer-panel .aja-error {
        margin-bottom: 12px;
        padding: 10px;
        border-radius: 6px;
        background: #fff1f2;
        color: #be123c;
        white-space: pre-wrap;
      }
      #ai-job-analyzer-panel .aja-fields {
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr);
        gap: 8px 10px;
        padding-top: 10px;
        border-top: 1px solid #e5e7eb;
      }
      #ai-job-analyzer-panel dt {
        color: #5f675f;
        font-weight: 700;
      }
      #ai-job-analyzer-panel dd {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      #ai-job-analyzer-panel ul {
        padding-left: 18px;
      }
      #ai-job-analyzer-panel li + li {
        margin-top: 6px;
      }
      #ai-job-analyzer-panel .aja-message p {
        padding: 10px;
        border-radius: 6px;
        background: #f7f7f2;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
    `;

    document.documentElement.appendChild(style);
    document.body.appendChild(panel);

    panel.querySelector("[data-action='analyze']").addEventListener("click", analyzeCurrentJob);
    panel.querySelector("[data-action='copy']").addEventListener("click", copyMessageDraft);

    render();
  }

  function render() {
    const panel = document.getElementById("ai-job-analyzer-panel");
    if (!panel) {
      return;
    }

    panel.querySelector("[data-role='status']").textContent = state.status;

    const error = panel.querySelector("[data-role='error']");
    error.hidden = !state.error;
    error.textContent = state.error;

    const data = state.data || {};
    setText(panel, "company", data.company);
    setText(panel, "position", data.position);
    setText(panel, "match_score", data.match_score);
    setText(panel, "risk_level", data.risk_level);
    setList(panel, "matched_points", data.matched_points);
    setList(panel, "missing_points", data.missing_points);
    setList(panel, "resume_suggestions", data.resume_suggestions);
    setText(panel, "message_draft", data.message_draft);

    panel.querySelector("[data-action='analyze']").disabled = state.status === "分析中";
    panel.querySelector("[data-action='copy']").disabled = !data.message_draft;
  }

  function setText(panel, field, value) {
    panel.querySelector(`[data-field='${field}']`).textContent =
      value === undefined || value === null || value === "" ? "-" : String(value);
  }

  function setList(panel, field, values) {
    const target = panel.querySelector(`[data-field='${field}']`);
    target.innerHTML = "";

    if (!Array.isArray(values) || values.length === 0) {
      const item = document.createElement("li");
      item.textContent = "-";
      target.appendChild(item);
      return;
    }

    values.forEach((value) => {
      const item = document.createElement("li");
      item.textContent = String(value);
      target.appendChild(item);
    });
  }

  function analyzeCurrentJob() {
    const payload = extractJobPayload();

    state.status = "分析中";
    state.error = "";
    render();

    GM_xmlhttpRequest({
      method: "POST",
      url: API_URL,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify(payload),
      timeout: 90000,
      onload: (response) => {
        const body = parseJSON(response.responseText);

        if (response.status < 200 || response.status >= 300) {
          state.status = "分析失败";
          state.error = body && body.error ? body.error : `HTTP ${response.status}: ${response.responseText}`;
          render();
          return;
        }

        if (!body) {
          state.status = "分析失败";
          state.error = "后端返回的不是合法 JSON";
          render();
          return;
        }

        state.status = "分析完成";
        state.error = "";
        state.data = body;
        render();
      },
      onerror: () => {
        state.status = "分析失败";
        state.error = "无法连接本地后端，请确认 http://localhost:8083 已启动。";
        render();
      },
      ontimeout: () => {
        state.status = "分析失败";
        state.error = "分析请求超时，请稍后重试。";
        render();
      },
    });
  }

  function copyMessageDraft() {
    const message = state.data && state.data.message_draft;
    if (!message) {
      return;
    }

    GM_setClipboard(message, "text");
    state.status = "沟通语已复制";
    render();
  }

  function extractJobPayload() {
    const pageText = normalizeText(document.body.innerText);
    const titleFromDocument = normalizeText(document.title).split(/[-_|]/)[0] || "";

    const position =
      firstText(selectors.position) ||
      titleFromDocument ||
      firstLine(pageText) ||
      "当前岗位";

    const company =
      firstText(selectors.company) ||
      inferCompanyFromText(pageText) ||
      "未知公司";

    const jdText =
      firstText(selectors.jd) ||
      pageText ||
      `${position}\n${company}`;

    return {
      company: limitText(company, 120),
      position: limitText(position, 120),
      jd_text: limitText(jdText, MAX_JD_LENGTH),
    };
  }

  function firstText(selectorList) {
    for (const selector of selectorList) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        if (!isVisible(node)) {
          continue;
        }
        const text = normalizeText(node.innerText || node.textContent || "");
        if (text) {
          return text;
        }
      }
    }
    return "";
  }

  function isVisible(node) {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function limitText(value, maxLength) {
    const text = normalizeText(value);
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength);
  }

  function firstLine(text) {
    return normalizeText(text).split("\n").find(Boolean) || "";
  }

  function inferCompanyFromText(text) {
    const lines = normalizeText(text).split("\n").map((line) => line.trim()).filter(Boolean);
    return lines.find((line) => /公司|科技|网络|信息|软件|集团|工作室/.test(line) && line.length <= 80) || "";
  }

  function parseJSON(value) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }

  if (document.body) {
    createPanel();
  } else {
    window.addEventListener("DOMContentLoaded", createPanel, { once: true });
  }
})();
