/**
 * dsh-output-setting —— 客户端半：DSH 输出呈现设置。
 *
 * 三件事：
 *   1. 自动展开：把会话区里可展开的过程节点点开（思考块 + 工具调用卡片）。
 *   2. 代码字号：注入 CSS 覆盖代码块/行内代码的字号与行高。
 *   3. 设置界面：在「设置」里注册一个独立分区「输出设置」(settings.section)，
 *      上述四项参数都在这里实时调整。
 *
 * ── 为什么这些都要在客户端做 ────────────────────────────────────────────
 * · 过程节点的展开状态是各组件的**本地 useState**（初始恒 false），
 *   `transcriptView` 四档只影响「回合过程容器」与「预览行」，管不到节点本身。
 * · 代码块字号**不在 ui-theme 的 Config 里**（那里只有正文字号 10–22），
 *   它是 ui-theme 在 `body{}` 上硬编码的设计变量。
 * · volatile 字段只保证**值实时下发**，不会自动生成设置 UI ——
 *   `autoGenerate` 是纯元数据，客户端没有任何包读它，必须自己注册 slot。
 *
 * ── 踩过的契约坑（别再犯） ──────────────────────────────────────────────
 * 1. 选择器别写 `button[...]`：`DisclosureRow` 在 rowExpands 为真时**不渲染 <button>**，
 *    可点的是 `<div role="button" aria-expanded>`。
 * 2. `aria-expanded` 位置不统一：工具卡片挂在**节点自身**，思考块挂在**后代 row**；
 *    而 `querySelector` **不含自身**，只写后代会漏掉全部工具卡片。
 * 3. `--dsw-font-markdown-code-block` 是 **`font:` 简写**，覆盖要三部分写全。
 * 4. 终端类代码块的行高硬编码在 `.xxx_terminalBody` 上（特异性高于 `body`），
 *    不按同级特异性覆盖会「字号变大、行高不变 → 行行重叠」。
 */
