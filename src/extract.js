// ===== 抓取工具（纯函数，不依赖 chrome API）=====
// 目标：从词典页面提取 {en, phonetic, pos, cn}，抓不到的字段留空，交给 popup 手填。
// 策略：多选择器候选 + 正则启发 + 划词/URL 参数兜底，不绑定单一 class（站点会改版）。

const RC_POS = /(^|[\s;；,，])(vt|vi|v|n|adj|adv|prep|conj|pron|num|int|aux|art|abbr|phr|a|ad)\.?/i;
// 音标：/ˈæp(ə)l/ 、[æpəl]、英/ ˈæp(ə)l / 美/ ... /
const RC_PHON = /[\/\[]([^\s\/\[\]]{2,30}?)[\/\]]/g;

function rcDetectSite() {
  const h = location.hostname;
  if (h.indexOf("bing.com") >= 0) return "bing";
  if (h.indexOf("youdao.com") >= 0) return "youdao";
  return "unknown";
}

// 从 URL query 取词（?q= / ?word= /?wd=）
function rcUrlWord() {
  const p = new URLSearchParams(location.search);
  const v = p.get("q") || p.get("word") || p.get("wd") || p.get("key");
  return v ? v.trim() : "";
}

function rcPickText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent && el.textContent.trim()) {
      return el.textContent.trim().replace(/\s+/g, " ");
    }
  }
  return "";
}

// 提取主词条英文
function rcExtractEn() {
  const site = rcDetectSite();
  let en = "";
  if (site === "bing") {
    // 必应词典 URL 形如 /dict/search?q=Stir，q 最可靠；选择器作补充
    en = rcUrlWord() || rcPickText([
      "#dict_pw_1", ".q", ".hd_tp1 strong", "h1 .txt_20b43",
      ".b_promtxt", ".df_txt h2", "h2.tp1"
    ]);
  } else if (site === "youdao") {
    en = rcPickText([
      ".wordcard .title", ".basic-word h1", ".keyword",
      "#detailHead h1", ".word-title", "h1.title"
    ]);
  }
  // 兜底：常见大标题里的单个英文词
  if (!en) {
    const h = document.querySelector("h1");
    if (h) {
      const t = h.textContent.trim();
      if (/^[A-Za-z'’\- ]{1,40}$/.test(t)) en = t;
    }
  }
  if (!en) en = rcUrlWord();
  // 清理：只保留英文单词本身
  if (en) en = en.split(/[\s；;，,]/)[0].replace(/[·•].*$/, "").trim();
  return /^[A-Za-z'’\- ]+$/.test(en || "") ? en : "";
}

// 提取音标（取第一个，保留英/美标注若有）
function rcExtractPhonetic() {
  const site = rcDetectSite();
  let raw = "";
  if (site === "bing") {
    raw = rcPickText([".hd_pd", ".phonetic", ".df_pron", ".pron"]);
  } else if (site === "youdao") {
    raw = rcPickText([".phonetic", ".pronounce", ".basic-phonetic", ".trans-phonetic"]);
  }
  if (!raw) {
    // 全文正则找音标
    const body = document.body ? document.body.innerText : "";
    const m = body.match(RC_PHON);
    if (m) raw = m[0];
  }
  // 规整：保留 /.../ 或 [...]
  const mm = raw.match(/[\/\[][^\s\/\[\]]{2,30}?[\/\]]/);
  return mm ? mm[0] : (raw || "");
}

// 从一段释义文本里拆分 词性 + 中文
function rcSplitPos(text) {
  const out = { pos: [], cn: [] };
  const lines = text.split(/[\n;；]/).map(s => s.trim()).filter(Boolean);
  for (let line of lines) {
    const m = line.match(RC_POS);
    if (m) {
      out.pos.push(m[2].toLowerCase().replace(/\.$/, "") + ".");
      // 去掉词性前缀后的中文
      const cn = line.replace(RC_POS, "").replace(/^[\s:：.、]+/, "").trim();
      if (cn) out.cn.push(cn);
    } else if (line) {
      out.cn.push(line);
    }
  }
  return {
    pos: [...new Set(out.pos)].join("/"),
    cn: out.cn.join("；")
  };
}

// 提取词性 + 词义（聚合多个释义块）
function rcExtractPosCn() {
  const site = rcDetectSite();
  let containerText = "";
  if (site === "bing") {
    containerText = rcPickText([".df_bk", ".md_en", ".b_dict", ".df_txt", "#dictContent"]);
  } else if (site === "youdao") {
    containerText = rcPickText([".basic-trans", ".trans-container", "#phrsListTab", ".wordcard-body", ".dict-content"]);
  }
  if (!containerText && document.body) {
    // 兜底：取 body 里含词性缩写的行
    containerText = document.body.innerText
      .split("\n")
      .filter(l => RC_POS.test(l) && /[一-龥]/.test(l))
      .slice(0, 12)
      .join("\n");
  }
  return rcSplitPos(containerText || "");
}

function rcExtract() {
  const en = rcExtractEn();
  const phonetic = rcExtractPhonetic();
  const pc = rcExtractPosCn();
  return {
    en: en,
    phonetic: phonetic,
    pos: pc.pos,
    cn: pc.cn,
    source: rcDetectSite(),
    sourceUrl: location.href
  };
}

function rcSelectionText() {
  const t = (window.getSelection() && window.getSelection().toString() || "").trim();
  return /^[A-Za-z'’\- ]{1,40}$/.test(t) ? t : "";
}
