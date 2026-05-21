# Salınım Algılama Sayfası Kod İnceleme ve Geliştirme Raporu

Bu rapor, `gkc_scada_app/gkc-tauri/src/features/oscillation` modülündeki salınım algılama akışını kod üzerinden açıklar ve rapora eklenen kullanıcı notlarına göre yapılan düzeltmeleri özetler. İnceleme; `oscillationMetrics.ts`, `signalProcessing.ts`, `coherence.ts`, `visualization.ts`, grafik bileşenleri, store, rapor üretimi ve testler üzerinden yapılmıştır.

## 1. Güncel Veri Akışı

Salınım algılama sayfası PMU verisini şu sırayla işler:

1. **YTBS PMU verisi alınır.** Sorgu `fetchSequentialPmuRawData` ile zaman parçalarına bölünür. Backend tarafında YTBS cevabındaki `grafik_verisi_json` blokları okunur ve aynı zaman damgasındaki alanlar birleştirilir.
2. **Ham satırlar `PmuSample` nesnesine çevrilir.** `rawYtbsRowsToPmuSamples`, frekansı `y1`, gerilimi `y2-y4` ortalaması, aktif gücü `y14`, reaktif gücü `y15`, görünür gücü `y16` alanından üretir.
3. **Seçili sinyaller analiz edilir.** Filtre barına eklenen `Tümü`, `F`, `P`, `Q`, `V` seçimleri `selectedSignals` state'ini kullanır. Varsayılan davranış tüm sinyalleri analiz etmektir. Kullanıcı seçimi değiştirince mevcut analiz temizlenir; aktif sekme seçili sinyaller dışında kalırsa ilk seçili sinyale düşer.
4. **Tam aralık ve kayan pencere metrikleri üretilir.** Ana hesap `calculateOscillationAnalysis` içindedir. YTBS PMU verisi için 10 Hz örnekleme varsayımı korunmuştur.
5. **Grafikler ve karar destek metni üretilir.** Grafik 1 ham/filtrelenmiş sinyali, Grafik 2 mod + DR bilgisini, Grafik 3 genlik + RMS/enerji göstergesini çizer. Özet, olay listesi, detay ekranı ve rapor `reportBuilder.ts` üzerinden beslenir.

## 2. Ölçüm Birimleri ve Salınım Tespiti

Analiz edilen sinyaller şunlardır:

```ts
type PmuSignalKey = 'frequency' | 'voltage' | 'activePower' | 'reactivePower'
```

### Frekans

- Kaynak alan: `y1`
- Birim: Hz
- Eşik: sabit mHz eşiği, varsayılan `10 mHz`
- Kod karşılığı: `thresholds.frequencyMhz / 1000`
- `p.u.` gösterimde değer 50 Hz nominal değere bölünür.

Pencere içindeki frekans değerleri önce doğrusal trendden arındırılır. Spektrumda aktif bantlar aranır. Baskın genlik 0.010 Hz eşiğini aşarsa salınım adayı üretilir.

### Gerilim

- Kaynak alanlar: `y2`, `y3`, `y4`
- Kullanılan değer: üç faz gerilim büyüklüğü ortalaması
- Birim: kV
- Eşik: pencere ortalamasının yüzdesi, varsayılan `%5`
- `p.u.` gösterimde nominal gerilim değerine bölünür; 380/400 kV cihazlar 400 kV kabul edilir.

Gerilimde algoritma frekansla aynı spektral akışı kullanır; fark, eşik hesabının mutlak mHz yerine pencere ortalamasının yüzdesi olmasıdır.

### Aktif Güç

- Kaynak alan: `y14`
- Birim: MW
- Eşik: `max(abs(windowMean) * activePowerPercent / 100, 10 MW)`
- Varsayılan yüzde: `%5`

Bu düzeltme uygulandı. Ortalama güç sıfıra yakın olduğunda eşik artık sıfıra düşmüyor; minimum mutlak eşik 10 MW.

### Reaktif Güç

- Kaynak alan: `y15`
- Birim: MVAr
- Eşik: `max(abs(windowMean) * reactivePowerPercent / 100, 5 MVAr)`
- Varsayılan yüzde: `%5`

Bu düzeltme uygulandı. Ortalama MVAr sıfıra yakın olduğunda minimum mutlak eşik 5 MVAr.

