# GKÇ İstemci Modernizasyon Projesi - Gemini CLI Talimatları

## Proje Bağlamı
Bu proje, Java/JavaFX tabanlı bir Güç Kalitesi Çözümleyici (GKÇ) dinamik izleme istemcisinin
Tauri v2 ile modern, portable bir masaüstü uygulaması olarak yeniden yazılmasını kapsamaktadır.

## Teknik Detaylar
- Mevcut uygulama: MGKP_DINAMIK_IZLEME.exe (Java 8, JavaFX, Jar2Exe paketli)
- Sunucu: 212.174.153.18:8080 (HTTP/REST, XML yanıtlar)
- Veri kanalları: RMS (frekans, güç, gerilim, akım), PMU (fazör), PMUX
- Konfigürasyon: XStream XML formatında app.properties
- Tek-hat şeması: SVG tabanlı elektrik diyagramı (5.xml)

## Hedef Teknoloji Yığını
- Backend: Rust + Tauri v2
- Frontend: React + TypeScript + Vite
- Grafik: Apache ECharts
- Tek-Hat: SVG + D3.js
- HTTP: reqwest (Rust async)
- State: Zustand

## Çalışma Kuralları
- Tüm kod yorumları ve dokümantasyon Türkçe olmalı
- API endpoint'leri henüz keşfedilmemiştir, esnek yapıda olmalı
- Veri modelleri app.properties'deki alan adlarıyla uyumlu olmalı
- Performans kritiktir: 3 saniyede bir veri polling yapılacak
