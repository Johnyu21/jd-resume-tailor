const DEFAULT_PROMPTS = {
  tailorSystemPrompt: [
    '你是一位资深技术招聘面试官与中文技术简历架构师。',
    '你的任务是根据候选人的「真实母版简历骨架」、「项目深度素材库（若有）」和「目标岗位 JD」，生成一份结构化的简历定向改写提案（严格 JSON 格式）。',
    '',
    '【必须严格遵守的红线与取材优先级】',
    '1. 真实项目骨架原则：绝对不能编造新的项目名称、不能篡改项目时间段和担任角色；必须保留母版中每一个真实项目。',
    '2. 三层取材优先级（严禁舍近求远）：',
    '   - 第 1 优先级（kb_matched · 素材库命中）：如果候选人提供了「项目深度素材库」，优先从中挖掘真实做过、但母版简历未展开的技术栈、模块细节、性能量化指标或故障排查案例来贴合 JD。',
    '   - 第 2 优先级（rewritten · JD 改写）：基于母版已有经历，用 JD 偏好的专业术语和侧重点重写表达。',
    '   - 第 3 优先级（ai_expanded · AI 扩展）：仅当母版和素材库都未覆盖、但 JD 强要求时，才允许围绕真实项目场景适度扩展合理模块。',
    '3. 精准来源标注（origin 字段只能取以下四个值之一）：',
    '   - "original"：基本保留母版原文内容',
    '   - "kb_matched"：来自候选人「项目深度素材库」中的真实模块/技术栈/量化指标（面试 100% 可讲）',
    '   - "rewritten"：基于母版原有经历，结合 JD 关键词优化了专业术语和表达',
    '   - "ai_expanded"：母版和素材库均未明写、结合该项目场景与 JD 要求适度扩展的技术细节或模块',
    '4. 防面试露馅机制：凡是标记为 "ai_expanded" 的技能条目、项目新增技术关键词或项目功能模块，必须在 interviewTip 中给出 40~90 字的「面试应对要点/实现原理提示」，帮助候选人审阅后决定是否勾选。',
    '5. 版面字数控制（避免撑爆 A4 排版）：',
    '   - 专业技能（skills）控制在 3~5 条，每条 content 不超过 75 个汉字。',
    '   - 每个项目的功能模块（bullets）控制在 3~4 条（至少保留原有或素材库命中的核心模块，AI 扩展模块每项目最多 1~2 条），每条 detail 控制在 45~85 个汉字。',
    '6. 若提供了 Golden Set 标杆写作画像，仅学习其叙事结构、量化表达和专业凝练度，绝不照搬标杆中的他人公司名或项目内容。',
    '7. 仅输出合法 JSON，禁止输出 Markdown 说明文字或多余前后缀。'
  ].join('\n'),

  evalSystemPrompt: [
    '你是一位严格、客观的大厂技术招聘总监（LLM-as-a-Judge）。',
    '请对照「目标岗位 JD」以及「Golden Set 黄金标杆画像（若提供）」，对候选人新生成的简历内容进行客观多维评测，明确告诉候选人：这份简历好不好、具体好在哪里、与标杆和 JD 的差距在哪里、下一轮怎么改能提分。',
    '',
    '【评分维度（每项 0~100 分，拒绝虚高打分，普通简历给 65~75，优秀给 80~90，顶尖给 90+）】',
    '1. jdMatch（JD 关键词与核心诉求匹配度）',
    '2. techDepth（技术深度、架构表达与工程专业性）',
    '3. quantification（业务价值、结果导向与量化成果密度）',
    '4. conciseness（表达凝练度、去套话程度与 A4 排版节奏）',
    '5. goldenAlign（与 Golden Set 标杆写作范式的贴合度；若无 Golden Set 则按一线大厂高分简历通用标杆评分）',
    '',
    '【面向真实用户的语言规范（必须严格遵守）】',
    '1. 严禁在输出中出现任何程序内部 ID 或英文字段名（如 p1_b1、p2_b2、sk_4、proj_1、ai_expanded、kb_matched、rewritten、origin 等）。',
    '2. 提及简历具体位置时，一律使用自然中文名称（例如「专业技能 · 跨部门赋能」「项目 1《项目名》· 审批引擎模块」）；提及来源时一律说「AI 扩展补充项」「原有经历」或「素材库内容」。',
    '3. 每条改进建议必须拆清「涉及位置」「存在问题」「具体修改动作」，让求职者一看就懂、照着就能改。',
    '4. 严格只输出合法 JSON。'
  ].join('\n'),

  goldenExtractPrompt: [
    '你是一位资深简历分析专家。请分析这份高分标杆简历（Golden Set 样本），提炼出它之所以优秀的「可复用写作范式与质量标杆」。',
    '【严格脱敏红线】只提炼写作结构、量化表达方法、技术深度呈现方式、句式节奏与通用表达模板，绝对不要保留原简历中的个人姓名、学校、具体公司名或特定业务机密。',
    '严格只输出合法 JSON。'
  ].join('\n')
};

