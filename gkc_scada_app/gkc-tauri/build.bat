@echo off
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
echo [BILGI] Cargo PATH gecici olarak eklendi.
echo [BILGI] Tauri uygulamasi derleniyor... Lutfen bekleyin.
npm run build:portable
