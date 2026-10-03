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
