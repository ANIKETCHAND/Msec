@echo off
title MediShield - Live Port Sharing
echo =========================================================================
echo MEDISHIELD IoMT DEFENSIVE PLATFORM - LIVE PORT SHARING
echo =========================================================================
echo.
echo 1. If your friend is on the SAME WI-FI / LOCAL NETWORK:
echo    Share this address: http://172.16.0.143:5173
echo.
echo 2. Starting Cloudflare Public HTTPS Tunnel for ANYWHERE on the internet:
echo =========================================================================
echo.
backend\tools\bin\cloudflared.exe tunnel --url http://localhost:5173
pause
