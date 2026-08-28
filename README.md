# Personal LLM Wiki

Personal LLM Wiki は、Markdown を永続的な Source of Truth とする、local-first の Personal Knowledge Infrastructure です。Obsidian Vault はユーザー所有の外部データとして保ち、このリポジトリは deterministic な knowledge logic、CLI、test、必要になった agent Skill を担当します。

## Current status

Phase 1 の read-only recall vertical slice を実装済みです。

```text
wiki doctor
wiki search <query>
wiki show <relative-path-or-id>
```

- 外部 Vault を変更せず、Markdown を直接scan
- lexicalで説明可能なdeterministic ranking
- source、knowledge、asset、daily、unknownを認識
- plain Markdownやmetadata不足のnoteも検索・表示
- relative pathをprimary identity、frontmatter `id`をoptional identityとして使用
- Vector DB、embedding、persistent index、MCP、Web UI、Product OS連携は未導入

設計の詳細は次を参照してください。

- [Architecture](docs/ARCHITECTURE.md)
- [Knowledge Model](docs/KNOWLEDGE-MODEL.md)
- [Roadmap](docs/ROADMAP.md)

## Requirements and setup

- Node.js 24以降
- npm

```bash
npm install
npm run build
```

Vaultを環境変数で設定する場合:

```bash
cp .env.example .env
export LLM_WIKI_VAULT=/path/to/Personal-Knowledge
```

CLI自身は`.env`を自動loadしません。shellや呼び出し元から環境変数を渡してください。各commandの`--vault <path>`が環境変数より優先されます。

## Usage

Repository内から実行する場合:

```bash
npm run wiki -- doctor
npm run wiki -- search "react state"
npm run wiki -- show "20-Knowledge/react-state-management.md"
```

build後は直接実行できます。

```bash
node dist/src/cli.js --vault /path/to/vault doctor
node dist/src/cli.js --vault /path/to/vault search "円形アニメーション"
node dist/src/cli.js --vault /path/to/vault show KNOW-0001
```

`show KNOW-0001`は該当するoptional frontmatter `id`がある場合だけ成功します。すべてのnoteにIDを要求しません。

各commandはagent向けに`--json`も受け付けます。

```bash
npm run wiki -- --json search "motion graphics"
```

### `doctor`

設定source、resolved Vault path、existence、readability、writable capability、recognized top-level directories、Markdown note countを表示します。Writable capabilityはOS access checkだけで診断し、probe fileを作成しません。`.obsidian/`がないことはエラーではありません。

### `search`

全Markdown noteを直接scanし、relative path、title、kind、promotion、optional ID、score、matched fields、snippet、source/provenanceを返します。network、LLM、embedding、external/persistent indexは使いません。

### `show`

relative Vault path、または存在するoptional frontmatter IDで1つのMarkdown noteを表示します。Vault外へのpath traversalは拒否します。

## Test

```bash
npm test
```

Testsは毎回temporary fixture Vaultを作り、実Personal Vaultを使用しません。実Vaultに対するdogfood evaluationは、人間が少数の本物のnoteを追加した後、read-onlyで別途行います。

## Repository and Vault boundary

```text
personal-llm-wiki/                  code, docs, tests
        |
        | --vault / LLM_WIKI_VAULT
        v
Personal-Knowledge/                 user-owned Markdown Vault
```

Knowledge Engineは`.obsidian/`を作成・変更しません。

## Safety

- Vault の既存noteをdelete、rename、move、bulk rewriteしない
- AI-generated candidateを人間の操作なしにcanonicalへ昇格しない
- source materialとinterpretationを混ぜない
- contradictionを片方の削除で解決しない
- hidden directoriesとsymlinkをscanしない
- testsは実Vaultではなくtemporary fixture Vaultを使う

安定したinvariantは [AGENTS.md](AGENTS.md) にあります。
