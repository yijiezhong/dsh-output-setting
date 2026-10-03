Adds one entry: `data/plugins/yijiezhong__dsh-output-setting.yml`

### The plugin

**Repo**: https://github.com/yijiezhong/dsh-output-setting
**Category**: `usage`

A single settings page (Plugins → dsh-output-setting) for how DSH renders output:

- **Auto-expand reasoning** — new reasoning blocks show their full content instead of a one-line summary
- **Auto-expand tool calls** — command and other tool cards show their input and output directly
- **Code font size / line spacing** — live sliders for code blocks and inline code
- **Model output language** — follow the DSH UI language automatically, or force Chinese / English
  (written into the *system prompt*, so it constrains the hidden reasoning channel too —
  `AGENTS.md` only arrives as a user message and cannot reach it)

### Manifest

Both halves are declared, so it installs via `dsh plugin add`:

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "platform": "web" }
}
```

### Verification

Installed and exercised on **DSH Desktop 0.2.0-rc.2** while linked as a local bundle:

- `listConfigs` reports `status: "schema"` with all six fields declared `volatile`
- every setting applies **live** — verified by editing the profile config directly and
  observing the UI change within seconds, without a page refresh or restart
- `npm pack` ships exactly the 9 whitelisted files (sources, both READMEs, LICENSE, and two screenshots); `npm publish --dry-run` passes

See the repo's README for the settings table and the configuration-page screenshots
(installed via `dsh plugin add`, then **Plugins → dsh-output-setting**).
