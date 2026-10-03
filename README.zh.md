# dsh-output-setting

[English](README.md) | 简体中文

DSH（DeepSeek Harness）的输出呈现设置插件。把「过程节点怎么展开」「代码块多大」「模型用什么语言回答」集中到一个配置页里，全部**实时生效**，无需重启。

配置入口：**插件 → dsh-output-setting**（插件自己的详情页，不是「设置」里的独立分组）。

## 配置项

| 分组 | 配置 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| 过程节点 | 自动展开思考过程 | 开关 | 开 | 新出现的思考块直接显示完整内容 |
| 过程节点 | 自动展开工具调用 | 开关 | 开 | 命令等工具卡片直接显示输入输出 |
| 代码块 | 代码块字号 | 滑块 1–3 | 1.4× | 代码块与行内代码的字号倍率（1 = DSH 原样 11px） |
| 代码块 | 代码块行距 | 滑块 1–2.5 | 1.6× | 行高 = 字号 × 此系数 |
| 输出语言 | 模型输出语言 | 下拉 | 自动 | `自动`（跟随界面语言）/ `简体中文` / `English` |

「模型输出语言」写进的是**系统提示**（不是 AGENTS.md），因此对隐藏的**思考/推理通道**同样有约束力 —— AGENTS.md 是以 user 消息注入的，管不住推理通道。

## 安装

```sh
# 在 DSH 的 profile 里加一条 link: 依赖
cd ~/.dsh/profiles/desktop
pnpm add link:/path/to/dsh-output-setting
node -e "const f='package.json',j=require('./'+f);j.dsh.profile.bundles.push('dsh-output-setting');require('fs').writeFileSync(f,JSON.stringify(j,null,2)+'\n')"
```

或直接用插件管理器：

```
plugin_manager(install_bundle, "link:/path/to/dsh-output-setting")
```

### ⚠️ 依赖：必须自带 `@deepseek-ai/schemastery@3.18.4`

```sh
cd /path/to/dsh-output-setting
npm install @deepseek-ai/schemastery@3.18.4 --no-save
```

**为什么**：本机 profile 共享层（`~/.dsh/profiles/node_modules`）里那份是旧版 **3.18.1**，
**没有 `.volatile()`**；而 Desktop 未传 `bareModuleBaseUrl`，裸模块名走 Node 原生解析，
插件不自己带新版就会命中旧版 → `z.number().volatile is not a function` →
**模块加载失败 → Config 缺失 → 配置页不出现**（`listConfigs` 报 `status: "absent"`，
但 `fiberPhase` 仍显示 `active`，极易误判）。

**也不要**把 schemastery 写进 `peerDependencies` —— 写了会被 peer 拦截重新导向共享层的旧版。

## 开发须知

- **改 host 半（`host.js`）必须重启应用**才生效：`disable → enable`、改文件名、
  `remove + install` 都**不会**重新加载模块（Node ESM 按 URL 缓存，`dsh-hmr` 只监听 patch 文件）。
  判断是否真的重载，用副作用写文件验证，**别信 `fiberPhase`**。
- **改 client 半（`client.js`）刷新页面即可**（`Cmd+R`）。但注意 `Cmd+R` 会把整个 DSH 界面
  语言回落成浏览器语言，验证双语时请在设置面板里切语言。
- 配置界面注册在 **`plugins.bundle.config`**（keyed slot，key = 本包名），
  渲染在插件详情页「描述」与「包含的组件」之间。

## 相关

- `STATUS.md`（在 `dsh-testhud` 仓库里）记录了本插件涉及的全部 DSH 坑位与验证方法。

## License

MIT
