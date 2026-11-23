(function () {
  'use strict';

  const state = {
    config: null,
    defaultPrompts: null,
    goldenSet: { updatedAt: null, samples: [] },
    master: null,
    knowledge: { updatedAt: null, projects: [] },
    inbox: [],
    inboxFilter: { query: '', status: 'all' },
    expandedInboxIds: {},
    archives: [],
    archiveQuery: '',
    activeDocId: 'master',
    masterDirty: false,
    masterWarnedOnce: false,
    openTabs: [],
    diffMode: false,
    isSwitchingDoc: false,
    autoSaveTimer: null,
    currentInboxId: null,
    currentArchiveId: null,
    currentSourceUrl: '',
    currentSalary: '',
    currentCity: '',
    currentProposal: null,
    currentEvaluation: null,
    evalExpanded: true,
    selection: null,
    pastedImageDataUrl: ''
  };

  const OPEN_TABS_KEY = 'ai_resume_open_tab_ids_v1';

  const CUSTOM_EXTRACT_PROMPT_KEY = 'ai_resume_custom_extract_prompt_v2';

  // 标准提示词模板 v2：跨平台默认落盘桌面 MD + 硬事实与待核实指标严格分层 + 强对齐本系统简历结构
  const PROJECT_EXTRACT_PROMPT = `请你作为资深架构师与技术简历顾问，全面阅读当前工作区的代码目录、依赖清单（package.json / requirements.txt / pyproject.toml / pom.xml / go.mod / Dockerfile / docker-compose.yml 等）、README、测试文件与核心业务源码，为我提炼一份【标准项目深度档案 Markdown】，专供「AI 简历岗位定制台」按不同岗位 JD 精准抽取真实经历。

【交付方式（重要）】
- 如果你当前具备写文件权限（如 Antigravity / Cursor / Claude Code / Windsurf 等）：请自动识别当前操作系统的桌面路径（Windows 为 %USERPROFILE%\\Desktop，macOS / Linux 为 ~/Desktop），直接将完整结果保存为桌面文件：\`项目深度档案_<项目名称>.md\`，并在回复中告诉我保存路径和核心摘要。
- 如果你当前仅支持对话输出（无写文件权限）：请直接输出完整 Markdown 代码块，方便我复制保存。

【绝对红线（严防面试露馅）】
1. 100% 忠于代码仓真实实现，绝不编造不存在的中间件、高并发场景或业务指标。
2. 硬事实与待核实数据严格隔离：
   - 凡是代码/配置/测试中可直接观测的硬事实（如接口数、模块数、自动化测试用例数、真实架构机制），请注明对应代码文件或配置依据。
   - 凡是代码中无法直接验证的业务指标（如“效率提升 40%”、“QPS 提升 3 倍”、“日活用户数”），严禁替我估算或编造！请统一留空放入第 6 节「待本人核实补充的业务指标」中。
3. 表达尽量贴合一线招聘 JD 的工程术语（如幂等、异步解耦、权限隔离、可观测性、降级兜底、混合检索、防幻觉校验等），但每一条都必须有代码级依据。

请严格按以下 Markdown 结构生成（总字数建议控制在 2500~4500 字，高密度干货，避免贴大段源码）：

# 项目名称：<真实项目名称>

## 1. 简历基础骨架（可直接对应简历模板）
- **一句话定位**：<不超过 45 字概括项目核心价值>
- **项目背景与业务痛点**：<不超过 75 字，交代真实业务场景与待解决的问题>
- **精炼技术栈（顿号分隔，按核心程度排序）**：<技术1、技术2、技术3...>

## 2. STAR 精炼版核心要点（供 AI 简历直取，4~6 条，每条 50~85 字，零虚构数据）
- **<模块短标题 1>：**<针对什么痛点，采用什么具体架构/技术方案，实现什么可验证的工程能力或结果>
- **<模块短标题 2>：**<...>
- **<模块短标题 3>：**<...>
- **<模块短标题 4>：**<...>

## 3. 全量真实技术栈与代码证据清单
- **编程语言与核心框架**：<附配置文件依据>
- **数据库 / 缓存 / 向量检索**：<附真实模型/连接代码依据>
- **AI / 大模型 / Agent / 中间件**：<附调用链/路由/工具封装依据>
- **部署、容器化、CI/CD 与监控**：<附 Dockerfile / 脚本 / 日志配置依据>
- **测试与质量保障**：<列出真实测试框架与可统计的测试用例数>

## 4. 核心功能模块与架构设计拆解（5~8 个真实模块）
### 模块 1：<模块名称>
- **解决的问题**：<...>
- **代码实现与关键设计**：<结合具体文件/模块说明数据流、状态机、边界控制或取舍理由>
- **可验证工程亮点**：<如解耦、容错、安全隔离、扩展性等>

（按真实代码继续拆解其余核心模块...）

## 5. 工程质量、安全性与稳定性设计证据
- **异常处理与降级兜底**：<代码中真实的超时、重试、降级、事务或并发控制机制>
- **数据安全与权限隔离**：<如只读视图、鉴权、脱敏、防注入、本地隔离等>
- **性能与可维护性优化**：<如缓存、异步队列、分页、索引、模块化重构等>

## 6. 待本人核实补充的业务指标（严禁 AI 编造，由本人按真实口径填写）
- 业务规模/使用范围：待本人补充：___
- 关键耗时/性能前后对比：待本人补充：___
- 效率/成本/准确率量化收益：待本人补充：___

## 7. 多岗位方向投递侧重点映射
- **偏 AI 应用 / Agent 工程师**：优先突出哪些模块与关键词
- **偏后端 / 全栈开发工程师**：优先突出哪些模块与关键词
- **偏运维 / 架构 / 稳定性方向**：优先突出哪些模块与关键词

## 8. 面试官高频深挖问题与代码级回答依据（4~6 题）
- **Q1**：<面试官最可能追问的架构/难点问题>
  - **回答依据**：<结合本项目真实代码实现与设计取舍给出清晰答法>`;

  function initToolbarDropdowns() {
    const dropdowns = Array.from(document.querySelectorAll('.tb-dropdown'));
    const closeAll = () => dropdowns.forEach((d) => d.classList.remove('open'));
    dropdowns.forEach((dd) => {
      const trigger = dd.querySelector('.tb-dropdown-trigger');
      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = dd.classList.contains('open');
        closeAll();
        if (!wasOpen) dd.classList.add('open');
      });
      dd.querySelectorAll('.tb-dropdown-item').forEach((item) => {
        item.addEventListener('click', () => closeAll());
      });
    });
    document.addEventListener('click', closeAll);
  }

  function escHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showToast(msg) {
    let el = document.getElementById('aiToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'aiToast';
      el.className = 'ai-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  async function api(path, options = {}) {
    const resp = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.ok === false) {
      throw new Error(data.error || `请求失败 (${resp.status})`);
    }
    return data;
  }

  // 原地异步等待条（带旋转图标 + 当前模型 + 实时计时 + 一键取消）
  function mountInlineLoading(hostEl, { title, model, onCancel }) {
    if (!hostEl) return () => {};
    const startTs = Date.now();
    const box = document.createElement('div');
    box.className = 'ai-inline-loading';
    box.innerHTML = `
      <div class="ai-inline-loading-left">
        <span class="ai-spinner"></span>
        <span style="font-weight:600;">${escHtml(title || '正在处理中...')}</span>
        ${model ? `<span class="ai-model-tag">${escHtml(model)}</span>` : ''}
        <span class="ai-elapsed-badge">0.0s</span>
      </div>
      <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-cancel-task="1">⏹ 取消</button>
    `;
    hostEl.innerHTML = '';
    hostEl.appendChild(box);

    const elapsedEl = box.querySelector('.ai-elapsed-badge');
    const timer = setInterval(() => {
      const sec = ((Date.now() - startTs) / 1000).toFixed(1);
      if (elapsedEl) elapsedEl.textContent = `${sec}s`;
    }, 100);

    box.querySelector('[data-cancel-task]')?.addEventListener('click', () => {
      if (typeof onCancel === 'function') onCancel();
    });

    return () => {
      clearInterval(timer);
      if (box.parentNode === hostEl) box.remove();
    };
  }

  // ===== 1. 局部插槽 DOM 读取与回填 =====
  function cleanCloneText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.item-tools, .entry-tools, .section-tools, button').forEach((n) => n.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function splitBoldItem(li) {
    const clone = li.cloneNode(true);
    clone.querySelectorAll('.item-tools, button').forEach((n) => n.remove());
    const strong = clone.querySelector('strong');
    if (strong) {
      const title = (strong.textContent || '').replace(/[：:]\s*$/, '').trim();
      strong.remove();
      const detail = (clone.textContent || '').replace(/^\s*[：:]\s*/, '').replace(/\s+/g, ' ').trim();
      return { title, detail };
    }
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    const idx = text.search(/[：:]/);
    if (idx > 0 && idx < 22) {
      return { title: text.slice(0, idx).trim(), detail: text.slice(idx + 1).trim() };
    }
    return { title: '', detail: text };
  }

  function findTargetRoleEl() {
    const items = document.querySelectorAll('#pagesContainer .info-item');
    for (const item of items) {
      const label = cleanCloneText(item.querySelector('.info-label'));
      if (label.includes('求职意向')) {
        return item.querySelector('.info-val');
      }
    }
    return null;
  }

  function findSkillSection() {
    const sections = document.querySelectorAll('#pagesContainer .section');
    for (const sec of sections) {
      const title = cleanCloneText(sec.querySelector('.section-ribbon'));
      if (title.includes('技能')) return sec;
    }
    return null;
  }

  function findProjectEntries() {
    const result = [];
    const sections = document.querySelectorAll('#pagesContainer .section');
    for (const sec of sections) {
      const title = cleanCloneText(sec.querySelector('.section-ribbon'));
      if (!title.includes('项目')) continue;
      sec.querySelectorAll('.entry').forEach((entry) => result.push(entry));
    }
    return result;
  }

  function extractSkeletonFromRoot(root) {
    const roleEl = (() => {
      const items = root.querySelectorAll('.info-item');
      for (const item of items) {
        const label = cleanCloneText(item.querySelector('.info-label'));
        if (label.includes('求职意向')) return item.querySelector('.info-val');
      }
      return null;
    })();
    const targetRole = roleEl ? cleanCloneText(roleEl) : '';

    const skills = [];
    const skillSec = (() => {
      for (const sec of root.querySelectorAll('.section')) {
        if (cleanCloneText(sec.querySelector('.section-ribbon')).includes('技能')) return sec;
      }
      return null;
    })();
    if (skillSec) {
      skillSec.querySelectorAll('ul.bullet-list > li').forEach((li, idx) => {
        const { title, detail } = splitBoldItem(li);
        if (!title && !detail) return;
        skills.push({ id: `sk_${idx + 1}`, category: title || `技能${idx + 1}`, content: detail });
      });
    }

    const projects = [];
    const projEntries = [];
    for (const sec of root.querySelectorAll('.section')) {
      if (!cleanCloneText(sec.querySelector('.section-ribbon')).includes('项目')) continue;
      sec.querySelectorAll('.entry').forEach((entry) => projEntries.push(entry));
    }
    projEntries.forEach((entry, idx) => {
      const headSpans = entry.querySelectorAll('.entry-head-3 > span');
      const time = cleanCloneText(headSpans[0]);
      const name = cleanCloneText(headSpans[1]);
      const role = cleanCloneText(headSpans[2]);
      let techStack = '';
      let background = '';
      entry.querySelectorAll('.kv-line').forEach((kv) => {
        const text = cleanCloneText(kv);
        if (text.startsWith('技术栈')) {
          techStack = text.replace(/^技术栈[：:]\s*/, '').trim();
        } else if (text.startsWith('项目背景') || text.startsWith('项目简介')) {
          background = text.replace(/^(项目背景|项目简介)[：:]\s*/, '').trim();
        }
      });
      const bullets = [];
      entry.querySelectorAll('ul.bullet-list > li').forEach((li, bIdx) => {
        const { title, detail } = splitBoldItem(li);
        if (!title && !detail) return;
        bullets.push({ id: `p${idx + 1}_b${bIdx + 1}`, title, detail });
      });
      projects.push({
        id: `proj_${idx + 1}`,
        time,
        name,
        role,
        techStack,
        background,
        bullets
      });
    });

    return { targetRole, skills, projects };
  }

  function extractSkeletonFromDom() {
    return extractSkeletonFromRoot(document.getElementById('pagesContainer'));
  }

  function extractSkeletonFromHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return extractSkeletonFromRoot(tmp);
  }

  function applySelectionToDom(proposal, selection) {
    if (!proposal || !selection) return;
    if (typeof window.pushHistory === 'function') window.pushHistory();

    // 1. 求职意向
    if (selection.targetRole && proposal.targetRole?.suggested) {
      const roleEl = findTargetRoleEl();
      if (roleEl) roleEl.textContent = proposal.targetRole.suggested;
      document.querySelectorAll('#pagesContainer .cont-header span:last-child').forEach((sp) => {
        const txt = sp.textContent || '';
        const sep = txt.includes('｜') ? '｜' : txt.includes('|') ? '|' : '';
        if (sep) {
          const left = txt.split(sep)[0].trim();
          sp.textContent = `${left} ${sep} ${proposal.targetRole.suggested}`;
        }
      });
    }

    // 2. 专业技能
    const skillSec = findSkillSection();
    if (skillSec && Array.isArray(proposal.skills)) {
      const ul = skillSec.querySelector('ul.bullet-list');
      if (ul) {
        const chosenSkills = proposal.skills.filter((s) => selection.skills[s.id]);
        if (chosenSkills.length > 0) {
          ul.innerHTML = chosenSkills
            .map((s) => {
              const cat = s.category ? `<strong>${escHtml(s.category)}：</strong>` : '';
              return `<li>${cat}${escHtml(s.content)}</li>`;
            })
            .join('');
        }
      }
    }

    // 3. 项目经历（按真实骨架一一对应回填）
    const domEntries = findProjectEntries();
    if (Array.isArray(proposal.projects)) {
      proposal.projects.forEach((proj, idx) => {
        let entry = domEntries[idx];
        if (!entry) {
          entry = domEntries.find((e) => {
            const spans = e.querySelectorAll('.entry-head-3 > span');
            return cleanCloneText(spans[1]) === proj.name;
          });
        }
        if (!entry) return;

        // 技术栈
        if (selection.projectTech[proj.id] && proj.techStack?.suggested) {
          entry.querySelectorAll('.kv-line').forEach((kv) => {
            if (cleanCloneText(kv).startsWith('技术栈')) {
              kv.innerHTML = `<strong>技术栈：</strong>${escHtml(proj.techStack.suggested)}`;
            }
          });
        }

        // 功能模块列表
        const ul = entry.querySelector('ul.bullet-list');
        if (ul && Array.isArray(proj.bullets)) {
          const chosenBullets = proj.bullets.filter((b) => selection.projectBullets[b.id]);
          if (chosenBullets.length > 0) {
            ul.innerHTML = chosenBullets
              .map((b) => {
                const title = b.title ? `<strong>${escHtml(b.title)}：</strong>` : '';
                return `<li>${title}${escHtml(b.detail)}</li>`;
              })
              .join('');
          }
        }
      });
    }

    if (typeof window.enhanceBlocks === 'function') window.enhanceBlocks(window.pagesContainer);
    if (typeof window.updatePageNumbers === 'function') window.updatePageNumbers(true);
    if (typeof window.autoReflowPages === 'function') window.autoReflowPages(false);
    if (typeof window.pushHistory === 'function') window.pushHistory();
    if (typeof window.saveDraft === 'function') window.saveDraft();
  }

  // ===== 2. 初始化默认勾选状态（原有/改写默认勾，AI扩展默认不勾） =====
  function buildDefaultSelection(proposal) {
    const sel = {
      targetRole: proposal.targetRole?.origin !== 'ai_expanded',
      skills: {},
      projectTech: {},
      projectBullets: {}
    };
    (proposal.skills || []).forEach((s) => {
      sel.skills[s.id] = s.origin !== 'ai_expanded';
    });
    (proposal.projects || []).forEach((p) => {
      sel.projectTech[p.id] = p.techStack?.origin !== 'ai_expanded';
      (p.bullets || []).forEach((b) => {
        sel.projectBullets[b.id] = b.origin !== 'ai_expanded';
      });
    });
    return sel;
  }

  // ===== 3. 抽屉 UI 构建 =====
  function mountDrawer() {
    const backdrop = document.createElement('div');
    backdrop.id = 'aiDrawerBackdrop';
    backdrop.className = 'ai-drawer-backdrop';

    const drawer = document.createElement('aside');
    drawer.id = 'aiDrawer';
    drawer.className = 'ai-drawer';
    drawer.innerHTML = `
      <div class="ai-drawer-header">
        <div class="ai-drawer-title">✨ AI 岗位简历定制台</div>
        <button type="button" class="ai-drawer-close" id="aiDrawerClose" title="关闭">×</button>
      </div>
      <div class="ai-tabs">
        <button type="button" class="ai-tab active" data-tab="tailor">JD 定制</button>
        <button type="button" class="ai-tab" data-tab="knowledge">项目素材库</button>
        <button type="button" class="ai-tab" data-tab="inbox">收件箱 <span class="inbox-badge" id="aiTabInboxBadge" style="display:none">0</span></button>
        <button type="button" class="ai-tab" data-tab="archives">岗位档案</button>
        <button type="button" class="ai-tab" data-tab="settings">设置</button>
      </div>
      <div class="ai-drawer-body">
        <!-- Tab 1: JD 定制与审核 -->
        <div class="ai-panel active" id="aiPanel-tailor">
          <div class="ai-safety-banner">
            <strong>安全边界：</strong>仅基于真实项目骨架做定向改写与适度扩展；AI 扩展项默认<strong>不勾选</strong>，需你审核面试要点后才写入；本工具绝不自动投递，提交权 100% 归你。
          </div>

          <div class="ai-card">
            <div class="ai-card-title">
              <span>① 母版简历骨架</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="btnUploadMaster" title="上传本 13 套模板导出的 HTML 主简历（也支持直接拖入页面）">📂 上传主简历</button>
                <button type="button" class="ai-btn ai-btn-sm" id="btnSaveMaster">存当前简历为母版</button>
                <button type="button" class="ai-btn ai-btn-sm" id="btnRestoreMaster">恢复母版</button>
              </div>
            </div>
            <div class="ai-hint" id="aiMasterStatus">正在检查母版状态...</div>
          </div>

          <div class="ai-card">
            <div class="ai-card-title">
              <span>② 目标岗位 JD（支持贴图识图 / 手动粘贴 / 油猴推送）</span>
            </div>
            <div class="ai-row">
              <div>
                <label class="ai-field-label">公司名称</label>
                <input class="ai-input" id="aiCompanyInput" placeholder="例如：字节跳动" />
              </div>
              <div>
                <label class="ai-field-label">岗位名称</label>
                <input class="ai-input" id="aiJobTitleInput" placeholder="例如：Linux 运维工程师" />
              </div>
            </div>

            <div class="ai-paste-zone" id="aiPasteZone" tabindex="0">
              📷 点击此处后按 <strong>Ctrl + V</strong> 粘贴 JD 截图（支持 Snipaste），或点击上传截图自动识别
              <input type="file" id="aiScreenshotFile" accept="image/*" style="display:none" />
              <div id="aiPastePreviewWrap"></div>
            </div>

            <label class="ai-field-label">岗位 JD 正文</label>
            <textarea class="ai-textarea" id="aiJdTextarea" placeholder="粘贴目标岗位的职责与任职要求，或从「油猴收件箱」一键载入..."></textarea>

            <div style="margin-top:8px;">
              <label class="ai-field-label">补充偏好（可选）</label>
              <input class="ai-input" id="aiExtraNotes" placeholder="例如：重点突出 Docker/K8s 与监控告警排查经验" />
            </div>

            <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;">
              <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                <button type="button" class="ai-btn ai-btn-sm" id="btnModeQuickJump" title="点击前往设置切换默认模式 / Golden Set 模式">⚙️ 当前：默认模式</button>
                <select class="ai-quick-model-select" id="aiQuickTailorModel" title="临时切换本次生成使用的模型（不影响默认路由设置）">
                  <option value="">✍️ 生成模型：默认路由</option>
                </select>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="ai-btn" id="btnClearJd">清空</button>
                <button type="button" class="ai-btn ai-btn-primary" id="btnGenerateProposal">🚀 AI 分析 JD 并生成提案</button>
              </div>
            </div>
            <div id="aiGenerateBusySlot"></div>
          </div>

          <div id="aiEvalArea"></div>
          <div id="aiReviewArea"></div>
        </div>

        <!-- Tab 1.5: 项目深度素材库 & 提炼提示词模板 -->
        <div class="ai-panel" id="aiPanel-knowledge">
          <div class="ai-card">
            <div class="ai-card-title">
              <span>📋 项目深度提炼提示词模板（默认落盘桌面 MD）</span>
              <div style="display:flex;gap:6px;">
                <button type="button" class="ai-btn ai-btn-sm" id="btnTogglePromptPreview">展开编辑</button>
                <button type="button" class="ai-btn ai-btn-sm" id="btnResetExtractPrompt" title="恢复默认提炼提示词">↺ 恢复默认</button>
                <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="btnCopyExtractPrompt">一键复制提示词</button>
              </div>
            </div>
            <div class="ai-hint">
              点<strong>「一键复制提示词」</strong>发给任意能看代码仓的 AI（Antigravity / Cursor / Claude Code 等），会自动识别当前系统桌面并生成 <code>项目深度档案_&lt;项目名&gt;.md</code>（严格区分代码硬事实与待核实指标，绝不虚构提效数字），再直接导入下方素材库即可。
            </div>
            <textarea class="ai-prompt-editor" id="aiPromptPreviewBox" style="display:none;margin-top:8px;min-height:220px;"></textarea>
          </div>

          <div class="ai-card">
            <div class="ai-card-title">
              <span>📚 我的项目深度素材库（专供 AI 查资料，不印在简历上）</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;">
              <button type="button" class="ai-btn ai-btn-sm" id="btnSyncKbFromResume">从当前简历同步项目名</button>
              <button type="button" class="ai-btn ai-btn-sm" id="btnAddKbProject">+ 新增项目素材</button>
              <button type="button" class="ai-btn ai-btn-success ai-btn-sm" id="btnSaveKnowledge" style="margin-left:auto;">💾 保存素材库</button>
            </div>
            <div class="ai-hint">AI 定制简历时会<strong>优先</strong>从素材库提取你真实做过但母版未展开的模块与量化指标（标注为绿色 <strong>「素材库命中」</strong>）。</div>
          </div>

          <div id="aiKbList"></div>
        </div>

        <!-- Tab 2: 油猴收件箱 -->
        <div class="ai-panel" id="aiPanel-inbox">
          <div class="ai-card">
            <div class="ai-card-title">
              <span>📥 油猴抓取岗位收件箱（最多 200 条 · 自动去重）</span>
              <div style="display:flex;gap:5px;">
                <a class="ai-btn ai-btn-primary ai-btn-sm" href="/boss-jd-capture.user.js" target="_blank" style="text-decoration:none;">🧩 安装油猴脚本</a>
                <button type="button" class="ai-btn ai-btn-sm" id="btnRefreshInbox">刷新</button>
                <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" id="btnClearInbox">清空</button>
              </div>
            </div>
            <div class="ai-hint">支持在 BOSS 直聘手动单条或低频模拟点击收集岗位 JD，在此任意挑选并一键联动应用到「JD 定制」。</div>
            <div class="ai-inbox-toolbar">
              <input class="ai-input" id="aiInboxSearch" placeholder="搜索公司、岗位、城市或 JD 关键词..." style="flex:1;min-width:180px;" />
              <button type="button" class="ai-filter-pill active" data-inbox-status="all">全部</button>
              <button type="button" class="ai-filter-pill" data-inbox-status="pending">待定制</button>
              <button type="button" class="ai-filter-pill" data-inbox-status="tailored">已定制</button>
            </div>
          </div>
          <div id="aiInboxList"></div>
        </div>

        <!-- Tab 3: 公司岗位档案 -->
        <div class="ai-panel" id="aiPanel-archives">
          <div class="ai-card">
            <div class="ai-card-title">
              <span>🗂️ 历史生成的副模板档案（按公司-岗位绑定）</span>
              <button type="button" class="ai-btn ai-btn-sm" id="btnRefreshArchives">刷新</button>
            </div>
            <div class="ai-hint">每份 AI 副模板均绑定公司名、岗位名、薪资、城市、JD 原文与面试要点，随时点开查看、编辑或重导。</div>
            <div class="ai-inbox-toolbar">
              <input class="ai-input" id="aiArchiveSearch" placeholder="按公司名、岗位名、城市搜索历史生成的简历..." style="flex:1;" />
            </div>
          </div>
          <div id="aiArchivesList"></div>
        </div>

        <!-- Tab 4: 模型设置（手风琴折叠 + Golden Set + 系统提示词透明化） -->
        <div class="ai-panel" id="aiPanel-settings">
          <details class="ai-accordion" open>
            <summary>⚙️ 运行模式与 OpenAI 兼容接口配置</summary>
            <div class="ai-accordion-body">
              <label class="ai-field-label">生成与评测模式</label>
              <div class="ai-mode-switch">
                <button type="button" class="ai-mode-opt active" data-cfg-mode="default">默认模式（通用大厂标准）</button>
                <button type="button" class="ai-mode-opt is-golden" data-cfg-mode="golden">🏆 Golden Set 模式（标杆对齐 + 自动评测）</button>
              </div>

              <div style="margin-bottom:8px;">
                <label class="ai-field-label">统一接口 Base URL（默认供所有模块继承）</label>
                <input class="ai-input" id="cfgBaseUrl" placeholder="https://api.deepseek.com/v1" />
              </div>
              <div style="margin-bottom:8px;">
                <label class="ai-field-label">统一接口 API Key（留空则保持已保存密钥不变）</label>
                <input class="ai-input" type="password" id="cfgApiKey" placeholder="sk-..." />
                <div class="ai-hint" id="cfgKeyStatus" style="margin-top:4px;"></div>
              </div>
              <div>
                <label class="ai-field-label">全局兜底主模型（任意模块未单独指定时自动回退到此模型）</label>
                <input class="ai-input" id="cfgModel" list="aiAllModelsDatalist" placeholder="从模型目录点选或手动输入" />
              </div>
              <datalist id="aiAllModelsDatalist"></datalist>
              <datalist id="aiVisionModelsDatalist"></datalist>
            </div>
          </details>

          <details class="ai-accordion" open>
            <summary>🔀 4 大核心模块独立模型路由（支持跨供应商覆盖）</summary>
            <div class="ai-accordion-body">
              <div class="ai-hint" style="margin-bottom:8px;">
                为不同 AI 模块分配最擅长的模型（强烈建议「生成」与「评测」选不同模型避免自评偏见）。默认继承上方统一接口；如需跨平台混用，展开单个模块的「独立接口」覆盖即可。
              </div>

              <div class="ai-route-card" data-route-card="tailor">
                <div class="ai-route-head">
                  <span class="ai-route-name">✍️ 1. 生成模块</span>
                  <span class="ai-route-sub">简历定向改写 & 二轮精修</span>
                </div>
                <input class="ai-input" id="routeModel_tailor" list="aiAllModelsDatalist" placeholder="留空则使用全局兜底主模型" />
                <details class="ai-route-override">
                  <summary>▸ 独立接口（跨供应商覆盖，留空继承统一接口）</summary>
                  <div class="ai-route-override-body">
                    <input class="ai-input" id="routeUrl_tailor" placeholder="独立 Base URL（可选）" style="margin-bottom:6px;" />
                    <input class="ai-input" type="password" id="routeKey_tailor" placeholder="独立 API Key（可选，留空保持不变）" />
                    <div class="ai-hint" id="routeKeyStatus_tailor" style="margin-top:3px;"></div>
                  </div>
                </details>
              </div>

              <div class="ai-route-card" data-route-card="evaluate">
                <div class="ai-route-head">
                  <span class="ai-route-name">⚖️ 2. 评测模块（独立裁判）</span>
                  <span class="ai-route-sub">LLM-as-a-Judge 多维打分与点评</span>
                </div>
                <input class="ai-input" id="routeModel_evaluate" list="aiAllModelsDatalist" placeholder="建议选与「生成模块」不同的模型" />
                <div class="ai-route-warn" id="aiSameModelWarn" style="display:none;">⚠️ 当前评测模块与生成模块使用同一模型，可能存在自我打分偏见，建议在模型目录中为评测换一个不同模型。</div>
                <details class="ai-route-override">
                  <summary>▸ 独立接口（跨供应商覆盖，留空继承统一接口）</summary>
                  <div class="ai-route-override-body">
                    <input class="ai-input" id="routeUrl_evaluate" placeholder="独立 Base URL（可选）" style="margin-bottom:6px;" />
                    <input class="ai-input" type="password" id="routeKey_evaluate" placeholder="独立 API Key（可选，留空保持不变）" />
                    <div class="ai-hint" id="routeKeyStatus_evaluate" style="margin-top:3px;"></div>
                  </div>
                </details>
              </div>

              <div class="ai-route-card" data-route-card="goldenExtract">
                <div class="ai-route-head">
                  <span class="ai-route-name">🏆 3. 标杆提炼模块</span>
                  <span class="ai-route-sub">Golden Set 写作画像抽象提炼</span>
                </div>
                <input class="ai-input" id="routeModel_goldenExtract" list="aiAllModelsDatalist" placeholder="留空则使用全局兜底主模型" />
                <details class="ai-route-override">
                  <summary>▸ 独立接口（跨供应商覆盖，留空继承统一接口）</summary>
                  <div class="ai-route-override-body">
                    <input class="ai-input" id="routeUrl_goldenExtract" placeholder="独立 Base URL（可选）" style="margin-bottom:6px;" />
                    <input class="ai-input" type="password" id="routeKey_goldenExtract" placeholder="独立 API Key（可选，留空保持不变）" />
                    <div class="ai-hint" id="routeKeyStatus_goldenExtract" style="margin-top:3px;"></div>
                  </div>
                </details>
              </div>

              <div class="ai-route-card" data-route-card="vision">
                <div class="ai-route-head">
                  <span class="ai-route-name">📷 4. 视觉识图模块</span>
                  <span class="ai-route-sub">JD 截图识图 + PNG/JPG 标杆简历识图</span>
                </div>
                <input class="ai-input" id="routeModel_vision" list="aiVisionModelsDatalist" placeholder="建议选带 📷 标记的多模态视觉模型" />
                <details class="ai-route-override">
                  <summary>▸ 独立接口（跨供应商覆盖，留空继承统一接口）</summary>
                  <div class="ai-route-override-body">
                    <input class="ai-input" id="routeUrl_vision" placeholder="独立 Base URL（可选）" style="margin-bottom:6px;" />
                    <input class="ai-input" type="password" id="routeKey_vision" placeholder="独立 API Key（可选，留空保持不变）" />
                    <div class="ai-hint" id="routeKeyStatus_vision" style="margin-top:3px;"></div>
                  </div>
                </details>
              </div>
            </div>
          </details>

          <details class="ai-accordion">
            <summary>📋 模型目录（拉取可用模型 · 一键指派 生/评/标/视）</summary>
            <div class="ai-accordion-body">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;">
                <span class="ai-hint">点 📷 标图片能力，点 <strong>生/评/标/视</strong> 一键指派给对应模块</span>
                <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="btnFetchModels">🔄 获取可用模型</button>
              </div>
              <div id="aiModelCatalogList"></div>
              <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
                <button type="button" class="ai-btn ai-btn-sm" id="btnAddModelRow">+ 添加模型</button>
                <span class="ai-hint" id="aiModelCatalogCount"></span>
              </div>
            </div>
          </details>

          <details class="ai-accordion" open>
            <summary>🏆 Golden Set 黄金标杆样本库（PDF / DOCX / HTML / PNG）</summary>
            <div class="ai-accordion-body">
              <div class="ai-hint" style="margin-bottom:8px;">
                上传你认可的高分标杆简历（支持 <strong>PDF / DOCX / HTML / PNG / JPG / WEBP</strong>；文档本地解析，图片自动走视觉模型识图并脱敏），AI 将提炼其写作范式用于<strong>生成对齐与多维评测打分</strong>。
              </div>
              <div class="ai-row" style="align-items:center;">
                <input class="ai-input" id="gsTagInput" placeholder="方向标签（如：AI应用 / 运维 / 后端）" style="flex:1;" />
                <label class="ai-btn ai-btn-primary ai-btn-sm" style="flex:0 0 auto;cursor:pointer;">
                  📤 上传标杆简历
                  <input type="file" id="gsFileInput" accept=".pdf,.docx,.html,.htm,.png,.jpg,.jpeg,.webp" style="display:none;" />
                </label>
              </div>
              <div id="aiGoldenList"></div>
            </div>
          </details>

          <details class="ai-accordion">
            <summary>📝 系统提示词与规则（透明化 · 可自由编辑）</summary>
            <div class="ai-accordion-body">
              <div class="ai-hint" style="margin-bottom:10px;">
                以下为系统实际发送给大模型的底层 System Prompt，支持直接修改、拖拽右下角缩放高度，或一键恢复默认。修改后点击底部「保存全部设置」生效。
              </div>

              <div class="ai-prompt-block">
                <div class="ai-prompt-block-head">
                  <label class="ai-field-label" style="margin:0;">1. 简历定向改写系统提示词</label>
                  <button type="button" class="ai-btn ai-btn-sm" data-reset-prompt="tailorSystemPrompt">↺ 恢复默认</button>
                </div>
                <textarea class="ai-prompt-editor" id="cfgPromptTailor"></textarea>
              </div>

              <div class="ai-prompt-block">
                <div class="ai-prompt-block-head">
                  <label class="ai-field-label" style="margin:0;">2. 独立评测打分系统提示词（LLM-as-a-Judge）</label>
                  <button type="button" class="ai-btn ai-btn-sm" data-reset-prompt="evalSystemPrompt">↺ 恢复默认</button>
                </div>
                <textarea class="ai-prompt-editor" id="cfgPromptEval"></textarea>
              </div>

              <div class="ai-prompt-block">
                <div class="ai-prompt-block-head">
                  <label class="ai-field-label" style="margin:0;">3. Golden Set 风格画像提炼提示词</label>
                  <button type="button" class="ai-btn ai-btn-sm" data-reset-prompt="goldenExtractPrompt">↺ 恢复默认</button>
                </div>
                <textarea class="ai-prompt-editor" id="cfgPromptGolden"></textarea>
              </div>
            </div>
          </details>

          <div style="display:flex;justify-content:flex-end;margin-top:4px;margin-bottom:12px;">
            <button type="button" class="ai-btn ai-btn-primary" id="btnSaveConfig">💾 保存全部设置（模式 / 模型 / 提示词）</button>
          </div>
        </div>
      </div>

      <div class="ai-drawer-footer" id="aiDrawerFooter" style="display:none;">
        <button type="button" class="ai-btn" id="btnSaveArchiveOnly">💾 仅保存档案</button>
        <button type="button" class="ai-btn ai-btn-success" id="btnApplyAndArchive">✅ 确认勾选并生成副模板</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    const openDrawer = () => {
      backdrop.classList.add('open');
      drawer.classList.add('open');
      loadInbox();
      loadArchives();
    };
    const closeDrawer = () => {
      backdrop.classList.remove('open');
      drawer.classList.remove('open');
    };

    document.getElementById('btnAiTailor')?.addEventListener('click', openDrawer);
    document.getElementById('aiDrawerClose').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    // Tab 切换
    drawer.querySelectorAll('.ai-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
      });
    });

    bindDrawerEvents();
  }

  function switchTab(name) {
    document.querySelectorAll('#aiDrawer .ai-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('#aiDrawer .ai-panel').forEach((p) => p.classList.toggle('active', p.id === `aiPanel-${name}`));
    const footer = document.getElementById('aiDrawerFooter');
    footer.style.display = name === 'tailor' && state.currentProposal ? 'flex' : 'none';
  }

  // ===== 4. 审核区渲染 =====
  function originBadge(origin) {
    if (origin === 'ai_expanded') return '<span class="ai-origin-tag ai-origin-ai_expanded">AI 扩展 · 需确认</span>';
    if (origin === 'kb_matched') return '<span class="ai-origin-tag ai-origin-kb_matched">素材库命中</span>';
    if (origin === 'rewritten') return '<span class="ai-origin-tag ai-origin-rewritten">JD 改写</span>';
    return '<span class="ai-origin-tag ai-origin-original">原有</span>';
  }

  function renderReviewArea() {
    const area = document.getElementById('aiReviewArea');
    const footer = document.getElementById('aiDrawerFooter');
    const p = state.currentProposal;
    const sel = state.selection;
    if (!p || !sel) {
      area.innerHTML = '';
      footer.style.display = 'none';
      return;
    }

    const hitHtml = (p.matchedKeywords || []).map((k) => `<span class="ai-kw ai-kw-hit">✓ ${escHtml(k)}</span>`).join('');
    const missHtml = (p.missingKeywords || []).map((k) => `<span class="ai-kw ai-kw-miss">! 缺失: ${escHtml(k)}</span>`).join('');

    const skillsHtml = (p.skills || [])
      .map((s) => {
        const checked = sel.skills[s.id] ? 'checked' : '';
        const tip = s.interviewTip ? `<div class="ai-interview-tip"><strong>💡 面试应对要点（不写入简历）：</strong>${escHtml(s.interviewTip)}</div>` : '';
        return `
          <div class="ai-review-item origin-${escHtml(s.origin)}">
            <label class="ai-review-head">
              <input type="checkbox" data-kind="skill" data-id="${escHtml(s.id)}" ${checked} />
              <div class="ai-review-content">
                ${originBadge(s.origin)}<strong>${escHtml(s.category)}：</strong>${escHtml(s.content)}
                ${s.reason ? `<div class="ai-reason">对齐说明：${escHtml(s.reason)}</div>` : ''}
                ${tip}
              </div>
            </label>
          </div>`;
      })
      .join('');

    const projectsHtml = (p.projects || [])
      .map((proj) => {
        const techChecked = sel.projectTech[proj.id] ? 'checked' : '';
        const techOrigin = proj.techStack?.origin || 'rewritten';
        const techTip = proj.techStack?.interviewTip
          ? `<div class="ai-interview-tip"><strong>💡 技术栈面试要点（不写入简历）：</strong>${escHtml(proj.techStack.interviewTip)}</div>`
          : '';
        const bulletsHtml = (proj.bullets || [])
          .map((b) => {
            const bChecked = sel.projectBullets[b.id] ? 'checked' : '';
            const bTip = b.interviewTip
              ? `<div class="ai-interview-tip"><strong>💡 面试应对要点（不写入简历）：</strong>${escHtml(b.interviewTip)}</div>`
              : '';
            return `
              <div class="ai-review-item origin-${escHtml(b.origin)}">
                <label class="ai-review-head">
                  <input type="checkbox" data-kind="bullet" data-id="${escHtml(b.id)}" ${bChecked} />
                  <div class="ai-review-content">
                    ${originBadge(b.origin)}<strong>${escHtml(b.title)}：</strong>${escHtml(b.detail)}
                    ${b.reason ? `<div class="ai-reason">对齐说明：${escHtml(b.reason)}</div>` : ''}
                    ${bTip}
                  </div>
                </label>
              </div>`;
          })
          .join('');

        return `
          <div class="ai-card">
            <div class="ai-card-title">
              <span>📌 ${escHtml(proj.name)}</span>
              <span class="ai-hint">${escHtml(proj.time)} · ${escHtml(proj.role)}</span>
            </div>
            <div class="ai-review-item origin-${escHtml(techOrigin)}">
              <label class="ai-review-head">
                <input type="checkbox" data-kind="tech" data-id="${escHtml(proj.id)}" ${techChecked} />
                <div class="ai-review-content">
                  ${originBadge(techOrigin)}<strong>技术栈：</strong>${escHtml(proj.techStack?.suggested || '')}
                  ${proj.techStack?.addedKeywords?.length ? `<div class="ai-reason">新增技术词：${escHtml(proj.techStack.addedKeywords.join('、'))}</div>` : ''}
                  ${techTip}
                </div>
              </label>
            </div>
            ${bulletsHtml}
          </div>`;
      })
      .join('');

    area.innerHTML = `
      <div class="ai-card">
        <div class="ai-card-title">
          <span>③ JD 匹配诊断 ${p._usedModel ? `<span class="ai-model-tag">✍️ 生成：${escHtml(p._usedModel)}</span>` : ''}</span>
          <span style="color:#2563eb;font-size:14px;">匹配度约 ${escHtml(p.matchScore ?? '-')} 分</span>
        </div>
        <div class="ai-hint">${escHtml(p.jdSummary || '')}</div>
        <div class="ai-kw-group">${hitHtml}${missHtml}</div>
      </div>

      ${
        p.targetRole?.suggested
          ? `<div class="ai-card">
              <div class="ai-card-title">求职意向建议</div>
              <div class="ai-review-item origin-${escHtml(p.targetRole.origin)}">
                <label class="ai-review-head">
                  <input type="checkbox" data-kind="targetRole" ${sel.targetRole ? 'checked' : ''} />
                  <div class="ai-review-content">
                    ${originBadge(p.targetRole.origin)}<strong>${escHtml(p.targetRole.suggested)}</strong>
                    ${p.targetRole.reason ? `<div class="ai-reason">${escHtml(p.targetRole.reason)}</div>` : ''}
                  </div>
                </label>
              </div>
            </div>`
          : ''
      }

      <div class="ai-card">
        <div class="ai-card-title">专业技能勾选（AI 扩展项默认不勾，请审核后勾选）</div>
        ${skillsHtml}
      </div>

      ${projectsHtml}
    `;

    area.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const kind = cb.dataset.kind;
        const id = cb.dataset.id;
        if (kind === 'targetRole') state.selection.targetRole = cb.checked;
        else if (kind === 'skill') state.selection.skills[id] = cb.checked;
        else if (kind === 'tech') state.selection.projectTech[id] = cb.checked;
        else if (kind === 'bullet') state.selection.projectBullets[id] = cb.checked;
      });
    });

    footer.style.display = 'flex';
  }

  // ===== 5. 业务交互绑定 =====
  async function handleOcrImage(dataUrl) {
    state.pastedImageDataUrl = dataUrl;
    const wrap = document.getElementById('aiPastePreviewWrap');
    wrap.innerHTML = `<img class="ai-paste-preview" src="${dataUrl}" /><div id="aiOcrBusySlot"></div>`;
    const controller = new AbortController();
    const cleanup = mountInlineLoading(document.getElementById('aiOcrBusySlot'), {
      title: '正在调用视觉模型识别 JD 截图...',
      model: getEffectiveModuleModel('vision'),
      onCancel: () => controller.abort()
    });
    try {
      const { extracted } = await api('/api/ocr-jd', {
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      if (extracted.company) document.getElementById('aiCompanyInput').value = extracted.company;
      if (extracted.jobTitle) document.getElementById('aiJobTitleInput').value = extracted.jobTitle;
      if (extracted.salary) state.currentSalary = extracted.salary;
      if (extracted.city) state.currentCity = extracted.city;
      if (extracted.jdText) document.getElementById('aiJdTextarea').value = extracted.jdText;
      wrap.innerHTML = `<img class="ai-paste-preview" src="${dataUrl}" /><div class="ai-hint" style="color:#059669;">✓ 截图识别完成，已自动填充 JD</div>`;
      showToast('JD 截图识别成功');
    } catch (err) {
      if (err.name === 'AbortError') {
        wrap.innerHTML = `<img class="ai-paste-preview" src="${dataUrl}" /><div class="ai-hint">已取消本次截图识图</div>`;
        showToast('已取消截图识图');
      } else {
        wrap.innerHTML = `<img class="ai-paste-preview" src="${dataUrl}" /><div class="ai-hint" style="color:#dc2626;">识图失败：${escHtml(err.message)}</div>`;
        showToast(`识图失败：${err.message}`);
      }
    } finally {
      cleanup();
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function bindDrawerEvents() {
    // 贴图识别（Ctrl+V / 点击上传）
    const pasteZone = document.getElementById('aiPasteZone');
    const fileInput = document.getElementById('aiScreenshotFile');
    pasteZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const f = fileInput.files?.[0];
      if (!f) return;
      const dataUrl = await fileToDataUrl(f);
      handleOcrImage(dataUrl);
      fileInput.value = '';
    });

    document.getElementById('aiPanel-tailor').addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const dataUrl = await fileToDataUrl(file);
            handleOcrImage(dataUrl);
          }
          return;
        }
      }
    });

    // 上传 13 套模板 HTML 主简历（严格校验 + 安全清理 + 压缩大图 + 写入后端 /api/master/upload）
    const ALLOWED_MASTER_THEMES = new Set([
      'sage-ribbon', 'basic-a4', 'minimal-prose', 'corporate-classic', 'gov-red',
      'folio-ledger', 'sidebar-compact', 'timeline-grid', 'editorial',
      'swiss-neue', 'bauhaus', 'code-poetry', 'mono-raw'
    ]);

    function ensureMasterUploadDom() {
      if (!document.getElementById('aiMasterHtmlInput')) {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.id = 'aiMasterHtmlInput';
        inp.accept = '.html,.htm,text/html';
        inp.style.display = 'none';
        document.body.appendChild(inp);
        inp.addEventListener('change', (e) => {
          const f = e.target.files && e.target.files[0];
          if (f) uploadMasterHtmlFile(f);
          inp.value = '';
        });
      }
      if (!document.getElementById('aiFileDropOverlay')) {
        const ov = document.createElement('div');
        ov.id = 'aiFileDropOverlay';
        ov.className = 'ai-file-drop-overlay';
        ov.innerHTML = `
          <div class="ai-file-drop-card">
            <h3>📂 松开鼠标，上传主简历 HTML</h3>
            <p>暂仅支持本 13 套模板（及兼容多页模板）导出的 .html 格式主简历</p>
          </div>
        `;
        document.body.appendChild(ov);
      }
    }
    ensureMasterUploadDom();

    function triggerMasterUploadPicker() {
      ensureMasterUploadDom();
      document.getElementById('aiMasterHtmlInput')?.click();
    }

    function validateMasterHtmlDoc(doc) {
      const schemaMeta = doc.querySelector('meta[name="resume-template-schema"]');
      const hasFingerprint = Boolean(schemaMeta && /^universal-13/i.test(schemaMeta.getAttribute('content') || ''));
      const container = doc.querySelector('#pagesContainer') || doc.querySelector('.pages-container');
      if (!container) {
        return { ok: false, reason: '未检测到本模板的简历容器（#pagesContainer），仅支持这 13 套模板导出的 HTML 主简历。' };
      }
      const pages = container.querySelectorAll('section.page, .page');
      if (pages.length === 0) {
        return { ok: false, reason: '未检测到有效的 A4 简历页（.page），无法上传。' };
      }
      const hasCore = Boolean(
        container.querySelector('.page-body .section .section-header .section-ribbon') ||
        container.querySelector('.page-body .section .section-content')
      );
      if (!hasFingerprint && !hasCore) {
        return { ok: false, reason: '该 HTML 不是本 13 套模板（或兼容多页模板）导出的简历，已拒绝上传。' };
      }
      return { ok: true, container };
    }

    function compressBigPhotoDataUrl(dataUrl, maxChars = 280000) {
      return new Promise((resolve) => {
        if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length <= maxChars) {
          resolve(dataUrl);
          return;
        }
        const img = new Image();
        img.onload = () => {
          const maxW = 600;
          const scale = img.width > maxW ? maxW / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    }

    async function sanitizeImportedMasterContainer(container) {
      container.querySelectorAll('script, iframe, object, embed, link, style').forEach((el) => el.remove());
      container.querySelectorAll('[draggable]').forEach((el) => el.removeAttribute('draggable'));
      container.querySelectorAll('.is-dragging, .drop-before, .drop-after, .drop-into').forEach((el) => {
        el.classList.remove('is-dragging', 'drop-before', 'drop-after', 'drop-into');
      });
      // 修复旧版 <p> 内嵌 <div> 拆裂问题
      Array.from(container.querySelectorAll('p.kv-line, p.paragraph-text')).forEach((p) => {
        const div = document.createElement('div');
        div.className = p.className;
        const pEmpty = (p.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '';
        const next = p.nextElementSibling;
        if (pEmpty && next && next.classList.contains('item-text')) {
          div.appendChild(next);
          p.replaceWith(div);
          let sib = div.nextElementSibling;
          while (sib && (sib.classList.contains('item-tools') || (sib.tagName === 'P' && (sib.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === ''))) {
            const rm = sib;
            sib = sib.nextElementSibling;
            rm.remove();
          }
        } else {
          while (p.firstChild) div.appendChild(p.firstChild);
          p.replaceWith(div);
        }
      });
      container.querySelectorAll('.entry > p, .section-content > p').forEach((p) => {
        if ((p.textContent || '').replace(/[\u200B\u00A0\s]/g, '') === '') p.remove();
      });
      // 压缩超大 Base64 证件照
      const imgs = Array.from(container.querySelectorAll('img[src^="data:image/"]'));
      for (const imgEl of imgs) {
        const src = imgEl.getAttribute('src') || '';
        if (src.length > 280000) {
          imgEl.setAttribute('src', await compressBigPhotoDataUrl(src, 280000));
        }
      }
      // 补齐 bauhaus-dots 兼容元素
      const firstHeader = container.querySelector('.page .resume-header');
      if (firstHeader && !firstHeader.querySelector('.bauhaus-dots')) {
        const dots = document.createElement('div');
        dots.className = 'bauhaus-dots';
        dots.setAttribute('aria-hidden', 'true');
        dots.innerHTML = '<span class="bd-r"></span><span class="bd-y"></span><span class="bd-b"></span>';
        firstHeader.appendChild(dots);
      }
      return container.innerHTML;
    }

    async function uploadMasterHtmlFile(file) {
      if (!file) return;
      if (!/\.html?$/i.test(file.name) && file.type && !file.type.includes('html')) {
        alert('格式不支持：暂仅支持上传这 13 套模板导出的 .html 格式主简历。');
        return;
      }
      let rawText = '';
      try {
        rawText = await file.text();
      } catch {
        showToast('读取主简历文件失败');
        return;
      }

      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(rawText, 'text/html');
      const check = validateMasterHtmlDoc(parsedDoc);
      if (!check.ok) {
        alert('上传被拒绝：' + check.reason);
        showToast('上传被拒绝：非本 13 套模板格式');
        return;
      }

      const rawTheme = parsedDoc.body?.getAttribute('data-theme') || 'sage-ribbon';
      const targetTheme = ALLOWED_MASTER_THEMES.has(rawTheme) ? rawTheme : 'sage-ribbon';
      const rootStyleAttr = parsedDoc.documentElement.getAttribute('style') || '';
      const fsMatch = rootStyleAttr.match(/--body-size:\s*([0-9.]+)pt/i);
      const lhMatch = rootStyleAttr.match(/--body-lh:\s*([0-9.]+)/i);
      const importedStyle = {
        fontSize: fsMatch ? Math.min(12.0, Math.max(8.5, parseFloat(fsMatch[1]))) : 9.5,
        density: lhMatch ? (parseFloat(lhMatch[1]) <= 1.52 ? 'compact' : parseFloat(lhMatch[1]) >= 1.68 ? 'airy' : 'normal') : 'normal'
      };

      const cleanInner = await sanitizeImportedMasterContainer(check.container);

      // 若当前在副模板，先静默保存副模板再切回主简历标签
      if (state.activeDocId !== 'master') {
        await flushCurrentDocToBackend();
        state.activeDocId = 'master';
      }

      if (typeof window.pushHistory === 'function') window.pushHistory();
      loadHtmlIntoCanvas(cleanInner, targetTheme);

      // 还原字号与松紧 CSS 变量
      document.documentElement.style.setProperty('--body-size', `${importedStyle.fontSize.toFixed(1)}pt`);
      const skeleton = extractSkeletonFromDom();
      const finalHtml = window.pagesContainer.innerHTML;

      try {
        let resp;
        try {
          resp = await api('/api/master/upload', {
            method: 'POST',
            body: JSON.stringify({
              html: finalHtml,
              theme: targetTheme,
              skeleton,
              sourceFileName: file.name,
              styleState: importedStyle
            })
          });
        } catch (err) {
          // 若旧进程尚未重启导致 /api/master/upload 暂返回 404，自动回退到 /api/master 保存
          if (String(err.message || '').includes('404') || String(err.message || '').includes('Cannot POST')) {
            resp = await api('/api/master', {
              method: 'POST',
              body: JSON.stringify({ html: finalHtml, theme: targetTheme, skeleton, sourceFileName: file.name })
            });
          } else {
            throw err;
          }
        }
        state.master = resp.master;
        if (typeof window.pushHistory === 'function') window.pushHistory();
        if (typeof window.saveDraft === 'function') window.saveDraft();
        updateMasterStatus();
        renderWorkspaceBar();
        showToast(`✅ 已上传主简历「${file.name}」（${skeleton.projects.length} 个项目 / ${skeleton.skills.length} 条技能，可 Ctrl+Z 撤回）`);
      } catch (err) {
        showToast(`上传主简历失败：${err.message}`);
      }
    }

    document.getElementById('btnUploadMaster')?.addEventListener('click', triggerMasterUploadPicker);

    // 支持直接拖入 .html 主简历文件到整个窗口（仅响应外部文件拖拽，不干扰画布内小模块拖拽）
    let masterDragDepth = 0;
    function isHtmlFileDragEvent(e) {
      if (document.querySelector('#pagesContainer .is-dragging')) return false;
      const types = e.dataTransfer && e.dataTransfer.types;
      return Boolean(types && Array.from(types).includes('Files'));
    }
    window.addEventListener('dragenter', (e) => {
      if (!isHtmlFileDragEvent(e)) return;
      e.preventDefault();
      masterDragDepth++;
      document.getElementById('aiFileDropOverlay')?.classList.add('active');
    });
    window.addEventListener('dragover', (e) => {
      if (!isHtmlFileDragEvent(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('dragleave', (e) => {
      if (!isHtmlFileDragEvent(e)) return;
      masterDragDepth = Math.max(0, masterDragDepth - 1);
      if (masterDragDepth === 0) document.getElementById('aiFileDropOverlay')?.classList.remove('active');
    });
    window.addEventListener('drop', (e) => {
      if (!isHtmlFileDragEvent(e)) return;
      e.preventDefault();
      masterDragDepth = 0;
      document.getElementById('aiFileDropOverlay')?.classList.remove('active');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) uploadMasterHtmlFile(f);
    });

    // 保存 / 恢复母版（走显式主简历保存接口 POST /api/master/save）
    document.getElementById('btnSaveMaster').addEventListener('click', async () => {
      try {
        const master = await persistMasterFromDom(false);
        const sk = master?.skeleton || { projects: [], skills: [] };
        showToast(`✅ 已保存主简历 v${master?.revision || 1}（${sk.projects.length} 个项目，${sk.skills.length} 条技能）`);
      } catch (err) {
        showToast(`保存主简历失败：${err.message}`);
      }
    });

    document.getElementById('btnRestoreMaster').addEventListener('click', () => {
      if (!state.master?.html) {
        showToast('尚未保存母版，请先点击「存当前简历为母版」');
        return;
      }
      if (typeof window.pushHistory === 'function') window.pushHistory();
      window.pagesContainer.innerHTML = state.master.html;
      if (state.master.theme && typeof window.applyTheme === 'function') {
        window.applyTheme(state.master.theme, false);
      }
      if (typeof window.enhanceBlocks === 'function') window.enhanceBlocks(window.pagesContainer);
      if (typeof window.bindPhotoUpload === 'function') window.bindPhotoUpload();
      if (typeof window.updatePageNumbers === 'function') window.updatePageNumbers(true);
      if (typeof window.pushHistory === 'function') window.pushHistory();
      if (typeof window.saveDraft === 'function') window.saveDraft();
      showToast('已恢复到母版简历');
    });

    document.getElementById('btnClearJd').addEventListener('click', () => {
      document.getElementById('aiCompanyInput').value = '';
      document.getElementById('aiJobTitleInput').value = '';
      document.getElementById('aiJdTextarea').value = '';
      document.getElementById('aiExtraNotes').value = '';
      document.getElementById('aiPastePreviewWrap').innerHTML = '';
      state.currentArchiveId = null;
      state.currentSourceUrl = '';
      state.currentProposal = null;
      state.currentEvaluation = null;
      state.selection = null;
      renderEvalArea();
      renderReviewArea();
    });

    // AI 生成提案（支持传入 evalFeedback 进行二轮按评测建议优化 + 原地进度条与取消）
    let activeGenController = null;
    let activeEvalController = null;

    async function runGenerateProposal(evalFeedback = null) {
      const btn = document.getElementById('btnGenerateProposal');
      const company = document.getElementById('aiCompanyInput').value.trim();
      const jobTitle = document.getElementById('aiJobTitleInput').value.trim();
      const jdText = document.getElementById('aiJdTextarea').value.trim();
      const extraNotes = document.getElementById('aiExtraNotes').value.trim();
      if (!jdText) {
        showToast('请先输入 JD 正文、粘贴 JD 截图或从油猴收件箱载入');
        return;
      }
      if (activeGenController) activeGenController.abort();
      activeGenController = new AbortController();

      const masterSkeleton = state.master?.skeleton || extractSkeletonFromDom();
      const modelOverride = (document.getElementById('aiQuickTailorModel')?.value || '').trim();
      const activeModel = modelOverride || getEffectiveModuleModel('tailor');
      const busySlot = evalFeedback
        ? document.getElementById('aiEvalBusySlot') || document.getElementById('aiGenerateBusySlot')
        : document.getElementById('aiGenerateBusySlot');

      btn.disabled = true;
      const refineBtn = document.getElementById('btnRefineByEval');
      if (refineBtn) refineBtn.disabled = true;

      const cleanup = mountInlineLoading(busySlot, {
        title: evalFeedback ? '正在按评测建议精修优化...' : '正在分析 JD 并生成定制提案...',
        model: activeModel,
        onCancel: () => activeGenController?.abort()
      });

      try {
        const { proposal, mode } = await api('/api/tailor', {
          method: 'POST',
          signal: activeGenController.signal,
          body: JSON.stringify({ masterSkeleton, company, jobTitle, jdText, extraNotes, evalFeedback, modelOverride })
        });
        state.currentProposal = proposal;
        state.currentEvaluation = null;
        state.evalExpanded = true;
        state.selection = buildDefaultSelection(proposal);
        renderReviewArea();
        renderEvalArea();
        if (mode === 'golden') {
          showToast('AI 提案已生成，正在按 Golden Set 自动运行独立评测...');
          await runEvaluateCurrentProposal();
        } else {
          showToast('AI 定制提案已生成，可点击「📊 评测这份提案」查看多维打分');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast('已取消本次生成/优化请求');
        } else {
          showToast(`生成失败：${err.message}`);
        }
      } finally {
        cleanup();
        activeGenController = null;
        btn.disabled = false;
        const rBtn = document.getElementById('btnRefineByEval');
        if (rBtn) rBtn.disabled = false;
      }
    }

    async function runEvaluateCurrentProposal(modelOverrideArg = '') {
      if (!state.currentProposal) return;
      if (activeEvalController) activeEvalController.abort();
      activeEvalController = new AbortController();

      const modelOverride = String(modelOverrideArg || document.getElementById('aiQuickEvalModel')?.value || '').trim();
      const activeModel = modelOverride || getEffectiveModuleModel('evaluate');

      // 原地叠加等待条：若已有评测卡片则保留旧卡片不清空，只在顶部显示等待条与取消按钮
      let busySlot = document.getElementById('aiEvalBusySlot');
      if (!busySlot) {
        const evalArea = document.getElementById('aiEvalArea');
        if (evalArea) {
          evalArea.innerHTML = '<div class="ai-eval-card"><div id="aiEvalBusySlot"></div></div>';
          busySlot = document.getElementById('aiEvalBusySlot');
        }
      }
      const reEvalBtn = document.getElementById('btnReEval');
      if (reEvalBtn) reEvalBtn.disabled = true;

      const cleanup = mountInlineLoading(busySlot, {
        title: '正在运行独立多维评测...',
        model: activeModel,
        onCancel: () => activeEvalController?.abort()
      });

      try {
        const company = document.getElementById('aiCompanyInput').value.trim();
        const jobTitle = document.getElementById('aiJobTitleInput').value.trim();
        const jdText = document.getElementById('aiJdTextarea').value.trim();
        const { evaluation } = await api('/api/evaluate', {
          method: 'POST',
          signal: activeEvalController.signal,
          body: JSON.stringify({
            company,
            jobTitle,
            jdText,
            candidateResume: state.currentProposal,
            modelOverride
          })
        });
        state.currentEvaluation = evaluation;
        state.evalExpanded = true;
        renderEvalArea();
        // 若当前已关联副模板档案，自动将评测结果持久化落盘并刷新顶部横幅
        if (state.currentArchiveId) {
          const tab = state.openTabs.find((t) => t.id === state.currentArchiveId);
          if (tab) {
            tab.evaluation = evaluation;
            api('/api/archives', { method: 'POST', body: JSON.stringify(tab) })
              .then(({ archive }) => {
                upsertOpenTab(archive);
                renderWorkspaceBar();
                loadArchives();
              })
              .catch(() => {});
          }
        }
        showToast(`评测完成：总分 ${evaluation.overallScore ?? '-'} 分`);
      } catch (err) {
        if (err.name === 'AbortError') {
          showToast('已取消本次评测，保留原评测结果');
          renderEvalArea();
        } else {
          showToast(`评测失败：${err.message}`);
          renderEvalArea();
        }
      } finally {
        cleanup();
        activeEvalController = null;
        const rBtn = document.getElementById('btnReEval');
        if (rBtn) rBtn.disabled = false;
      }
    }

    window._aiRunGenerateWithFeedback = runGenerateProposal;
    window._aiRunEvaluateProposal = runEvaluateCurrentProposal;

    document.getElementById('btnGenerateProposal').addEventListener('click', () => runGenerateProposal(null));
    document.getElementById('btnModeQuickJump').addEventListener('click', () => switchTab('settings'));

    // 确认回填 -> 严格隔离：永远基于主简历底稿克隆生成独立「AI 副模板」标签，绝不污染主简历
    async function saveCurrentArchive(overrideHtml, overrideTheme) {
      const company = document.getElementById('aiCompanyInput').value.trim() || '未命名公司';
      const jobTitle = document.getElementById('aiJobTitleInput').value.trim() || '未命名岗位';
      const jdText = document.getElementById('aiJdTextarea').value.trim();
      const { archive } = await api('/api/archives', {
        method: 'POST',
        body: JSON.stringify({
          id: state.currentArchiveId,
          company,
          jobTitle,
          salary: state.currentSalary || '',
          city: state.currentCity || '',
          sourceUrl: state.currentSourceUrl,
          jdText,
          proposal: state.currentProposal,
          evaluation: state.currentEvaluation,
          selectedState: state.selection,
          theme: overrideTheme || document.body.dataset.theme || 'sage-ribbon',
          htmlSnapshot: overrideHtml || window.pagesContainer.innerHTML
        })
      });
      state.currentArchiveId = archive.id;
      if (state.currentInboxId) {
        api(`/api/inbox/${state.currentInboxId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: 'tailored', read: true })
        })
          .then(loadInbox)
          .catch(() => {});
      }
      await loadArchives();
      return archive;
    }

    document.getElementById('btnApplyAndArchive').addEventListener('click', async () => {
      if (!state.currentProposal || !state.selection) return;
      const company = document.getElementById('aiCompanyInput').value.trim();
      const jobTitle = document.getElementById('aiJobTitleInput').value.trim();
      if (!company && !jobTitle) {
        showToast('请先填写公司名称或岗位名称，方便与生成的副模板绑定');
        document.getElementById('aiCompanyInput').focus();
        return;
      }

      // 1. 若当前停留在主简历且有未保存修改，必须先提示用户确认，绝不静默覆盖主简历
      if (state.activeDocId === 'master') {
        if (state.masterDirty) {
          const ok = confirm(
            '检测到「我的主简历」存在未保存的修改。\n\n• 点击「确定」：先将当前修改正式保存到主简历，再基于新主简历生成副模板\n• 点击「取消」：暂不生成，返回继续撤回/重做或放弃修改'
          );
          if (!ok) return;
          const saved = await persistMasterFromDom(false);
          if (!saved) return;
        }
      } else {
        await flushCurrentDocToBackend();
      }

      // 2. 永远基于纯净的「主简历」底稿克隆，绝不被其他副模板污染
      const baseHtml = state.master?.html || window.pagesContainer.innerHTML;
      const existingTab = state.currentArchiveId
        ? state.openTabs.find((t) => t.id === state.currentArchiveId)
        : null;
      const targetTheme = existingTab?.theme || state.master?.theme || document.body.dataset.theme || 'sage-ribbon';

      state.isSwitchingDoc = true;
      window.pagesContainer.innerHTML = baseHtml;
      if (typeof window.applyTheme === 'function') window.applyTheme(targetTheme, false);
      if (typeof window.enhanceBlocks === 'function') window.enhanceBlocks(window.pagesContainer);
      if (typeof window.bindPhotoUpload === 'function') window.bindPhotoUpload();

      // 3. 将审核勾选的 AI 提案回填到该克隆副模板中
      applySelectionToDom(state.currentProposal, state.selection);
      const subHtml = window.pagesContainer.innerHTML;
      state.isSwitchingDoc = false;

      try {
        const archive = await saveCurrentArchive(subHtml, targetTheme);
        upsertOpenTab(archive);
        state.activeDocId = archive.id;
        persistOpenTabIds();
        renderWorkspaceBar();
        showToast(`✅ 已生成独立副模板「${archive.company} · ${archive.jobTitle}」，主简历未受影响`);
      } catch (err) {
        showToast(`生成副模板失败：${err.message}`);
      }
    });

    document.getElementById('btnSaveArchiveOnly').addEventListener('click', async () => {
      try {
        const archive = await saveCurrentArchive();
        upsertOpenTab(archive);
        renderWorkspaceBar();
        showToast('已保存到历史副模板档案');
      } catch (err) {
        showToast(`保存失败：${err.message}`);
      }
    });

    // 模式切换（默认模式 / Golden Set 模式）
    document.querySelectorAll('[data-cfg-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!state.config) state.config = {};
        state.config.mode = btn.dataset.cfgMode === 'golden' ? 'golden' : 'default';
        updateModeUI();
      });
    });

    // 透明系统提示词：恢复默认
    document.querySelectorAll('[data-reset-prompt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.resetPrompt;
        const defVal = state.defaultPrompts?.[key] || '';
        if (key === 'tailorSystemPrompt') document.getElementById('cfgPromptTailor').value = defVal;
        if (key === 'evalSystemPrompt') document.getElementById('cfgPromptEval').value = defVal;
        if (key === 'goldenExtractPrompt') document.getElementById('cfgPromptGolden').value = defVal;
        showToast('已恢复为默认系统提示词，记得点击「保存全部设置」');
      });
    });

    // Golden Set 文件上传（PDF / DOCX / HTML）
    document.getElementById('gsFileInput').addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const tag = document.getElementById('gsTagInput').value.trim() || '通用';
      showToast(`正在本地解析 ${f.name} 并提炼 Golden 画像...`);
      try {
        const base64Content = await fileToDataUrl(f);
        const res = await api('/api/golden-set/upload', {
          method: 'POST',
          body: JSON.stringify({ fileName: f.name, base64Content, tag })
        });
        await loadGoldenSet();
        showToast(res.warning || `✅ 已添加 Golden 样本：${f.name}`);
      } catch (err) {
        showToast(`上传失败：${err.message}`);
      } finally {
        e.target.value = '';
      }
    });

    // 保存模型配置、运行模式、4 模块路由、自定义模型目录与透明系统提示词
    document.getElementById('btnSaveConfig').addEventListener('click', async () => {
      try {
        const moduleKeys = ['tailor', 'evaluate', 'goldenExtract', 'vision'];
        const moduleRoutes = {};
        moduleKeys.forEach((k) => {
          moduleRoutes[k] = {
            model: (document.getElementById(`routeModel_${k}`)?.value || '').trim(),
            baseUrl: (document.getElementById(`routeUrl_${k}`)?.value || '').trim(),
            apiKey: (document.getElementById(`routeKey_${k}`)?.value || '').trim()
          };
        });
        const { config } = await api('/api/config', {
          method: 'POST',
          body: JSON.stringify({
            baseUrl: document.getElementById('cfgBaseUrl').value.trim(),
            apiKey: document.getElementById('cfgApiKey').value.trim(),
            model: document.getElementById('cfgModel').value.trim(),
            visionModel: moduleRoutes.vision.model,
            mode: state.config?.mode || 'default',
            models: state.config?.models || [],
            moduleRoutes,
            prompts: {
              tailorSystemPrompt: document.getElementById('cfgPromptTailor').value,
              evalSystemPrompt: document.getElementById('cfgPromptEval').value,
              goldenExtractPrompt: document.getElementById('cfgPromptGolden').value
            }
          })
        });
        state.config = config;
        document.getElementById('cfgApiKey').value = '';
        moduleKeys.forEach((k) => {
          const inp = document.getElementById(`routeKey_${k}`);
          if (inp) inp.value = '';
        });
        renderConfig();
        showToast('全部设置（模式 / 4模块路由 / 模型目录 / 提示词）已保存');
      } catch (err) {
        showToast(`保存配置失败：${err.message}`);
      }
    });

    // 获取可用模型（GET {baseUrl}/models）
    document.getElementById('btnFetchModels').addEventListener('click', async () => {
      const btn = document.getElementById('btnFetchModels');
      btn.disabled = true;
      btn.textContent = '拉取中...';
      try {
        const { models } = await api('/api/models/fetch', {
          method: 'POST',
          body: JSON.stringify({
            baseUrl: document.getElementById('cfgBaseUrl').value.trim(),
            apiKey: document.getElementById('cfgApiKey').value.trim()
          })
        });
        if (!models.length) {
          showToast('接口返回了空模型列表，请手动点击「+ 添加模型」');
        } else {
          if (!state.config) state.config = { models: [] };
          const oldMap = new Map((state.config.models || []).map((m) => [m.id, m]));
          state.config.models = models.map((m) => {
            const old = oldMap.get(m.id);
            return old ? { id: m.id, name: old.name || m.name, supportsVision: old.supportsVision } : m;
          });
          renderModelCatalog();
          showToast(`成功获取到 ${models.length} 个可用模型，记得点「保存配置」`);
        }
      } catch (err) {
        showToast(`获取模型失败：${err.message}`);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔄 获取可用模型';
      }
    });

    document.getElementById('btnAddModelRow').addEventListener('click', () => {
      if (!state.config) state.config = { models: [] };
      if (!Array.isArray(state.config.models)) state.config.models = [];
      state.config.models.push({ id: '', name: '', supportsVision: false });
      renderModelCatalog();
    });

    document.getElementById('cfgModel').addEventListener('input', () => {
      updateSameModelWarn();
      renderModelCatalog();
    });
    ['tailor', 'evaluate', 'goldenExtract', 'vision'].forEach((k) => {
      document.getElementById(`routeModel_${k}`)?.addEventListener('input', () => {
        updateSameModelWarn();
        renderModelCatalog();
      });
    });

    document.getElementById('btnRefreshInbox').addEventListener('click', loadInbox);
    document.getElementById('btnClearInbox').addEventListener('click', async () => {
      if (!state.inbox.length) return;
      if (!confirm('确认清空收件箱中的所有岗位 JD 吗？（不影响已保存的公司岗位档案）')) return;
      await api('/api/inbox', { method: 'DELETE' });
      loadInbox();
      showToast('已清空收件箱');
    });
    document.getElementById('aiInboxSearch').addEventListener('input', (e) => {
      state.inboxFilter.query = e.target.value.trim().toLowerCase();
      renderInboxList();
    });
    document.querySelectorAll('[data-inbox-status]').forEach((pill) => {
      pill.addEventListener('click', () => {
        state.inboxFilter.status = pill.dataset.inboxStatus;
        document.querySelectorAll('[data-inbox-status]').forEach((p) => p.classList.toggle('active', p === pill));
        renderInboxList();
      });
    });
    document.getElementById('btnRefreshArchives').addEventListener('click', loadArchives);
    document.getElementById('aiArchiveSearch').addEventListener('input', (e) => {
      state.archiveQuery = e.target.value.trim().toLowerCase();
      renderArchivesList();
    });

    // 项目深度提炼提示词模板（支持在线微调、自动保存与恢复默认）
    const promptBox = document.getElementById('aiPromptPreviewBox');
    let savedCustomExtract = '';
    try {
      savedCustomExtract = localStorage.getItem(CUSTOM_EXTRACT_PROMPT_KEY) || '';
    } catch {}
    promptBox.value = savedCustomExtract || PROJECT_EXTRACT_PROMPT;
    promptBox.addEventListener('input', () => {
      try {
        localStorage.setItem(CUSTOM_EXTRACT_PROMPT_KEY, promptBox.value);
      } catch {}
    });
    document.getElementById('btnTogglePromptPreview').addEventListener('click', (e) => {
      const hidden = promptBox.style.display === 'none';
      promptBox.style.display = hidden ? 'block' : 'none';
      e.target.textContent = hidden ? '收起编辑' : '展开编辑';
    });
    document.getElementById('btnResetExtractPrompt').addEventListener('click', () => {
      promptBox.value = PROJECT_EXTRACT_PROMPT;
      try {
        localStorage.removeItem(CUSTOM_EXTRACT_PROMPT_KEY);
      } catch {}
      showToast('已恢复默认「项目深度提炼提示词」');
    });
    document.getElementById('btnCopyExtractPrompt').addEventListener('click', async () => {
      const textToCopy = promptBox.value || PROJECT_EXTRACT_PROMPT;
      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('已复制提示词！发给 AI 扫代码仓即可在桌面生成标准项目 MD');
      } catch {
        promptBox.style.display = 'block';
        promptBox.select();
        showToast('请从下方编辑框手动复制');
      }
    });

    document.getElementById('btnSyncKbFromResume').addEventListener('click', () => {
      const sk = extractSkeletonFromDom();
      const existingNames = new Set((state.knowledge.projects || []).map((p) => p.name));
      let added = 0;
      sk.projects.forEach((p, idx) => {
        if (p.name && !existingNames.has(p.name)) {
          state.knowledge.projects.push({
            id: `kb_${Date.now()}_${idx}`,
            name: p.name,
            content: ''
          });
          added++;
        }
      });
      renderKnowledgeList();
      showToast(added ? `已同步 ${added} 个简历项目，请粘贴或导入对应的 MD 档案` : '当前简历项目均已在素材库中');
    });

    document.getElementById('btnAddKbProject').addEventListener('click', () => {
      state.knowledge.projects.push({
        id: `kb_${Date.now()}`,
        name: '',
        content: ''
      });
      renderKnowledgeList();
    });

    document.getElementById('btnSaveKnowledge').addEventListener('click', async () => {
      try {
        const { knowledge } = await api('/api/knowledge', {
          method: 'POST',
          body: JSON.stringify({ projects: state.knowledge.projects })
        });
        state.knowledge = knowledge;
        renderKnowledgeList();
        updateMasterStatus();
        showToast(`已保存项目素材库（共 ${knowledge.projects.length} 份项目档案）`);
      } catch (err) {
        showToast(`保存素材库失败：${err.message}`);
      }
    });

    // 导出高清 PNG
    document.getElementById('btnExportPng')?.addEventListener('click', exportHdPng);
  }

  function renderKnowledgeList() {
    const list = document.getElementById('aiKbList');
    if (!list) return;
    const projects = state.knowledge?.projects || [];
    if (!projects.length) {
      list.innerHTML = '<div class="ai-card ai-hint">尚未添加项目深度素材。点击上方「从当前简历同步项目名」或「+ 新增项目素材」开始添加。</div>';
      return;
    }
    list.innerHTML = projects
      .map(
        (p, idx) => `
        <div class="ai-kb-item" data-kb-idx="${idx}">
          <div class="ai-row" style="align-items:center;">
            <input class="ai-input" data-kb-name="${idx}" value="${escHtml(p.name)}" placeholder="项目名称（建议与简历中的项目名一致）" />
            <label class="ai-btn ai-btn-sm" style="flex:0 0 auto;cursor:pointer;">
              📂 导入 .md/.txt
              <input type="file" accept=".md,.txt,text/markdown,text/plain" data-kb-file="${idx}" style="display:none;" />
            </label>
            <button type="button" class="ai-btn ai-btn-sm" data-kb-export="${idx}" style="flex:0 0 auto;" title="导出为本地 Markdown 文件">⬇ 导出 .md</button>
            <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-kb-del="${idx}" style="flex:0 0 auto;">删</button>
          </div>
          <textarea class="ai-textarea ai-kb-textarea" data-kb-content="${idx}" placeholder="粘贴由提示词提炼出的项目 Markdown 档案（技术栈、核心模块、量化数据、踩坑记录、面试考点）...">${escHtml(p.content)}</textarea>
          <div class="ai-hint" style="margin-top:4px;">字数：${(p.content || '').length} 字</div>
        </div>`
      )
      .join('');

    list.querySelectorAll('[data-kb-name]').forEach((input) => {
      input.addEventListener('input', () => {
        const i = Number(input.dataset.kbName);
        if (state.knowledge.projects[i]) state.knowledge.projects[i].name = input.value;
      });
    });

    list.querySelectorAll('[data-kb-content]').forEach((ta) => {
      ta.addEventListener('input', () => {
        const i = Number(ta.dataset.kbContent);
        if (state.knowledge.projects[i]) state.knowledge.projects[i].content = ta.value;
      });
    });

    list.querySelectorAll('[data-kb-file]').forEach((fileInput) => {
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        const i = Number(fileInput.dataset.kbFile);
        const text = await f.text();
        if (state.knowledge.projects[i]) {
          if (!state.knowledge.projects[i].name) {
            state.knowledge.projects[i].name = f.name.replace(/\.(md|txt)$/i, '');
          }
          state.knowledge.projects[i].content = text;
          renderKnowledgeList();
          showToast(`已导入 ${f.name}，记得点击「💾 保存素材库」`);
        }
      });
    });

    list.querySelectorAll('[data-kb-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.knowledge.projects[Number(btn.dataset.kbExport)];
        if (!item) return;
        const safeName = (item.name || '未命名项目').replace(/[\\/:*?"<>|]/g, '_');
        const blob = new Blob([item.content || `# ${item.name || '未命名项目'}\n`], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `项目深度档案_${safeName}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`已导出：项目深度档案_${safeName}.md`);
      });
    });

    list.querySelectorAll('[data-kb-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.kbDel);
        state.knowledge.projects.splice(i, 1);
        renderKnowledgeList();
      });
    });
  }

  // ===== 6. 数据加载与渲染 =====
  function updateMasterStatus() {
    const el = document.getElementById('aiMasterStatus');
    if (!el) return;
    const kbCount = (state.knowledge?.projects || []).filter((p) => String(p.content || '').trim()).length;
    const kbHint = kbCount > 0 ? ` ｜ 📚 已挂载 <strong>${kbCount}</strong> 份项目深度素材` : ` ｜ 可在「项目素材库」补充深度资料`;
    if (state.master?.skeleton) {
      const sk = state.master.skeleton;
      const t = new Date(state.master.updatedAt).toLocaleString();
      el.innerHTML = `✅ 已保存母版（${sk.projects.length} 个项目 / ${sk.skills.length} 条技能，更新于 ${t}）${kbHint}`;
    } else {
      el.innerHTML = `尚未保存母版：请先把编辑器里的个人信息、技能与真实项目填好，然后点击右上角 <strong>「存当前简历为母版」</strong>${kbHint}`;
    }
  }

  function updateModeUI() {
    const mode = state.config?.mode === 'golden' ? 'golden' : 'default';
    document.querySelectorAll('[data-cfg-mode]').forEach((b) => {
      b.classList.toggle('active', b.dataset.cfgMode === mode);
    });
    const enabledCount = (state.goldenSet?.samples || []).filter((s) => s.enabled !== false).length;
    const jumpBtn = document.getElementById('btnModeQuickJump');
    if (jumpBtn) {
      if (mode === 'golden') {
        jumpBtn.textContent = `🏆 Golden Set 模式（已启用 ${enabledCount} 份标杆）`;
        jumpBtn.style.borderColor = '#f59e0b';
        jumpBtn.style.background = '#fffbeb';
        jumpBtn.style.color = '#b45309';
      } else {
        jumpBtn.textContent = '⚙️ 当前：默认模式';
        jumpBtn.style.borderColor = '';
        jumpBtn.style.background = '';
        jumpBtn.style.color = '';
      }
    }
  }

  function getEffectiveModuleModel(moduleKey) {
    const domVal = (document.getElementById(`routeModel_${moduleKey}`)?.value || '').trim();
    if (domVal) return domVal;
    const cfgRoute = state.config?.moduleRoutes?.[moduleKey]?.model || '';
    if (cfgRoute) return cfgRoute;
    const globalModel = (document.getElementById('cfgModel')?.value || state.config?.model || '').trim();
    return globalModel;
  }

  function updateSameModelWarn() {
    const warn = document.getElementById('aiSameModelWarn');
    if (!warn) return;
    const tModel = getEffectiveModuleModel('tailor');
    const eModel = getEffectiveModuleModel('evaluate');
    warn.style.display = tModel && eModel && tModel === eModel ? 'block' : 'none';
  }

  function renderQuickModelSelects() {
    const models = (state.config?.models || []).filter((m) => m.id);
    const tailorSel = document.getElementById('aiQuickTailorModel');
    if (tailorSel) {
      const prev = tailorSel.value;
      const effTailor = getEffectiveModuleModel('tailor') || '未配置';
      tailorSel.innerHTML =
        `<option value="">✍️ 生成：默认 (${escHtml(effTailor)})</option>` +
        models.map((m) => `<option value="${escHtml(m.id)}">✍️ ${escHtml(m.name || m.id)}</option>`).join('');
      if (prev && models.some((m) => m.id === prev)) tailorSel.value = prev;
    }
  }

  function renderConfig() {
    if (!state.config) return;
    document.getElementById('cfgBaseUrl').value = state.config.baseUrl || '';
    document.getElementById('cfgModel').value = state.config.model || '';
    document.getElementById('cfgKeyStatus').textContent = state.config.hasApiKey
      ? `当前已配置统一 API Key：${state.config.maskedKey}`
      : '尚未配置统一 API Key（请填写后保存）';

    const routes = state.config.moduleRoutes || {};
    ['tailor', 'evaluate', 'goldenExtract', 'vision'].forEach((k) => {
      const r = routes[k] || {};
      const mEl = document.getElementById(`routeModel_${k}`);
      const uEl = document.getElementById(`routeUrl_${k}`);
      const ksEl = document.getElementById(`routeKeyStatus_${k}`);
      if (mEl) mEl.value = r.model || '';
      if (uEl) uEl.value = r.baseUrl || '';
      if (ksEl) {
        ksEl.textContent = r.hasApiKey
          ? `已配置独立 Key：${r.maskedKey}`
          : '未配置独立 Key（自动继承上方统一接口）';
      }
    });

    const p = state.config.prompts || {};
    const def = state.defaultPrompts || {};
    document.getElementById('cfgPromptTailor').value = p.tailorSystemPrompt || def.tailorSystemPrompt || '';
    document.getElementById('cfgPromptEval').value = p.evalSystemPrompt || def.evalSystemPrompt || '';
    document.getElementById('cfgPromptGolden').value = p.goldenExtractPrompt || def.goldenExtractPrompt || '';

    updateModeUI();
    updateSameModelWarn();
    renderModelCatalog();
    renderQuickModelSelects();
  }

  async function loadGoldenSet() {
    try {
      const { goldenSet } = await api('/api/golden-set');
      state.goldenSet = goldenSet || { updatedAt: null, samples: [] };
      renderGoldenSetList();
      updateModeUI();
    } catch {}
  }

  function renderGoldenSetList() {
    const list = document.getElementById('aiGoldenList');
    if (!list) return;
    const samples = state.goldenSet?.samples || [];
    if (!samples.length) {
      list.innerHTML = '<div class="ai-hint" style="padding:6px 0;">暂未上传 Golden Set 样本。上传高分 PDF / DOCX / HTML 简历后，即可开启「Golden Set 模式」进行标杆对齐与评测。</div>';
      return;
    }
    list.innerHTML = samples
      .map((s) => {
        const hasProfile = Boolean(s.profile);
        const profileText = hasProfile
          ? JSON.stringify(s.profile, null, 2)
          : '（尚未提炼画像，点击「重新提炼」或直接参考解析原文）';
        return `
          <div class="ai-gs-item ${s.enabled !== false ? 'is-enabled' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;min-width:0;flex:1;">
                <input type="checkbox" data-gs-toggle="${escHtml(s.id)}" ${s.enabled !== false ? 'checked' : ''} />
                <span class="ai-fmt-badge fmt-${escHtml(s.format)}">${escHtml(s.format)}</span>
                <strong style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escHtml(s.fileName)}">${escHtml(s.fileName)}</strong>
              </label>
              <div style="display:flex;gap:4px;flex-shrink:0;">
                <button type="button" class="ai-btn ai-btn-sm" data-gs-reextract="${escHtml(s.id)}" title="重新提炼标杆画像">提炼</button>
                <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-gs-del="${escHtml(s.id)}">删</button>
              </div>
            </div>
            <div class="ai-list-meta" style="margin-top:4px;">
              标签：<strong>${escHtml(s.tag || '通用')}</strong> · ${s.charCount || 0} 字 · ${hasProfile ? '✅ 已提炼标杆画像' : '⚠️ 未提炼画像'}
            </div>
            <details style="margin-top:5px;">
              <summary style="cursor:pointer;font-size:11.5px;color:#2563eb;">查看提炼出的 Golden 标杆画像</summary>
              <pre class="ai-gs-profile-pre">${escHtml(profileText)}</pre>
            </details>
          </div>`;
      })
      .join('');

    list.querySelectorAll('[data-gs-toggle]').forEach((cb) => {
      cb.addEventListener('change', async () => {
        await api(`/api/golden-set/${cb.dataset.gsToggle}`, {
          method: 'PATCH',
          body: JSON.stringify({ enabled: cb.checked })
        });
        await loadGoldenSet();
      });
    });

    list.querySelectorAll('[data-gs-reextract]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '...';
        try {
          await api(`/api/golden-set/${btn.dataset.gsReextract}/reextract`, { method: 'POST' });
          await loadGoldenSet();
          showToast('已重新提炼 Golden 标杆画像');
        } catch (err) {
          showToast(`提炼失败：${err.message}`);
        } finally {
          btn.disabled = false;
          btn.textContent = '提炼';
        }
      });
    });

    list.querySelectorAll('[data-gs-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/golden-set/${btn.dataset.gsDel}`, { method: 'DELETE' });
        await loadGoldenSet();
        showToast('已移除该 Golden 样本');
      });
    });
  }

  function renderEvalArea() {
    const area = document.getElementById('aiEvalArea');
    if (!area) return;
    if (!state.currentProposal) {
      area.innerHTML = '';
      return;
    }
    const ev = state.currentEvaluation;
    if (!ev) {
      area.innerHTML = `
        <div class="ai-eval-card" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span class="ai-hint">想知道这份 AI 简历好不好、好在哪里？运行独立多维评测：</span>
          <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="btnManualEval">📊 评测这份提案</button>
        </div>`;
      area.querySelector('#btnManualEval')?.addEventListener('click', () => window._aiRunEvaluateProposal?.());
      return;
    }

    const dimsHtml = (ev.dimensions || [])
      .map((d) => {
        const score = Math.max(0, Math.min(100, Number(d.score || 0)));
        return `
          <div class="ai-eval-dim">
            <div class="ai-eval-dim-top">
              <span>${escHtml(d.label || d.key)}</span>
              <span>${score} 分</span>
            </div>
            <div class="ai-eval-bar-bg"><div class="ai-eval-bar-fill" style="width:${score}%;"></div></div>
            ${d.comment ? `<div class="ai-hint" style="font-size:11.5px;margin-top:2px;">${escHtml(d.comment)}</div>` : ''}
          </div>`;
      })
      .join('');

    const goodHtml = (ev.highlights || [])
      .map((h) => {
        if (typeof h === 'string') return `<div class="ai-eval-item-card">• ${escHtml(h)}</div>`;
        return `<div class="ai-eval-item-card">${h.location ? `<span class="ai-eval-loc">📍 ${escHtml(h.location)}</span>` : ''}${escHtml(h.point || '')}</div>`;
      })
      .join('');

    const fixHtml = (ev.improvements || [])
      .map((h) => {
        if (typeof h === 'string') return `<div class="ai-eval-item-card">• ${escHtml(h)}</div>`;
        const prio = String(h.priority || '中');
        const prioCls = prio.includes('高') ? 'p-high' : prio.includes('低') ? 'p-low' : 'p-mid';
        return `
          <div class="ai-eval-item-card">
            <div>
              <span class="ai-eval-prio ${prioCls}">${escHtml(prio)}优先级</span>
              ${h.location ? `<span class="ai-eval-loc">📍 ${escHtml(h.location)}</span>` : ''}
            </div>
            <div style="margin-top:3px;"><strong>问题：</strong>${escHtml(h.issue || '')}</div>
            ${h.action ? `<div class="ai-eval-action">👉 建议：${escHtml(h.action)}</div>` : ''}
          </div>`;
      })
      .join('');

    const models = (state.config?.models || []).filter((m) => m.id);
    const effEval = getEffectiveModuleModel('evaluate') || '未配置';
    const evalSelectHtml = `
      <select class="ai-quick-model-select" id="aiQuickEvalModel" title="临时换一个裁判模型重新评测（A/B 交叉校验）">
        <option value="">⚖️ 裁判：默认 (${escHtml(effEval)})</option>
        ${models.map((m) => `<option value="${escHtml(m.id)}">⚖️ ${escHtml(m.name || m.id)}</option>`).join('')}
      </select>`;

    const isIncomplete = (ev.dimensions || []).length < 5 || !(ev.highlights || []).length || !(ev.improvements || []).length;
    const expanded = state.evalExpanded !== false;

    area.innerHTML = `
      <div class="ai-eval-card">
        <div id="aiEvalBusySlot"></div>
        <div class="ai-eval-head">
          <div>
            <strong>📊 独立评测报告（${state.config?.mode === 'golden' ? 'Golden Set 标杆模式' : '默认大厂标准'}）</strong>
            ${ev._usedModel ? `<span class="ai-model-tag" style="margin-left:6px;">⚖️ 裁判：${escHtml(ev._usedModel)}</span>` : ''}
          </div>
          <span class="ai-eval-score-badge">${escHtml(ev.overallScore ?? '-')} 分 · ${escHtml(ev.grade || '')}</span>
        </div>
        ${ev.summary ? `<div class="ai-hint" style="margin-bottom:8px;color:#1e293b;">${escHtml(ev.summary)}</div>` : ''}
        ${
          isIncomplete
            ? `<div class="ai-route-warn" style="margin-bottom:8px;">⚠️ 该份评测由模型返回不完整（缺少部分维度或亮点/建议），点击下方 <strong>🔄 重新评测</strong> 即可自动补全 5 维与详细建议。</div>`
            : ''
        }
        <div style="margin-bottom:6px;">
          <button type="button" class="ai-btn ai-btn-sm" id="btnToggleEvalDetail">${expanded ? '▴ 收起 5 维与详细建议' : '▾ 展开 5 维与详细建议'}</button>
        </div>
        <div id="aiEvalDetailBody" style="display:${expanded ? 'block' : 'none'};">
          ${dimsHtml}
          ${goodHtml ? `<div class="ai-eval-box is-good"><strong>✨ 好在哪里（亮点）：</strong>${goodHtml}</div>` : ''}
          ${fixHtml ? `<div class="ai-eval-box is-fix"><strong>🔧 差距与改进建议：</strong>${fixHtml}</div>` : ''}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:flex-end;margin-top:10px;">
          ${evalSelectHtml}
          <button type="button" class="ai-btn ai-btn-sm" id="btnReEval">🔄 重新评测</button>
          <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="btnRefineByEval">✨ 按评测建议再优化一轮</button>
        </div>
      </div>`;

    area.querySelector('#btnToggleEvalDetail')?.addEventListener('click', () => {
      state.evalExpanded = !expanded;
      renderEvalArea();
    });
    area.querySelector('#btnReEval')?.addEventListener('click', () => {
      const override = (area.querySelector('#aiQuickEvalModel')?.value || '').trim();
      window._aiRunEvaluateProposal?.(override);
    });
    area.querySelector('#btnRefineByEval')?.addEventListener('click', () => {
      window._aiRunGenerateWithFeedback?.(ev.improvements || ev.summary || '');
    });
  }

  function renderModelCatalog() {
    const list = document.getElementById('aiModelCatalogList');
    const countEl = document.getElementById('aiModelCatalogCount');
    const allDl = document.getElementById('aiAllModelsDatalist');
    const visDl = document.getElementById('aiVisionModelsDatalist');
    if (!list) return;

    const models = state.config?.models || [];
    const curTailor = (document.getElementById('routeModel_tailor')?.value || '').trim();
    const curEval = (document.getElementById('routeModel_evaluate')?.value || '').trim();
    const curGolden = (document.getElementById('routeModel_goldenExtract')?.value || '').trim();
    const curVis = (document.getElementById('routeModel_vision')?.value || '').trim();

    if (allDl) {
      allDl.innerHTML = models
        .filter((m) => m.id)
        .map((m) => `<option value="${escHtml(m.id)}">${escHtml(m.name || m.id)}${m.supportsVision ? ' (📷 支持图片)' : ''}</option>`)
        .join('');
    }
    if (visDl) {
      const sorted = [...models].filter((m) => m.id).sort((a, b) => Number(b.supportsVision) - Number(a.supportsVision));
      visDl.innerHTML = sorted
        .map((m) => `<option value="${escHtml(m.id)}">${m.supportsVision ? '📷 ' : ''}${escHtml(m.name || m.id)}</option>`)
        .join('');
    }
    renderQuickModelSelects();
    if (countEl) {
      const visCount = models.filter((m) => m.supportsVision).length;
      countEl.textContent = models.length ? `共 ${models.length} 个模型（其中 ${visCount} 个支持图片）` : '暂无目录，点击上方「获取可用模型」';
    }

    if (!models.length) {
      list.innerHTML = '<div class="ai-hint" style="padding:8px 0;">点击右上角 <strong>🔄 获取可用模型</strong> 自动拉取接口列表，或点击下方 <strong>+ 添加模型</strong> 手动录入。</div>';
      return;
    }

    list.innerHTML = models
      .map((m, idx) => {
        const isTailor = curTailor && m.id === curTailor;
        const isEval = curEval && m.id === curEval;
        const isGolden = curGolden && m.id === curGolden;
        const isVis = curVis && m.id === curVis;
        return `
          <div class="ai-model-row" data-m-idx="${idx}" style="flex-wrap:wrap;">
            <input class="ai-input ai-model-id-input" data-m-id="${idx}" value="${escHtml(m.id)}" placeholder="模型 ID" />
            <input class="ai-input ai-model-name-input" data-m-name="${idx}" value="${escHtml(m.name)}" placeholder="显示名称" />
            <button type="button" class="ai-model-pill ${m.supportsVision ? 'vision-on' : ''}" data-m-vis="${idx}" title="点击切换该模型是否支持图片识图">📷</button>
            <button type="button" class="ai-model-pill ${isTailor ? 'role-active' : ''}" data-m-assign="tailor:${idx}" title="指派给「生成模块」">生</button>
            <button type="button" class="ai-model-pill ${isEval ? 'role-active' : ''}" data-m-assign="evaluate:${idx}" title="指派给「评测模块」">评</button>
            <button type="button" class="ai-model-pill ${isGolden ? 'role-active' : ''}" data-m-assign="goldenExtract:${idx}" title="指派给「标杆提炼模块」">标</button>
            <button type="button" class="ai-model-pill ${isVis ? 'role-active' : ''}" data-m-assign="vision:${idx}" title="指派给「视觉识图模块」">视</button>
            <button type="button" class="ai-model-pill del-btn" data-m-del="${idx}" title="删除">🗑</button>
          </div>`;
      })
      .join('');

    list.querySelectorAll('[data-m-id]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.mId);
        if (state.config.models[i]) state.config.models[i].id = inp.value.trim();
      });
    });
    list.querySelectorAll('[data-m-name]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.mName);
        if (state.config.models[i]) state.config.models[i].name = inp.value;
      });
    });
    list.querySelectorAll('[data-m-vis]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.mVis);
        if (state.config.models[i]) {
          state.config.models[i].supportsVision = !state.config.models[i].supportsVision;
          renderModelCatalog();
        }
      });
    });
    const roleLabelMap = { tailor: '生成模块', evaluate: '评测模块', goldenExtract: '标杆提炼模块', vision: '视觉识图模块' };
    list.querySelectorAll('[data-m-assign]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [roleKey, idxStr] = btn.dataset.mAssign.split(':');
        const m = state.config.models[Number(idxStr)];
        if (m?.id) {
          if (roleKey === 'vision') m.supportsVision = true;
          const targetInput = document.getElementById(`routeModel_${roleKey}`);
          if (targetInput) targetInput.value = m.id;
          updateSameModelWarn();
          renderModelCatalog();
          showToast(`已将 ${m.id} 指派给「${roleLabelMap[roleKey]}」，记得点底部「保存全部设置」`);
        }
      });
    });
    list.querySelectorAll('[data-m-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.config.models.splice(Number(btn.dataset.mDel), 1);
        renderModelCatalog();
      });
    });
  }

  async function loadInbox() {
    try {
      const { items } = await api('/api/inbox');
      state.inbox = items || [];
      const unreadCount = state.inbox.filter((x) => !x.read).length;
      ['aiInboxBadge', 'aiTabInboxBadge'].forEach((id) => {
        const badge = document.getElementById(id);
        if (!badge) return;
        badge.textContent = String(unreadCount);
        badge.style.display = unreadCount > 0 ? 'inline-flex' : 'none';
      });
      renderInboxList();
    } catch {}
  }

  function renderInboxList() {
    const list = document.getElementById('aiInboxList');
    if (!list) return;
    const { query, status } = state.inboxFilter;
    const filtered = state.inbox.filter((item) => {
      const st = item.status || 'pending';
      if (status !== 'all' && st !== status) return false;
      if (query) {
        const hay = `${item.company || ''} ${item.jobTitle || ''} ${item.city || ''} ${item.salary || ''} ${item.jdText || ''}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="ai-card ai-hint">${
        state.inbox.length
          ? '没有符合当前筛选条件的岗位，试试清空搜索词或切换状态。'
          : '暂无来自油猴脚本的 JD 推送。在 BOSS 直聘点开岗位或使用「小批量采集」，即可把岗位收集到这里。'
      }</div>`;
      return;
    }

    list.innerHTML = filtered
      .map((item) => {
        const t = new Date(item.capturedAt).toLocaleString();
        const modeLabel =
          item.mode === 'screenshot'
            ? '📷 截图'
            : item.mode === 'batch_click'
            ? '⚡ 模拟点选'
            : '📄 可见文本';
        const st = item.status || 'pending';
        const statusBadge =
          st === 'tailored'
            ? '<span class="ai-status-pill ai-status-tailored">已定制</span>'
            : '<span class="ai-status-pill ai-status-pending">待定制</span>';
        const expanded = Boolean(state.expandedInboxIds[item.id]);
        const linkHtml = item.sourceUrl
          ? ` · <a href="${escHtml(item.sourceUrl)}" target="_blank" style="color:#2563eb;text-decoration:none;">原岗位 ↗</a>`
          : '';
        return `
          <div class="ai-list-item ${item.read ? '' : 'unread'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;min-width:0;">
                <strong>${escHtml(item.company || '未识别公司')} · ${escHtml(item.jobTitle || '未识别岗位')}</strong>${statusBadge}
                <div class="ai-list-meta">${modeLabel} · ${escHtml(item.salary || '薪资面议')} ${escHtml(item.city || '')} · ${t}${linkHtml}</div>
              </div>
              <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-del-inbox="${escHtml(item.id)}" title="删除">删</button>
            </div>
            ${
              item.jdText
                ? expanded
                  ? `<div class="ai-inbox-jd-full">${escHtml(item.jdText)}</div>`
                  : `<div class="ai-hint" style="margin-top:6px;">${escHtml(item.jdText.slice(0, 120))}${item.jdText.length > 120 ? '...' : ''}</div>`
                : ''
            }
            ${item.screenshotDataUrl ? `<img class="ai-paste-preview" src="${item.screenshotDataUrl}" />` : ''}
            <div class="ai-inbox-actions">
              <button type="button" class="ai-btn ai-btn-sm" data-use-inbox="${escHtml(item.id)}">📥 应用到 JD 定制</button>
              <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" data-gen-inbox="${escHtml(item.id)}">🚀 应用并立即生成</button>
              ${
                item.jdText && item.jdText.length > 120
                  ? `<button type="button" class="ai-btn ai-btn-sm" data-toggle-jd="${escHtml(item.id)}" style="margin-left:auto;">${expanded ? '收起 JD' : '展开完整 JD'}</button>`
                  : ''
              }
            </div>
          </div>`;
      })
      .join('');

    async function applyInboxToTailor(item, autoGenerate) {
      api(`/api/inbox/${item.id}/read`, { method: 'POST' }).then(loadInbox).catch(() => {});
      state.currentInboxId = item.id;
      state.currentArchiveId = null;
      state.currentSourceUrl = item.sourceUrl || '';
      state.currentSalary = item.salary || '';
      state.currentCity = item.city || '';
      document.getElementById('aiCompanyInput').value = item.company || '';
      document.getElementById('aiJobTitleInput').value = item.jobTitle || '';
      document.getElementById('aiJdTextarea').value = item.jdText || '';
      switchTab('tailor');

      if (item.screenshotDataUrl && !item.jdText) {
        await handleOcrImage(item.screenshotDataUrl);
      }
      if (autoGenerate) {
        document.getElementById('btnGenerateProposal')?.click();
      } else {
        showToast(`已将「${item.company || ''} - ${item.jobTitle || ''}」应用到 JD 定制`);
      }
    }

    list.querySelectorAll('[data-use-inbox]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.inbox.find((x) => x.id === btn.dataset.useInbox);
        if (item) applyInboxToTailor(item, false);
      });
    });

    list.querySelectorAll('[data-gen-inbox]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = state.inbox.find((x) => x.id === btn.dataset.genInbox);
        if (item) applyInboxToTailor(item, true);
      });
    });

    list.querySelectorAll('[data-toggle-jd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleJd;
        state.expandedInboxIds[id] = !state.expandedInboxIds[id];
        renderInboxList();
      });
    });

    list.querySelectorAll('[data-del-inbox]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/inbox/${btn.dataset.delInbox}`, { method: 'DELETE' });
        loadInbox();
      });
    });
  }

  async function loadArchives() {
    try {
      const { items } = await api('/api/archives');
      state.archives = items || [];
      renderArchivesList();
    } catch {}
  }

  function renderArchivesList() {
    const list = document.getElementById('aiArchivesList');
    if (!list) return;
    const countEl = document.getElementById('aiHistoryCount');
    if (countEl) countEl.textContent = String(state.archives.length);

    const q = state.archiveQuery || '';
    const filtered = state.archives.filter((a) => {
      if (!q) return true;
      const hay = `${a.company || ''} ${a.jobTitle || ''} ${a.city || ''} ${a.salary || ''}`.toLowerCase();
      return hay.includes(q);
    });

    if (!filtered.length) {
      list.innerHTML = `<div class="ai-card ai-hint">${
        state.archives.length
          ? '没有匹配该关键词的历史副模板。'
          : '暂无历史副模板档案。每次确认勾选并生成副模板后，都会自动绑定公司和岗位保存在这里。'
      }</div>`;
      return;
    }
    list.innerHTML = filtered
      .map((a) => {
        const t = new Date(a.updatedAt || a.createdAt).toLocaleString();
        const extraMeta = [a.salary, a.city].filter(Boolean).join(' · ');
        const linkHtml = a.sourceUrl
          ? ` · <a href="${escHtml(a.sourceUrl)}" target="_blank" style="color:#2563eb;text-decoration:none;">原岗位 ↗</a>`
          : '';
        const evalPart = a.evalScore != null ? ` · 📊 评测 ${a.evalScore} 分` : '';
        return `
          <div class="ai-list-item">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">
              <div style="flex:1;min-width:0;">
                <strong>🎯 ${escHtml(a.company)} · ${escHtml(a.jobTitle)}</strong>
                <div class="ai-list-meta">匹配度 ${escHtml(a.matchScore ?? '-')} 分${evalPart}${extraMeta ? ' · ' + escHtml(extraMeta) : ''} · 主题 ${escHtml(a.theme)} · ${t}${linkHtml}</div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0;">
                <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" data-open-arch="${escHtml(a.id)}">打开副模板</button>
                <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-del-arch="${escHtml(a.id)}">删</button>
              </div>
            </div>
          </div>`;
      })
      .join('');

    list.querySelectorAll('[data-open-arch]').forEach((btn) => {
      btn.addEventListener('click', () => openSubTemplateById(btn.dataset.openArch, false));
    });

    list.querySelectorAll('[data-del-arch]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.delArch;
        await api(`/api/archives/${id}`, { method: 'DELETE' });
        closeOpenTab(id);
        loadArchives();
        showToast('已删除历史副模板');
      });
    });
  }

  // ===== 6.5 主简历 / AI 副模板 多标签工作台 =====
  function persistOpenTabIds() {
    try {
      localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(state.openTabs.map((t) => t.id)));
    } catch {}
  }

  function upsertOpenTab(archive) {
    if (!archive || !archive.id) return;
    const idx = state.openTabs.findIndex((t) => t.id === archive.id);
    if (idx >= 0) state.openTabs[idx] = archive;
    else state.openTabs.push(archive);
    persistOpenTabIds();
  }

  function closeOpenTab(id) {
    const idx = state.openTabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    state.openTabs.splice(idx, 1);
    persistOpenTabIds();
    if (state.activeDocId === id) {
      switchDocumentTab('master');
    } else {
      renderWorkspaceBar();
    }
  }

  function syncMasterUndoButtons() {
    const u = document.getElementById('wsBtnMasterUndo');
    const r = document.getElementById('wsBtnMasterRedo');
    const topU = document.getElementById('btnUndo');
    const topR = document.getElementById('btnRedo');
    if (u && topU) u.disabled = topU.disabled;
    if (r && topR) r.disabled = topR.disabled;
  }

  function markMasterDirty() {
    if (state.isSwitchingDoc || state.activeDocId !== 'master') return;
    const wasDirty = state.masterDirty;
    state.masterDirty = true;
    if (!state.masterWarnedOnce) {
      state.masterWarnedOnce = true;
      showToast('⚠️ 提醒：你正在修改「我的主简历」，修改不会自动覆盖底稿；保存前可随时 ↶ 撤回 / ↷ 重做，确认后请点「💾 保存主简历」');
    }
    if (!wasDirty) {
      renderWorkspaceBar();
    } else {
      syncMasterUndoButtons();
    }
  }

  function discardUnsavedMasterChanges() {
    if (!state.master?.html) {
      showToast('后端尚无已保存的主简历，无法放弃修改');
      return;
    }
    if (!confirm('确认放弃当前未保存的主简历修改，恢复到上次保存的主简历底稿吗？（可按 Ctrl+Z 撤回）')) return;
    if (typeof window.pushHistory === 'function') window.pushHistory();
    loadHtmlIntoCanvas(state.master.html, state.master.theme);
    if (typeof window.pushHistory === 'function') window.pushHistory();
    state.masterDirty = false;
    state.masterWarnedOnce = false;
    renderWorkspaceBar();
    showToast('已放弃未保存修改，恢复到上次保存的主简历');
  }

  async function persistMasterFromDom(silent = false) {
    const skeleton = extractSkeletonFromDom();
    const html = window.pagesContainer.innerHTML;
    const theme = document.body.dataset.theme || 'sage-ribbon';
    const rootFs = parseFloat(document.documentElement.style.getPropertyValue('--body-size'));
    const styleState = !Number.isNaN(rootFs) ? { fontSize: rootFs } : null;
    const payload = {
      html,
      theme,
      skeleton,
      sourceFileName: state.master?.sourceFileName || '',
      styleState
    };

    let resp;
    try {
      resp = await api('/api/master/save', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // 兼容旧进程未重启时 /api/master/save 返回 404 的情况
      if (String(err.message || '').includes('404') || String(err.message || '').includes('Cannot POST')) {
        resp = await api('/api/master', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      } else {
        throw err;
      }
    }

    state.master = resp.master;
    state.masterDirty = false;
    state.masterWarnedOnce = false;
    updateMasterStatus();
    renderWorkspaceBar();
    if (!silent) showToast(`✅ 已保存「我的主简历」${resp.master?.revision ? `（v${resp.master.revision}）` : ''}`);
    return resp.master;
  }

  async function flushCurrentDocToBackend() {
    if (state.isSwitchingDoc) return;
    // 约束：主简历绝不静默自动保存覆盖后端底稿，只自动保存 AI 副模板
    if (state.activeDocId === 'master') {
      return;
    }
    const tab = state.openTabs.find((t) => t.id === state.activeDocId);
    if (!tab) return;
    tab.htmlSnapshot = window.pagesContainer.innerHTML;
    tab.theme = document.body.dataset.theme || 'sage-ribbon';
    try {
      const { archive } = await api('/api/archives', {
        method: 'POST',
        body: JSON.stringify(tab)
      });
      upsertOpenTab(archive);
    } catch {}
  }

  function loadHtmlIntoCanvas(html, theme) {
    state.isSwitchingDoc = true;
    window.pagesContainer.innerHTML = html;
    if (theme && typeof window.applyTheme === 'function') {
      window.applyTheme(theme, false);
    }
    if (typeof window.enhanceBlocks === 'function') window.enhanceBlocks(window.pagesContainer);
    if (typeof window.bindPhotoUpload === 'function') window.bindPhotoUpload();
    if (typeof window.updatePageNumbers === 'function') window.updatePageNumbers(true);
    state.isSwitchingDoc = false;
  }

  async function switchDocumentTab(docId) {
    if (state.activeDocId === docId) {
      renderWorkspaceBar();
      return;
    }
    setDiffMode(false);
    // 约束：从主简历切走前，若有未保存修改，必须提醒用户确认保存
    if (state.activeDocId === 'master' && state.masterDirty) {
      const saveNow = confirm('⚠️ 「我的主简历」有尚未保存的修改。\n\n点击「确定」立即保存主简历并切换；\n点击「取消」留在主简历继续编辑（可撤回/重做或放弃修改）。');
      if (!saveNow) return;
      await persistMasterFromDom(false);
    } else {
      await flushCurrentDocToBackend();
    }

    if (docId === 'master') {
      state.activeDocId = 'master';
      state.masterDirty = false;
      state.masterWarnedOnce = false;
      if (state.master?.html) {
        loadHtmlIntoCanvas(state.master.html, state.master.theme);
      }
      renderWorkspaceBar();
      showToast('已切换到「🏠 我的主简历」');
      return;
    }

    const tab = state.openTabs.find((t) => t.id === docId);
    if (!tab) return;
    state.activeDocId = tab.id;
    if (tab.htmlSnapshot) {
      loadHtmlIntoCanvas(tab.htmlSnapshot, tab.theme);
    }
    // 同步该副模板绑定的岗位信息与审核提案到抽屉
    state.currentArchiveId = tab.id;
    state.currentSourceUrl = tab.sourceUrl || '';
    state.currentSalary = tab.salary || '';
    state.currentCity = tab.city || '';
    state.currentProposal = tab.proposal || null;
    state.currentEvaluation = tab.evaluation || null;
    state.selection = tab.selectedState || (tab.proposal ? buildDefaultSelection(tab.proposal) : null);
    document.getElementById('aiCompanyInput').value = tab.company || '';
    document.getElementById('aiJobTitleInput').value = tab.jobTitle || '';
    document.getElementById('aiJdTextarea').value = tab.jdText || '';
    renderEvalArea();
    renderReviewArea();
    renderWorkspaceBar();
    showToast(`已切换到副模板「${tab.company} · ${tab.jobTitle}」`);
  }

  async function openSubTemplateById(archiveId, openReviewDrawer = false) {
    try {
      await flushCurrentDocToBackend();
      const { archive } = await api(`/api/archives/${archiveId}`);
      upsertOpenTab(archive);
      state.activeDocId = '__force__';
      await switchDocumentTab(archive.id);
      if (openReviewDrawer) {
        document.getElementById('aiDrawerBackdrop')?.classList.add('open');
        document.getElementById('aiDrawer')?.classList.add('open');
        switchTab('tailor');
      }
    } catch (err) {
      showToast(`打开历史副模板失败：${err.message}`);
    }
  }

  function mountWorkspaceBar() {
    if (document.getElementById('aiWorkspaceBar')) return;
    const bar = document.createElement('div');
    bar.id = 'aiWorkspaceBar';
    bar.className = 'ai-workspace-bar';
    window.pagesContainer.parentNode.insertBefore(bar, window.pagesContainer);

    // 监听画布内容编辑与主题切换：主简历只标记未保存并提醒，绝不静默覆盖；副模板才自动保存
    const onCanvasMutated = () => {
      if (state.isSwitchingDoc) return;
      if (state.activeDocId === 'master') {
        markMasterDirty();
        setTimeout(syncMasterUndoButtons, 40);
        return;
      }
      clearTimeout(state.autoSaveTimer);
      state.autoSaveTimer = setTimeout(() => {
        flushCurrentDocToBackend();
      }, 900);
    };

    window.pagesContainer.addEventListener('input', onCanvasMutated);
    window.pagesContainer.addEventListener('drop', onCanvasMutated);
    window.pagesContainer.addEventListener('click', (e) => {
      if (e.target.closest('.item-del-btn, .entry-del-btn, .item-add-btn, .entry-add-bullet-btn, .entry-add-kv-btn, .item-toggle-btn, .info-add-btn, .info-del-btn, .section-tools .mini-btn, .page-actions .mini-btn')) {
        setTimeout(onCanvasMutated, 30);
      }
    });
    document.getElementById('themeSelector')?.addEventListener('change', onCanvasMutated);
    document.getElementById('btnUndo')?.addEventListener('click', () => setTimeout(syncMasterUndoButtons, 30));
    document.getElementById('btnRedo')?.addEventListener('click', () => setTimeout(syncMasterUndoButtons, 30));

    // 主简历有未保存修改时，关闭或刷新页面前提醒用户
    window.addEventListener('beforeunload', (e) => {
      if (state.activeDocId === 'master' && state.masterDirty) {
        e.preventDefault();
        e.returnValue = '「我的主简历」有尚未保存的修改，确定离开吗？';
      }
    });
  }

  function renderWorkspaceBar() {
    const bar = document.getElementById('aiWorkspaceBar');
    if (!bar) return;

    const subTabsHtml = state.openTabs
      .map((t) => {
        const active = state.activeDocId === t.id ? 'active' : '';
        return `
          <div class="ai-doc-tab is-sub ${active}" data-doc-tab="${escHtml(t.id)}" title="岗位副模板：${escHtml(t.company)} · ${escHtml(t.jobTitle)}">
            <span>🎯 ${escHtml(t.company)} · ${escHtml(t.jobTitle)}</span>
            <button type="button" class="ai-doc-tab-close" data-doc-close="${escHtml(t.id)}" title="关闭标签（不删除档案）">×</button>
          </div>`;
      })
      .join('');

    const activeSub = state.activeDocId !== 'master' ? state.openTabs.find((t) => t.id === state.activeDocId) : null;
    let bannerHtml = '';
    if (!activeSub) {
      const srcNote = state.master?.sourceFileName ? ` · 来源：${escHtml(state.master.sourceFileName)}` : '';
      const revNote = state.master?.revision ? ` · v${state.master.revision}` : '';
      if (state.masterDirty) {
        bannerHtml = `
          <div class="ai-doc-banner mode-master-dirty">
            <div>⚠️ <strong>正在修改「我的主简历」（尚未保存）</strong>· 修改不会自动覆盖底稿，保存前可随时撤回/重做</div>
            <div class="ai-doc-banner-actions">
              <button type="button" class="ai-btn ai-btn-sm" id="wsBtnMasterUndo" title="撤回上一步主简历修改（Ctrl + Z）">↶ 撤回</button>
              <button type="button" class="ai-btn ai-btn-sm" id="wsBtnMasterRedo" title="重做主简历修改（Ctrl + Y）">↷ 重做</button>
              <button type="button" class="ai-btn ai-btn-sm" id="wsBtnMasterDiscard" title="放弃未保存修改，恢复到上次保存的主简历">↺ 放弃修改</button>
              <button type="button" class="ai-btn ai-btn-sm" id="wsBtnUploadMaster" title="上传本 13 套模板导出的 HTML 主简历">📂 上传主简历</button>
              <button type="button" class="ai-btn ai-btn-save-warn ai-btn-sm" id="wsBtnSyncMaster" title="显式保存当前修改到后端主简历（POST /api/master/save）">💾 保存主简历</button>
            </div>
          </div>`;
      } else {
        bannerHtml = `
          <div class="ai-doc-banner mode-master">
            <div>🏠 <strong>当前编辑：我的主简历</strong>（受保护基准底稿 · 修改需手动保存${revNote}${srcNote}）</div>
            <div class="ai-doc-banner-actions">
              <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="wsBtnUploadMaster" title="上传本 13 套模板导出的 HTML 主简历">📂 上传主简历 HTML</button>
              <button type="button" class="ai-btn ai-btn-sm" id="wsBtnSyncMaster" title="保存主简历到后端（POST /api/master/save）">💾 保存主简历</button>
            </div>
          </div>`;
      }
    } else {
      const metaParts = [activeSub.salary, activeSub.city].filter(Boolean).join(' · ');
      const scoreText = activeSub.proposal?.matchScore != null ? ` ｜ 匹配度 ${activeSub.proposal.matchScore} 分` : '';
      const evalText =
        activeSub.evaluation?.overallScore != null
          ? ` ｜ 📊 评测 ${activeSub.evaluation.overallScore} 分${activeSub.evaluation.grade ? ' (' + activeSub.evaluation.grade + ')' : ''}`
          : '';
      const linkHtml = activeSub.sourceUrl
        ? ` ｜ <a href="${escHtml(activeSub.sourceUrl)}" target="_blank" style="color:#2563eb;font-weight:600;text-decoration:none;">原岗位 ↗</a>`
        : '';
      bannerHtml = `
        <div class="ai-doc-banner mode-sub">
          <div>
            🎯 <strong>绑定岗位：${escHtml(activeSub.company)} · ${escHtml(activeSub.jobTitle)}</strong>${metaParts ? ' ｜ ' + escHtml(metaParts) : ''}${scoreText}${evalText}${linkHtml}
          </div>
          <div class="ai-doc-banner-actions">
            <button type="button" class="ai-btn ai-btn-sm ${state.diffMode ? 'ai-btn-primary' : ''}" id="wsBtnToggleDiff">${state.diffMode ? '✅ 退出 Diff 审阅' : '🔍 Diff 审阅（红删绿增）'}</button>
            <button type="button" class="ai-btn ai-btn-sm" id="wsBtnReview">📊 评测与面试要点</button>
            <button type="button" class="ai-btn ai-btn-sm" id="wsBtnResetFromMaster">↺ 从主简历重置</button>
            <button type="button" class="ai-btn ai-btn-sm" id="wsBtnExportPng">🖼️ 导出 PNG</button>
            <button type="button" class="ai-btn ai-btn-primary ai-btn-sm" id="wsBtnExportPdf">🖨️ 导出 PDF</button>
          </div>
        </div>`;
    }

    bar.innerHTML = `
      <div class="ai-doc-tabs-row">
        <div class="ai-doc-tabs">
          <div class="ai-doc-tab is-master ${state.activeDocId === 'master' ? 'active' : ''}" data-doc-tab="master">🏠 我的主简历${state.masterDirty ? '<span class="ai-master-dirty-dot" title="有未保存修改"></span>' : ''}</div>
          ${subTabsHtml}
        </div>
        <button type="button" class="ai-btn ai-btn-sm" id="wsBtnHistory" style="flex-shrink:0;">📂 历史副模板 (<span id="aiHistoryCount">${state.archives.length}</span>)</button>
      </div>
      ${bannerHtml}
    `;

    bar.querySelectorAll('[data-doc-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-doc-close]')) return;
        switchDocumentTab(el.dataset.docTab);
      });
    });

    bar.querySelectorAll('[data-doc-close]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeOpenTab(btn.dataset.docClose);
      });
    });

    bar.querySelector('#wsBtnHistory')?.addEventListener('click', () => {
      document.getElementById('aiDrawerBackdrop')?.classList.add('open');
      document.getElementById('aiDrawer')?.classList.add('open');
      loadArchives();
      switchTab('archives');
    });

    bar.querySelector('#wsBtnMasterUndo')?.addEventListener('click', () => {
      if (typeof window.undo === 'function') window.undo();
      setTimeout(syncMasterUndoButtons, 30);
    });
    bar.querySelector('#wsBtnMasterRedo')?.addEventListener('click', () => {
      if (typeof window.redo === 'function') window.redo();
      setTimeout(syncMasterUndoButtons, 30);
    });
    bar.querySelector('#wsBtnMasterDiscard')?.addEventListener('click', discardUnsavedMasterChanges);
    bar.querySelector('#wsBtnUploadMaster')?.addEventListener('click', () => {
      document.getElementById('aiMasterHtmlInput')?.click();
    });
    bar.querySelector('#wsBtnSyncMaster')?.addEventListener('click', () => persistMasterFromDom(false));
    syncMasterUndoButtons();

    bar.querySelector('#wsBtnToggleDiff')?.addEventListener('click', () => {
      setDiffMode(!state.diffMode);
    });

    bar.querySelector('#wsBtnReview')?.addEventListener('click', () => {
      document.getElementById('aiDrawerBackdrop')?.classList.add('open');
      document.getElementById('aiDrawer')?.classList.add('open');
      switchTab('tailor');
    });

    bar.querySelector('#wsBtnResetFromMaster')?.addEventListener('click', async () => {
      if (!state.master?.html) {
        showToast('尚未保存主简历底稿');
        return;
      }
      if (!confirm('确认用「我的主简历」重置当前副模板的内容吗？')) return;
      loadHtmlIntoCanvas(state.master.html, document.body.dataset.theme || state.master.theme);
      await flushCurrentDocToBackend();
      if (state.diffMode) renderDiffReviewPanel();
      showToast('已从主简历重置当前副模板');
    });

    bar.querySelector('#wsBtnExportPng')?.addEventListener('click', () => {
      setDiffMode(false);
      exportHdPng();
    });
    bar.querySelector('#wsBtnExportPdf')?.addEventListener('click', () => {
      setDiffMode(false);
      document.getElementById('btnPrint')?.click();
    });
  }

  // ===== 6.8 代码 Review 风格 Diff 对比审阅引擎（红删绿增 + 单条还原） =====
  function tokenizeForDiff(str) {
    // 英文单词/数字整体切分，中文按单字切分，保证中英文混排 Diff 颗粒度精准
    return String(str || '').match(/[A-Za-z0-9_+#.-]+|\s+|[\u4e00-\u9fa5]|[^\s\w\u4e00-\u9fa5]/g) || [];
  }

  function computeInlineDiff(oldStr, newStr) {
    const a = tokenizeForDiff(oldStr);
    const b = tokenizeForDiff(newStr);
    const m = a.length;
    const n = b.length;
    if (m * n > 60000) {
      return {
        delHtml: `<span class="ai-diff-del-mark">${escHtml(oldStr)}</span>`,
        addHtml: `<span class="ai-diff-add-mark">${escHtml(newStr)}</span>`
      };
    }
    const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    let delHtml = '';
    let addHtml = '';
    let delBuf = '';
    let addBuf = '';
    const flushDel = () => {
      if (delBuf) {
        delHtml += `<span class="ai-diff-del-mark">${escHtml(delBuf)}</span>`;
        delBuf = '';
      }
    };
    const flushAdd = () => {
      if (addBuf) {
        addHtml += `<span class="ai-diff-add-mark">${escHtml(addBuf)}</span>`;
        addBuf = '';
      }
    };
    while (i < m && j < n) {
      if (a[i] === b[j]) {
        flushDel();
        flushAdd();
        const safe = escHtml(a[i]);
        delHtml += safe;
        addHtml += safe;
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        delBuf += a[i++];
      } else {
        addBuf += b[j++];
      }
    }
    while (i < m) delBuf += a[i++];
    while (j < n) addBuf += b[j++];
    flushDel();
    flushAdd();
    return { delHtml, addHtml };
  }

  function pairListItems(oldList, newList, keyFn, fullTextFn) {
    const usedOld = new Set();
    const usedNew = new Set();
    const pairs = [];

    // 1. 先按完全一致或标题一致精确配对
    newList.forEach((nItem, ni) => {
      const nKey = keyFn(nItem);
      const nFull = fullTextFn(nItem);
      let matchIdx = oldList.findIndex((oItem, oi) => !usedOld.has(oi) && fullTextFn(oItem) === nFull);
      if (matchIdx < 0 && nKey) {
        matchIdx = oldList.findIndex((oItem, oi) => !usedOld.has(oi) && keyFn(oItem) === nKey);
      }
      if (matchIdx >= 0) {
        usedOld.add(matchIdx);
        usedNew.add(ni);
        const oItem = oldList[matchIdx];
        const status = fullTextFn(oItem) === nFull ? 'same' : 'modified';
        pairs.push({ status, oldItem: oItem, newItem: nItem, oldIdx: matchIdx, newIdx: ni });
      }
    });

    // 2. 剩余按顺序配对（若两边都有剩余则视为 modified，否则为 added / deleted）
    const remOld = oldList.map((item, idx) => ({ item, idx })).filter((x) => !usedOld.has(x.idx));
    const remNew = newList.map((item, idx) => ({ item, idx })).filter((x) => !usedNew.has(x.idx));
    const common = Math.min(remOld.length, remNew.length);
    for (let k = 0; k < common; k++) {
      pairs.push({
        status: 'modified',
        oldItem: remOld[k].item,
        newItem: remNew[k].item,
        oldIdx: remOld[k].idx,
        newIdx: remNew[k].idx
      });
    }
    for (let k = common; k < remOld.length; k++) {
      pairs.push({ status: 'deleted', oldItem: remOld[k].item, newItem: null, oldIdx: remOld[k].idx, newIdx: -1 });
    }
    for (let k = common; k < remNew.length; k++) {
      pairs.push({ status: 'added', oldItem: null, newItem: remNew[k].item, oldIdx: -1, newIdx: remNew[k].idx });
    }
    return pairs;
  }

  function setDiffMode(enabled) {
    const next = Boolean(enabled) && state.activeDocId !== 'master';
    state.diffMode = next;
    let panel = document.getElementById('aiDiffPanel');
    if (!next) {
      if (panel) panel.style.display = 'none';
      window.pagesContainer.style.display = '';
      renderWorkspaceBar();
      return;
    }
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'aiDiffPanel';
      panel.className = 'ai-diff-panel';
      window.pagesContainer.parentNode.insertBefore(panel, window.pagesContainer);
    }
    window.pagesContainer.style.display = 'none';
    panel.style.display = 'block';
    renderWorkspaceBar();
    renderDiffReviewPanel();
  }

  async function applyDomMutationAndRefreshDiff(fn, toastMsg) {
    fn();
    if (typeof window.enhanceBlocks === 'function') window.enhanceBlocks(window.pagesContainer);
    if (typeof window.updatePageNumbers === 'function') window.updatePageNumbers(true);
    if (typeof window.autoReflowPages === 'function') window.autoReflowPages(false);
    await flushCurrentDocToBackend();
    renderDiffReviewPanel();
    if (toastMsg) showToast(toastMsg);
  }

  function renderDiffReviewPanel() {
    const panel = document.getElementById('aiDiffPanel');
    if (!panel || !state.diffMode) return;

    const masterSk = state.master?.html ? extractSkeletonFromHtml(state.master.html) : state.master?.skeleton;
    const subSk = extractSkeletonFromDom();
    if (!masterSk) {
      panel.innerHTML = '<div style="padding:20px;">尚未找到主简历底稿，请先切换到「我的主简历」保存一次。</div>';
      return;
    }

    let addCount = 0;
    let delCount = 0;
    let modCount = 0;

    // 1. 求职意向 Diff
    const roleChanged = (masterSk.targetRole || '') !== (subSk.targetRole || '');
    if (roleChanged) modCount++;
    const roleDiff = roleChanged ? computeInlineDiff(masterSk.targetRole || '', subSk.targetRole || '') : null;
    const roleSectionHtml = `
      <div class="ai-diff-section">
        <div class="ai-diff-sec-head">
          <span>求职意向</span>
          ${roleChanged ? '<button type="button" class="ai-btn ai-btn-sm" data-diff-revert-role="1">↺ 还原为主简历</button>' : '<span class="ai-hint">未变更</span>'}
        </div>
        ${
          roleChanged
            ? `<div class="ai-diff-hunk">
                <div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text">${roleDiff.delHtml}</div></div>
                <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text">${roleDiff.addHtml}</div></div>
              </div>`
            : `<div class="ai-diff-line is-same"><span class="ai-diff-sign"> </span><div class="ai-diff-text">${escHtml(subSk.targetRole || '（空）')}</div></div>`
        }
      </div>`;

    // 2. 专业技能 Diff
    const skillPairs = pairListItems(
      masterSk.skills || [],
      subSk.skills || [],
      (s) => s.category || '',
      (s) => `${s.category}：${s.content}`
    );
    const skillHunksHtml = skillPairs
      .map((pair, idx) => {
        if (pair.status === 'same') {
          return `<div class="ai-diff-hunk"><div class="ai-diff-line is-same"><span class="ai-diff-sign"> </span><div class="ai-diff-text"><strong>${escHtml(pair.newItem.category)}：</strong>${escHtml(pair.newItem.content)}</div></div></div>`;
        }
        if (pair.status === 'modified') {
          modCount++;
          const d = computeInlineDiff(`${pair.oldItem.category}：${pair.oldItem.content}`, `${pair.newItem.category}：${pair.newItem.content}`);
          return `
            <div class="ai-diff-hunk">
              <div class="ai-diff-hunk-bar">
                <span>技能修改</span>
                <button type="button" class="ai-btn ai-btn-sm" data-diff-skill-revert="${idx}">↺ 还原此条</button>
              </div>
              <div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text">${d.delHtml}</div></div>
              <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text">${d.addHtml}</div></div>
            </div>`;
        }
        if (pair.status === 'added') {
          addCount++;
          return `
            <div class="ai-diff-hunk">
              <div class="ai-diff-hunk-bar">
                <span style="color:#16a34a;font-weight:600;">+ 新增技能</span>
                <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-diff-skill-remove="${idx}">× 移除此新增</button>
              </div>
              <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text"><strong>${escHtml(pair.newItem.category)}：</strong>${escHtml(pair.newItem.content)}</div></div>
            </div>`;
        }
        delCount++;
        return `
          <div class="ai-diff-hunk">
            <div class="ai-diff-hunk-bar">
              <span style="color:#dc2626;font-weight:600;">- 原主简历已删除条目</span>
              <button type="button" class="ai-btn ai-btn-sm" data-diff-skill-restore="${idx}">+ 恢复原条目</button>
            </div>
            <div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text"><strong>${escHtml(pair.oldItem.category)}：</strong>${escHtml(pair.oldItem.content)}</div></div>
          </div>`;
      })
      .join('');

    // 3. 项目经历 Diff
    const projPairStore = [];
    const projSectionsHtml = (subSk.projects || [])
      .map((sProj, pIdx) => {
        const mProj =
          (masterSk.projects || []).find((p) => p.name && p.name === sProj.name) ||
          (masterSk.projects || [])[pIdx] || { techStack: '', bullets: [] };

        const techChanged = (mProj.techStack || '') !== (sProj.techStack || '');
        if (techChanged) modCount++;
        const techDiff = techChanged ? computeInlineDiff(mProj.techStack || '', sProj.techStack || '') : null;

        const bulletPairs = pairListItems(
          mProj.bullets || [],
          sProj.bullets || [],
          (b) => b.title || '',
          (b) => `${b.title}：${b.detail}`
        );
        projPairStore[pIdx] = { mProj, sProj, bulletPairs };

        const bulletsHtml = bulletPairs
          .map((pair, bIdx) => {
            if (pair.status === 'same') {
              return `<div class="ai-diff-hunk"><div class="ai-diff-line is-same"><span class="ai-diff-sign"> </span><div class="ai-diff-text"><strong>${escHtml(pair.newItem.title)}：</strong>${escHtml(pair.newItem.detail)}</div></div></div>`;
            }
            if (pair.status === 'modified') {
              modCount++;
              const d = computeInlineDiff(`${pair.oldItem.title}：${pair.oldItem.detail}`, `${pair.newItem.title}：${pair.newItem.detail}`);
              return `
                <div class="ai-diff-hunk">
                  <div class="ai-diff-hunk-bar">
                    <span>模块改写</span>
                    <button type="button" class="ai-btn ai-btn-sm" data-diff-b-revert="${pIdx}:${bIdx}">↺ 还原此模块</button>
                  </div>
                  <div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text">${d.delHtml}</div></div>
                  <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text">${d.addHtml}</div></div>
                </div>`;
            }
            if (pair.status === 'added') {
              addCount++;
              return `
                <div class="ai-diff-hunk">
                  <div class="ai-diff-hunk-bar">
                    <span style="color:#16a34a;font-weight:600;">+ 新增功能模块</span>
                    <button type="button" class="ai-btn ai-btn-danger ai-btn-sm" data-diff-b-remove="${pIdx}:${bIdx}">× 移除此新增</button>
                  </div>
                  <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text"><strong>${escHtml(pair.newItem.title)}：</strong>${escHtml(pair.newItem.detail)}</div></div>
                </div>`;
            }
            delCount++;
            return `
              <div class="ai-diff-hunk">
                <div class="ai-diff-hunk-bar">
                  <span style="color:#dc2626;font-weight:600;">- 原主简历已删除模块</span>
                  <button type="button" class="ai-btn ai-btn-sm" data-diff-b-restore="${pIdx}:${bIdx}">+ 恢复原模块</button>
                </div>
                <div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text"><strong>${escHtml(pair.oldItem.title)}：</strong>${escHtml(pair.oldItem.detail)}</div></div>
              </div>`;
          })
          .join('');

        return `
          <div class="ai-diff-section">
            <div class="ai-diff-sec-head">
              <span>📌 项目：${escHtml(sProj.name || `项目 ${pIdx + 1}`)}</span>
              <span class="ai-hint">${escHtml(sProj.time || '')}</span>
            </div>
            <div class="ai-diff-hunk">
              <div class="ai-diff-hunk-bar">
                <span>技术栈${techChanged ? '（已变更）' : '（未变更）'}</span>
                ${techChanged ? `<button type="button" class="ai-btn ai-btn-sm" data-diff-tech-revert="${pIdx}">↺ 还原技术栈</button>` : ''}
              </div>
              ${
                techChanged
                  ? `<div class="ai-diff-line is-del"><span class="ai-diff-sign">-</span><div class="ai-diff-text"><strong>技术栈：</strong>${techDiff.delHtml}</div></div>
                     <div class="ai-diff-line is-add"><span class="ai-diff-sign">+</span><div class="ai-diff-text"><strong>技术栈：</strong>${techDiff.addHtml}</div></div>`
                  : `<div class="ai-diff-line is-same"><span class="ai-diff-sign"> </span><div class="ai-diff-text"><strong>技术栈：</strong>${escHtml(sProj.techStack)}</div></div>`
              }
            </div>
            ${bulletsHtml}
          </div>`;
      })
      .join('');

    panel.innerHTML = `
      <div class="ai-diff-topbar">
        <div>
          <strong style="font-size:14px;">🔍 副模板 vs 主简历 · 代码级 Diff 审阅</strong>
          <div class="ai-diff-stats" style="margin-left:10px;">
            <span class="ai-diff-stat-mod">${modCount} 处修改</span>
            <span class="ai-diff-stat-add">+${addCount} 新增</span>
            <span class="ai-diff-stat-del">-${delCount} 删除</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button type="button" class="ai-btn ai-btn-success ai-btn-sm" id="btnDiffDone">✅ 完成审阅，返回简历画布</button>
        </div>
      </div>
      ${roleSectionHtml}
      <div class="ai-diff-section">
        <div class="ai-diff-sec-head"><span>专业技能</span></div>
        ${skillHunksHtml}
      </div>
      ${projSectionsHtml}
    `;

    panel.querySelector('#btnDiffDone')?.addEventListener('click', () => setDiffMode(false));

    // 单项还原：求职意向
    panel.querySelector('[data-diff-revert-role]')?.addEventListener('click', () => {
      applyDomMutationAndRefreshDiff(() => {
        const el = findTargetRoleEl();
        if (el) el.textContent = masterSk.targetRole || '';
      }, '已还原求职意向为主简历');
    });

    // 单项还原/移除/恢复：专业技能
    panel.querySelectorAll('[data-diff-skill-revert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pair = skillPairs[Number(btn.dataset.diffSkillRevert)];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findSkillSection()?.querySelector('ul.bullet-list');
          const li = ul?.children[pair.newIdx];
          if (li && pair.oldItem) {
            li.innerHTML = `<strong>${escHtml(pair.oldItem.category)}：</strong>${escHtml(pair.oldItem.content)}`;
          }
        }, '已还原该条技能为主简历');
      });
    });

    panel.querySelectorAll('[data-diff-skill-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pair = skillPairs[Number(btn.dataset.diffSkillRemove)];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findSkillSection()?.querySelector('ul.bullet-list');
          ul?.children[pair.newIdx]?.remove();
        }, '已移除该条新增技能');
      });
    });

    panel.querySelectorAll('[data-diff-skill-restore]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pair = skillPairs[Number(btn.dataset.diffSkillRestore)];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findSkillSection()?.querySelector('ul.bullet-list');
          if (ul && pair.oldItem) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${escHtml(pair.oldItem.category)}：</strong>${escHtml(pair.oldItem.content)}`;
            ul.appendChild(li);
          }
        }, '已恢复原主简历技能条目');
      });
    });

    // 单项还原：项目技术栈
    panel.querySelectorAll('[data-diff-tech-revert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const pIdx = Number(btn.dataset.diffTechRevert);
        const { mProj } = projPairStore[pIdx];
        applyDomMutationAndRefreshDiff(() => {
          const entry = findProjectEntries()[pIdx];
          entry?.querySelectorAll('.kv-line').forEach((kv) => {
            if (cleanCloneText(kv).startsWith('技术栈')) {
              kv.innerHTML = `<strong>技术栈：</strong>${escHtml(mProj.techStack || '')}`;
            }
          });
        }, '已还原该项目技术栈为主简历');
      });
    });

    // 单项还原/移除/恢复：项目功能模块
    panel.querySelectorAll('[data-diff-b-revert]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [pIdx, bIdx] = btn.dataset.diffBRevert.split(':').map(Number);
        const pair = projPairStore[pIdx].bulletPairs[bIdx];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findProjectEntries()[pIdx]?.querySelector('ul.bullet-list');
          const li = ul?.children[pair.newIdx];
          if (li && pair.oldItem) {
            li.innerHTML = `<strong>${escHtml(pair.oldItem.title)}：</strong>${escHtml(pair.oldItem.detail)}`;
          }
        }, '已还原该功能模块为主简历');
      });
    });

    panel.querySelectorAll('[data-diff-b-remove]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [pIdx, bIdx] = btn.dataset.diffBRemove.split(':').map(Number);
        const pair = projPairStore[pIdx].bulletPairs[bIdx];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findProjectEntries()[pIdx]?.querySelector('ul.bullet-list');
          ul?.children[pair.newIdx]?.remove();
        }, '已移除该新增功能模块');
      });
    });

    panel.querySelectorAll('[data-diff-b-restore]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const [pIdx, bIdx] = btn.dataset.diffBRestore.split(':').map(Number);
        const pair = projPairStore[pIdx].bulletPairs[bIdx];
        applyDomMutationAndRefreshDiff(() => {
          const ul = findProjectEntries()[pIdx]?.querySelector('ul.bullet-list');
          if (ul && pair.oldItem) {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${escHtml(pair.oldItem.title)}：</strong>${escHtml(pair.oldItem.detail)}`;
            ul.appendChild(li);
          }
        }, '已恢复原主简历功能模块');
      });
    });
  }

  // ===== 7. 高清 PNG 长图导出（方便 BOSS 直聘直接发图） =====
  async function exportHdPng() {
    if (typeof window.html2canvas !== 'function') {
      showToast('html2canvas 未加载，请确认通过本地 Node 服务访问页面');
      return;
    }
    const btn = document.getElementById('btnExportPng');
    const pages = Array.from(document.querySelectorAll('#pagesContainer .page'));
    if (!pages.length) return;

    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = '渲染 PNG 中...';
    document.body.classList.add('exporting-png');

    try {
      await new Promise((r) => setTimeout(r, 80));
      const canvases = [];
      for (const page of pages) {
        const c = await window.html2canvas(page, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });
        canvases.push(c);
      }

      const width = Math.max(...canvases.map((c) => c.width));
      const gap = canvases.length > 1 ? 16 : 0;
      const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0) + gap * (canvases.length - 1);

      const merged = document.createElement('canvas');
      merged.width = width;
      merged.height = totalHeight;
      const ctx = merged.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, totalHeight);

      let y = 0;
      for (const c of canvases) {
        ctx.drawImage(c, 0, y);
        y += c.height + gap;
      }

      const activeSub = state.activeDocId !== 'master' ? state.openTabs.find((t) => t.id === state.activeDocId) : null;
      const company = (activeSub?.company || document.getElementById('aiCompanyInput')?.value || '').trim();
      const job = (activeSub?.jobTitle || document.getElementById('aiJobTitleInput')?.value || '').trim();
      const safeName =
        state.activeDocId === 'master'
          ? '我的主简历'
          : [company, job].filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g, '') || '定制副模板';

      const link = document.createElement('a');
      link.download = `个人简历_${safeName}.png`;
      link.href = merged.toDataURL('image/png');
      link.click();
      showToast(`已导出高清 PNG：个人简历_${safeName}.png`);
    } catch (err) {
      showToast(`导出 PNG 失败：${err.message}`);
    } finally {
      document.body.classList.remove('exporting-png');
      btn.disabled = false;
      btn.textContent = oldText;
    }
  }

  // ===== 8. 启动初始化 =====
  async function bootstrap() {
    initToolbarDropdowns();
    mountWorkspaceBar();
    mountDrawer();
    try {
      const [cfgRes, masterRes, kbRes, gsRes] = await Promise.all([
        api('/api/config'),
        api('/api/master'),
        api('/api/knowledge'),
        api('/api/golden-set')
      ]);
      state.config = cfgRes.config;
      state.defaultPrompts = cfgRes.defaultPrompts || {};
      state.master = masterRes.master;
      state.knowledge = kbRes.knowledge || { updatedAt: null, projects: [] };
      state.goldenSet = gsRes.goldenSet || { updatedAt: null, samples: [] };
      renderConfig();
      renderGoldenSetList();
      renderKnowledgeList();
      updateMasterStatus();

      // 若后端尚未初始化主简历，自动把当前画布存为初始主简历底稿；若已有主简历，优先载入主简历
      if (state.master?.html) {
        loadHtmlIntoCanvas(state.master.html, state.master.theme);
      } else {
        await persistMasterFromDom(true).catch(() => {});
      }

      // 恢复上次打开的副模板标签
      await loadArchives();
      try {
        const savedIds = JSON.parse(localStorage.getItem(OPEN_TABS_KEY) || '[]');
        if (Array.isArray(savedIds) && savedIds.length) {
          for (const id of savedIds.slice(0, 8)) {
            if (state.archives.some((a) => a.id === id)) {
              const { archive } = await api(`/api/archives/${id}`);
              upsertOpenTab(archive);
            }
          }
        }
      } catch {}
    } catch (err) {
      showToast('未连接到本地 AI 服务，请确认 node server.js 已启动');
    }
    renderWorkspaceBar();
    loadInbox();
    setInterval(loadInbox, 3500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
