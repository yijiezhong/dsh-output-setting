# PR 材料：收录 dsh-output-setting 到 DSH 插件目录

目标仓库：**[awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin)**
（DSH 生态的策展目录，也是 `dsh-market` 市场应用的数据源）

## 已就绪的状态

| 项 | 值 |
| --- | --- |
| Fork | `yijiezhong/awesome-dsh-plugin`（fork of 上游） |
| 分支 | `add-dsh-output-setting`（基于 `main` = `bb8496ec4cbb`） |
| 提交 | `f1d1d3628de5` — "Add yijiezhong/dsh-output-setting to the catalog" |
| 改动 | **1 个文件 / +6 行**（`data/plugins/yijiezhong__dsh-output-setting.yml`） |
| 文件位置 | [fork 上的文件](https://github.com/yijiezhong/awesome-dsh-plugin/blob/add-dsh-output-setting/data/plugins/yijiezhong__dsh-output-setting.yml) |

**PR 已开**：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/6494>

```
PR #6494  OPEN  ·  MERGEABLE  ·  1 文件 +6 −0
分支 add-dsh-output-setting → main
```

若需更新条目内容：直接往该分支再提交一次即可，PR 会自动带上新提交。

## 收录文件内容

```yaml
url: https://github.com/yijiezhong/dsh-output-setting
name: yijiezhong/dsh-output-setting
category: usage
description:
  en: 'Auto-expand reasoning and tool cards, tune code-block font size and line spacing, and choose the model output language (auto, Chinese or English).'
  zh: '自动展开思考与工具卡片，调整代码块字号与行距，并可选择模型输出语言（自动、中文或 English）。'
```

## 对照 contributing.md 的自检

| 要求 | 状态 |
| --- | --- |
| 文件名格式 `<owner>__<repo>.yml` | ✅ `yijiezhong__dsh-output-setting.yml` |
| `url` 与仓库完全一致 | ✅ |
| `category` 取自允许的取值集合 | ✅ `usage` |
| `description.en` 必填、以句号结尾 | ✅ |
| `description.zh` 可选（缺失由维护者补） | ✅ 已提供 |
| 含 `: ` 的描述必须加引号 | ✅ 中英都已用单引号包裹 |
| **`package.json` 声明 `dsh.bundle`** | ✅ `{"bundle":{"patch":"./cordis.patch.yml"}}`（规范点名：只声明 `dsh.client` 会被拒） |
| 只提交一个文件、不手工编辑生成的 README | ✅ 改动仅 1 文件 6 行 |

## 为什么选 `usage`

该插件调的是**使用体验**（过程节点怎么展开、代码块多大、模型用什么语言回答），
不改变应用外观版式（那是 `ui`/`theme` 的范畴），因此归入 `usage`。

---

## 投稿机制备忘（2026-10-04 实测，供将来提交其他插件复用）

### 两个独立的收录通道

| 通道 | 入口 | 生效方式 | 本次结果 |
| --- | --- | --- | --- |
| **策展目录**（权威） | PR 到 `awesome-dsh-plugin`，加一个 `data/plugins/<owner>__<repo>.yml` | 人工审核合并；`dsh-market` 市场 App 与周边站点次日自动同步 | PR [#6494](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/6494) 已开 |
| **topic 扫描**（免 PR） | 给仓库打 `dsh-plugin` topic | dshbase / Oh-My-DSH 等自动扫描收录 | ✅ 已设置 |

topic 通道的关键是 **`dsh-plugin`** 这个词 —— dshbase 页面写明"数据源：GitHub dsh-plugin topic + dsh.so 目录合并"，
但它是**数天一次的周期扫描**（当时数据源标注"更新于 2026-09-29"），不是实时。

### `Submission gate` 的两个反直觉点

这个 gate 由 `.github/workflows/pr-gate.yml` 实现，`check` 通过后才触发。踩到两个坑：

**① 仓库年龄门槛。** 新仓库必须满 **1 天**才放行，摘要里写的是
`repository is 0.2 days old (needs 1)`。这是反垃圾措施，不是投稿内容有问题。

**② "会自动重跑" 不是实时的。** 摘要里写 *"this check re-runs by itself and should clear
in about 19h. No need to resubmit, push, or close and reopen"* —— 容易误读成"到点自动变绿"。
实际机制在 `.github/workflows/regate.yml`（"Re-check gated submissions"）：

```yaml
on:
  schedule:
    - cron: '19 */6 * * *'      # 名义上每 6 小时
  workflow_dispatch:
env:
  MAX_RERUNS: '20'              # 每轮最多重跑 20 个 PR
```

- 实际触发**有 30~90 分钟漂移**（历史间隔 5–7 小时，不是精确定时）
- 每轮只挑 20 个，而这个仓库有 **500+ 个待处理 PR**
- 源码注释承认过极端案例：*#2146 sat on an "aged in" verdict for 119 hours*
- 它把 `blocking`（等时钟的，如仓库年龄）与 `revalidate`（例行复查）**分两层**，
  后者让路（"Diligence yields"），所以等时钟的 PR 优先 —— 但仍可能连续两轮轮不到

**结论**：等两轮 regate（约 12 小时）还没动静，就**推一个空提交**主动触发。
官方注释自己也承认这是有效方式：*"it sits red until someone pushes"*。

```sh
# 无需 clone，用 Git Data API 造一个 tree 不变的空提交
SHA=$(gh api repos/<fork>/git/refs/heads/<branch> --jq '.object.sha')
TREE=$(gh api repos/<fork>/git/commits/$SHA --jq '.tree.sha')
NEW=$(gh api repos/<fork>/git/commits --input - --jq '.sha' <<EOF
{"message":"chore: re-run submission gate","tree":"$TREE","parents":["$SHA"]}
EOF
)
gh api -X PATCH repos/<fork>/git/refs/heads/<branch> -f sha="$NEW"
```

### 其它实测要点

- **`MAX_RERUNS` 这类"自动机制"要读源码确认，别信摘要文案** —— 摘要说 19 小时，
  真实节奏取决于 cron 漂移与队列长度。
- **gate 失败不影响分支内容**：推空提交后 PR 的 tree 完全不变，只是 head 前移一格触发重跑。
- **`gh run view <id>` 对 check-run ID 会 404** —— `gh pr checks` 输出的是 check-run ID
  （`/runs/<id>`），不是 workflow run ID。查详情要用
  `gh api repos/<owner>/<repo>/commits/<sha>/check-runs`。
