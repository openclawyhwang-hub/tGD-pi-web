# Pi with tGD — 網頁介面

[English](./README.md)

[Pi 編程智能體](https://github.com/earendil-works/pi) 的網頁界面。在瀏覽器中瀏覽會話、與智能體即時對話、分叉對話、切換訊息分支。

## 快速開始

**一鍵安裝：**

```bash
git clone https://github.com/openclawyhwang-hub/tGD-pi-web.git
cd tGD-pi-web
./setup.sh
```

`setup.sh` 會自動檢查 Node.js 版本、安裝依賴、驗證編譯，並詢問是否立即啟動。

**手動安裝：**

```bash
git clone https://github.com/openclawyhwang-hub/tGD-pi-web.git
cd tGD-pi-web
npm install
npm run dev
```

啟動後打開 [http://localhost:30141](http://localhost:30141)。

**自訂連接埠：**

```bash
npm run dev -- --port 8080               # 透過 CLI 參數
PORT=8080 npm run dev                    # 透過環境變數
```

## 功能

### 對話
- **即時串流** — SSE 串流輸出，邊生成邊顯示
- **引導 / 追加** — 中斷正在運行的智能體，或在其完成後追加訊息
- **模型切換** — 對話中途隨時切換模型和 thinking level
- **工具面板** — 控制智能體可使用的工具（無工具 / 預設 / 全部）
- **壓縮會話** — 對長會話進行摘要，節省上下文視窗

### 會話管理
- **會話瀏覽器** — 按工作目錄分組，自動偵測最近使用的專案
- **時間分組** — Today / Yesterday / This Week / Earlier
- **會話搜尋** — 按名稱或首條訊息即時搜尋
- **自動命名** — 首次對話後自動生成會話標題
- **會話分叉** — 從任意用戶訊息建立獨立的新會話
- **會話內分支** — 回到任意節點繼續對話，分支共用同一檔案
- **分支導航器** — 視覺化切換同一會話內的各個分支
- **匯出 HTML** — 將會話匯出為獨立 HTML 檔

### 檔案瀏覽
- **檔案總管** — 側邊欄內建檔案樹，支援展開/摺疊
- **檔案搜尋** — 即時過濾，匹配的目錄自動展開
- **垃圾目錄過濾** — 自動隱藏 `.git`、`node_modules`、`__pycache__` 等
- **檔案預覽** — 在分頁中查看檔案內容，支援 Markdown 渲染
- **@提及** — 點擊檔案旁的按鈕插入路徑到聊天輸入框

### 渲染
- **Markdown** — GFM 語法、表格、工作清單
- **程式碼** — 語法高亮 + 行號
- **數學公式** — KaTeX 渲染行內與區塊公式
- **圖表** — Mermaid 流程圖、時序圖等
- **Provider 圖示** — Anthropic、OpenAI、Google、ZAI 等

### 體驗
- **深色模式** — 自動偵測系統主題，手動切換有圓形展開動畫
- **跨平台字型** — 打包 Inter + JetBrains Mono，零網路依賴
- **無障礙** — 鍵盤焦點指示、尊重 `prefers-reduced-motion`、ARIA 標籤
- **響應式** — 桌面與觸控裝置自適應（捲軸、佈局）
- **IME 支援** — 正確處理中文/日文輸入法組字

### tGD 整合
- **Slash Commands** — 在網頁直接執行 `/tgd-map`、`/tgd-define` 等 7-phase 指令
- **Skills 管理** — 搜尋與安裝 tGD skills

## 設定

| 項目 | 說明 |
|------|------|
| 會話目錄 | 預設 `~/.pi/agent/sessions/`，可設 `PI_CODING_AGENT_DIR` |
| 模型設定 | 讀取 `models.json`，可在側邊欄 Models 面板編輯 |
| API Keys | 各 provider 的 key 存於 `auth.json` |
| 預設目錄 | 可在 CWD 選擇器中設定或自訂路徑 |

## 開發

```bash
npm install
npm run dev    # port 30141
```

**驗證指令：**

```bash
node_modules/.bin/tsc --noEmit     # 型別檢查
npx eslint .                       # 程式碼風格
```

> ⚠️ 開發期間**不要**跑 `next build` — 會污染 `.next/` 並導致 `npm run dev` 異常。

## 技術棧

| 層 | 技術 |
|----|------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + CSS Variables（零 CSS-in-JS）|
| Agent SDK | @earendil-works/pi-ai + pi-coding-agent |
| Markdown | react-markdown + remark-gfm + rehype-katex |
| 圖表 | Mermaid |
| 程式碼 | react-syntax-highlighter |
| 字型 | Inter + JetBrains Mono（打包 .woff2）|

## 架構

```
瀏覽器                Next.js Server              AgentSession（in-process）
  │                        │                               │
  ├─ GET /api/sessions ────▶ 讀取 ~/.pi/agent/sessions/    │
  ├─ GET /api/sessions/[id] 直接讀取 .jsonl 檔案           │
  │                        │                               │
  ├─ 發送訊息 ─────────────▶ POST /api/agent/[id]          │
  │                        │   startRpcSession() ─────────▶│ createAgentSession()
  │                        │   session.send(cmd) ─────────▶│ session.prompt()
  │                        │                               │
  ├─ SSE 連線 ─────────────▶ GET /api/agent/[id]/events    │
  │                        │   session.onEvent() ◀─────────│ session.subscribe()
  │◀── data: {...} ─────────│                               │
```

## 專案結構

```
app/
  api/
    agent/          # 發送指令、SSE 事件流、自動命名
    sessions/       # 讀寫會話檔案、匯出
    files/          # 檔案內容讀取（stream, meta, preview, watch）
    models/         # 可用模型與預設模型
    models-config/  # 讀寫 models.json
    auth/           # Provider 登入/登出
    skills/         # tGD skills 搜尋與安裝
    cwd/            # 工作目錄驗證
components/         # UI 元件
lib/
  rpc-manager.ts    # AgentSession 生命週期管理
  session-reader.ts # 解析 .jsonl 會話檔案
  file-security.ts  # 路徑驗證與允許根目錄
  file-mime.ts      # 副檔名 → MIME/語言對應
  file-stream.ts    # 串流、Content-Disposition、HTML 預覽
  normalize.ts      # 規範化 toolCall 欄位名
  types.ts          # 共用 TypeScript 型別
hooks/              # 抽出的狀態邏輯（useSessions, useCwd, useFileWatch…）
```

## 授權

MIT