function normalizeChatUrl(baseUrl) {
  const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) throw new Error('请先配置大模型 Base URL');
  if (clean.endsWith('/chat/completions')) return clean;
  return `${clean}/chat/completions`;
}

function normalizeModelsUrl(baseUrl) {
  const clean = String(baseUrl || '').trim().replace(/\/+$/, '');
  if (!clean) throw new Error('请先配置大模型 Base URL');
  if (clean.endsWith('/chat/completions')) {
    return clean.replace(/\/chat\/completions$/, '/models');
  }
  if (clean.endsWith('/models')) return clean;
  return `${clean}/models`;
}

function guessSupportsVision(modelId, rawObj = {}) {
  if (rawObj.supportsVision === true || rawObj.vision === true || rawObj.capabilities?.vision === true) {
    return true;
  }
  const id = String(modelId || '').toLowerCase();
  return /(vl|vision|4o|gpt-4\.1|gpt-5|gemini|claude-3|claude-4|omni|multimodal|pixtral|llava|qvq|internvl|minicpm-v|hy4)/i.test(id);
}

async function fetchAvailableModels({ baseUrl, apiKey }) {
  const url = normalizeModelsUrl(baseUrl);
  const headers = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const resp = await fetch(url, { method: 'GET', headers });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`获取模型列表失败 (${resp.status}): ${text.slice(0, 260)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`模型列表接口返回非 JSON: ${text.slice(0, 200)}`);
  }

  const rawList = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.models)
    ? data.models
    : [];

  const seen = new Set();
  const models = [];
  for (const item of rawList) {
    const id = String(typeof item === 'string' ? item : item?.id || item?.name || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    models.push({
      id,
      name: String(item?.display_name || item?.name || id).trim(),
      supportsVision: guessSupportsVision(id, typeof item === 'object' ? item : {})
    });
  }
  return models;
}

function extractJsonBlock(text) {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('大模型返回内容为空');
  try {
    return JSON.parse(raw);
  } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {}
  }
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  }
  throw new Error('无法从大模型返回中解析合法 JSON，请重试或更换更稳定的模型');
}

async function callChatCompletion({ baseUrl, apiKey, model, messages, temperature = 0.35 }) {
  if (!apiKey) {
    throw new Error('未配置大模型 API Key，请在「模型设置」中填写');
  }
  if (!model) {
    throw new Error('未配置模型名称（如 deepseek-chat / qwen-plus / gpt-4o-mini）');
  }

  const url = normalizeChatUrl(baseUrl);
  const body = {
    model,
    messages,
    temperature
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`模型接口请求失败 (${resp.status}): ${text.slice(0, 300)}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`模型接口返回非 JSON: ${text.slice(0, 200)}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('模型返回缺少 choices[0].message.content');
  }
  return content;
}

function resolveModuleEndpoint(config, moduleKey, modelOverride = '') {
  const route = config?.moduleRoutes?.[moduleKey] || {};
  const baseUrl = String(route.baseUrl || config?.baseUrl || '').trim();
  const apiKey = String(route.apiKey || config?.apiKey || '').trim();
  const fallbackModel = moduleKey === 'vision' ? config?.visionModel || config?.model : config?.model;
  const model = String(modelOverride || route.model || fallbackModel || '').trim();
  return { baseUrl, apiKey, model };
}

async function extractJdFromImage(config, imageDataUrl, modelOverride = '') {
  const ep = resolveModuleEndpoint(config, 'vision', modelOverride);
  const messages = [
    {
      role: 'system',
      content:
        '你是一个精准的招聘 JD 图片识别助手。请读取截图中的招聘信息，严格只输出 JSON，不要输出任何额外解释。'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            '请从这张招聘岗位截图中提取以下 JSON 字段：',
            '{',
            '  "company": "公司名称（若图中未出现则为空字符串）",',
            '  "jobTitle": "岗位名称（若图中未出现则为空字符串）",',
            '  "salary": "薪资范围（可选）",',
            '  "city": "工作城市（可选）",',
            '  "jdText": "完整还原的岗位职责与任职要求正文，保持清晰分段"',
            '}'
          ].join('\n')
        },
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        }
      ]
    }
  ];

  const content = await callChatCompletion({
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model,
    messages,
    temperature: 0.1
  });
  const parsed = extractJsonBlock(content);
  parsed._usedModel = ep.model;
  return parsed;
}

async function extractResumeTextFromImage(config, imageDataUrl, modelOverride = '') {
  const ep = resolveModuleEndpoint(config, 'vision', modelOverride);
  const messages = [
    {
      role: 'system',
      content:
        '你是一个高精度的简历图片 OCR 识别助手。请完整、准确地还原简历图片中的所有文字内容（保留模块标题、技能要点、项目经历与量化数据），只输出还原后的纯文本，不要输出多余解释。'
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: '请完整提取这张标杆简历图片中的全部文字内容，保持清晰的分段与列表层级。'
        },
        {
          type: 'image_url',
          image_url: { url: imageDataUrl }
        }
      ]
    }
  ];

  const content = await callChatCompletion({
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model,
    messages,
    temperature: 0.1
  });
  return String(content || '').trim();
}

async function extractGoldenProfile(config, { fileName, format, tag, rawText, modelOverride = '' }) {
  const ep = resolveModuleEndpoint(config, 'goldenExtract', modelOverride);
  const sysPrompt = (config.prompts?.goldenExtractPrompt || '').trim() || DEFAULT_PROMPTS.goldenExtractPrompt;
  const userPrompt = [
    `样本文件名：${fileName}（格式：${format}，方向标签：${tag || '通用'}）`,
    '',
    '=== 样本简历正文 ===',
    String(rawText || '').slice(0, 14000),
    '',
    '=== 请严格按以下 JSON Schema 输出 ===',
    JSON.stringify(
      {
        summary: '一句话概括这份标杆简历最核心的写作优势',
        styleRules: ['写作结构与叙事规范1（例如：采用“痛点+架构动作+量化收益”三段式）', '规范2', '规范3'],
        quantificationPatterns: ['量化指标呈现方式1（例如：用百分比+基线对比体现性能提升）', '方式2'],
        techDepthSignals: ['体现技术深度的写法特征1（例如：明确写出核心中间件选型与高可用机制）', '特征2'],
        exemplaryTemplates: ['脱敏后的优秀句式模板1（用【】占位）', '模板2']
      },
      null,
      2
    )
  ].join('\n');

  const content = await callChatCompletion({
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  });
  const parsed = extractJsonBlock(content);
  parsed._usedModel = ep.model;
  return parsed;
}

function formatGoldenSamplesBlock(goldenSamples) {
  const active = Array.isArray(goldenSamples) ? goldenSamples.filter((s) => s && s.enabled !== false) : [];
  if (!active.length) return '';
  const lines = [
    '',
    '=== Golden Set 黄金标杆写作画像（请对齐其写作范式、技术深度与量化节奏，绝不抄袭其他人项目） ==='
  ];
  active.forEach((s, idx) => {
    lines.push(`--- 标杆样本 ${idx + 1}（${s.tag || '通用'} · ${s.fileName}） ---`);
    if (s.profile && typeof s.profile === 'object') {
      lines.push(JSON.stringify(s.profile, null, 2));
    } else if (s.rawText) {
      lines.push(String(s.rawText).slice(0, 2200));
    }
  });
  return lines.join('\n');
}

async function generateTailoredProposal(
  config,
  { masterSkeleton, projectKnowledge, goldenSamples, evalFeedback, company, jobTitle, jdText, extraNotes, modelOverride = '' }
) {
  const ep = resolveModuleEndpoint(config, 'tailor', modelOverride);
  const kbList = Array.isArray(projectKnowledge?.projects)
    ? projectKnowledge.projects.filter((p) => p && String(p.content || '').trim())
    : [];

  const systemPrompt = (config.prompts?.tailorSystemPrompt || '').trim() || DEFAULT_PROMPTS.tailorSystemPrompt;

  const kbSection = kbList.length
    ? [
        '',
        '=== 候选人项目深度素材库（真实做过的详细资料，优先从中取材并标为 kb_matched） ===',
        ...kbList.map((p, i) => `--- 项目素材 ${i + 1}：${p.name} ---\n${p.content.slice(0, 12000)}`)
      ].join('\n')
    : '';

  const goldenSection = config.mode === 'golden' ? formatGoldenSamplesBlock(goldenSamples) : '';

  const feedbackSection = evalFeedback
    ? [
        '',
        '=== 上一轮评测报告指出的短板与改进要求（本轮请重点针对以下问题逐条优化提分！） ===',
        typeof evalFeedback === 'string' ? evalFeedback : JSON.stringify(evalFeedback, null, 2)
      ].join('\n')
    : '';

  const userPrompt = [
    `目标公司：${company || '未提供'}`,
    `目标岗位：${jobTitle || '未提供'}`,
    extraNotes ? `候选人补充说明：${extraNotes}` : '',
    '',
    '=== 目标岗位 JD ===',
    jdText,
    '',
    '=== 候选人真实母版简历骨架 (JSON) ===',
    JSON.stringify(masterSkeleton, null, 2),
    kbSection,
    goldenSection,
    feedbackSection,
    '',
    '=== 请严格按以下 JSON Schema 输出 ===',
    JSON.stringify(
      {
        jdSummary: '一句话总结该岗位最看重的核心能力',
        matchScore: 80,
        matchedKeywords: ['母版或素材库已覆盖的JD关键词1', '关键词2'],
        missingKeywords: ['母版和素材库均未覆盖的JD关键词1'],
        targetRole: {
          original: '原求职意向',
          suggested: '建议调整后的求职意向',
          origin: 'rewritten',
          reason: '调整理由'
        },
        skills: [
          {
            id: 'sk_1',
            category: '技能分类名（不含冒号）',
            content: '具体技能描述（≤75字）',
            origin: 'original | kb_matched | rewritten | ai_expanded',
            reason: '贴合JD的说明',
            interviewTip: '仅 ai_expanded 必填：面试被问到时的回答要点'
          }
        ],
        projects: [
          {
            id: '保持与母版相同的 proj id',
            time: '保持与母版相同的时间',
            name: '保持与母版相同的项目名',
            role: '保持与母版相同的角色',
            background: '精炼的项目背景（保持真实，≤70字）',
            techStack: {
              original: '原技术栈',
              suggested: '按JD优化排序或微调后的技术栈（顿号分隔）',
              addedKeywords: ['本次新加入的技术词'],
              origin: 'original | kb_matched | rewritten | ai_expanded',
              reason: '技术栈调整说明',
              interviewTip: '若为 ai_expanded，说明在项目中怎么落地与面试如何回答'
            },
            bullets: [
              {
                id: 'p1_b1',
                title: '模块短标题（6~14字，不含冒号）',
                detail: '具体架构/实现/业务价值（45~85字）',
                origin: 'original | kb_matched | rewritten | ai_expanded',
                reason: '对应JD哪条要求（若为 kb_matched 可注明命中素材库哪部分）',
                interviewTip: '仅 ai_expanded 必填：核心原理与面试应对要点'
              }
            ]
          }
        ]
      },
      null,
      2
    )
  ]
    .filter(Boolean)
    .join('\n');

  const content = await callChatCompletion({
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.35
  });

  const parsed = extractJsonBlock(content);
  parsed._usedModel = ep.model;
  return parsed;
}

async function evaluateResume(config, { company, jobTitle, jdText, candidateResume, goldenSamples, mode, modelOverride = '' }) {
  const ep = resolveModuleEndpoint(config, 'evaluate', modelOverride);
  const sysPrompt = (config.prompts?.evalSystemPrompt || '').trim() || DEFAULT_PROMPTS.evalSystemPrompt;
  const goldenBlock = mode === 'golden' ? formatGoldenSamplesBlock(goldenSamples) : '';

  const userPrompt = [
    `评测模式：${mode === 'golden' && goldenBlock ? 'Golden Set 标杆对齐评测' : '默认通用大厂标杆评测'}`,
    `目标公司：${company || '未提供'}`,
    `目标岗位：${jobTitle || '未提供'}`,
    '',
    '=== 目标岗位 JD ===',
    jdText || '（未提供 JD，仅按简历质量通用标准评测）',
    goldenBlock,
    '',
    '=== 待评测的简历内容 ===',
    JSON.stringify(candidateResume, null, 2),
    '',
    '【重要输出约束】',
    '1. 请用求职者能直接看懂的自然中文输出，严禁出现 p1_b1 / sk_4 / proj_1 / ai_expanded / kb_matched 等任何程序内部编号或英文字段名！',
    '2. dimensions 数组必须严格包含全部 5 个独立对象（jdMatch、techDepth、quantification、conciseness、goldenAlign），每个对象只有 key / label / score / comment 四个字段，禁止合并或省略。',
    '3. highlights 必须包含 2~4 条具体亮点对象，improvements 必须包含 2~4 条具体改进建议对象，严禁返回空数组 []！',
    '=== 请严格按以下 JSON Schema 输出评测报告 ===',
    JSON.stringify(
      {
        overallScore: 84,
        grade: 'A-（有竞争力）',
        summary: '一句话总评：指出核心优势与最主要的提分空间（自然中文，不含内部编号）',
        dimensions: [
          { key: 'jdMatch', label: 'JD 关键词匹配度', score: 86, comment: '简短具体点评（≤35字）' },
          { key: 'techDepth', label: '技术深度与专业性', score: 84, comment: '简短具体点评（≤35字）' },
          { key: 'quantification', label: '业务价值与量化成果', score: 78, comment: '简短具体点评（≤35字）' },
          { key: 'conciseness', label: '表达凝练与排版节奏', score: 88, comment: '简短具体点评（≤35字）' },
          { key: 'goldenAlign', label: 'Golden 标杆贴合度', score: 82, comment: '简短具体点评（≤35字）' }
        ],
        highlights: [
          {
            location: '简历具体位置（自然中文，如：项目 2 · 客服 AI 底座）',
            point: '好在哪里：具体写法亮点与打动面试官的原因'
          },
          {
            location: '简历具体位置 2',
            point: '好在哪里 2'
          }
        ],
        improvements: [
          {
            priority: '高',
            location: '涉及位置（自然中文，如：专业技能 · 跨部门赋能）',
            issue: '具体存在什么问题或面试风险（不含任何代码字段名）',
            action: '明确可执行的修改建议（怎么删、怎么换、怎么补充）'
          },
          {
            priority: '中',
            location: '涉及位置 2',
            issue: '问题 2',
            action: '修改建议 2'
          }
        ]
      },
      null,
      2
    )
  ]
    .filter(Boolean)
    .join('\n');

  const isCompleteEval = (obj) =>
    obj &&
    Array.isArray(obj.dimensions) &&
    obj.dimensions.length >= 5 &&
    Array.isArray(obj.highlights) &&
    obj.highlights.length > 0 &&
    Array.isArray(obj.improvements) &&
    obj.improvements.length > 0;

  let content = await callChatCompletion({
    baseUrl: ep.baseUrl,
    apiKey: ep.apiKey,
    model: ep.model,
    messages: [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.25
  });
  let parsed = extractJsonBlock(content);

  // 若模型首次偷懒漏掉维度或返回空 highlights/improvements，自动静默补全重试 1 次
  if (!isCompleteEval(parsed)) {
    const retryContent = await callChatCompletion({
      baseUrl: ep.baseUrl,
      apiKey: ep.apiKey,
      model: ep.model,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: String(content || '').slice(0, 2000) },
        {
          role: 'user',
          content:
            '你刚才的输出不完整（dimensions 不足 5 个，或 highlights / improvements 为空数组）。请严格重新输出完整合法 JSON：必须包含全部 5 个 dimensions 对象、至少 2 条 highlights 和至少 2 条 improvements。'
        }
      ],
      temperature: 0.2
    });
    try {
      const retryParsed = extractJsonBlock(retryContent);
      if (isCompleteEval(retryParsed) || (retryParsed?.dimensions?.length || 0) > (parsed?.dimensions?.length || 0)) {
        parsed = retryParsed;
      }
    } catch {}
  }

  parsed._usedModel = ep.model;
  return parsed;
}

module.exports = {
  DEFAULT_PROMPTS,
  resolveModuleEndpoint,
  fetchAvailableModels,
  extractJdFromImage,
  extractResumeTextFromImage,
  extractGoldenProfile,
  generateTailoredProposal,
  evaluateResume
};
