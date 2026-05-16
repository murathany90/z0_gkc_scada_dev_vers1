# Codex CLI Talimatları - GKÇ Tauri Projesi

## Bağlam
Güç Kalitesi Çözümleyici istemcisinin Tauri v2 ile yeniden yazımı.
Mevcut Java uygulaması reverse-engineer edilerek API endpoint'leri keşfedilecek.

## Teknoloji
- Rust (Tauri backend), React/TypeScript (frontend)
- reqwest (HTTP), quick-xml (XML parse), ECharts (grafik)
- Zustand (state), D3.js (tek-hat şeması SVG)

## Kurallar
- Türkçe yorumlar ve dokümantasyon
- async/await pattern kullan
- Tauri v2 IPC (invoke/emit) kullan
- Tüm veri modelleri serde derive ile
