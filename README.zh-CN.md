# 家庭财务盘点

[English](README.md) | 简体中文

一个快速、私密的家庭资产负债盘点工具。每个季度或每年花几分钟，更新家里有什么、欠什么、收入和支出，就能看到净资产、和上次相比的变化，以及主要收入中断后，家里的积蓄还能撑几个月。

产品面向中国城市家庭设计，房产、房贷、公积金、人民币和美元资产并存都是常见情况。

> 当前是原型。所有数据只保存在你的浏览器本地，不上传，也不需要注册账号。

## 功能

- **资产负债表**：现金、投资、房产、受限资产（如公积金）、其他资产和负债。每类可以添加多个账户，也可以自定义条目。
- **现金流**：收入（工资、奖金、一次性补偿）和支出（房租、保险、订阅等），每一项有自己的频率，系统统一折算成每月金额。
- **安全垫**：按月模拟主要收入中断后，家里先用现金、再按下跌后的市值卖出投资，还能维持几个月。
- **净资产趋势**：历次盘点的净资产走势，以及环比（对比上次盘点）和同比（对比约一年前）的变化。
- **人民币和美元**：按每日汇率折算，每次保存的盘点都会记下当时用的汇率。
- **中英文、日夜主题与移动优先**：手机上录入和结果分成两页。

它不是记账软件，也不连接银行，而是一份每年更新几次的家庭财务快照。

## 在 Agent 里使用

`skills/family-finance-review/` 是一个 [Agent Skill](https://agentskills.io)，给已经在用 Claude Code、Codex 等 AI Agent 的人。Agent 负责看截图和账单、把盘点整理成 JSON，再调用附带的命令行工具（`scripts/ffr.mjs`，Node 20 以上，无依赖）。所有计算都由它完成，用的是和网页同一套引擎。你先在 HTML 预览里核对，在对话里确认后才会保存。

- 每次盘点存成一个 JSON 文件：`~/.family-finance-review/reviews/<日期>.json`。任何一次都能重新打开，也能做环比、同比。
- 结果页是单个 HTML 文件，离线可用，不上传任何数据。

安装方法：把这个文件夹复制或链接到 Agent 的 skills 目录，比如 `~/.claude/skills/family-finance-review`。流程见 [SKILL.md](skills/family-finance-review/SKILL.md)，数据格式见 [format.md](skills/family-finance-review/references/format.md)。

## 开始使用

需要 Node 20 以上版本和 pnpm（可通过 Corepack 启用）。

```bash
corepack enable
pnpm install
pnpm dev
```

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm test` | 运行计算引擎测试（Vitest） |
| `pnpm typecheck` | 类型检查 |
| `pnpm fx:update` | 更新 `public/fx.json` 中的美元兑人民币汇率 |
| `pnpm build:skill` | 重新打包 skill 的命令行工具和内嵌的结果页 |

## 目录结构

```text
src/
  engine/      纯函数、结果确定的计算：资产负债、现金流、安全垫模拟
  lib/         格式化、本地存储与数据迁移、主题、图标
  components/  盘点界面（各类卡片、结论、报告、趋势图）和用到的 shadcn 组件
  screens/     盘点页（录入与结果）和只读示例页
  report/      skill 命令行工具生成的独立结果页
  cli/         skill 的命令行工具（打包为 skills/family-finance-review/scripts/ffr.mjs）
  sample.ts    示例页使用的虚构家庭数据
```

计算引擎不依赖界面和网络，以后可以复用到其他端，比如小程序。

## 技术栈

React、Vite、TypeScript、Tailwind CSS v4、Radix（通过 shadcn/ui）、lucide 图标、Vitest。

## 声明

本工具只做情景推演，不构成投资、法律或房产交易建议。默认假设（如股市跌幅、收入中断后的生活支出等）是产品假设，尚未用真实数据校准。