## 3. Mod Belirleme

Modlar `bands.ts` içinde sabittir:

| Mod | Bant | Frekans aralığı | Kod etiketi | Not |
| --- | --- | --- | --- | --- |
| 0 | Yok | - | `MOD_YOK` | Eşik üstü salınım yok |
| 1 | Interarea | 0.1-0.4 Hz | `INTERAREA` | Bölgeler arası aday |
| 2 | Local | 0.4-2.0 Hz | `LOCAL` | Yerel elektromekanik aday |
| 3 | Forced | 2.0-4.5 Hz | `FORCED` | Zorlanmış/kontrol kaynaklı aday |
| 4 | Torsiyon pasif | 4.5-5.0 Hz | `TORSION_PASSIVE` | Pasif diagnostik |

Kayan pencere karar mantığı:

1. Her aktif bant için `estimatePeakAmplitude` çalışır.
2. Tepe genliği eşik değerine oranlanır.
3. Eşiği aşan en güçlü aday seçilir.
4. Aktif aday yoksa torsiyon pasif bandı ayrıca kontrol edilir.
5. O da yoksa mod `0` olur.

Kullanıcı notu doğrultusunda torsiyon davranışı değiştirilmedi; Mod 4 hâlâ pasif diagnostik olarak korunuyor.

## 4. Genlik Hesabı

Genlik hesabı `estimatePeakAmplitude` içindedir:

1. Sayısal olmayan değerler atılır.
2. Sinyal `linearDetrend` ile trendden arındırılır.
3. Hann pencereli spektrum oluşturulur.
4. İlgili banttaki en yüksek spektral güç noktası baskın frekans kabul edilir.
5. Baskın frekansta kompleks katsayı yeniden hesaplanır.
6. Genlik yaklaşık `2 * magnitude / windowSum` olarak bulunur.

Bu değer tek taraflı sinüs genliği gibi yorumlanır; tepe-tepe genlik değildir.

## 5. Enerji / RMS Davranışı

Kodda iki farklı büyüklük var:

1. **Tam aralık spektral enerji:** `spectralEnergy`, ilgili bant içindeki spektrum güçlerinin toplamıdır.
2. **Kayan pencere Grafik 3 enerji çizgisi:** `energyRms: rms(detrended)` olarak hesaplanır.

Kullanıcı notu gereği bu davranış değiştirilmedi. Grafik 3 hâlâ mevcut RMS/enerji davranışını koruyor. `bandRms` alanının tüm detrend edilmiş sinyal RMS'i olması da kapsam dışı bırakıldı.

## 6. Sönümleme Oranı (DR)

Sönümleme oranı `estimateDampingRatio` fonksiyonunda hesaplanır. Fonksiyon mutlak değer tepe araması yaptığı için tepe dizisi yarım periyot aralıklıdır. Eski kod bu yarım periyot yaklaşımına rağmen formülde `2π` kullanıyordu ve DR değerini yaklaşık yarıya düşürebiliyordu.

Uygulanan düzeltme:

- Tepe araması aynı kaldı: mutlak değer ve yaklaşık yarım periyot tepe mesafesi.
- Log decrement aynı kaldı: `log(first / last) / (peakCount - 1)`.
- Formül yarım periyotla uyumlu hale getirildi: `π` tabanı kullanılıyor.
- `%5` sönümlü sentetik sinüs testi eklendi ve yaklaşık `%5` değerini doğruluyor.

Yorum:

- DR pozitifse salınım küçülme/sönümlenme eğilimindedir.
- DR negatifse salınım büyüme eğilimindedir.
- Grafiklerde negatif DR kırmızı, pozitif DR yeşil gösterilir.

DR scatter legend'ının başlangıçta kapalı kalması kullanıcı notu gereği değiştirilmedi.

## 7. Örtüşen Pencere Renklendirmesi

Eski davranışta Grafik 1 renklendirmesi bir zaman damgasını kapsayan ilk pencereyi seçiyordu. Varsayılan 120 sn pencere / 30 sn adımda pencereler yoğun örtüştüğü için daha kritik negatif DR penceresi önceki pozitif pencere bitene kadar görünmeyebiliyordu.

Uygulanan düzeltme:

