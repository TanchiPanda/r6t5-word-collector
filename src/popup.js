// ===== Popup：队列整理 + 同步到游戏桥接页 =====
const queueEl = document.getElementById("queue");
const countEl = document.getElementById("count");
const statusEl = document.getElementById("status");
let queue = [];

function b64urlEncode(obj) {
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function setStatus(msg, ok) {
  statusEl.textContent = msg;
  statusEl.className = "status " + (ok ? "ok" : "err");
}

function save() {
  chrome.storage.local.set({ queue });
}

function render() {
  countEl.textContent = queue.length;
  if (!queue.length) {
    queueEl.innerHTML = '<div class="empty">还没有收藏，去词典页点 ⭐</div>';
    return;
  }
  queueEl.innerHTML = "";
  queue.forEach((w, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      '<div class="en-row"><input class="en-input" data-f="en" placeholder="英文单词" style="font-weight:bold;font-size:14px;flex:1"></input><button class="del" type="button">✕</button></div>' +
      '<input data-i="' + i + '" data-f="phonetic" placeholder="音标 /ˈæpl/">' +
      '<input data-i="' + i + '" data-f="pos" placeholder="词性 n. / v. / adj.">' +
      '<input data-i="' + i + '" data-f="cn" placeholder="中文释义">';
    card.querySelector('[data-f="en"]').value = w.en || "";
    card.querySelector('[data-f="phonetic"]').value = w.phonetic || "";
    card.querySelector('[data-f="pos"]').value = w.pos || "";
    card.querySelector('[data-f="cn"]').value = w.cn || "";

    card.querySelector(".del").addEventListener("click", () => {
      queue.splice(i, 1);
      save(); render();
    });
    card.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("input", () => {
        queue[i][inp.dataset.f] = inp.value.trim();
        save();
      });
    });
    queueEl.appendChild(card);
  });
}

document.getElementById("clearBtn").addEventListener("click", () => {
  if (!queue.length) return;
  if (!confirm("清空全部待收藏单词？")) return;
  queue = []; save(); render();
});

document.getElementById("syncBtn").addEventListener("click", () => {
  const bookName = document.getElementById("bookName").value.trim() || "我的收藏";
  const levelName = document.getElementById("levelName").value.trim() || "LV1";
  const words = queue
    .map(w => ({
      en: (w.en || "").trim(),
      phonetic: (w.phonetic || "").trim(),
      pos: (w.pos || "").trim(),
      cn: (w.cn || "").trim()
    }))
    .filter(w => w.en);

  if (!words.length) { setStatus("没有可同步的单词", false); return; }

  const payload = { bookName, levelName, words };
  const hash = b64urlEncode(payload);
  const url = "https://wordgm.r6t5.dpdns.org/dict/bridge.html#data=" + hash;

  chrome.tabs.create({ url }, () => {
    setStatus("已打开同步页，完成后可关闭", true);
  });
});

chrome.storage.local.get({ queue: [] }, res => {
  queue = res.queue || [];
  render();
});
