chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'translate') return;

  port.onMessage.addListener(async ({ text }) => {
    const { apiKey } = await chrome.storage.local.get('apiKey');

    if (!apiKey) {
      port.postMessage({ type: 'error', error: '請先在插件設定中填入 Claude API Key' });
      return;
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          messages: [
            {
              role: 'user',
              content: `將以下英文翻譯成繁體中文，只回覆翻譯結果，不要加任何說明：\n\n${text}`
            }
          ]
        })
      });

      if (!response.ok) {
        const err = await response.json();
        port.postMessage({ type: 'error', error: err.error?.message || `API 錯誤 ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          port.postMessage({ type: 'done' });
          break;
        }

        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              port.postMessage({ type: 'chunk', text: parsed.delta.text });
            }
          } catch {}
        }
      }
    } catch (err) {
      port.postMessage({ type: 'error', error: err.message });
    }
  });
});
