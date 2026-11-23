const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

function stripHtmlToText(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/section|\/header)[^>]*>/gi, '\n');
  s = s.replace(/<li[^>]*>/gi, '\n- ');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return s
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function sanitizePersonalInfo(text) {
  let out = String(text || '');
  // 轻度脱敏：移除他人手机号与邮箱，避免标杆简历隐私或联系方式串味
  out = out.replace(/(?<!\d)1[3-9]\d[\s-]?\d{4}[\s-]?\d{4}(?!\d)/g, '[已脱敏手机]');
  out = out.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[已脱敏邮箱]');
  return out;
}

async function parseGoldenDocument({ fileName, base64Content, visionExtractor }) {
  if (!base64Content) throw new Error('文件内容为空');
  const ext = path.extname(String(fileName || '')).toLowerCase();
  const cleanBase64 = String(base64Content).replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  let format = '';
  let rawText = '';

  if (ext === '.pdf') {
    format = 'PDF';
    const parsed = await pdfParse(buffer);
    rawText = String(parsed.text || '').trim();
    if (rawText.length < 30) {
      throw new Error('该 PDF 几乎未提取到可选中文字（可能是纯图片扫描版 PDF），请截图保存为 PNG 后上传，即可走视觉模型识别');
    }
  } else if (ext === '.docx') {
    format = 'DOCX';
    const res = await mammoth.extractRawText({ buffer });
    rawText = String(res.value || '').trim();
    if (!rawText) throw new Error('未能从 DOCX 文档中提取到正文内容');
  } else if (ext === '.html' || ext === '.htm') {
    format = 'HTML';
    rawText = stripHtmlToText(buffer.toString('utf8'));
    if (!rawText) throw new Error('未能从 HTML 文件中提取到正文内容');
  } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    format = ext === '.png' ? 'PNG' : ext === '.webp' ? 'WEBP' : 'JPG';
    if (typeof visionExtractor !== 'function') {
      throw new Error('图片格式需要配置支持图片的视觉模型才能识别');
    }
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    const dataUrl = String(base64Content).startsWith('data:image/')
      ? base64Content
      : `data:${mime};base64,${cleanBase64}`;
    rawText = String(await visionExtractor(dataUrl) || '').trim();
    if (!rawText) throw new Error('视觉模型未能从图片中识别到文字，请确认视觉模型支持图片输入');
  } else {
    throw new Error(`暂不支持 ${ext || '未知'} 格式，支持 PDF / DOCX / HTML / PNG / JPG / WEBP`);
  }

  const sanitized = sanitizePersonalInfo(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    format,
    charCount: sanitized.length,
    text: sanitized.slice(0, 25000)
  };
}

module.exports = {
  parseGoldenDocument
};
