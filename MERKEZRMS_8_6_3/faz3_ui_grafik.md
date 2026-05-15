# Faz 3: UI Geliştirme ve Grafik Sistemi

> **Süre:** 2 hafta | **Durum:** ⏳ Bekliyor  
> **Hedef:** ECharts ile canlı zaman serisi grafikleri, tek-hat şeması SVG rendering, konfigürasyon paneli.

---

## Görev Listesi

- [ ] RMS grafik bileşeni (frekans, güç, gerilim, akım)
- [ ] PMU grafik bileşeni (fazör, frekans farkı)
- [ ] PMUX grafik bileşeni (faz bazlı güç)
- [ ] Tek-hat şeması SVG rendering (5.xml → SVG)
- [ ] Dashboard layout (çoklu grafik panelleri)
- [ ] Konfigürasyon paneli (kanal seçimi, renk ayarları)
- [ ] Login sayfası
- [ ] Dark/Light tema desteği
- [ ] Responsive layout

---

## 1. Grafik Sistemi (ECharts)

### 1.1. RMS Zaman Serisi Grafiği

```typescript
// RmsChart.tsx
// - X ekseni: zaman (son 3600 saniye = 1 saat)
// - Y ekseni: değer (otomatik ölçekleme)
// - Seriler: frekans, aktif güç, reaktif güç, gerilim (renkler konfigürasyondan)
// - Canlı güncelleme: her 3 saniyede yeni veri noktası
// - Performans: dataZoom, sampling, large mode
```

### 1.2. PMU Fazör Diyagramı

```typescript
// PmuChart.tsx
// - Polar koordinat sistemi (fazör gösterimi)
// - Gerilim ve akım fazörleri
// - Frekans karşılaştırma grafiği
// - Zaman penceresi: son 300 saniye
```

## 2. Tek-Hat Şeması (SVG + D3.js)

### 2.1. XML → SVG Dönüşüm Motoru

```typescript
// SingleLineDiagram.tsx
// 5.xml'den eleman türlerine göre SVG şekilleri:
// - Bara: kalın yatay çizgi
// - Kesici: daire (On=dolu/Off=boş)
// - Anahtar: açılır/kapanır sembol
// - Trafo: iç içe daireler
// - Toprak: topraklama sembolü
// - Birleştirici: bağlantı noktası
// - DataLabel: metin etiketi
// - Ok: yön oku
//
// Renk kodlama: RED=enerjili, GREEN=enerjisiz
// Etkileşim: hover, click (detay bilgi popup)
// Zoom/Pan: D3.js zoom behavior
```

## 3. Dashboard Layout

```
┌────────────────────────────────────────────────┐
│ Toolbar: [Bağlantı ●] [Ayarlar ⚙] [Dil 🌐]   │
├────────┬───────────────────────────────────────┤
│        │ ┌─────────────┐ ┌─────────────────┐  │
│ Menü   │ │ RMS Grafik  │ │ PMU Grafik      │  │
│        │ │ (Frekans)   │ │ (Fazör)         │  │
│ [RMS]  │ └─────────────┘ └─────────────────┘  │
│ [PMU]  │ ┌─────────────┐ ┌─────────────────┐  │
│ [PMUX] │ │ Güç Grafik  │ │ Gerilim Grafik  │  │
│ [T-Hat]│ │             │ │                 │  │
│ [Ayar] │ └─────────────┘ └─────────────────┘  │
│        │ ┌──────────────────────────────────┐  │
│        │ │ Tek-Hat Şeması (tam genişlik)    │  │
│        │ └──────────────────────────────────┘  │
└────────┴───────────────────────────────────────┘
```

## 4. Doğrulama Kriterleri

- [ ] Canlı RMS grafiği çalışır (mock data ile)
- [ ] Tek-hat şeması 5.xml'den doğru render edilir
- [ ] Kanal seçimi değiştiğinde grafikler güncellenir
- [ ] Dark tema tüm bileşenlerde tutarlı

---

> 📌 Grafik performansı kritiktir. 10.000+ veri noktasında akıcı çalışmalıdır.
