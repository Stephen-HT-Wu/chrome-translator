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
    startStreaming(selectedText);
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

function positionBubble() {
  if (!bubble || !translateBtn) return;
  const btnRect = translateBtn.getBoundingClientRect();
  bubble.style.left = `${btnRect.left + window.scrollX}px`;
  bubble.style.top = `${btnRect.bottom + window.scrollY + 6}px`;
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

  positionBubble();
  bubble.classList.add('visible');
}

function appendBubbleText(text) {
  if (!bubble) return;
  bubble.textContent += text;
}

function hideBubble() {
  if (bubble) bubble.classList.remove('visible');
}

function startStreaming(text) {
  showBubble('loading');

  const port = chrome.runtime.connect({ name: 'translate' });
  let started = false;

  port.onMessage.addListener((msg) => {
    if (msg.type === 'chunk') {
      if (!started) {
        // 第一個字到了，切換成結果模式
        bubble.textContent = '';
        bubble.className = 'result visible';
        started = true;
      }
      appendBubbleText(msg.text);
    } else if (msg.type === 'error') {
      showBubble('error', msg.error);
      port.disconnect();
    } else if (msg.type === 'done') {
      port.disconnect();
    }
  });

  port.onDisconnect.addListener(() => {
    if (!started) showBubble('error', '連線中斷，請重試');
  });

  port.postMessage({ text });
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