- Ortak pencere seçim helper'ı eklendi.
- Aynı zaman damgasını kapsayan pencerelerde öncelik sırası:
  1. Negatif DR
  2. Pozitif DR
  3. Mod var ama DR yok / yok
- Aynı öncelikte RMS/enerji ve pencere başlangıcı ile kararlı seçim yapılır.
- Grafik 1 filtreli çizgi renklendirmesi ve Grafik 2 mod alan gölgelemesi aynı helper davranışını kullanır.

Bu sayede filtreli değer renklendirmesi ile mod grafiği aynı olay aralığına hizalanır.

## 8. Koherens ve Mode Shape

Eski `buildCoherenceMatrix` hesabı Pearson korelasyon karesiydi. Bu, faz kaymış ama aynı dominant frekansta salınan PMU'ları düşük gösterebilir; ayrıca gerçek magnitude-squared coherence hesabı değildir.

Uygulanan düzeltme:

- Koherens matrisi dominant frekansta segmentli/Welch tarzı magnitude-squared coherence hesabına geçirildi.
- Segmentlerde Hann pencere kullanılıyor.
- Çapraz spektrum `Sxy`, öz spektrumlar `Sxx` ve `Syy` üzerinden `|Sxy|^2 / (Sxx * Syy)` hesaplanıyor.
- `modeShape.coherenceAverage` artık bu koherens matrisinden besleniyor.
- Fazı 90 derece kaymış aynı frekanstaki iki sentetik sinyalde koherens yüksek, ilişkisiz sinyalde düşük test edildi.

UI metinlerinde "koherens" ifadesi korunmuştur; artık korelasyon benzerliği değil, dominant frekansta gerçek magnitude-squared coherence yaklaşımıdır.

## 9. Karar Destek ve Ayrıntılar

Uygulanan iyileştirmeler:

- Karar destek cümleleri artık ölçüm adını açık yazar: Frekans, Gerilim, Aktif Güç, Reaktif Güç.
- Metinler kesin "tespit edilmiştir" dili yerine "salınım aday bulgusu üretilmiştir" diline çekildi.
- Olay satırlarına `Veriler / Ayrıntılar` aksiyonu eklendi.
- Ayrıntılar sekmesi seçili olay aralığındaki ham PMU satırlarını gösterir.
- Aynı sekmede hesaplama pencereleri gösterilir: pencere başlangıcı, pencere bitişi, süre, mod, dominant frekans, genlik, eşik, RMS/enerji ve DR.
- Tooltip'ler genişletildi: pencere başlangıç/bitiş, süre, merkez zamanı, dominant frekans, genlik, eşik, RMS/enerji ve DR bilgisi görünür.

## 10. Ekteki Görselin Güncel Yorumu

Ekteki ekran görüntüsünde Frekans sekmesi açık. Grafik 1'de frekans sinyalinde yaklaşık 09:31:30-09:32:45 aralığında yeşil ve kırmızı renklendirme görülüyor:

- Yeşil segmentler pozitif DR, yani sönümlenen salınım adayıdır.
- Kırmızı segmentler negatif DR, yani büyüme eğilimi olan salınım adayıdır.
- Grafik 2'de mod çizgisinin "Yok" seviyesinden "Interarea" seviyesine çıkması, frekans ölçümünde 0.1-0.4 Hz bandında aday salınım bulunduğunu gösterir.

Görseldeki önceki belirsizlikler için yapılanlar:

- Grafik 1 ve Grafik 2 zaman aralıkları ortak pencere/status helper'ı ile hizalandı.
- Örtüşen pencere durumunda kırmızı/negatif DR önceliklendirildi.
- Tooltip'e analiz penceresi, merkez zamanı, dominant frekans, genlik, eşik, RMS/enerji ve DR bilgileri eklendi.
- DR legend'ının kapalı başlaması kullanıcı isteğiyle korundu.

## 11. Uygulama Durumu

