@echo off
chcp 65001 >nul
REM ============================================================
REM  Focus Flow 2.4.0「流体玻璃版」— Windows 一键构建脚本
REM  前置要求（只需一次）：
REM   1. Node.js 20+   https://nodejs.org
REM   2. Rust stable   https://rustup.rs
REM   3. VS Build Tools (勾选“使用 C++ 的桌面开发”/MSVC)  https://visualstudio.microsoft.com/zh-hans/downloads/
REM   4. WebView2 运行时（Win11 自带；Win10 需安装）
REM  产物输出：src-tauri\target\release\bundle\nsis\FocusFlow_2.4.0_x64-setup.exe
REM ============================================================
setlocal
cd /d "%~dp0"

echo [1/4] 安装前端依赖 ...
call npm install --no-audit --no-fund
if errorlevel 1 goto :err

echo [2/4] 构建前端（tsc 类型检查 + vite 打包）...
call npm run build
if errorlevel 1 goto :err

echo [3/4] 构建 Tauri Windows 安装包（NSIS .exe，约需 5-15 分钟，首次编译较久）...
call npx tauri build
if errorlevel 1 goto :err

echo [4/4] 构建完成！
echo.
echo   安装包位置：src-tauri\target\release\bundle\nsis\
echo   双击运行即可安装。若杀毒软件误报，添加信任即可（Tauri 自带签名可选）。
pause
exit /b 0

:err
echo.
echo [构建失败] 请查看上方报错信息。
echo 常见原因：未安装 Rust / Node / VS Build Tools，或网络原因拉取 crate 失败。
pause
exit /b 1
