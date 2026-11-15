@echo off
chcp 65001 >nul
title 1151115 聰賢老師 · AI 歷史劇創作 × Google Flow 旗艦實戰平台
echo ========================================================
echo   1151115 聰賢老師 ｜ AI 歷史劇創作 × Google Flow
echo   旗艦成果展示平台與離線互動教學系統
echo ========================================================
echo.
echo 正在啟動本機伺服器：http://localhost:8088 ...
echo 瀏覽器將自動開啟展示首頁，若要停止伺服器請按 Ctrl+C。
echo.

start "" "http://localhost:8088/index.html"
python -m http.server 8088
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Python 伺服器啟動異常，嘗試開啟預設瀏覽器直接檢視...
    start "" "index.html"
    pause
)
