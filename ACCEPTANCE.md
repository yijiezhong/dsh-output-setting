# 验收报告 — dsh-output-setting v1.0.0

测试日期：2026-10-03 ｜ 测试环境：DSH Desktop **0.2.0-rc.2**（macOS，profile = `desktop`）

## 一、验收结论

**通过**。9 项用例全部通过，其中 4 项配置的**实时生效**已用截图取证；
插件在 DSH 侧加载正常（`listConfigs` 报 `status: "schema"`），
`npm pack` 产物精确符合 `files` 白名单。

## 二、用例与结果

| # | 用例 | 方法与判据 | 结果 |
| --- | --- | --- | --- |
| 1 | 清单完整性 | `package.json` 字段盘点 | ✅ 含 name/version/description/license/repository/keywords/files/main/exports/dsh |
| 2 | 依赖声明 | `npm ls --all` | ✅ 树为 `schemastery → cosmokit + @standard-schema/spec`，**无 extraneous** |
| 3 | 源文件完整 | 8 个文件逐一存在性检查 | ✅ host.js / client.js / cordis.patch.yml / package.json / README×2 / LICENSE / .gitignore |
| 4 | 语法与导出 | `import` host + `new Function` 解析 client | ✅ 导出 `Config, apply, inject, name`；`inject = ["settings","systemPrompt"]` |
| 5 | 配置 schema | `cordis_inspect_query(Config.listConfigs)` | ✅ `status: "schema"`，6 字段齐全且全为 `volatile: true` |
| 6 | **代码块字号实时生效** | 配置写 `codeScale: 2.2`，**不刷新页面** | ✅ 4 秒内代码块字号明显变大（截图取证） |
| 7 | **自动展开可关闭** | 配置写 `expandTools: false` | ✅ 新产生的工具调用块保持折叠（截图取证为单行 `>_ 运行命令 · …`） |
| 8 | **输出语言 auto** | `outputLanguage: auto` + `effectiveLocale: zh` | ✅ 系统提示注入中文规则（以"本会话中文输出"为观测点） |
| 9 | 打包产物 | `npm pack --dry-run` | ✅ 7 文件 / 13.5 kB，无 `.git`、`bin/`、`node_modules` 混入 |

**测试后已恢复现场**：临时写入的 `codeScale` 与 `expandTools` 均已还原，残留检查为 0。

## 三、已知限制

1. **改 host 半（`host.js`）需重启应用**才生效 —— `disable → enable`、改文件名、
   `remove + install` 都不会重新加载模块（Node ESM 按 URL 缓存，`dsh-hmr` 只监听 patch 文件）。
   仅改 `client.js` 时刷新页面即可。（**例外**：换包路径 = 换模块 URL，会直接重新加载。）
2. **必须自带 `@deepseek-ai/schemastery@~3.18.4`** —— profile 共享层那份是 3.18.1，没有
   `.volatile()`；且**不能**把它写进 `peerDependencies`（会被拦截回旧版）。
3. **DSH 0.2.0-rc.2 没有内置插件市场** —— 插件通过 pnpm spec 分发
   （`link:` / `file:` / `github:` / `https:` / npm 包名）。因此"提交插件市场"= 让包能被
   GitHub 或 npm 安装。
4. **GitHub 侧已打通（2026-10-03 补测）**。当时 `github.com` 主站一度超时，已通过
   GitHub **Git Data API**（走可达的 `api.github.com`）完成首次推送，随后主站恢复，
   改用常规 `git push --force` 对齐，**本地与远端 HEAD 现已完全相同**。
   `github:` 安装已实测：`pnpm add github:yijiezhong/dsh-output-setting` 成功，
   装下来的正是 `files` 白名单那 7 个文件（无 `.git` / `bin/` / `node_modules`）。
   **注意**：按既有约定，`github` remote 的 push 用哨兵 `disabled://github-push-disabled`
   默认禁用；需要推送时临时放开、推完立刻恢复（见 `bin/pushall.sh` 顶部注释）。

## 四、发布前检查清单

| 项 | 状态 |
| --- | --- |
| `private` 字段已移除（否则 npm 拒绝发布） | ✅ |
| `license` / `repository` / `homepage` / `bugs` / `keywords` | ✅ |
| `files` 白名单，`npm pack` 已验证 | ✅ |
| 双语 README + LICENSE | ✅ |
| 依赖声明正确（schemastery 在 `dependencies`） | ✅ |
| NAS 远端（`origin`）与 GitHub remote（`github`，push 按约定禁用） | ✅ |
| `git pushall` 可用（跳过被禁用远程并核对各远程 HEAD） | ✅ |
| **GitHub 仓库已创建且公开**、内容已推送、SHA 与本地对齐 | ✅ |
| **`github:` 安装已实测**（pnpm 拉取内容符合白名单） | ✅ |
| **npm 发布**（可选；不发也能用 `github:` 安装） | ⬜ 可选 |

> GitHub：<https://github.com/yijiezhong/dsh-output-setting>（public，默认分支 `master`）

## 五、复现测试的方法

```sh
# 结构 / 依赖
cd <repo> && npm install && npm ls --all && npm pack --dry-run

# DSH 侧加载与 schema
#   cordis_inspect_query(platform="host", provider="Config",
#                        method="listConfigs", input={entry:"include:dsh-output-setting"})
#   期望 status == "schema" 且含 expandReasoning / expandTools / codeScale /
#        codeLineHeightRatio / outputLanguage / effectiveLocale 六个字段

# 功能（改配置最可靠，避免用合成鼠标点原生控件）
#   编辑 ~/.dsh/profiles/desktop/cordis.patch.yml 里 dsh-output-setting 的 config，
#   写完后 dsh-hmr 会 reconcile，数秒内界面即生效；测完记得还原。
```