| Madde | Durum | Açıklama |
| --- | --- | --- |
| DR yarım periyot formülü | Uygulandı | Formül `π` tabanına çekildi; sentetik `%5` sönümlü sinüs testi eklendi. |
| Örtüşen pencere renklendirmesi | Uygulandı | Negatif DR > pozitif DR > yok önceliği eklendi. |
| Gap / 10 Hz veri kapısı | Kapsam dışı bırakıldı | Kullanıcı notu gereği YTBS verisinin 10 Hz olduğu kabul edildi. |
| Enerji/RMS adlandırması | Kapsam dışı bırakıldı | Kullanıcı notu gereği mevcut RMS/enerji davranışı korundu. |
| `bandRms` bant RMS davranışı | Kapsam dışı bırakıldı | Kullanıcı notu gereği değiştirilmedi. |
| MW minimum eşik | Uygulandı | Minimum 10 MW. |
| MVAr minimum eşik | Uygulandı | Minimum 5 MVAr. |
| DR legend varsayılan kapalı | Kapsam dışı bırakıldı | Kullanıcı notu gereği mevcut davranış korundu. |
| Sinyal seçimi | Uygulandı | `Tümü`, `F`, `P`, `Q`, `V` kontrolü eklendi; sekmeler seçili sinyallere göre gösteriliyor. |
| Koherens | Uygulandı | Pearson² yerine dominant frekansta magnitude-squared coherence hesabı kullanılıyor. |
| Torsiyon pasif davranışı | Kapsam dışı bırakıldı | Kullanıcı notu gereği değiştirilmedi. |
| Karar destek / ayrıntılar | Uygulandı | Ölçüm adı, aday dili, ham veri ve pencere hesapları eklendi. |
| Bundle uyarısı | Kısmen uygulandı | Salınım ve eğitim sayfaları lazy-load edildi; ECharts vendor chunk'a ayrıldı. Vite büyük chunk uyarısı hâlâ devam ediyor. |

## 12. Test ve Derleme Durumu

Çalıştırılan doğrulamalar:

```bash
npm run test:oscillation
npm run test:ytbs-pmu
npm run build
```

Sonuç:

- `npm run test:oscillation` geçti.
- `npm run test:ytbs-pmu` geçti.
- `npm run build` geçti.
- Build çıktısında salınım sayfası ayrı chunk olarak üretildi: `OscillationPage` yaklaşık 51 kB minified.
- Eğitim sayfası ayrı chunk olarak üretildi: `OscillationTrainingPage` yaklaşık 123 kB minified.
- `vendor-echarts` yaklaşık 1.15 MB, ana `index` yaklaşık 3.50 MB minified kaldığı için Vite'ın 500 kB büyük chunk uyarısı devam ediyor. Bu kalan uyarı salınım sayfasının lazy-load edilmesine rağmen ana uygulamadaki genel ECharts ve büyük uygulama kodu nedeniyle sürüyor.

## 13. Kalan Riskler ve Öneriler

1. **Ana bundle hâlâ büyük.** Salınım/eğitim ekranları ayrıldı, ancak ana uygulama hâlâ büyük. Sonraki adımda YTBS grafik ekranları, SCADA raporları ve ağır statik veri/listeler route bazlı bölünebilir.
2. **10 Hz varsayımı korunuyor.** Kullanıcı notu gereği değiştirilmedi. İleride YTBS dışında kaynak eklenirse zaman damgası tabanlı efektif örnekleme ve resampling gerekebilir.
3. **Enerji/RMS terminolojisi korunuyor.** Kullanıcı notu gereği değiştirilmedi. Yeni kullanıcılar için ekran içi açıklama veya rapor dipnotu faydalı olabilir.
4. **Torsiyon pasif diagnostik.** Davranış korunuyor. Bu bandın kesin modal tespit değil, Nyquist sınırına yakın pasif uyarı olduğu eğitim/yardım dokümanında açık kalmalı.

## 14. Kısa Sonuç

Salınım algılama akışı artık notlarda istenen ana düzeltmeleri içeriyor: DR hesabı yarım periyot yaklaşımıyla tutarlı, MW/MVAr eşikleri tabanlı, örtüşen pencere renklendirmesi kritik negatif DR'yi öne alıyor, koherens gerçek magnitude-squared coherence hesabına yükseltildi, karar destek dili ölçüm bazlı ve daha temkinli hale getirildi, ayrıntılar sekmesi ham veri ile hesaplama pencerelerini gösteriyor. Kullanıcının "çözme" dediği gap/10 Hz, enerji/RMS, DR legend ve torsiyon davranışları özellikle kapsam dışı bırakıldı.
