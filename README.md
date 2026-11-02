# Family Finance Review

家庭财务盘点：几分钟更新一次家庭资产负债表，看清净资产、资产结构和收入中断后的抗风险能力。

当前是交互原型，数据只保存在浏览器本地。

```bash
pnpm install
pnpm dev
pnpm test
```

- 技术栈：React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- `src/engine`：确定性计算引擎，不依赖界面，也不联网
- `src/screens`、`src/components`：页面和组件
- `pnpm fx:update`：更新 `public/fx.json` 中的汇率

本工具只做情景推演，不构成投资、法律或房产交易建议。默认参数是产品假设，尚未用真实数据校准。
