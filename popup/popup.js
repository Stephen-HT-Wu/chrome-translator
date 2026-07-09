const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// 載入已儲存的 Key
chrome.storage.local.get('apiKey', ({ apiKey }) => {
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
});

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

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.className = isError ? 'error' : '';
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}
