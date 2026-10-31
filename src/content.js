// ===== 页面注入：悬浮收藏按钮 + 划词兜底 =====
(function () {
  if (window.__rcCollectorInjected) return;
  window.__rcCollectorInjected = true;

  const BTN_ID = "rc-collect-btn";

  function ensureBtn() {
    let btn = document.getElementById(BTN_ID);
    if (btn) return btn;
    btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.textContent = "⭐ 收藏到词书";
    btn.style.cssText = [
      "position:fixed", "right:18px", "bottom:84px", "z-index:2147483647",
      "padding:10px 14px", "border-radius:999px", "border:none", "cursor:pointer",
      "background:linear-gradient(135deg,#ffd700,#ff8c00)", "color:#162a22",
      "font-size:14px", "font-weight:bold", "box-shadow:0 4px 14px rgba(0,0,0,.35)",
      "font-family:inherit"
    ].join(";");
    document.body.appendChild(btn);
    btn.addEventListener("click", onCollect);
    return btn;
  }

  function toast(msg, ok) {
    let t = document.getElementById("rc-toast");
    if (!t) {
      t = document.createElement("div");
      t.id = "rc-toast";
      t.style.cssText = [
        "position:fixed", "right:18px", "bottom:140px", "z-index:2147483647",
        "padding:10px 14px", "border-radius:10px", "font-size:13px",
        "background:rgba(20,20,28,.92)", "color:#fff", "max-width:280px"
      ].join(";");
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.border = ok ? "1px solid #39d98a" : "1px solid #ff8888";
    clearTimeout(t._h);
    t._h = setTimeout(() => { t.remove(); }, 2600);
  }

  function onCollect() {
    let w = rcExtract();
    const sel = rcSelectionText();
    if (!w.en && sel) w.en = sel;
    if (!w.en) {
      toast("未识别到单词，请先选中要收藏的英文词再点收藏", false);
      return;
    }
    w.collectedAt = new Date().toISOString();
    chrome.storage.local.get({ queue: [] }, (res) => {
      const queue = res.queue || [];
      const dup = queue.find(x => x.en && x.en.toLowerCase() === w.en.toLowerCase());
      if (dup) {
        if (!dup.phonetic && w.phonetic) dup.phonetic = w.phonetic;
        if (!dup.pos && w.pos) dup.pos = w.pos;
        if (!dup.cn && w.cn) dup.cn = w.cn;
      } else {
        queue.unshift(w);
      }
      chrome.storage.local.set({ queue }, () => {
        toast((dup ? "已更新：" : "已收藏：") + w.en + "，点扩展图标整理", true);
      });
    });
  }

  const boot = () => ensureBtn();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
