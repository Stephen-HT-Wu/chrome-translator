# 英翻中翻譯器

Chrome 插件，選取網頁上的英文文字，即時顯示繁體中文翻譯。由 Claude AI 驅動，支援串流輸出。

## 功能

- 選取英文文字 → 出現「譯」按鈕 → 點擊後逐字串流顯示翻譯結果
- API Key 僅存在本機（`chrome.storage.local`），不會上傳至 Google

## 安裝

1. Clone 或下載此 repo
2. 打開 Chrome，前往 `chrome://extensions/`
3. 右上角開啟「開發人員模式」
4. 點擊「載入未封裝項目」，選擇此資料夾
5. 點擊插件圖示，填入你的 Claude API Key → 儲存

## 取得 Claude API Key

前往 [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key

## 使用方式

在任意網頁上選取英文文字，點擊出現的紫色「譯」按鈕，翻譯結果會以氣泡方式顯示。

## 技術細節

| 項目 | 說明 |
|------|------|
| Manifest | V3 |
| 翻譯模型 | claude-haiku-4-5（速度快、成本低） |
| 串流 | 使用 Chrome Port 連線 + SSE |
| Key 儲存 | `chrome.storage.local`（僅本機） |
