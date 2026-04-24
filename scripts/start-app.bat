@echo off
echo Starting Workshop Order Tracker...

cd /d %~dp0\..

if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo Starting application...
npm run dev

pause
