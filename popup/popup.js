const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const immersiveBtn = document.getElementById('immersiveBtn');

const INPUT_PRICE_PER_TOKEN = 0.80 / 1_000_000;
const OUTPUT_PRICE_PER_TOKEN = 4.00 / 1_000_000;

// 載入已儲存的 Key 與用量
chrome.storage.local.get(['apiKey', 'totalInputTokens', 'totalOutputTokens'], (result) => {
  if (result.apiKey) apiKeyInput.value = result.apiKey;
  renderUsage(result.totalInputTokens || 0, result.totalOutputTokens || 0);
});

function renderUsage(inputTokens, outputTokens) {
  const cost = inputTokens * INPUT_PRICE_PER_TOKEN + outputTokens * OUTPUT_PRICE_PER_TOKEN;
  const totalTokens = inputTokens + outputTokens;
  const usageEl = document.getElementById('usageInfo');
  if (totalTokens === 0) {
    usageEl.textContent = '';
    return;
  }
  usageEl.innerHTML =
    `累積用量：${totalTokens.toLocaleString()} tokens` +
    `<span class="cost">≈ $${cost.toFixed(4)}</span>` +
    `<button id="resetBtn" class="reset-btn">清除</button>`;

  document.getElementById('resetBtn').addEventListener('click', () => {
    chrome.storage.local.set({ totalInputTokens: 0, totalOutputTokens: 0 }, () => {
      renderUsage(0, 0);
    });
  });
}

// 儲存 API Key
saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();

  if (!key) {
    showStatus('請輸入 API Key', true);
    return;
  }

  if (!key.startsWith('sk-ant-')) {
    showStatus('Key 格式不正確（應以 sk-ant- 開頭）', true);
    return;
  }

  chrome.storage.local.set({ apiKey: key }, () => {
    showStatus('已儲存！');
  });
});

// 沈浸式翻譯
immersiveBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'START_IMMERSIVE' });
    window.close();
  });
});

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? 'error' : '';
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}
