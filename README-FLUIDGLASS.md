# Focus Flow 2.4.0「流体玻璃版」改动说明

基于上游 [Lexiang-Xiong/Focus-Flow](https://github.com/Lexiang-Xiong/Focus-Flow) v2.3.3 定制改造。

## 新增功能

### 1. 流体玻璃 UI（基于 fluidglass-ui 技能）
- 全窗口 WebGL 流体玻璃背景：复用 fluidglass-ui 的 canonical fragment shader（FBM + domain warp + plumes + 鼠标扰动），透明度预算 / 材质分层 / 默认 Cyan 配色与技能内核保持一致。
- 主界面外壳玻璃化：窗口、标题栏、顶部栏、左右主面板改为主题化玻璃底（半透明 + backdrop blur + 细颗粒噪点 + 边缘高光）。
- WebGL 不可用或上下文耗尽时自动降级为 CSS 流体渐变（canonical fallback）。

### 2. 粒子特效
- 背景层新增漂浮粒子（2D canvas，预渲染发光精灵，含闪烁、指针轻微扰动）。
- 粒子数量/透明度随质量档位与主题自适应；`prefers-reduced-motion`、页面隐藏时自动暂停，零依赖、不引外网资源。

### 3. 设置 → 外观（新增区块）
| 控件 | 说明 |
| --- | --- |
| 明暗主题 | 浅色 / 深色 一键切换，即时生效并持久化（重启保持） |
| 玻璃材质质量 | 自动 / 高清 / 均衡 / 节能（影响流体渲染清晰度与性能） |
| 粒子特效 | 开 / 关 |

### 4. 顺带修复
- `store/index.ts` 中 `mergeSettings` 的 `require('@/lib/language-utils')` 在生产构建（ESM）下会导致 store 水合失败、设置无法持久化。已改为静态 import。
- 主题启动防闪烁：`index.html` 内联脚本在 React 挂载前读取持久化主题。

## 涉及文件
```
index.html
package.json / src-tauri/tauri.conf.json / src-tauri/Cargo.toml   (版本 2.4.0)
src/App.tsx                    主题同步 effect
src/App.css                    玻璃外壳 / 背景层 / 粒子 / 浅色适配样式
src/types/index.ts             设置类型 + 默认值
src/store/index.ts             require 修复
src/store/slices/settingsSlice.ts
src/components/FloatWindow.tsx 背景层挂载
src/components/SettingsPanel.tsx 外观区块
src/components/ui/sonner.tsx   主题跟随设置
src/components/FluidGlassBackdrop.tsx  （新增）背景 + 粒子组件
src/lib/fluidGlassCore.ts      （新增）canonical 材质核心（shader 逐字节保留）
src/locales/zh.json / en.json  外观文案
.github/workflows/build.yml    main 推送也可触发 Windows 构建
```

## 构建 / 打包
- **GitHub Actions（推荐）**：推送到仓库 main 分支后自动测试并构建 Windows 安装包（NSIS .exe），产物在 Release。
- **本机 Windows**：双击 `build-windows.bat`（需 Node 20+ / Rust / VS Build Tools）。

## 验证
- `npm run build`（tsc + vite）：通过
- `npm test`：267 passed / 1 skipped（与上游一致）
- 深色 / 浅色两套界面均已在 Chromium 中截图验证（设置→外观→浅色 即时生效）

> 说明：本行用于触发 GitHub Actions CI（workflow 文件变更的 push 本身不触发运行）。

> 二次触发：确认 Actions 调度（配置已核验：on.push.branches.main + build-windows if main）。

> Actions 已启用，正式触发构建。
