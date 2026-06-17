# コーディング規約

このドキュメントは `my-eve-first-agent`（[eve](https://www.npmjs.com/package/eve) フレームワークのエージェントアプリ）のコーディング規約を定義します。

> **前提**: コードを書く前に、必ず `node_modules/eve/docs/` の該当ガイドを読むこと（`AGENTS.md` の方針）。

## 目次

1. [プロジェクト構成](#プロジェクト構成)
2. [インポートパス](#インポートパス)
3. [型定義規約](#型定義規約)
4. [エクスポートと関数スタイル](#エクスポートと関数スタイル)
5. [スキーマ検証（valibot）](#スキーマ検証valibot)
6. [エラーハンドリング（better-result）](#エラーハンドリングbetter-result)
7. [eve 固有規約](#eve-固有規約)
8. [eval（テスト方針）](#evalテスト方針)
9. [コードスタイル](#コードスタイル)
10. [コメント規約](#コメント規約)
11. [ツール設定](#ツール設定)
12. [参考リンク](#参考リンク)

---

## プロジェクト構成

eve はファイルシステム駆動です。`agent/` に能力を書き、ランタイムがモデルループ・セッション永続化・HTTP/チャネル配信を担います。

```text
my-eve-first-agent/
├── agent/
│   ├── agent.ts          # defineAgent（ランタイム設定 / default export）
│   ├── instructions.md   # 常時適用のシステムプロンプト
│   ├── channels/         # eveChannel（HTTP・Slack 等 / default export）
│   └── tools/            # defineTool（ファイル名 = ツール名 / default export）
└── evals/
    ├── evals.config.ts   # defineEvalConfig（default export）
    └── **/*.eval.ts      # defineEval（default export）
```

- ツールはファイル名がそのままモデルに見えるツール名になる。**snake_case ASCII** で命名する（例: `agent/tools/get_weather.ts` → `get_weather`）。
- 詳細は `node_modules/eve/docs/`（`getting-started.mdx` / `tools/` / `channels/` / `evals/`）を参照。

---

## インポートパス

**`#` サブパスインポートを優先します。** 深い相対パス（`../../`）は禁止します。

`package.json` の `imports` で次のように定義されています。

```jsonc
"imports": {
  "#*": "./agent/*",       // #tools/get_weather → agent/tools/get_weather
  "#evals/*": "./evals/*"  // #evals/helpers     → evals/helpers
}
```

```typescript
// ✅ Good: # サブパスを使用
import { fetchWeather } from "#lib/weather";
import type { WeatherInput } from "#tools/get_weather";

// ❌ Bad: 深い相対パスは禁止
import { fetchWeather } from "../../lib/weather";
```

> **注意**: `#*` は `agent/` 配下に解決されます。`agent/` 外（`evals/` など）からの参照は `#evals/*` を使います。

---

## 型定義規約

### const assertion + satisfies パターン

オブジェクト定数には `as const satisfies` を使用して型安全性を確保します。

```typescript
// ✅ Good: リテラル型を保持しつつ型チェックも行う
const modelByTier = {
  fast: "anthropic/claude-haiku-4.5",
  smart: "anthropic/claude-sonnet-4.6",
} as const satisfies Record<Tier, string>;

// ❌ Bad: 型推論が string になってしまう
const modelByTier: Record<Tier, string> = {
  fast: "anthropic/claude-haiku-4.5",
  smart: "anthropic/claude-sonnet-4.6",
};
```

### Single Source of Truth

型は一箇所で定義し、派生型は親の型から生成します。

```typescript
export type Tier = "fast" | "smart";

export type WeatherResult = {
  city: string;
  condition: string;
  temperatureF: number;
};

// 派生型は親の型から作成
export type WeatherSummary = Pick<WeatherResult, "city" | "condition">;
```

### type vs interface

基本的に `type` を使用します。

```typescript
// ✅ Good
type WeatherResult = {
  city: string;
  condition: string;
};

// ❌ Bad（このプロジェクトでは interface を避ける）
interface WeatherResult {
  city: string;
  condition: string;
}
```

### 型推論を優先する

**明示的な型注釈よりも型推論を優先します。** TypeScript が正しく推論できる場合は型を書きません。

```typescript
// ❌ Wrong: 推論できるのに明示している
export function toSummary(r: WeatherResult): WeatherSummary {
  return { city: r.city, condition: r.condition };
}

// ✅ Good: 戻り値は推論に任せる
export function toSummary(r: WeatherResult) {
  return { city: r.city, condition: r.condition };
}
```

型注釈を書くのは、推論結果が `unknown` / `any` になる場合、または公開 API の境界で意図を明示する必要がある場合のみです。

### TypeScript Utility 型の積極的活用

**型定義では可能な限り Utility 型を活用します。** 特に 1〜2 個のプロパティしかない場合は専用型を定義せず直接 Utility 型を使用します。

```typescript
// ✅ Good: 既存の型から派生 → Pick/Omit を活用
export function summarize({ city }: Pick<WeatherResult, "city">) {
  return city;
}

// ❌ Bad: 既存の型から簡単に派生できるのに新規定義
type SummarizeInput = {
  city: string;
};
```

**よく使用する Utility 型:**

| Utility 型     | 用途                                 | 例                                    |
| -------------- | ------------------------------------ | ------------------------------------- |
| `Record<K, V>` | 特定のキーと値の型を持つオブジェクト | `Record<Tier, string>`                |
| `Pick<T, K>`   | 既存の型から特定のプロパティを抽出   | `Pick<WeatherResult, "city">`         |
| `Omit<T, K>`   | 既存の型から特定のプロパティを除外   | `Omit<WeatherResult, "temperatureF">` |
| `Partial<T>`   | すべてのプロパティをオプショナルに   | `Partial<WeatherResult>`              |
| `Required<T>`  | すべてのプロパティを必須に           | `Required<Config>`                    |
| `Readonly<T>`  | すべてのプロパティを読み取り専用に   | `Readonly<State>`                     |

**ガイドライン:**

1. **1〜2 個のプロパティ** → 専用型を定義せず直接 Utility 型を使用
2. **3 個以上のプロパティ** → 状況に応じて専用型の定義も可
3. **既存の型から派生可能** → 必ず Pick/Omit などを使用して派生させる

---

## エクスポートと関数スタイル

### Named Export を基本とする

ユーティリティ・型・ヘルパーは named export を使用します。

```typescript
// ✅ Good: Named Export
export function toSummary(r: WeatherResult) {
  return { city: r.city, condition: r.condition };
}

export type WeatherSummary = Pick<WeatherResult, "city" | "condition">;
```

**例外（default export が必須）:** eve はファイルの **default export** でエージェント定義を読み込みます。次のファイルは `export default` を使用します。`.oxlintrc.json` の `import/no-default-export` も同じ範囲を除外しています。

| ファイル                | default export する関数 |
| ----------------------- | ----------------------- |
| `agent/agent.ts`        | `defineAgent(...)`      |
| `agent/channels/*.ts`   | `eveChannel(...)`       |
| `agent/tools/*.ts`      | `defineTool(...)`       |
| `evals/**/*.eval.ts`    | `defineEval(...)`       |
| `evals/evals.config.ts` | `defineEvalConfig(...)` |
| `*.config.ts`           | （設定ファイル全般）    |

### 関数スタイル

ヘルパーやツールの `execute` 以外のロジックは **関数宣言** スタイルを使用します。

```typescript
// ✅ Good: 関数宣言
export function toSummary(r: WeatherResult) {
  return { city: r.city, condition: r.condition };
}

// ❌ Bad: アロー関数（トップレベルの公開関数）
export const toSummary = (r: WeatherResult) => {
  return { city: r.city, condition: r.condition };
};
```

---

## スキーマ検証（valibot）

外部入力（ツール入力・環境変数・API レスポンス）の検証には [valibot](https://valibot.dev/) を使用します（このプロジェクトの依存）。型は `InferOutput` でスキーマから導出し、二重定義を避けます。

```typescript
import * as v from "valibot";

// ✅ スキーマを唯一の真実とし、型は導出する
export const WeatherInput = v.object({
  city: v.pipe(v.string(), v.minLength(1)),
});

export type WeatherInput = v.InferOutput<typeof WeatherInput>;
```

> **補足（tool inputSchema）**: eve のスキャフォールド既定は `zod` ですが、本プロジェクトは `valibot` に統一します。ただし `defineTool` の `inputSchema` は **JSON Schema 変換可能なスキーマ**（`StandardJSONSchemaV1` または JSON Schema オブジェクト）を要求し、valibot 素のスキーマは型不適合です。`@valibot/to-json-schema` の `toJsonSchema()` で変換して渡し（valibot を SSoT に保つ）、`execute` 内では `v.parse` で型付きに検証します。具体例は [eve 固有規約 §tools](#eve-固有規約) を参照。

---

## エラーハンドリング（better-result）

このプロジェクトでは [better-result](https://github.com/dmmulroy/better-result) による型安全なエラーハンドリングを採用します。`throw` ではなく `Result` を返します。

### 境界をラップする

```typescript
import { Result } from "better-result";
import { fetchWeather } from "#lib/weather";

export function fetchWeatherSafe(city: string) {
  return Result.tryPromise({
    catch: (e) => e,
    try: () => fetchWeather(city),
  });
}
```

### 消費側は match を使う

```typescript
// match パターン（キー順序はアルファベット順）
const result = await fetchWeatherSafe(city);

result.match({
  err: (error) => {
    // 失敗を明示的に処理する
    return { error: true, message: String(error) };
  },
  ok: (data) => data,
});
```

**注意**: `if (result.isErr())` パターンは return 忘れによるバグの原因になるため、`match` を使用してください。

**実践ガイドライン:**

1. **最初は重複を許容する** — パターンが明確になるまで待つ
2. **3 回目の重複で抽象化を検討する** — 2 回までは重複のままでよい
3. **間違った抽象化は重複より高コスト** — リファクタリングが困難になる

---

## eve 固有規約

詳細は必ず `node_modules/eve/docs/` を参照すること。以下は最低限の約束事です。

### agent.ts

ランタイム設定のみを持ち、`defineAgent` を default export します。

```typescript
import { defineAgent } from "eve";

export default defineAgent({
  model: "anthropic/claude-sonnet-4.6",
});
```

### tools

`agent/tools/<name>.ts` に 1 ツール 1 ファイルで置きます。ファイル名がツール名（snake_case）になります。`defineTool` を default export します。valibot スキーマを SSoT にし、`toJsonSchema()` で `inputSchema` に渡し、`execute` 内で `v.parse` して型付きに検証します（`execute` の戻り値は推論に任せる）。

```typescript
import { toJsonSchema } from "@valibot/to-json-schema";
import { defineTool } from "eve/tools";
import * as v from "valibot";

// eve の JsonObject は string index signature を要するため構造的にキャストして橋渡し
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

const GetWeatherInput = v.object({ city: v.pipe(v.string(), v.minLength(1)) });

export default defineTool({
  description: "Get the current weather for a city.",
  inputSchema: toJsonSchema(GetWeatherInput) as Record<string, JsonValue>,
  async execute(args) {
    const { city } = v.parse(GetWeatherInput, args);
    return { city, condition: "Sunny", temperatureF: 72 };
  },
});
```

### channels

`agent/channels/*.ts` に `eveChannel` を default export します。認証は用途に応じて差し替えます（本番は `placeholderAuth()` を実際の auth provider に置き換えること）。

### instructions.md

常時適用のシステムプロンプト。「何をするか」だけでなく「どう振る舞うか」を簡潔に書きます。

---

## eval（テスト方針）

テストは eve の **eval**（`evals/**/*.eval.ts`）で書きます。eval は実際の HTTP サーフェスを経由してエージェントを駆動し、結果を採点する再現可能なチェックです。`eve eval`（`pnpm eval`）で実行します。

### ユーザー視点でアサートする

実装詳細ではなく、**実行結果（完了・使用ツール・返信内容）** をアサートします。

```typescript
import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "天気エージェントのメッセージとツール利用の基本カバレッジ。",
  async test(t) {
    await t.send("What is the weather in Brooklyn?");
    t.completed();
    t.calledTool("get_weather");
    t.check(t.reply, includes("Sunny"));
  },
});
```

- ファイルパスが eval の識別子になるため `id` / `name` は書かない（`evals/weather/forecast.eval.ts` → `weather/forecast`）。
- 各 `evals/` ディレクトリには `evals.config.ts` を 1 つ置き、`judge` モデルや reporter などの共通既定を宣言する。
- LLM-as-judge アサーション（`t.judge.*`）は揺らぎを伴うため、決定的にチェックできるものは `t.calledTool` / `includes` などで書く。

---

## コードスタイル

整形は **oxfmt**（`pnpm format` / `pnpm fix`）が担当します。手動整形は不要です。下表は oxfmt のデフォルト挙動です。

| ルール         | 設定               |
| -------------- | ------------------ |
| インデント     | 2 スペース         |
| クォート       | ダブルクォート `"` |
| セミコロン     | あり               |
| 末尾カンマ     | あり               |
| インポート整列 | oxfmt が自動整列   |

```typescript
// ✅ Good
const user = {
  city: "Brooklyn",
  condition: "Sunny",
};
```

### 命名規則

| 対象           | 規則             | 例                                 |
| -------------- | ---------------- | ---------------------------------- |
| 変数・関数     | lowerCamelCase   | `cityName`, `fetchWeather`         |
| 型             | UpperCamelCase   | `WeatherResult`, `WeatherInput`    |
| 定数           | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL`  |
| ファイル名     | kebab-case       | `to-summary.ts`, `weather.ts`      |
| ツールファイル | snake_case       | `get_weather.ts`（ツール名と一致） |

### オブジェクトのキー順序

アルファベット順に並べます。インポートは oxfmt が自動整列します。

```typescript
// ✅ Good
const colors = {
  fast: "green",
  slow: "red",
};
```

### Import 順序

oxfmt により自動整列されます。手動で並べ替える必要はありません。参考として整列後の順序は次のとおりです。

1. 外部ライブラリ（`eve`、サードパーティ）
2. 内部モジュール（`#` サブパス）
3. 型のインポート

```typescript
import { defineTool } from "eve/tools";
import * as v from "valibot";

import { fetchWeather } from "#lib/weather";

import type { WeatherResult } from "#tools/get_weather";
```

---

## コメント規約

- 「何をしているか」ではなく「なぜそうしているか」を書く
- 複雑なビジネスロジックには説明を追加
- TODO コメントには担当者と期限を記載

```typescript
// ✅ Good: 理由を説明
// Gateway 経由だとレート制限が緩いため直叩きを避ける
const model = "anthropic/claude-sonnet-4.6";

// TODO(@username 2026-07): 認証 provider 確定後に placeholderAuth を差し替え

// ❌ Bad: コードを繰り返しただけ
// model に値を代入する
const model = "anthropic/claude-sonnet-4.6";
```

---

## ツール設定

| ツール | 用途                                       | 設定ファイル       |
| ------ | ------------------------------------------ | ------------------ |
| tsgo   | 型チェック                                 | `tsconfig.json`    |
| oxlint | Linter                                     | `.oxlintrc.json`   |
| oxfmt  | Formatter                                  | `.oxfmtrc.json`    |
| fallow | コード健全性（未使用・重複・循環・複雑度） | `.fallowrc.json`   |
| eve    | ビルド・開発サーバ・実行                   | （フレームワーク） |

### コマンド

```bash
# まとめてチェック（型 + lint + 整形チェック）
pnpm check

# 自動修正（lint --fix + 整形）
pnpm fix

# 個別実行
pnpm typecheck   # tsgo
pnpm lint        # oxlint
pnpm format      # oxfmt（書き込み）
pnpm eval        # eve eval（評価実行）

# 開発・ビルド
pnpm dev         # eve dev（ローカル TUI）
pnpm build       # eve build
pnpm start       # eve start
```

### fallow（コード健全性）

`fallow` は型チェックや整形ではなく、**未使用コード・依存・重複・循環依存・複雑度** を検出します（lint/format は oxlint/oxfmt、型は tsgo の担当）。

```bash
pnpm fallow:health      # 健全性レポート
pnpm fallow:dead-code   # 未使用ファイル・export・依存
pnpm fallow:audit       # 変更差分の品質ゲート（コミット/PR 前）
pnpm fallow:fix         # 未使用 export/依存の自動削除（--dry-run で確認後）
```

- 「未使用」と出たものを消す前に、必ず `fallow dead-code --trace <file>:<export>` で根拠を確認する。
- コミット/PR 前のゲートはエージェント向けに導入済み（`.claude/hooks/fallow-gate.sh`）。`fallow audit` が `fail` の場合は指摘を直してから再試行する。

> `pnpm tsc` / `npx tsc` は使用しません。型チェックは `tsgo`（`pnpm typecheck` / `pnpm check`）が担当します。

---

## 参考リンク

- [eve ドキュメント](https://eve.dev/docs/introduction)（インストール後は `node_modules/eve/docs/`）
- [better-result](https://github.com/dmmulroy/better-result)
- [Valibot](https://valibot.dev/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html) / [oxc](https://github.com/oxc-project/oxc)
- [fallow](https://docs.fallow.tools)
