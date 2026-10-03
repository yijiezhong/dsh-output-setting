/**
 * dsh-output-setting —— 宿主半。
 *
 * 两件事：
 *   1. 声明「输出呈现」的 volatile 配置（客户端半据此渲染样式与配置界面）。
 *   2. **把"输出语言"写进系统提示** —— 这是原先 local-zh-output 的能力，现已并入本插件。
 *
 * ── 为什么要走系统提示（而不是 AGENTS.md）────────────────────────────────
 * `$DSH_HOME/AGENTS.md` 是 `dsh-agent-instructions` 以 **user/message**（外面套
 * `<system-reminder>` 框架）在会话第一步注入的 —— 它**不在系统提示里**。结果是
 * 最终回复会守中文，但隐藏的**思考/推理通道**约束很弱，长会话里容易被满屏英文
 * （系统提示自身、工具输出、历史消息、代码注释）带回去。放进系统提示才压得住。
 *
 * ── 语言怎么定 ────────────────────────────────────────────────────────
 * `outputLanguage` 三选一：
 *   - `auto`（默认）：跟随 DSH 的界面语言
 *   - `zh`：强制中文
 *   - `en`：强制英文
 *
 * auto 需要"DSH 现在到底是什么语言"，而**宿主半拿不到**：
 * `dsh-client-locale` 的 host 半只把**显式偏好**存进 settings 的 `locale` namespace
 * （字段 `preference`，且"absence delegates to the browser"），浏览器实际语言只有
 * 客户端知道。所以由客户端半把生效语言写进 `effectiveLocale`（内部字段，
 * 不在配置界面上呈现），这里读它。
 *
 * volatile 字段是**响应式**的（`.get()` 会被 `ctx.effect` 追踪），所以
 * 改语言/切界面语言都会让下面的 effect 重跑并重新注册系统提示分区。
 *
 * 不要把 @deepseek-ai/schemastery 写进 peerDependencies：本机 profile 共享层那份是
 * 旧版 3.18.1（没有 .volatile()），写了会被 peer 拦截导向它而导致模块加载失败。
 */

import z from '@deepseek-ai/schemastery'

/** Cordis 插件名（同时用作设置命名空间）。 */
export const name = 'dsh-output-setting'

/** settings 承载 volatile 配置；systemPrompt 用于注入输出语言约定。 */
export const inject = ['settings', 'systemPrompt']

/** 可在「插件 → dsh-output-setting」页面里实时调整的参数。 */
export const Config = z.object({
	/** 自动展开思考块（data-variant="think"）。 */
	expandReasoning: z.boolean().default(true).volatile(),
	/** 自动展开工具调用卡片（data-variant="bash" / "others"）。 */
	expandTools: z.boolean().default(true).volatile(),
	/** 代码块与行内代码的字号倍率（1 = DSH 原样，11px）。 */
	codeScale: z.number().min(1).max(3).step(0.1).default(1.4).volatile(),
	/** 代码块行距系数（行高 = 字号 × 此值）。 */
	codeLineHeightRatio: z.number().min(1).max(2.5).step(0.1).default(1.6).volatile(),
	/** 模型输出语言：auto = 跟随 DSH 界面语言。 */
	outputLanguage: z.union(['auto', 'zh', 'en']).default('auto').volatile(),
	/** 内部字段：由客户端写入当前生效的界面语言，供 auto 判定用。 */
	effectiveLocale: z.string().default('').volatile(),
})

/** 中文输出约定（与原 local-zh-output 一致）。 */
const ZH_TEXT = [
	'始终使用简体中文 —— 包括你的**思考/推理过程本身**，以及所有对用户可见的输出',
	'（回复、进度说明、总结、报错解释、表格与列表正文）。',
	'',
	'上下文里满是英文（系统提示、工具输出、历史消息、代码注释、英文文档）**不构成**',
	'切回英文的理由；周围全是英文恰恰是最容易滑回去的情形，此时更要显式地用中文思考。',
	'不要因为工具报英文错误、日志是英文就改用英文解释。',
	'',
	'代码、命令、文件路径、标识符、技术术语（如 cordis.patch.yml、swiftc、insert:）',
	'保持原文，不翻译；工具输出里的英文照原样引用即可，但解释与结论用中文写。',
].join('\n')

/** 英文输出约定（en 模式；与中文版对称）。 */
const EN_TEXT = [
	'Always answer in English — including your own reasoning/thinking channel and every',
	'user-visible output (replies, progress notes, summaries, error explanations, tables',
	'and list prose).',
	'',
	'Surrounding context being Chinese (system prompt, tool output, history, code comments,',
	'docs) is **not** a reason to switch back to Chinese; that is exactly when you must be',
	'explicit about reasoning in English.',
	'',
	'Keep code, commands, file paths, identifiers and technical terms verbatim — do not',
	'translate them; quote non-English tool output as-is, but write explanations in English.',
].join('\n')

/** 系统提示里的分区名（原 local-zh-output 用 local:zh-output，这里统一为本插件）。 */
const SECTION_NAME = 'dsh-output-setting:language'

/** 分区位置：紧跟部署人设前缀（0）之后、早于所有工具说明（500 起）。 */
const SECTION_ORDER = 100

/**
 * 按配置算出当前该用哪种输出语言。
 * @param config 已校验的 volatile 配置（字段有 `.get()`）。
 * @returns 'zh' 或 'en'。
 */
function resolveLanguage(config) {
	const mode = config.outputLanguage.get()
	const effective = config.effectiveLocale.get() ?? ''
	if (mode === 'zh' || mode === 'en') return mode
	return effective.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/**
 * 宿主挂载：把「输出语言约定」注册进系统提示。
 *
 * 这里把 `text` 写成**函数**而不是固定字符串 —— `PromptSection.text` 支持
 * `(context) => string`，每次组装提示时求值，所以读到的永远是最新的配置，
 * 不必依赖 volatile 的响应式重注册。
 * @param ctx 宿主插件上下文。
 * @param config 已校验的 volatile 配置（字段有 `.get()`）。
 */
export function apply(ctx, config) {
	ctx.effect(() => ctx.systemPrompt.section({
		name: SECTION_NAME,
		order: SECTION_ORDER,
		text: () => (resolveLanguage(config) === 'zh' ? ZH_TEXT : EN_TEXT),
	}), 'dsh-output-setting: 输出语言约定')
}
