// ── 選字翻譯 ──────────────────────────────────────────────

let bubble = null;
let translateBtn = null;
let selectedText = '';

function createTranslateBtn() {
  const btn = document.createElement('div');
  btn.id = 'claude-translate-btn';
  btn.textContent = '譯';
  btn.title = '翻譯成中文';
  document.body.appendChild(btn);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showBubble('loading');
    let started = false;
    startStreaming(selectedText, (state, text) => {
      if (state === 'chunk') {
        if (!started) {
          bubble.textContent = '';
          bubble.className = 'result visible';
          started = true;
        }
        bubble.textContent += text;
      } else if (state === 'error') {
        showBubble('error', text);
      }
    });
  });

  return btn;
}

function createBubble() {
  const b = document.createElement('div');
  b.id = 'claude-translate-bubble';
  document.body.appendChild(b);
  return b;
}

function showTranslateBtn(x, y) {
  if (!translateBtn) translateBtn = createTranslateBtn();
  translateBtn.style.left = `${x}px`;
  translateBtn.style.top = `${y - 36}px`;
  translateBtn.classList.add('visible');
}

function hideTranslateBtn() {
  if (translateBtn) translateBtn.classList.remove('visible');
}

function showBubble(state, text = '') {
  if (!bubble) bubble = createBubble();

  if (state === 'loading') {
    bubble.innerHTML = '<span class="claude-spinner"></span> 翻譯中...';
    bubble.className = 'loading';
  } else if (state === 'result') {
    bubble.textContent = text;
    bubble.className = 'result';
  } else if (state === 'error') {
    bubble.textContent = '⚠ ' + text;
    bubble.className = 'error';
  }

  if (translateBtn) {
    const btnRect = translateBtn.getBoundingClientRect();
    bubble.style.left = `${btnRect.left + window.scrollX}px`;
    bubble.style.top = `${btnRect.bottom + window.scrollY + 6}px`;
  }

  bubble.classList.add('visible');
}

function hideBubble() {
  if (bubble) bubble.classList.remove('visible');
}

document.addEventListener('mouseup', (e) => {
  if (e.target.id === 'claude-translate-btn' || e.target.id === 'claude-translate-bubble') return;

  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && /[a-zA-Z]/.test(text)) {
      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = rect.left + window.scrollX + rect.width / 2 - 16;
      const y = rect.top + window.scrollY;
      showTranslateBtn(x, y);
    } else {
      hideTranslateBtn();
      hideBubble();
    }
  }, 10);
});

document.addEventListener('mousedown', (e) => {
  if (
    e.target.id !== 'claude-translate-btn' &&
    e.target.id !== 'claude-translate-bubble'
  ) {
    hideTranslateBtn();
    hideBubble();
  }
});

// ── 共用串流函式 ───────────────────────────────────────────

// callback(state, text): state = 'chunk' | 'error' | 'done'
function startStreaming(text, callback) {
  const port = chrome.runtime.connect({ name: 'translate' });

  port.onMessage.addListener((msg) => {
    if (msg.type === 'chunk') {
      callback('chunk', msg.text);
    } else if (msg.type === 'error') {
      callback('error', msg.error);
      port.disconnect();
    } else if (msg.type === 'done') {
      callback('done', '');
      port.disconnect();
    }
  });

  port.onDisconnect.addListener(() => callback('done', ''));
  port.postMessage({ text });
}

// ── 沈浸式翻譯 ────────────────────────────────────────────

const SELECTORS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th';
const MIN_LENGTH = 30;
const CONCURRENCY = 2;

const translatedSet = new WeakSet();
let immersiveQueue = [];
let immersiveActive = 0;
let immersiveObserver = null;
let progressTotal = 0;
let progressDone = 0;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_IMMERSIVE') {
    startImmersiveTranslation();
  }
});

// ── 進度條 ────────────────────────────────────────────────

let progressBar = null;

function getProgressBar() {
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'claude-progress-bar';
    document.body.appendChild(progressBar);
  }
  return progressBar;
}

function updateProgress() {
  const bar = getProgressBar();
  const remaining = immersiveQueue.length + immersiveActive;

  if (remaining === 0) {
    bar.textContent = `✓ 翻譯完成（共 ${progressDone} 段）`;
    bar.classList.add('done');
    setTimeout(() => {
      bar.classList.remove('visible', 'done');
    }, 2500);
  } else {
    bar.className = 'visible';
    bar.textContent = `正在翻譯… ${progressDone} / ${progressTotal} 段`;
  }
}

// ── 沈浸式翻譯邏輯 ────────────────────────────────────────

function isEnglish(text) {
  const clean = text.trim();
  if (clean.length < MIN_LENGTH) return false;
  const englishChars = (clean.match(/[a-zA-Z]/g) || []).length;
  return englishChars / clean.length > 0.4;
}

function startImmersiveTranslation() {
  progressTotal = 0;
  progressDone = 0;

  // 掃描現有段落
  document.querySelectorAll(SELECTORS).forEach(enqueueElement);

  // 監聽動態新增內容
  if (!immersiveObserver) {
    immersiveObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.(SELECTORS)) enqueueElement(node);
          node.querySelectorAll?.(SELECTORS).forEach(enqueueElement);
        }
      }
    });
    immersiveObserver.observe(document.body, { childList: true, subtree: true });
  }
}

function enqueueElement(el) {
  if (translatedSet.has(el)) return;
  if (el.closest('pre, code, script, style, noscript')) return;
  if (el.classList.contains('claude-immersive')) return;
  if (!isEnglish(el.innerText || el.textContent || '')) return;

  translatedSet.add(el);
  immersiveQueue.push(el);
  progressTotal++;
  updateProgress();
  processImmersiveQueue();
}

function processImmersiveQueue() {
  while (immersiveActive < CONCURRENCY && immersiveQueue.length > 0) {
    const el = immersiveQueue.shift();
    immersiveActive++;
    translateElementImmersive(el).finally(() => {
      immersiveActive--;
      progressDone++;
      updateProgress();
      processImmersiveQueue();
    });
  }
}

function translateElementImmersive(el) {
  const text = (el.innerText || el.textContent || '').trim();
  if (!text) return Promise.resolve();

  const div = document.createElement('div');
  div.className = 'claude-immersive loading';
  div.textContent = '翻譯中...';
  el.insertAdjacentElement('afterend', div);

  return new Promise((resolve) => {
    let started = false;

    startStreaming(text, (state, chunk) => {
      if (state === 'chunk') {
        if (!started) {
          div.textContent = '';
          div.classList.remove('loading');
          started = true;
        }
        div.textContent += chunk;
      } else if (state === 'error') {
        div.remove();
        resolve();
      } else if (state === 'done') {
        if (!started) div.remove();
        resolve();
      }
    });
  });
}
