require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const store = require('./lib/store');
const llm = require('./lib/llm');
const parser = require('./lib/parser');

const app = express();
const PORT = Number(process.env.PORT || 3845);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// 静态资源：13 套模板编辑器 + 本地 html2canvas（零外部 CDN 依赖）+ 油猴脚本一键安装入口
app.use(express.static(path.join(__dirname, 'public')));
app.get('/vendor/html2canvas.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'html2canvas', 'dist', 'html2canvas.min.js'));
});
app.get('/boss-jd-capture.user.js', (req, res) => {
  res.type('application/javascript; charset=utf-8');
  res.sendFile(path.join(__dirname, 'userscript', 'boss-jd-capture.user.js'));
});

// 健康检查（油猴脚本也会调用以检测本地服务是否启动）
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'ai-resume-tailor', port: PORT, time: new Date().toISOString() });
});

// 模型配置（仅返回脱敏后的 key 状态 + 默认系统提示词）
app.get('/api/config', (req, res) => {
  res.json({ ok: true, config: store.getPublicConfig(), defaultPrompts: llm.DEFAULT_PROMPTS });
});

app.post('/api/config', (req, res) => {
  try {
    const config = store.saveConfig(req.body || {});
    res.json({ ok: true, config });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 拉取兼容 OpenAI 协议的可用模型列表（GET {baseUrl}/models）
app.post('/api/models/fetch', async (req, res) => {
  try {
    const saved = store.getRawConfig();
    const baseUrl = String(req.body?.baseUrl || '').trim() || saved.baseUrl;
    const apiKey = String(req.body?.apiKey || '').trim() || saved.apiKey;
    const models = await llm.fetchAvailableModels({ baseUrl, apiKey });
    res.json({ ok: true, models });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 母版简历骨架
app.get('/api/master', (req, res) => {
  res.json({ ok: true, master: store.getMaster() });
});

const ALLOWED_MASTER_THEMES = new Set([
  'sage-ribbon', 'basic-a4', 'minimal-prose', 'corporate-classic', 'gov-red',
  'folio-ledger', 'sidebar-compact', 'timeline-grid', 'editorial',
  'swiss-neue', 'bauhaus', 'code-poetry', 'mono-raw'
]);

app.post('/api/master', (req, res) => {
  try {
    const master = store.saveMaster(req.body || {});
    res.json({ ok: true, master });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

function validateMasterHtmlPayload(html) {
  if (typeof html !== 'string' || !html.trim()) {
    return '缺少有效的 HTML 简历内容';
  }
  if (/<script\b|<iframe\b|<object\b|<embed\b/i.test(html)) {
    return '主简历内容包含未清理的脚本或嵌入标签';
  }
  const hasPage = /class="[^"]*\bpage\b[^"]*"/i.test(html);
  const hasBody = /class="[^"]*\bpage-body\b[^"]*"/i.test(html);
  const hasSection = /class="[^"]*\bsection-ribbon\b[^"]*"/i.test(html) || /class="[^"]*\bsection-content\b[^"]*"/i.test(html);
  if (!hasPage || !hasBody || !hasSection) {
    return '仅支持本 13 套模板（及兼容多页模板）导出的 HTML 格式主简历';
  }
  return null;
}

// 显式保存主简历接口（修改主简历后需用户主动保存，禁止静默覆盖）
app.post('/api/master/save', (req, res) => {
  try {
    const { html, theme, skeleton, sourceFileName, styleState } = req.body || {};
    const errMsg = validateMasterHtmlPayload(html);
    if (errMsg) {
      return res.status(400).json({ ok: false, error: `保存主简历失败：${errMsg}` });
    }
    const safeTheme = ALLOWED_MASTER_THEMES.has(theme) ? theme : 'sage-ribbon';
    const master = store.saveMaster({
      html,
      theme: safeTheme,
      skeleton: skeleton || { targetRole: '', skills: [], projects: [] },
      sourceFileName: sourceFileName || '',
      styleState: styleState || null
    });
    res.json({ ok: true, master });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 上传 13 套模板 HTML 主简历（严格校验仅接受本 13 套模板及兼容多页模板结构）
app.post('/api/master/upload', (req, res) => {
  try {
    const { html, theme, skeleton, sourceFileName, styleState } = req.body || {};
    const errMsg = validateMasterHtmlPayload(html);
    if (errMsg) {
      return res.status(400).json({ ok: false, error: `上传失败：${errMsg}` });
    }
    const safeTheme = ALLOWED_MASTER_THEMES.has(theme) ? theme : 'sage-ribbon';
    const master = store.saveMaster({
      html,
      theme: safeTheme,
      skeleton: skeleton || { targetRole: '', skills: [], projects: [] },
      sourceFileName: sourceFileName || 'uploaded-master.html',
      styleState: styleState || null
    });
    res.json({ ok: true, master });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// 项目深度素材库（MD/TXT 项目档案，专供 AI 深度了解项目）
app.get('/api/knowledge', (req, res) => {
  res.json({ ok: true, knowledge: store.getKnowledge() });
});

app.post('/api/knowledge', (req, res) => {
  try {
    const knowledge = store.saveKnowledge(req.body || {});
    res.json({ ok: true, knowledge });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Golden Set 标杆样本库（本地解析 PDF / DOCX / HTML + AI 提炼写作画像）
app.get('/api/golden-set', (req, res) => {
  res.json({ ok: true, goldenSet: store.getGoldenSet() });
});

app.post('/api/golden-set/upload', async (req, res) => {
  try {
    const { fileName, base64Content, tag } = req.body || {};
    if (!fileName || !base64Content) {
      return res.status(400).json({ ok: false, error: '请上传 PDF / DOCX / HTML / PNG 图片文件' });
    }
    const config = store.getRawConfig();
    const parsed = await parser.parseGoldenDocument({
      fileName,
      base64Content,
      visionExtractor: (dataUrl) => llm.extractResumeTextFromImage(config, dataUrl)
    });
    let profile = null;
    let profileWarning = '';
    if (config.apiKey && config.model) {
      try {
        profile = await llm.extractGoldenProfile(config, {
          fileName,
          format: parsed.format,
          tag: tag || '通用',
          rawText: parsed.text
        });
      } catch (err) {
        profileWarning = `文档已解析成功，但自动提炼画像失败（${err.message}），评测时将直接参考文本。`;
      }
    } else {
      profileWarning = '文档已解析成功；配置大模型 API Key 后可点击「重新提炼画像」。';
    }
    const sample = store.addGoldenSample({
      fileName,
      format: parsed.format,
      tag: tag || '通用',
      enabled: true,
      charCount: parsed.charCount,
      rawText: parsed.text,
      profile
    });
    res.json({ ok: true, sample, warning: profileWarning });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/golden-set/:id/reextract', async (req, res) => {
  try {
    const gs = store.getGoldenSet();
    const target = gs.samples.find((s) => s.id === req.params.id);
    if (!target) return res.status(404).json({ ok: false, error: '样本不存在' });
    const config = store.getRawConfig();
    const profile = await llm.extractGoldenProfile(config, target);
    const updated = store.updateGoldenSample(target.id, { profile });
    res.json({ ok: true, sample: updated });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.patch('/api/golden-set/:id', (req, res) => {
  const updated = store.updateGoldenSample(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ ok: false, error: '样本不存在' });
  res.json({ ok: true, sample: updated });
});

app.delete('/api/golden-set/:id', (req, res) => {
  store.deleteGoldenSample(req.params.id);
  res.json({ ok: true });
});

// 油猴 JD 收件箱（只接收当前人工浏览页的可见内容或截图，绝不爬接口、绝不自动提交）
app.get('/api/inbox', (req, res) => {
  res.json({ ok: true, items: store.getInbox() });
});

app.post('/api/inbox', (req, res) => {
  try {
    const { jdText, screenshotDataUrl } = req.body || {};
    if (!jdText && !screenshotDataUrl) {
      return res.status(400).json({ ok: false, error: '缺少 jdText 或 screenshotDataUrl' });
    }
    const { item, deduplicated } = store.addInboxItem(req.body);
    res.json({ ok: true, item, deduplicated });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.post('/api/inbox/:id/read', (req, res) => {
  const item = store.markInboxRead(req.params.id);
  res.json({ ok: true, item });
});

app.post('/api/inbox/:id/status', (req, res) => {
  const item = store.updateInboxStatus(req.params.id, req.body || {});
  res.json({ ok: true, item });
});

app.delete('/api/inbox', (req, res) => {
  store.clearInbox();
  res.json({ ok: true });
});

app.delete('/api/inbox/:id', (req, res) => {
  store.deleteInboxItem(req.params.id);
  res.json({ ok: true });
});

// 截图识图提取 JD（支持 Snipaste 粘贴或油猴可视区截图）
app.post('/api/ocr-jd', async (req, res) => {
  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || !String(imageDataUrl).startsWith('data:image/')) {
      return res.status(400).json({ ok: false, error: '请提供合法的 base64 图片数据' });
    }
    const config = store.getRawConfig();
    const extracted = await llm.extractJdFromImage(config, imageDataUrl);
    res.json({ ok: true, extracted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 根据 JD + 真实母版骨架生成定制提案（支持 4 模块路由与单次临时 modelOverride）
app.post('/api/tailor', async (req, res) => {
  try {
    const { masterSkeleton, company, jobTitle, jdText, extraNotes, evalFeedback, modelOverride } = req.body || {};
    if (!jdText || !String(jdText).trim()) {
      return res.status(400).json({ ok: false, error: '请先输入或采集岗位 JD 内容' });
    }
    if (!masterSkeleton || (!Array.isArray(masterSkeleton.projects) && !Array.isArray(masterSkeleton.skills))) {
      return res.status(400).json({ ok: false, error: '请先保存或提取当前简历作为母版骨架' });
    }
    const config = store.getRawConfig();
    const projectKnowledge = store.getKnowledge();
    const goldenSet = store.getGoldenSet();
    const proposal = await llm.generateTailoredProposal(config, {
      masterSkeleton,
      projectKnowledge,
      goldenSamples: goldenSet.samples,
      evalFeedback,
      company,
      jobTitle,
      jdText,
      extraNotes,
      modelOverride
    });
    res.json({ ok: true, proposal, mode: config.mode, usedModel: proposal._usedModel || '' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// LLM-as-a-Judge 独立评测接口（支持 4 模块路由与单次临时 modelOverride）
app.post('/api/evaluate', async (req, res) => {
  try {
    const { company, jobTitle, jdText, candidateResume, modelOverride } = req.body || {};
    if (!candidateResume) {
      return res.status(400).json({ ok: false, error: '缺少待评测的简历内容' });
    }
    const config = store.getRawConfig();
    const goldenSet = store.getGoldenSet();
    const evaluation = await llm.evaluateResume(config, {
      company,
      jobTitle,
      jdText,
      candidateResume,
      goldenSamples: goldenSet.samples,
      mode: config.mode,
      modelOverride
    });
    res.json({ ok: true, evaluation, mode: config.mode, usedModel: evaluation._usedModel || '' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// 公司-岗位历史档案
app.get('/api/archives', (req, res) => {
  res.json({ ok: true, items: store.listArchives() });
});

app.get('/api/archives/:id', (req, res) => {
  const archive = store.getArchive(req.params.id);
  if (!archive) return res.status(404).json({ ok: false, error: '档案不存在' });
  res.json({ ok: true, archive });
});

app.post('/api/archives', (req, res) => {
  try {
    const archive = store.saveArchive(req.body || {});
    res.json({ ok: true, archive });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

app.delete('/api/archives/:id', (req, res) => {
  store.deleteArchive(req.params.id);
  res.json({ ok: true });
});

// 仅监听 127.0.0.1（严格本地安全隔离）
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n================================================`);
  console.log(`  AI 简历岗位定制服务已启动`);
  console.log(`  本地访问地址: http://127.0.0.1:${PORT}`);
  console.log(`================================================\n`);
});
