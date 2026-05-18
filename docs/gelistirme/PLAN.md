# Salınım Algılayıcı UI/UX İyileştirme Planı

## Summary
Rapor bulguları kod üzerinde büyük ölçüde doğrulandı: `OscillationFilterBar` tek satırlı yaklaşık 1456px minimum grid ile butonları dar ekranlarda taşıyor; eşik alanları ve bant listesi sıkışıyor; boş grafik durumları düz metin; tarayıcı modunda gerçek veri çağrısı Tauri IPC’ye guardsız gidiyor. Mevcut ECharts `group` bağlantısı ise zaten var, korunup görsel QA ile doğrulanacak.

## Key Changes
- Filtre bar iki katmanlı responsive düzene alınacak: üst satır seçim/PMU/referans/zaman, alt satır pencere-adım/eşikler/sinyaller/eylemler. `OscillationFilterBar.tsx` inline 8 kolon grid’den çıkarılıp `index.css` içinde `oscillation-*` sınıfları ve 1100px/760px breakpoint’leriyle yönetilecek.
- Eşikler her biri label + input dikey alanı olan responsive mini grid’e taşınacak; aksiyon butonları her çözünürlükte görünür kalacak. Bantlar düz metin yerine dört badge olarak gösterilecek: mod, ad, Hz aralığı, aktif/pasif durumu.
- Store’a `dataSourceMode: 'none' | 'ytbs' | 'demo'` ve `loadDemoData()` eklenecek. Demo veri büyük `gkc1.txt` dosyasını bundle’a almadan deterministik 10 Hz sentetik PMU örnekleri üretecek; Local/Interarea/Forced/Torsion senaryolarını grafiklerde gösterecek.
- `fetchPmuData()` Tauri dışı browser modunda `isTauri()` guard kullanacak; `invoke` çağrısına düşmeyip kullanıcıya “Tauri masaüstü ortamı gerekir, demo veri yükleyin” mesajı verecek.
- Boş durumlar için ortak `OscillationEmptyState` bileşeni eklenecek. Ham Veri, Mod + DR, Enerji + Genlik ve detay panelleri aynı profesyonel boş durum düzenini kullanacak; uygun yerlerde “Demo Verisi Yükle” ve “Analizi Çalıştır” aksiyonları gösterilecek.
- Grafiklerde mevcut `echarts.connect` yapısı korunacak; tooltipler sinyal birimlerini açık gösterecek, legend scroll alanları dar ekranlara göre ayarlanacak, metric grafiklerinde dataZoom başlangıcı tutarlı hesaplanacak.
- Eski kalıntı olarak `selectedBands` query alanı ve `getEnabledBands(selectedBandIds)` seçilebilir bant iması kaldırılacak; sabit 4 bant modeli yalnızca legend/badge olarak kalacak.

## Interfaces
- `OscillationStoreState` eklentileri:
  - `dataSourceMode: 'none' | 'ytbs' | 'demo'`
  - `loadDemoData: () => void`
- Yeni yardımcı:
  - `utils/demoSamples.ts`: `buildOscillationDemoSamples(pmuDevices, startMs, seconds, samplingRateHz): Record<string, PmuSample[]>`
- Chart props genişletilecek:
  - raw/metric chart bileşenleri boş durum aksiyonları için `onLoadDemo`, `onRunAnalysis`, `hasSamples` gibi minimum callback’leri alacak.
- Kullanıcı metinleri “Gerçek YTBS PMU verisi” sabitinden “YTBS PMU / Demo PMU” kaynak durumuna göre dinamikleşecek.

## Test Plan
- `scripts/oscillation.test.ts` içine demo veri testi eklenecek: demo samples 10 Hz, çoklu PMU, tüm sinyaller ve analiz edilebilir `windowMetrics` üretmeli.
- `npm run test:oscillation`
- `npm run build`
- Browser/DevTools QA:
  - 1366x768, 1536x864, 1920x1080 ve yaklaşık 390px mobil viewport.
  - Salınım Algılayıcı sekmesinde `Veriyi Getir`, `Analizi Çalıştır`, `Demo Verisi Yükle`, `Rapor Oluştur`, `CSV Dışa Aktar` görünür ve taşmasız olmalı.
  - Tauri dışı browser modunda `Veriyi Getir` console crash üretmemeli; demo yükleme sonrası grafikler dolmalı.
  - Raw Data, Mod + DR, Enerji + Genlik dataZoom senkron çalışmalı.
  - Console’da ilgili React/ECharts runtime error olmamalı.

## Assumptions
- Mevcut salınım matematiği ve worker davranışı değiştirilmeyecek; bu çalışma UI/UX, demo/runtime guard ve eski UI kalıntı temizliğiyle sınırlı.
- Büyük `ytbs_gkc/gkcpmu/gkc1.txt` uygulama bundle’ına eklenmeyecek; test fixture olarak kalacak.
- Çalışma ağacındaki YTBS login düzeltmesi dosyalarına dokunulmayacak; yalnızca `src/features/oscillation` ve gerekirse `src/index.css`/test scriptleri değiştirilecek.
