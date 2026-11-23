const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const ARCHIVES_DIR = path.join(DATA_DIR, 'archives');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const MASTER_FILE = path.join(DATA_DIR, 'master.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'knowledge.json');
const GOLDEN_FILE = path.join(DATA_DIR, 'golden-set.json');
const INBOX_FILE = path.join(DATA_DIR, 'inbox.json');

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(ARCHIVES_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDirs();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function newId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

const MODULE_KEYS = ['tailor', 'evaluate', 'goldenExtract', 'vision'];

function maskSecret(key) {
  const k = String(key || '');
  if (!k) return '';
  return k.length > 10 ? `${k.slice(0, 4)}****${k.slice(-4)}` : '****';
}

function normalizeModuleRoutes(rawRoutes = {}, legacyVisionModel = '') {
  const out = {};
  for (const key of MODULE_KEYS) {
    const r = rawRoutes?.[key] || {};
    out[key] = {
      model: String(r.model || (key === 'vision' ? legacyVisionModel : '') || '').trim(),
      baseUrl: String(r.baseUrl || '').trim(),
      apiKey: String(r.apiKey || '').trim()
    };
  }
  return out;
}

function getRawConfig() {
  const saved = readJson(CONFIG_FILE, {});
  const visionModel = saved.visionModel || process.env.LLM_VISION_MODEL || '';
  return {
    baseUrl: saved.baseUrl || process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
    apiKey: saved.apiKey || process.env.LLM_API_KEY || '',
    model: saved.model || process.env.LLM_MODEL || 'deepseek-chat',
    visionModel,
    mode: saved.mode === 'golden' ? 'golden' : 'default',
    models: Array.isArray(saved.models) ? saved.models : [],
    moduleRoutes: normalizeModuleRoutes(saved.moduleRoutes, visionModel),
    prompts: {
      tailorSystemPrompt: typeof saved.prompts?.tailorSystemPrompt === 'string' ? saved.prompts.tailorSystemPrompt : '',
      evalSystemPrompt: typeof saved.prompts?.evalSystemPrompt === 'string' ? saved.prompts.evalSystemPrompt : '',
      goldenExtractPrompt: typeof saved.prompts?.goldenExtractPrompt === 'string' ? saved.prompts.goldenExtractPrompt : ''
    }
  };
}

function getPublicConfig() {
  const cfg = getRawConfig();
  const publicRoutes = {};
  for (const key of MODULE_KEYS) {
    const r = cfg.moduleRoutes[key] || {};
    publicRoutes[key] = {
      model: r.model || '',
      baseUrl: r.baseUrl || '',
      hasApiKey: Boolean(r.apiKey),
      maskedKey: maskSecret(r.apiKey)
    };
  }
  return {
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    visionModel: cfg.moduleRoutes.vision.model || cfg.visionModel,
    mode: cfg.mode,
    models: cfg.models,
    moduleRoutes: publicRoutes,
    prompts: cfg.prompts,
    hasApiKey: Boolean(cfg.apiKey),
    maskedKey: maskSecret(cfg.apiKey)
  };
}

function saveConfig(patch) {
  const cur = getRawConfig();
  const models = Array.isArray(patch.models)
    ? patch.models
        .map((m) => ({
          id: String(m.id || '').trim(),
          name: String(m.name || m.id || '').trim(),
          supportsVision: Boolean(m.supportsVision)
        }))
        .filter((m) => m.id)
    : cur.models;

  const moduleRoutes = {};
  for (const key of MODULE_KEYS) {
    const prev = cur.moduleRoutes[key] || { model: '', baseUrl: '', apiKey: '' };
    const incoming = patch.moduleRoutes?.[key] || {};
    const clearKey = incoming.clearApiKey === true;
    moduleRoutes[key] = {
      model: typeof incoming.model === 'string' ? incoming.model.trim() : prev.model,
      baseUrl: typeof incoming.baseUrl === 'string' ? incoming.baseUrl.trim() : prev.baseUrl,
      apiKey: clearKey
        ? ''
        : typeof incoming.apiKey === 'string' && incoming.apiKey.trim() !== ''
        ? incoming.apiKey.trim()
        : prev.apiKey
    };
  }
  // 兼容旧字段 visionModel 同步
  if (typeof patch.visionModel === 'string' && !patch.moduleRoutes?.vision) {
    moduleRoutes.vision.model = patch.visionModel.trim();
  }

  const prompts = patch.prompts && typeof patch.prompts === 'object'
    ? {
        tailorSystemPrompt: typeof patch.prompts.tailorSystemPrompt === 'string' ? patch.prompts.tailorSystemPrompt : cur.prompts.tailorSystemPrompt,
        evalSystemPrompt: typeof patch.prompts.evalSystemPrompt === 'string' ? patch.prompts.evalSystemPrompt : cur.prompts.evalSystemPrompt,
        goldenExtractPrompt: typeof patch.prompts.goldenExtractPrompt === 'string' ? patch.prompts.goldenExtractPrompt : cur.prompts.goldenExtractPrompt
      }
    : cur.prompts;
  const next = {
    baseUrl: typeof patch.baseUrl === 'string' ? patch.baseUrl.trim() : cur.baseUrl,
    apiKey: typeof patch.apiKey === 'string' && patch.apiKey.trim() !== '' ? patch.apiKey.trim() : cur.apiKey,
    model: typeof patch.model === 'string' ? patch.model.trim() : cur.model,
    visionModel: moduleRoutes.vision.model,
    mode: patch.mode === 'golden' || patch.mode === 'default' ? patch.mode : cur.mode,
    models,
    moduleRoutes,
    prompts
  };
  writeJson(CONFIG_FILE, next);
  return getPublicConfig();
}

function getMaster() {
  return readJson(MASTER_FILE, null);
}

function saveMaster(payload) {
  const prev = getMaster();
  const prevRev = Number(prev?.revision || 0);
  const record = {
    revision: prevRev + 1,
    updatedAt: new Date().toISOString(),
    theme: payload.theme || prev?.theme || 'sage-ribbon',
    sourceFileName: typeof payload.sourceFileName === 'string' && payload.sourceFileName.trim()
      ? payload.sourceFileName.trim().slice(0, 200)
      : (prev?.sourceFileName || ''),
    styleState: payload.styleState && typeof payload.styleState === 'object' ? payload.styleState : (prev?.styleState || null),
    html: payload.html || '',
    skeleton: payload.skeleton || { targetRole: '', skills: [], projects: [] }
  };
  writeJson(MASTER_FILE, record);
  return record;
}

function getKnowledge() {
  return readJson(KNOWLEDGE_FILE, { updatedAt: null, projects: [] });
}

function saveKnowledge(payload) {
  const projects = Array.isArray(payload?.projects)
    ? payload.projects
        .map((p, idx) => ({
          id: String(p.id || newId(`kb${idx + 1}`)),
          name: String(p.name || `未命名项目 ${idx + 1}`).trim().slice(0, 120),
          content: String(p.content || '').slice(0, 60000)
        }))
        .filter((p) => p.name || p.content)
    : [];
  const record = {
    updatedAt: new Date().toISOString(),
    projects
  };
  writeJson(KNOWLEDGE_FILE, record);
  return record;
}

function getGoldenSet() {
  return readJson(GOLDEN_FILE, { updatedAt: null, samples: [] });
}

function addGoldenSample(sample) {
  const data = getGoldenSet();
  const record = {
    id: newId('gs'),
    createdAt: new Date().toISOString(),
    fileName: String(sample.fileName || '未命名样本').trim().slice(0, 180),
    format: String(sample.format || 'TXT').toUpperCase(),
    tag: String(sample.tag || '通用').trim().slice(0, 40),
    enabled: sample.enabled !== false,
    charCount: Number(sample.charCount || 0),
    rawText: String(sample.rawText || '').slice(0, 25000),
    profile: sample.profile || null
  };
  data.samples.unshift(record);
  data.updatedAt = new Date().toISOString();
  writeJson(GOLDEN_FILE, data);
  return record;
}

function updateGoldenSample(id, patch) {
  const data = getGoldenSet();
  const target = data.samples.find((s) => s.id === id);
  if (!target) return null;
  if (typeof patch.enabled === 'boolean') target.enabled = patch.enabled;
  if (typeof patch.tag === 'string') target.tag = patch.tag.trim().slice(0, 40);
  if (patch.profile !== undefined) target.profile = patch.profile;
  data.updatedAt = new Date().toISOString();
  writeJson(GOLDEN_FILE, data);
  return target;
}

function deleteGoldenSample(id) {
  const data = getGoldenSet();
  data.samples = data.samples.filter((s) => s.id !== id);
  data.updatedAt = new Date().toISOString();
  writeJson(GOLDEN_FILE, data);
  return true;
}

function getInbox() {
  return readJson(INBOX_FILE, []);
}

function addInboxItem(item) {
  const list = getInbox();
  const company = String(item.company || '').trim().slice(0, 120);
  const jobTitle = String(item.jobTitle || '').trim().slice(0, 120);
  const dedupeKey = company && jobTitle ? `${company.toLowerCase()}::${jobTitle.toLowerCase()}` : '';

  const existingIdx = dedupeKey
    ? list.findIndex((x) => `${(x.company || '').toLowerCase()}::${(x.jobTitle || '').toLowerCase()}` === dedupeKey)
    : -1;

  const existing = existingIdx >= 0 ? list[existingIdx] : null;
  const record = {
    id: existing ? existing.id : newId('jd'),
    capturedAt: new Date().toISOString(),
    sourceUrl: String(item.sourceUrl || existing?.sourceUrl || '').slice(0, 1000),
    company,
    jobTitle,
    salary: String(item.salary || existing?.salary || '').trim().slice(0, 60),
    city: String(item.city || existing?.city || '').trim().slice(0, 60),
    jdText: String(item.jdText || existing?.jdText || '').trim().slice(0, 20000),
    screenshotDataUrl: typeof item.screenshotDataUrl === 'string' && item.screenshotDataUrl ? item.screenshotDataUrl : (existing?.screenshotDataUrl || ''),
    mode: item.mode || existing?.mode || 'dom_visible',
    read: false,
    status: existing?.status || 'pending'
  };

  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  }
  list.unshift(record);
  const trimmed = list.slice(0, 200);
  writeJson(INBOX_FILE, trimmed);
  return { item: record, deduplicated: Boolean(existing) };
}

function updateInboxStatus(id, patch) {
  const list = getInbox();
  const target = list.find((x) => x.id === id);
  if (target) {
    if (typeof patch.read === 'boolean') target.read = patch.read;
    if (patch.status === 'pending' || patch.status === 'tailored') target.status = patch.status;
    writeJson(INBOX_FILE, list);
  }
  return target || null;
}

function clearInbox() {
  writeJson(INBOX_FILE, []);
  return true;
}

function markInboxRead(id) {
  const list = getInbox();
  const target = list.find((x) => x.id === id);
  if (target) {
    target.read = true;
    writeJson(INBOX_FILE, list);
  }
  return target || null;
}

function deleteInboxItem(id) {
  const list = getInbox().filter((x) => x.id !== id);
  writeJson(INBOX_FILE, list);
  return true;
}

function sanitizeId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function listArchives() {
  ensureDirs();
  const files = fs.readdirSync(ARCHIVES_DIR).filter((f) => f.endsWith('.json'));
  const items = [];
  for (const f of files) {
    const data = readJson(path.join(ARCHIVES_DIR, f), null);
    if (!data) continue;
    items.push({
      id: data.id,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      company: data.company || '未命名公司',
      jobTitle: data.jobTitle || '未命名岗位',
      salary: data.salary || '',
      city: data.city || '',
      matchScore: data.proposal?.matchScore ?? null,
      evalScore: data.evaluation?.overallScore ?? null,
      evalGrade: data.evaluation?.grade || '',
      theme: data.theme || 'sage-ribbon',
      sourceUrl: data.sourceUrl || ''
    });
  }
  items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  return items;
}

function getArchive(id) {
  const safe = sanitizeId(id);
  if (!safe) return null;
  return readJson(path.join(ARCHIVES_DIR, `${safe}.json`), null);
}

function saveArchive(payload) {
  ensureDirs();
  const now = new Date().toISOString();
  const existing = payload.id ? getArchive(payload.id) : null;
  const id = existing ? existing.id : newId('arch');
  const record = {
    id,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    company: String(payload.company || '未命名公司').trim(),
    jobTitle: String(payload.jobTitle || '未命名岗位').trim(),
    salary: String(payload.salary || existing?.salary || '').trim(),
    city: String(payload.city || existing?.city || '').trim(),
    sourceUrl: String(payload.sourceUrl || existing?.sourceUrl || '').trim(),
    jdText: String(payload.jdText || ''),
    proposal: payload.proposal || null,
    evaluation: payload.evaluation !== undefined ? payload.evaluation : (existing?.evaluation || null),
    selectedState: payload.selectedState || null,
    theme: payload.theme || 'sage-ribbon',
    htmlSnapshot: payload.htmlSnapshot || ''
  };
  writeJson(path.join(ARCHIVES_DIR, `${id}.json`), record);
  return record;
}

function deleteArchive(id) {
  const safe = sanitizeId(id);
  if (!safe) return false;
  const fp = path.join(ARCHIVES_DIR, `${safe}.json`);
  if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
    return true;
  }
  return false;
}

module.exports = {
  getRawConfig,
  getPublicConfig,
  saveConfig,
  getMaster,
  saveMaster,
  getKnowledge,
  saveKnowledge,
  getGoldenSet,
  addGoldenSample,
  updateGoldenSample,
  deleteGoldenSample,
  getInbox,
  addInboxItem,
  markInboxRead,
  updateInboxStatus,
  clearInbox,
  deleteInboxItem,
  listArchives,
  getArchive,
  saveArchive,
  deleteArchive
};
