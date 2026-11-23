// ==UserScript==
// @name         BOSS JD 安全采集助手（双模式 · 零爬虫 · 仅入本地收件箱）
// @namespace    local.ai.resume.tailor
// @version      2.0.0
// @description  严格隔离：绝不爬接口、绝不自动投递。支持手动单条采集、画面截图推送、以及 3~6 秒随机间隔的低频模拟点击小批量采集，带去重与可选轻量过滤，仅推入本地 http://127.0.0.1:3845 收件箱。
// @match        https://www.zhipin.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @connect      localhost
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const LOCAL_API = 'http://127.0.0.1:3845';
  const FILTER_KEY = 'aiResumeJdCollectorFilterV2';

  let batchRunning = false;
  let batchStopRequested = false;
  const sessionSeenKeys = new Set();

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function randomDelay(minMs, maxMs) {
    return Math.floor(minMs + Math.random() * (maxMs - minMs));
  }

  function loadFilterSettings() {
    try {
      return JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveFilterSettings(obj) {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(obj));
    } catch {}
  }

  // ===== 1. 仅读取当前页面已渲染的可见文本（绝不发任何平台接口请求） =====
  function pickVisibleText(selectors, root = document) {
    for (const sel of selectors) {
      const nodes = root.querySelectorAll(sel);
      for (const el of nodes) {
        if (!el || el.offsetParent === null) continue;
        const txt = (el.innerText || '').trim();
        if (txt) return txt;
      }
    }
    return '';
  }

  function extractVisibleJdFromCurrentDom(fallbackCardMeta = {}) {
    const jobTitle =
      pickVisibleText([
        '.job-detail-header .job-name',
        '.job-detail-box .job-name',
        '.job-banner .name h1',
        '.job-primary .name h1',
        'h1.name',
        'h1'
      ]) ||
      fallbackCardMeta.jobTitle ||
      '';

    const salary =
      pickVisibleText([
        '.job-detail-header .salary',
        '.job-detail-box .job-salary',
        '.job-banner .salary',
        '.job-primary .salary'
      ]) ||
      fallbackCardMeta.salary ||
      '';

    const company =
      pickVisibleText([
        '.job-detail-header .company-name',
        '.job-detail-box .boss-info-attr',
        '.sider-company .company-info a[ka*="company"]',
        '.company-info .company-name',
        '.company-name'
      ]) ||
      fallbackCardMeta.company ||
      '';

    const city =
      pickVisibleText([
        '.job-detail-header .text-city',
        '.job-detail-box .job-area',
        '.job-banner .text-city',
        '.job-area'
      ]) ||
      fallbackCardMeta.city ||
      '';

    const jdText = pickVisibleText([
      '.job-detail-body .desc',
      '.job-detail-section .job-sec-text',
      '.job-sec-text',
      '.job-detail-box .desc',
      '.job-detail-box .job-detail-body'
    ]);

    return {
      sourceUrl: location.href,
      company: company.replace(/\s+/g, ' ').trim(),
      jobTitle: jobTitle.replace(/\s+/g, ' ').trim(),
      salary: salary.replace(/\s+/g, ' ').trim(),
      city: city.replace(/\s+/g, ' ').trim(),
      jdText: jdText.trim()
    };
  }

  function extractCardMeta(card) {
    return {
      jobTitle: pickVisibleText(['.job-name', '[class*="job-name"]', 'a'], card),
      salary: pickVisibleText(['.salary', '.job-salary', '[class*="salary"]'], card),
      company: pickVisibleText(['.company-name', '.boss-name', '[class*="company-name"]'], card),
      city: pickVisibleText(['.job-area', '.company-location', '[class*="job-area"]'], card)
    };
  }

  function getVisibleJobCards() {
    const selectors = [
      '.job-list-box .job-card-wrapper',
      '.job-list-box .job-card-box',
      '.search-job-result .job-card-wrapper',
      '.search-job-result .job-card-box',
      "[class*='job-card-wrapper']",
      "[class*='job-card-box']"
    ];
    for (const sel of selectors) {
      const list = Array.from(document.querySelectorAll(sel)).filter((el) => el && el.offsetParent !== null);
      if (list.length > 0) return list;
    }
    return [];
  }

  // ===== 2. 本地轻量过滤与薪资解析 =====
  function parseMinSalaryK(salaryStr) {
    const m = String(salaryStr || '').match(/(\d+(?:\.\d+)?)\s*[-~～]\s*(\d+(?:\.\d+)?)\s*[kK千]?/);
    if (!m) return null;
    const low = parseFloat(m[1]);
    return Number.isFinite(low) ? low : null;
  }

  function splitKeywords(str) {
    return String(str || '')
      .split(/[,，、;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  function matchLocalFilter(item, filter) {
    const text = `${item.company} ${item.jobTitle} ${item.jdText}`.toLowerCase();
    const includes = splitKeywords(filter.include);
    const excludes = splitKeywords(filter.exclude);
    const minK = Number(filter.minSalaryK || 0);

    if (includes.length > 0 && !includes.some((kw) => text.includes(kw))) {
      return { ok: false, reason: '未命中包含关键词' };
    }
    if (excludes.length > 0 && excludes.some((kw) => text.includes(kw))) {
      return { ok: false, reason: '命中排除关键词' };
    }
    if (minK > 0) {
      const lowK = parseMinSalaryK(item.salary);
      if (lowK !== null && lowK < minK) {
        return { ok: false, reason: `起薪 ${lowK}K 低于 ${minK}K` };
      }
    }
    return { ok: true };
  }

  function makeDedupeKey(item) {
    const c = (item.company || '').toLowerCase().trim();
    const t = (item.jobTitle || '').toLowerCase().trim();
    return c && t ? `${c}::${t}` : '';
  }

  // ===== 3. 单帧画面截图（不依赖 DOM，人工授权当前标签页） =====
  async function captureCurrentTabFrame() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('当前浏览器不支持 getDisplayMedia 截屏，请改用 Snipaste 截图在定制台 Ctrl+V 粘贴');
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { preferCurrentTab: true },
      audio: false
    });
    try {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await sleep(180);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || window.innerWidth;
      canvas.height = video.videoHeight || window.innerHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/png');
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  // ===== 4. 仅与本地 127.0.0.1:3845 通信 =====
  function gmRequest(method, path, payload) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url: `${LOCAL_API}${path}`,
        headers: payload ? { 'Content-Type': 'application/json' } : undefined,
        data: payload ? JSON.stringify(payload) : undefined,
        timeout: 6000,
        onload: (res) => {
          try {
            const data = JSON.parse(res.responseText || '{}');
            if (res.status >= 200 && res.status < 300 && data.ok) resolve(data);
            else reject(new Error(data.error || `本地服务返回 ${res.status}`));
          } catch {
            reject(new Error(`本地服务响应异常 (${res.status})`));
          }
        },
        onerror: () => reject(new Error('未检测到本地服务 http://127.0.0.1:3845，请先启动 node server.js')),
        ontimeout: () => reject(new Error('连接本地服务超时'))
      });
    });
  }

  // ===== 5. 悬浮控制面板 =====
  function mountWidget() {
    if (document.getElementById('aiResumeJdCaptureBar')) return;
    const saved = loadFilterSettings();

    const bar = document.createElement('div');
    bar.id = 'aiResumeJdCaptureBar';
    bar.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483640',
      'background:#0f172a',
      'color:#f8fafc',
      'border:1px solid #334155',
      'border-radius:12px',
      'padding:11px 13px',
      'box-shadow:0 12px 32px rgba(0,0,0,0.34)',
      'font-family:"Microsoft YaHei",sans-serif',
      'font-size:12px',
      'width:258px'
    ].join(';');

    bar.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span id="aiCapDot" style="width:8px;height:8px;border-radius:50%;background:#94a3b8;display:inline-block;"></span>
          <strong style="font-size:12.5px;">BOSS JD 采集 → 收件箱</strong>
        </div>
        <button id="aiCapMinBtn" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:15px;line-height:1;">—</button>
      </div>
      <div id="aiCapBody">
        <div style="display:flex;flex-direction:column;gap:6px;">
          <button id="aiCapTextBtn" style="padding:7px 8px;border-radius:6px;border:none;background:#2563eb;color:#fff;cursor:pointer;font-weight:600;">📄 收入当前可见 JD</button>
          <button id="aiCapShotBtn" style="padding:6px 8px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f8fafc;cursor:pointer;font-weight:600;">📷 截图当前画面推送</button>
        </div>

        <div style="margin-top:9px;padding-top:9px;border-top:1px solid #1e293b;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#cbd5e1;font-weight:600;">⚡ 低频模拟点击小批量</span>
            <label style="color:#94a3b8;font-size:11.5px;">数量
              <input id="aiCapLimit" type="number" min="1" max="20" value="${Number(saved.limit || 5)}" style="width:42px;margin-left:3px;padding:2px 4px;border-radius:4px;border:1px solid #475569;background:#1e293b;color:#fff;font-size:11.5px;" />
            </label>
          </div>
          <div style="display:flex;gap:6px;">
            <button id="aiCapBatchBtn" style="flex:1;padding:6px 8px;border-radius:6px;border:none;background:#059669;color:#fff;cursor:pointer;font-weight:600;">开始模拟点选采集</button>
            <button id="aiCapStopBtn" style="padding:6px 10px;border-radius:6px;border:none;background:#dc2626;color:#fff;cursor:pointer;font-weight:600;display:none;">停止</button>
          </div>
        </div>

        <div style="margin-top:8px;">
          <button id="aiCapFilterToggle" style="background:none;border:none;color:#93c5fd;cursor:pointer;padding:0;font-size:11.5px;">▸ 可选过滤条件（不填则全收）</button>
          <div id="aiCapFilterBox" style="display:none;margin-top:6px;padding:7px;background:#1e293b;border-radius:6px;">
            <input id="aiCapInc" placeholder="包含词（逗号分隔，如 运维,Linux）" value="${(saved.include || '').replace(/"/g, '&quot;')}" style="width:100%;box-sizing:border-box;margin-bottom:5px;padding:4px 6px;border-radius:4px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:11.5px;" />
            <input id="aiCapExc" placeholder="排除词（逗号分隔，如 外包,销售）" value="${(saved.exclude || '').replace(/"/g, '&quot;')}" style="width:100%;box-sizing:border-box;margin-bottom:5px;padding:4px 6px;border-radius:4px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:11.5px;" />
            <input id="aiCapMinK" type="number" min="0" placeholder="最低起薪 K（如 12，留空不限）" value="${saved.minSalaryK || ''}" style="width:100%;box-sizing:border-box;padding:4px 6px;border-radius:4px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:11.5px;" />
          </div>
        </div>

        <div id="aiCapStatus" style="margin-top:8px;font-size:11px;color:#cbd5e1;line-height:1.45;">零爬虫 · 零自动投递 · 仅入本地收件箱</div>
        <div style="margin-top:6px;text-align:right;">
          <a href="${LOCAL_API}" target="_blank" style="color:#93c5fd;text-decoration:none;font-size:11.5px;">打开本地简历定制台 ↗</a>
        </div>
      </div>
    `;

    document.body.appendChild(bar);

    const dotEl = bar.querySelector('#aiCapDot');
    const statusEl = bar.querySelector('#aiCapStatus');
    const bodyEl = bar.querySelector('#aiCapBody');
    const minBtn = bar.querySelector('#aiCapMinBtn');
    const filterToggle = bar.querySelector('#aiCapFilterToggle');
    const filterBox = bar.querySelector('#aiCapFilterBox');
    const batchBtn = bar.querySelector('#aiCapBatchBtn');
    const stopBtn = bar.querySelector('#aiCapStopBtn');

    function setMsg(text, color = '#cbd5e1') {
      statusEl.style.color = color;
      statusEl.textContent = text;
    }

    function readFilterInputs() {
      const cfg = {
        limit: Math.max(1, Math.min(20, Number(bar.querySelector('#aiCapLimit').value || 5))),
        include: bar.querySelector('#aiCapInc').value.trim(),
        exclude: bar.querySelector('#aiCapExc').value.trim(),
        minSalaryK: bar.querySelector('#aiCapMinK').value.trim()
      };
      saveFilterSettings(cfg);
      return cfg;
    }

    // 健康检查绿点
    gmRequest('GET', '/api/health')
      .then(() => {
        dotEl.style.background = '#22c55e';
        dotEl.title = '已连接本地简历服务';
      })
      .catch(() => {
        dotEl.style.background = '#ef4444';
        dotEl.title = '本地服务未启动';
      });

    minBtn.addEventListener('click', () => {
      const hidden = bodyEl.style.display === 'none';
      bodyEl.style.display = hidden ? 'block' : 'none';
      minBtn.textContent = hidden ? '—' : '+';
    });

    filterToggle.addEventListener('click', () => {
      const hidden = filterBox.style.display === 'none';
      filterBox.style.display = hidden ? 'block' : 'none';
      filterToggle.textContent = hidden ? '▾ 可选过滤条件（不填则全收）' : '▸ 可选过滤条件（不填则全收）';
    });

    // 模式 A1：手动单条采集当前可见 JD
    bar.querySelector('#aiCapTextBtn').addEventListener('click', async () => {
      setMsg('正在读取当前可见 JD...');
      try {
        const data = extractVisibleJdFromCurrentDom();
        if (!data.jdText) {
          throw new Error('未检测到可见 JD 正文，请先点开一个岗位详情，或改用「截图当前画面推送」');
        }
        const res = await gmRequest('POST', '/api/inbox', { ...data, mode: 'dom_visible' });
        const key = makeDedupeKey(data);
        if (key) sessionSeenKeys.add(key);
        setMsg(
          res.deduplicated
            ? `✓ 已更新重复岗位：${data.company} - ${data.jobTitle}`
            : `✓ 已收入收件箱：${data.company} - ${data.jobTitle}`,
          '#86efac'
        );
      } catch (err) {
        setMsg(`✗ ${err.message}`, '#fca5a5');
      }
    });

    // 模式 A2：截图当前画面推送
    bar.querySelector('#aiCapShotBtn').addEventListener('click', async () => {
      setMsg('请在弹窗中选择当前标签页进行单帧截图...');
      try {
        const screenshotDataUrl = await captureCurrentTabFrame();
        const meta = extractVisibleJdFromCurrentDom();
        await gmRequest('POST', '/api/inbox', {
          sourceUrl: location.href,
          company: meta.company,
          jobTitle: meta.jobTitle,
          salary: meta.salary,
          city: meta.city,
          jdText: '',
          screenshotDataUrl,
          mode: 'screenshot'
        });
        setMsg('✓ 截图已推送至本地收件箱，载入时将自动识图！', '#86efac');
      } catch (err) {
        setMsg(`✗ ${err.message}`, '#fca5a5');
      }
    });

    // 模式 B：低频模拟人工点击小批量采集（3~6 秒随机间隔，绝不爬接口、绝不投递）
    stopBtn.addEventListener('click', () => {
      batchStopRequested = true;
      setMsg('正在停止采集...', '#fde047');
    });

    batchBtn.addEventListener('click', async () => {
      if (batchRunning) return;
      const filter = readFilterInputs();
      const cards = getVisibleJobCards();
      if (!cards.length) {
        setMsg('当前页面未找到左侧岗位卡片列表，请在 BOSS 岗位列表页使用小批量采集', '#fca5a5');
        return;
      }

      batchRunning = true;
      batchStopRequested = false;
      batchBtn.style.display = 'none';
      stopBtn.style.display = 'inline-block';

      let collected = 0;
      let skipped = 0;

      try {
        for (let i = 0; i < cards.length && collected < filter.limit; i++) {
          if (batchStopRequested) break;
          const card = cards[i];
          const cardMeta = extractCardMeta(card);
          const preKey = makeDedupeKey(cardMeta);
          if (preKey && sessionSeenKeys.has(preKey)) {
            skipped++;
            continue;
          }

          setMsg(`(${collected}/${filter.limit}) 正在模拟点选第 ${i + 1} 个岗位：${cardMeta.jobTitle || '...'}`, '#93c5fd');
          const beforeText = extractVisibleJdFromCurrentDom().jdText;

          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(randomDelay(400, 800));
          const clickTarget = card.querySelector('.job-name, a') || card;
          clickTarget.click();

          // 等待右侧详情面板真实渲染变化（最多等 5 秒）
          let detail = null;
          for (let waitStep = 0; waitStep < 12; waitStep++) {
            await sleep(400);
            const cur = extractVisibleJdFromCurrentDom(cardMeta);
            if (cur.jdText && (cur.jdText !== beforeText || i === 0)) {
              detail = cur;
              break;
            }
          }
          if (!detail) detail = extractVisibleJdFromCurrentDom(cardMeta);

          if (!detail.jdText) {
            skipped++;
          } else {
            const check = matchLocalFilter(detail, filter);
            if (!check.ok) {
              skipped++;
              setMsg(`跳过「${detail.jobTitle}」：${check.reason}`, '#cbd5e1');
            } else {
              await gmRequest('POST', '/api/inbox', { ...detail, mode: 'batch_click' });
              const key = makeDedupeKey(detail);
              if (key) sessionSeenKeys.add(key);
              collected++;
              setMsg(`✓ (${collected}/${filter.limit}) 已入箱：${detail.company} - ${detail.jobTitle}`, '#86efac');
            }
          }

          if (collected < filter.limit && i < cards.length - 1 && !batchStopRequested) {
            const delayMs = randomDelay(3200, 5800);
            setMsg(`✓ 已入箱 ${collected} 条，模拟人工浏览停顿 ${(delayMs / 1000).toFixed(1)}s...`, '#93c5fd');
            await sleep(delayMs);
          }
        }
        setMsg(
          batchStopRequested
            ? `已手动停止：共收入 ${collected} 条（跳过 ${skipped} 条）`
            : `✓ 小批量采集完成：共收入 ${collected} 条（跳过 ${skipped} 条）`,
          '#86efac'
        );
      } catch (err) {
        setMsg(`✗ 采集中断：${err.message}`, '#fca5a5');
      } finally {
        batchRunning = false;
        batchStopRequested = false;
        batchBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
      }
    });
  }

  mountWidget();
})();