window.__ModuleLoader__.load({
	id: "dsh-output-setting",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		const react = require("react");

		/** 设置命名空间 = 宿主插件名。 */
		const NAMESPACE = "dsh-output-setting";

		/**
		 * 界面文案字典（zh + en）。
		 * 交给 DSH 的 locale 服务按**当前语言**选择并走 fallback 链
		 * （zh-CN → zh → en），所以非中文系统会自动显示英文，
		 * 不需要自己判断 `navigator.language`。
		 */
		const MESSAGES = {
			zh: {
				title: "输出设置",
				subtitle: "控制会话里过程节点的展开方式与代码块的呈现尺寸",
				groupProcess: "过程节点",
				expandReasoning: "自动展开思考过程",
				expandReasoningDesc: "新出现的思考块直接显示完整内容，不用逐条点开",
				expandTools: "自动展开工具调用",
				expandToolsDesc: "运行命令等工具卡片直接显示输入输出，不用逐条点开",
				groupCode: "代码块",
				codeScale: "代码块字号",
				codeScaleDesc: "输出里代码块与行内代码的字号倍率（1 = DSH 原样，11px）",
				codeLineHeight: "代码块行距",
				codeLineHeightDesc: "行高 = 字号 × 此系数；过小会让各行挤在一起",
				groupLanguage: "输出语言",
				outputLanguage: "模型输出语言",
				outputLanguageDesc: "写进系统提示，约束回复与思考通道使用的语言",
				langAuto: "自动（跟随界面语言）",
				langZh: "简体中文",
				langEn: "English",
			},
			en: {
				title: "Output settings",
				subtitle: "How process nodes expand and how code blocks are sized in this session view",
				groupProcess: "Process nodes",
				expandReasoning: "Auto-expand reasoning",
				expandReasoningDesc: "New reasoning blocks show their full content without clicking each one",
				expandTools: "Auto-expand tool calls",
				expandToolsDesc: "Command and other tool cards show their input and output without clicking each one",
				groupCode: "Code blocks",
				codeScale: "Code font size",
				codeScaleDesc: "Font scale for code blocks and inline code (1 = DSH default, 11px)",
				codeLineHeight: "Code line height",
				codeLineHeightDesc: "Line height = font size \u00d7 this ratio; too small makes lines overlap",
				groupLanguage: "Output language",
				outputLanguage: "Model output language",
				outputLanguageDesc: "Written into the system prompt; governs the language of replies and the reasoning channel",
				langAuto: "Automatic (follow UI language)",
				langZh: "简体中文",
				langEn: "English",
			},
		};

		/** 兜底值（与宿主侧 Config 的 default 一致）。 */
		const DEFAULTS = {
			expandReasoning: true,
			expandTools: true,
			codeScale: 1.4,
			codeLineHeightRatio: 1.6,
		};

		/** 可自动展开的过程节点。 */
		const EXPANDABLE = '[data-variant="think"], [data-variant="bash"], [data-variant="others"]';

		/** 代码块基准字号（取自 ui-theme 的 body 定义）。 */
		const BASE = { block: 11, blockSmall: 11, inline: 12 };

		/**
		 * 当前表单与翻译函数；apply 时赋值，供设置分区组件读写。
		 */
		let outputForm = null;
		let outputT = (key) => key;
		let outputLocale = null;

		// ─────────────────────────── 1. 代码字号 CSS ───────────────────────────

		/** 取整到像素。 */
		function px(value) {
			return `${Math.round(value)}px`;
		}

		/** 由基准字号与系数推出 { size, line }。 */
		function metrics(baseSize, scale, ratio) {
			const size = baseSize * scale;
			return { size, line: size * ratio };
		}

		/** 拼一段 `font:` 简写。 */
		function font(spec) {
			return `${px(spec.size)}/${px(spec.line)} var(--ds-font-family-code)`;
		}

		/**
		 * 生成覆盖代码字号与行高的样式。
		 * @param scale 字号倍率（1 = DSH 原样）。
		 * @param ratio 行距系数。
		 * @returns 完整 CSS 文本。
		 */
		function buildCss(scale, ratio) {
			const block = metrics(BASE.block, scale, ratio);
			const blockSmall = metrics(BASE.blockSmall, scale, ratio);
			const inline = metrics(BASE.inline, scale, ratio);
			return [
				`/* dsh-output-setting：代码块字号 ×${scale}，行距 ×${ratio} */`,
				"body {",
				`  --dsw-font-markdown-code-block: ${font(block)} !important;`,
				`  --dsw-font-markdown-code-block-font-size: ${px(block.size)} !important;`,
				`  --dsw-font-markdown-code-block-line-height: ${px(block.line)} !important;`,
				`  --dsw-font-markdown-code-block-small: ${font(blockSmall)} !important;`,
				`  --dsw-font-markdown-code-block-small-font-size: ${px(blockSmall.size)} !important;`,
				`  --dsw-font-markdown-code-block-small-line-height: ${px(blockSmall.line)} !important;`,
				`  --dsw-font-markdown-code: ${font(inline)} !important;`,
				`  --dsw-font-markdown-code-font-size: ${px(inline.size)} !important;`,
				`  --dsw-font-markdown-code-line-height: ${px(inline.line)} !important;`,
				"}",
				"/* 终端类代码块的行高硬编码在 .xxx_terminalBody 上（特异性高于 body），",
				"   必须同级覆盖，否则字号变大而行高不变 → 行行重叠。 */",
				'body [class*="terminalBody"] {',
				`  --dsl-terminal-line-height: ${px(blockSmall.line)} !important;`,
				"}",
			].join("\n");
		}

		// ─────────────────────────── 2. 自动展开 ───────────────────────────

		/**
		 * 找一个节点上的折叠控件 —— 可能在节点自身，也可能在后代。
		 * @param node 可展开节点的根元素。
		 * @returns 带 aria-expanded="false" 的元素，找不到则 null。
		 */
		function collapsedControl(node) {
			if (node.getAttribute("aria-expanded") === "false") return node;
			return node.querySelector('[aria-expanded="false"]');
		}

		/**
		 * 按配置把当前未展开的过程节点点开。
		 * @param value 当前配置值。
		 * @returns 本次实际点开条数。
		 */
		function expandAll(value) {
			const wantReasoning = value.expandReasoning !== false;
			const wantTools = value.expandTools !== false;
			let opened = 0;
			for (const node of document.querySelectorAll(EXPANDABLE)) {
				const isReasoning = node.getAttribute("data-variant") === "think";
				if (isReasoning ? !wantReasoning : !wantTools) continue;
				const target = collapsedControl(node);
				if (target === null) continue;
				target.click();
				opened += 1;
			}
			return opened;
		}

		// ─────────────────────────── 3. 设置行样式 ───────────────────────────

		const STYLE = {
			header: { display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "6px" },
			title: {
				color: "var(--dsw-alias-label-primary)",
				fontSize: "15px",
				fontWeight: 600,
			},
			subtitle: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px" },
			group: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px", padding: "18px 0 4px" },
			row: {
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				gap: "16px",
				padding: "14px 0",
				borderTop: "1px solid var(--dsw-alias-border-l1)",
			},
			text: { display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 },
			rowTitle: { color: "var(--dsw-alias-label-primary)", fontSize: "13px" },
			desc: { color: "var(--dsw-alias-label-tertiary)", fontSize: "12px" },
			control: { display: "flex", alignItems: "center", gap: "10px", flex: "none" },
			range: { width: "160px", accentColor: "var(--dsw-alias-brand-primary)", cursor: "pointer" },
			select: {
				minWidth: "180px",
				color: "var(--dsw-alias-label-primary)",
				background: "var(--dsw-alias-bg-layer-2)",
				border: "1px solid var(--dsw-alias-border-l1)",
				borderRadius: "8px",
				padding: "6px 10px",
				fontSize: "13px",
				cursor: "pointer",
			},
			check: { width: "17px", height: "17px", accentColor: "var(--dsw-alias-brand-primary)", cursor: "pointer" },
			value: {
				minWidth: "52px",
				textAlign: "right",
				fontVariantNumeric: "tabular-nums",
				color: "var(--dsw-alias-label-primary)",
				fontSize: "13px",
			},
		};

		/** 一行的外壳：左文案 + 右控件。 */
		function rowShell(title, description, control) {
			return react.createElement(
				"div",
				{ style: STYLE.row },
				react.createElement(
					"div",
					{ style: STYLE.text },
					react.createElement("div", { style: STYLE.rowTitle }, title),
					react.createElement("div", { style: STYLE.desc }, description),
				),
				control,
			);
		}

		/** 开关行。 */
		function rowSwitch(title, description, checked, onChange) {
			return rowShell(
				title,
				description,
				react.createElement("input", {
					type: "checkbox",
					checked,
					style: STYLE.check,
					"aria-label": title,
					onChange: (event) => onChange(event.target.checked),
				}),
			);
		}

		/** 滑块行。 */
		function rowRange(title, description, value, min, max, step, onChange) {
			return rowShell(
				title,
				description,
				react.createElement(
					"div",
					{ style: STYLE.control },
					react.createElement("input", {
						type: "range",
						min,
						max,
						step,
						value,
						style: STYLE.range,
						"aria-label": title,
						onChange: (event) => onChange(Number(event.target.value)),
					}),
					react.createElement("span", { style: STYLE.value }, `${value.toFixed(1)}\u00d7`),
				),
			);
		}

		/** 下拉选择行。 */
		function rowSelect(title, description, value, options, onChange) {
			return rowShell(
				title,
				description,
				react.createElement(
					"select",
					{
						value,
						style: STYLE.select,
						"aria-label": title,
						onChange: (event) => onChange(event.target.value),
					},
					options.map((option) => react.createElement(
						"option",
						{ key: option.value, value: option.value },
						option.label,
					)),
				),
			);
		}

		/**
		 * 「输出设置」分区整页。owner 只传 close，其余全部自理。
		 */
		function OutputSettingsSection() {
			const form = outputForm;
			const t = outputT;
			const read = () => (form ? form.getSnapshot()?.value ?? {} : {});
			const [value, setValue] = react.useState(read);
			// 语言切换时重渲染（文案全部来自 locale 字典）。
			const [, setLocaleTick] = react.useState(0);
			react.useEffect(() => {
				if (!outputLocale) return undefined;
				return outputLocale.subscribe(() => setLocaleTick((n) => n + 1));
			}, []);
			react.useEffect(() => {
				if (!form) return undefined;
				const sync = () => setValue(read());
				const unsubscribe = form.subscribe(sync);
				sync();
				return unsubscribe;
			}, []);

			const bool = (key) => (typeof value[key] === "boolean" ? value[key] : DEFAULTS[key]);
			const num = (key) => (typeof value[key] === "number" && Number.isFinite(value[key]) ? value[key] : DEFAULTS[key]);
			const str = (key, fallback) => (typeof value[key] === "string" && value[key] !== "" ? value[key] : fallback);
			const write = (key, next) => {
				if (form) form.set(key, next).catch(() => {});
			};

			return react.createElement(
				"div",
				null,
				react.createElement(
					"div",
					{ style: STYLE.header },
					react.createElement("div", { style: STYLE.title }, t("title")),
					react.createElement("div", { style: STYLE.subtitle }, t("subtitle")),
				),
				react.createElement("div", { style: STYLE.group }, t("groupProcess")),
				rowSwitch(
					t("expandReasoning"),
					t("expandReasoningDesc"),
					bool("expandReasoning"), (next) => write("expandReasoning", next),
				),
				rowSwitch(
					t("expandTools"),
					t("expandToolsDesc"),
					bool("expandTools"), (next) => write("expandTools", next),
				),
				react.createElement("div", { style: STYLE.group }, t("groupCode")),
				rowRange(
					t("codeScale"),
					t("codeScaleDesc"),
					num("codeScale"), 1, 3, 0.1, (next) => write("codeScale", next),
				),
				rowRange(
					t("codeLineHeight"),
					t("codeLineHeightDesc"),
					num("codeLineHeightRatio"), 1, 2.5, 0.1, (next) => write("codeLineHeightRatio", next),
				),
				react.createElement("div", { style: STYLE.group }, t("groupLanguage")),
				rowSelect(
					t("outputLanguage"),
					t("outputLanguageDesc"),
					str("outputLanguage", "auto"),
					[
						{ value: "auto", label: t("langAuto") },
						{ value: "zh", label: t("langZh") },
						{ value: "en", label: t("langEn") },
					],
					(next) => write("outputLanguage", next),
				),
			);
		}

		const name = "dsh-output-setting";
		/** configForms 读写配置；slots 注册配置界面；locale 提供中英文案。 */
		const inject = ["configForms", "slots", "locale"];

		/**
		 * 注入字号样式、按配置观察并展开节点，并注册「输出设置」分区。
		 * @param ctx 客户端插件上下文。
		 */
		function apply(ctx) {
			const form = ctx.configForms.get(NAMESPACE);
			outputForm = form;
			outputLocale = ctx.locale;
			outputT = ctx.locale.bind(NAMESPACE);

			// 0) 文案字典：zh + en，由 locale 服务按当前语言选择（非中文系统自动全英文）。
			ctx.effect(() => ctx.locale.register(NAMESPACE, MESSAGES), "dsh-output-setting: 文案字典");

			// 0.5) 把当前生效的界面语言回写给宿主：auto 模式要靠它决定系统提示用哪种语言。
			//      宿主半拿不到浏览器语言（locale 的 host 半只存显式偏好），只能由这里推。
			ctx.effect(() => {
				const push = () => {
					const active = ctx.locale.getLocale()?.active ?? "";
					if (active !== "") form.set("effectiveLocale", active).catch(() => {});
				};
				const unsubscribe = ctx.locale.subscribe(push);
				push();
				return unsubscribe;
			}, "dsh-output-setting: 回写生效语言");

			// 1) 代码字号样式：配置一改立刻重写。
			ctx.effect(() => {
				const style = document.createElement("style");
				style.setAttribute("data-plugin-css", name);
				const render = () => {
					const value = form.getSnapshot()?.value ?? {};
					const scale = typeof value.codeScale === "number" ? value.codeScale : DEFAULTS.codeScale;
					const ratio = typeof value.codeLineHeightRatio === "number" ? value.codeLineHeightRatio : DEFAULTS.codeLineHeightRatio;
					style.textContent = buildCss(scale, ratio);
				};
				document.head.appendChild(style);
				const unsubscribe = form.subscribe(render);
				render();
				return () => {
					unsubscribe();
					style.remove();
				};
			}, "dsh-output-setting: 代码块字号");

			// 2) 自动展开：观察 DOM + 低频轮询兜底。
			ctx.effect(() => {
				let scheduled = false;
				const sweep = () => {
					const value = form.getSnapshot()?.value ?? {};
					expandAll(value);
				};
				const schedule = () => {
					if (scheduled) return;
					scheduled = true;
					requestAnimationFrame(() => {
						scheduled = false;
						sweep();
					});
				};
				const observer = new MutationObserver(schedule);
				observer.observe(document.body, {
					childList: true,
					subtree: true,
					attributes: true,
					attributeFilter: ["aria-expanded", "data-expanded", "data-expandable"],
				});
				const timer = setInterval(sweep, 400);
				schedule();
				return () => {
					observer.disconnect();
					clearInterval(timer);
				};
			}, "dsh-output-setting: 自动展开过程节点");

			// 3) 配置界面：挂在**本 bundle 的插件详情页**里。
			//    `plugins.bundle.config` 是 keyed slot，key = bundle 的 package name，
			//    渲染位置在该页「描述」与「包含的组件」之间（仅 view: 'page'）。
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "dsh-output-setting",
			}, OutputSettingsSection));
		}

		module.exports = { name, inject, apply };
		return module.exports;
	},
});
