@echo off
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
echo [BILGI] Cargo PATH gecici olarak eklendi.
echo [BILGI] Tauri gelistirici modunda baslatiliyor...
npm run tauri dev
