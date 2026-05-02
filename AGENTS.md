<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

Use the `/trellis:start` command when starting a new session to:
- Initialize your developer identity
- Understand current project context
- Read relevant guidelines

Use `@/.trellis/` to learn:
- Development workflow (`workflow.md`)
- Project structure guidelines (`spec/`)
- Developer workspace (`workspace/`)

If you're using Codex, project-scoped helpers may also live in:
- `.agents/skills/` for reusable Trellis skills
- `.codex/agents/` for optional custom subagents

## Git Push 注意事项

GitHub HTTPS 连接不稳定，push 时必须使用以下参数：

```bash
git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 push origin main
```

不要用默认的 `git push`，会因超时失败。

## 每次改动完成后的流程

1. 改版本号（`package.json` + `plugin.json`）
2. `npm run build` 确认通过
3. `git add` + `git commit`
4. `git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=30 push origin main`
5. 执行 `/trellis:finish-work` 清单
6. 执行 `record-session`

Keep this managed block so 'trellis update' can refresh the instructions.

<!-- TRELLIS:END -->
