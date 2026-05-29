// ==UserScript==
// @name         AI Job Analyzer
// @namespace    local.job-application-ai-assistant
// @version      0.2.1
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

  const text = {
    title: "\u0041\u0049 \u5c97\u4f4d\u5206\u6790",
    idle: "\u672a\u5206\u6790",
    loading: "\u5206\u6790\u4e2d",
    done: "\u5206\u6790\u5b8c\u6210",
    failed: "\u5206\u6790\u5931\u8d25",
    copied: "\u6c9f\u901a\u8bed\u5df2\u590d\u5236",
    analyze: "\u5206\u6790\u5f53\u524d\u5c97\u4f4d",
    copy: "\u590d\u5236\u6c9f\u901a\u8bed",
    company: "\u516c\u53f8",
    position: "\u5c97\u4f4d",
    matchScore: "\u5339\u914d\u5206",
    riskLevel: "\u98ce\u9669\u7b49\u7ea7",
    matchedPoints: "\u5339\u914d\u70b9",
    missingPoints: "\u7f3a\u5931\u70b9",
    resumeSuggestions: "\u7b80\u5386\u4f18\u5316\u5efa\u8bae",
    messageDraft: "\u6c9f\u901a\u8bed",
    techKeywords: "\u6280\u672f\u5173\u952e\u8bcd",
    unknownCompany: "\u672a\u77e5\u516c\u53f8",
    currentPosition: "\u5f53\u524d\u5c97\u4f4d",
    backendOffline: "\u65e0\u6cd5\u8fde\u63a5\u672c\u5730\u540e\u7aef\uff0c\u8bf7\u786e\u8ba4 http://localhost:8083 \u5df2\u542f\u52a8\u3002",
    invalidJSON: "\u540e\u7aef\u8fd4\u56de\u7684\u4e0d\u662f\u5408\u6cd5 JSON",
    timeout: "\u5206\u6790\u8bf7\u6c42\u8d85\u65f6\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002",
  };

  const riskLabels = {
    low: "\u4f4e",
    medium: "\u4e2d",
    high: "\u9ad8",
  };

  const state = {
    status: text.idle,
    error: "",
    data: null,
  };

  const selectors = {
    position: [
      ".job-banner .name",
      ".job-detail-box .name",
      ".job-primary .name",
      ".info-primary .name",
      ".job-title",
      ".job-name",
      "[class*='job-title']",
      "h1",
    ],
    company: [
      ".company-info .name",
      ".company-info h3",
      ".company-new .company-name",
      ".sider-company .company-name",
      ".company-banner .name",
      ".job-company",
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
          <h2>${text.title}</h2>
          <p data-role="status">${text.idle}</p>
        </div>
      </div>
      <div class="aja-actions">
        <button type="button" data-action="analyze">${text.analyze}</button>
        <button type="button" data-action="copy" disabled>${text.copy}</button>
      </div>
      <div class="aja-error" data-role="error" hidden></div>
      <dl class="aja-fields">
        <dt>${text.company}</dt><dd data-field="company">-</dd>
        <dt>${text.position}</dt><dd data-field="position">-</dd>
        <dt>${text.matchScore}</dt><dd data-field="match_score">-</dd>
        <dt>${text.riskLevel}</dt><dd data-field="risk_level">-</dd>
      </dl>
      <div class="aja-list"><h3>${text.matchedPoints}</h3><ul data-field="matched_points"></ul></div>
      <div class="aja-list"><h3>${text.missingPoints}</h3><ul data-field="missing_points"></ul></div>
      <div class="aja-list"><h3>${text.resumeSuggestions}</h3><ul data-field="resume_suggestions"></ul></div>
      <div class="aja-keywords"><h3>${text.techKeywords}</h3><div data-field="keywords"></div></div>
      <div class="aja-message">
        <h3>${text.messageDraft}</h3>
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
        font-size: 13px;
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
        grid-template-columns: 92px minmax(0, 1fr);
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
      #ai-job-analyzer-panel .aja-keywords div {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      #ai-job-analyzer-panel .aja-keywords span {
        display: inline-flex;
        gap: 5px;
        align-items: center;
        padding: 4px 8px;
        border: 1px solid #d9ded4;
        border-radius: 999px;
        background: #edf7f4;
        color: #115e59;
        font-size: 12px;
        font-weight: 700;
      }
      #ai-job-analyzer-panel .aja-keywords small {
        color: #5f675f;
        font-weight: 400;
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
    setText(panel, "risk_level", riskLabels[data.risk_level] || data.risk_level);
    setList(panel, "matched_points", data.matched_points);
    setList(panel, "missing_points", data.missing_points);
    setList(panel, "resume_suggestions", data.resume_suggestions);
    setKeywords(panel, data.keywords);
    setText(panel, "message_draft", data.message_draft);

    panel.querySelector("[data-action='analyze']").disabled = state.status === text.loading;
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

  function setKeywords(panel, keywords) {
    const target = panel.querySelector("[data-field='keywords']");
    target.innerHTML = "";

    if (!Array.isArray(keywords) || keywords.length === 0) {
      const empty = document.createElement("span");
      empty.textContent = "-";
      target.appendChild(empty);
      return;
    }

    keywords.forEach((item) => {
      const tag = document.createElement("span");
      tag.textContent = item.keyword || "-";

      if (item.category) {
        const category = document.createElement("small");
        category.textContent = item.category;
        tag.appendChild(category);
      }

      target.appendChild(tag);
    });
  }

  function analyzeCurrentJob() {
    const payload = extractJobPayload();

    state.status = text.loading;
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
          state.status = text.failed;
          state.error = body && body.error ? body.error : `HTTP ${response.status}: ${response.responseText}`;
          render();
          return;
        }

        if (!body) {
          state.status = text.failed;
          state.error = text.invalidJSON;
          render();
          return;
        }

        state.status = text.done;
        state.error = "";
        state.data = body;
        render();
      },
      onerror: () => {
        state.status = text.failed;
        state.error = text.backendOffline;
        render();
      },
      ontimeout: () => {
        state.status = text.failed;
        state.error = text.timeout;
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
    state.status = text.copied;
    render();
  }

  function extractJobPayload() {
    const pageText = normalizeText(document.body.innerText);
    const titleFromDocument = cleanPosition((normalizeText(document.title).split(/[-_|]/)[0] || ""));

    const position =
      findFirstValidText(selectors.position, cleanPosition, isValidPosition) ||
      titleFromDocument ||
      cleanPosition(firstLine(pageText)) ||
      text.currentPosition;

    const company =
      findFirstValidText(selectors.company, cleanCompany, isValidCompany) ||
      inferCompanyFromText(pageText) ||
      text.unknownCompany;

    const jdText =
      findFirstValidText(selectors.jd, (value) => normalizeText(value), (value) => value.length > 40) ||
      pageText ||
      `${position}\n${company}`;

    return {
      company: limitText(company, 120),
      position: limitText(position, 120),
      jd_text: limitText(jdText, MAX_JD_LENGTH),
    };
  }

  function findFirstValidText(selectorList, cleaner, validator) {
    for (const selector of selectorList) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        if (!isVisible(node)) {
          continue;
        }
        const value = cleaner(node.innerText || node.textContent || "");
        if (validator(value)) {
          return value;
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

  function cleanCompany(value) {
    return normalizeText(value)
      .replace(/^(\u516c\u53f8|\u516c\u53f8\u4fe1\u606f|\u4f01\u4e1a\u4fe1\u606f|\u516c\u53f8\u4ecb\u7ecd)[:\uff1a\s]*/u, "")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => isValidCompany(line)) || "";
  }

  function isValidCompany(value) {
    const invalid = new Set([
      "\u516c\u53f8",
      "\u516c\u53f8\u4fe1\u606f",
      "\u4f01\u4e1a\u4fe1\u606f",
      "\u516c\u53f8\u4ecb\u7ecd",
      "BOSS\u76f4\u8058",
      "",
    ]);
    const textValue = normalizeText(value);
    return !invalid.has(textValue) && textValue.length >= 2 && textValue.length <= 80;
  }

  function cleanPosition(value) {
    let result = normalizeText(value).split("\n").find(Boolean) || "";
    result = result
      .replace(/\d+\s*[-~\u5230]\s*\d+\s*[Kk]/gu, "")
      .replace(/\d+\s*[Kk]\s*[-~\u5230]\s*\d+\s*[Kk]/gu, "")
      .replace(/\d+\s*[-~\u5230]\s*\d+\s*\u5143\/\u5929/gu, "")
      .replace(/\d+\s*\u5143\/\u5929/gu, "")
      .replace(/\d+\s*[-~\u5230]\s*\d+\s*\u5143\/\u6708/gu, "")
      .replace(/[\u00b7|\uff5c].*$/u, "")
      .replace(/(\u5317\u4eac|\u4e0a\u6d77|\u5e7f\u5dde|\u6df1\u5733|\u676d\u5dde|\u6210\u90fd|\u6b66\u6c49|\u5357\u4eac|\u82cf\u5dde|\u897f\u5b89|\u8fdc\u7a0b).*/u, "")
      .replace(/(\u7ecf\u9a8c\u4e0d\u9650|\u5728\u6821|\u5e94\u5c4a|\u672c\u79d1|\u5927\u4e13|\u7855\u58eb|\u535a\u58eb).*/u, "")
      .replace(/\s{2,}/gu, " ")
      .trim();

    return result;
  }

  function isValidPosition(value) {
    const textValue = normalizeText(value);
    return textValue.length >= 2 && textValue.length <= 80 && !/\u5143\/\u5929|\u5143\/\u6708|\u85aa\u8d44|\u516c\u53f8/.test(textValue);
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function limitText(value, maxLength) {
    const valueText = normalizeText(value);
    if (valueText.length <= maxLength) {
      return valueText;
    }
    return valueText.slice(0, maxLength);
  }

  function firstLine(value) {
    return normalizeText(value).split("\n").find(Boolean) || "";
  }

  function inferCompanyFromText(value) {
    const lines = normalizeText(value).split("\n").map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const company = cleanCompany(line);
      if (isValidCompany(company) && /\u516c\u53f8|\u79d1\u6280|\u7f51\u7edc|\u4fe1\u606f|\u8f6f\u4ef6|\u96c6\u56e2|\u5de5\u4f5c\u5ba4|\u6709\u9650\u516c\u53f8/.test(company)) {
        return company;
      }
    }
    return "";
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
