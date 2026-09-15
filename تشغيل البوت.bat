@echo off
chcp 65001 >nul
title بوت أرقام التفعيل الشخصي - Hero-SMS Bot
cd /d "%~dp0"
echo ===================================================================
echo   🤖 بوت أرقام التفعيل الشخصي (Hero-SMS Direct Bot)
echo   جارٍ تشغيل البوت والاتصال المباشر بـ Telegram و Hero-SMS...
echo ===================================================================
python telegram_bot.py
pause
