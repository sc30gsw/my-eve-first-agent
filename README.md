# my-eve-first-agent

[eve](https://vercel.com/eve) フレームワークで作った、**eve の紹介記事（Zenn・日本語）を書く執筆エージェント**です。

記事は eve の構成部品（building block）を解説すると同時に、その記事自体を「同じ部品を使うエージェント」が書く、というメタ二層構造を狙っています。

> 「eve の部品を解説するこの記事を、その部品を使うエージェントが書いた」

土台は Vercel blog [Introducing eve](https://vercel.com/blog/introducing-eve)。文体は筆者の [Zenn](https://zenn.dev/sc30gsw) 記事に準拠します。

## 仕組み

```
Notion の brief（記事タイトルで検索して取得）
  → researcher サブエージェント（ローカル eve docs を調査）
  → 親（writer）が初稿を作成
  → reviewer サブエージェント（正確性・文体をレビュー）→ 改稿
  → 最終版を Notion ページへ書き戻し（status = review）
  → emit_zenn_markdown（人間の承認が必要）→ 承認で Zenn markdown を出力（status = approved）
```

承認前のレビュー面は Notion。承認は eve ネイティブの human-in-the-loop（dev UI で `y`）。最終 markdown は `emit_zenn_markdown` の返り値にインラインで返るので、reply からコピーして Zenn に貼れます。

### 実演する eve の構成部品

| slot                                | 役割                                                   | model                        |
| ----------------------------------- | ------------------------------------------------------ | ---------------------------- |
| `agent/agent.ts`                    | ランタイム / モデル設定                                | `anthropic/claude-haiku-4.5` |
| `agent/instructions.md`             | ライター人格・ワークフロー                             | —                            |
| `agent/tools/emit_zenn_markdown.ts` | Zenn 形式 `.md` を sandbox に出力（承認 gate）         | —                            |
| `agent/skills/`                     | 記事構成スキル + Zenn 文体スキル                       | —                            |
| `agent/connections/notion.ts`       | Notion（MCP）= brief 読み・下書き書き戻し・status 管理 | —                            |
| `agent/subagents/researcher/`       | eve docs を調査し fact/引用を返す                      | `anthropic/claude-haiku-4.5` |
| `agent/subagents/reviewer/`         | 下書きの正確性・文体をチェック                         | `anthropic/claude-haiku-4.5` |
| `agent/sandbox/`                    | `emit_zenn_markdown` の出力先ワークスペース            | —                            |
| `agent/channels/eve.ts`             | デフォルト HTTP / dev 端末                             | —                            |
| `evals/article/intro.eval.ts`       | 承認前の smoke eval                                    | —                            |

`hooks` と `schedules` は記事内で**解説のみ**（このエージェントには実装していません）。

## ディレクトリ構成

```
my-eve-first-agent/
├── agent/
│   ├── agent.ts                 # モデル設定（default export）
│   ├── instructions.md          # システムプロンプト
│   ├── channels/eve.ts          # HTTP / dev 端末の入口
│   ├── connections/notion.ts    # Notion MCP（Vercel Connect 認証）
│   ├── tools/emit_zenn_markdown.ts
│   ├── skills/                  # article-structure / zenn-style（markdown）
│   ├── subagents/
│   │   ├── researcher/          # agent.ts + instructions.md + tools/read_eve_docs.ts
│   │   └── reviewer/
│   ├── sandbox/sandbox.ts       # defaultBackend()
│   └── lib/                     # 共有コード（eve-docs / schema / read-eve-docs）
└── evals/
    ├── evals.config.ts
    └── article/intro.eval.ts
```

ファイルのパスがそのまま識別子になります（`agent/tools/emit_zenn_markdown.ts` → ツール `emit_zenn_markdown`）。インポートは `#` エイリアス（`#*` → `agent/*`、`#evals/*` → `evals/*`）。

## セットアップ

```bash
pnpm install
```

1. **AI Gateway**: `.env` に `AI_GATEWAY_API_KEY` を設定。**paid tier が必須**（free tier はモデル制限 / レート制限で多段エージェントが完走しません）。
2. **Vercel Connect（Notion 認証）**:
   ```bash
   vercel connect create mcp.notion.com --name notion   # OAuth UID: oauth/notion
   vercel link                                           # トークン解決に必須
   ```
3. **Notion「Articles」DB**: 以下のプロパティを用意し、記事ごとに 1 行作成します。
   - `Title`（記事タイトル。エージェントの検索キー）
   - `Status`（`todo` / `review` / `approved` — 値は厳密一致が必要）
   - `Brief`（アウトライン・強調点・トーン。本文とは別プロパティに）
   - `作成日` / `更新日`（Created time / Last edited time）

## 使い方

```bash
pnpm dev
```

dev UI で記事を依頼します（例）:

```
Notion の Articles DB から「<記事タイトル>」の行を検索して、その Brief で eve 紹介記事を書いて。
最終版はそのページに書き戻して Status=review。slug は eve-intro、emoji は 🪶。
```

- 初回の Notion 呼び出しで認可 URL が出ます → ブラウザで Notion を認可し、Articles DB を共有してください。
- `emit_zenn_markdown` の承認プロンプトで Notion の最終版を確認し、`y` で承認します。
- 出力された Zenn markdown（frontmatter 付き）を reply からコピーして公開します。

brief をメッセージに直接書けば Notion なしでも動きます（eval はこの経路を使います）。

## 開発コマンド

| コマンド            | 内容                                    |
| ------------------- | --------------------------------------- |
| `pnpm dev`          | dev サーバ + 端末 UI                    |
| `pnpm build`        | `.eve/` 成果物のビルド                  |
| `pnpm eval`         | eval 実行（`pnpm eval article` で個別） |
| `pnpm check`        | tsgo + oxlint + oxfmt --check           |
| `pnpm fix`          | oxlint --fix + oxfmt                    |
| `pnpm fallow:audit` | 変更コードの health gate                |

型チェックは **tsgo**（`tsc` は使いません）。詳細は [AGENTS.md](AGENTS.md) を参照。

## 規約

- [CODING_GUIDELINE.md](CODING_GUIDELINE.md) … 人間・エージェント共通の正典
- [AGENTS.md](AGENTS.md) … エージェント向けの運用ルール
- `.claude/rules/` … AI 向けに蒸留したルール（`#` エイリアス・`type`（`interface` 禁止）・immutability・valibot・better-result など）

## 制約・注意

- **paid tier 必須**（AI Gateway）。
- **Status は `todo` / `review` / `approved` 厳守**（エージェントがこのリテラルを読み書きします）。
- **slug は kebab-case のみ**（`^[a-z0-9_-]+$`。`emit_zenn_markdown` が検証 — パストラバーサル対策）。
- frontmatter は全スカラを JSON エスケープして出力（YAML インジェクション対策）。

---

eve は現在 public beta です（[Vercel beta terms](https://vercel.com/docs/release-phases/public-beta-agreement)）。API や挙動は変わる可能性があります。
