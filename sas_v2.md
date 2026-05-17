# Salınım Algılayıcı (Oscillation Detector) v2 - Kapsamlı Sistem Analizi ve Kod Mimarisi Raporu

## 1. Giriş ve Proje Bağlamı

GKÇ SCADA (Güç Kalitesi ve Çözümleyici SCADA) sistemi içerisindeki "Salınım Algılayıcı" (Oscillation Detector) modülü, Türkiye Elektrik İletim A.Ş. (TEİAŞ) veya benzeri operatörlerin güç sistemlerinden (YTBS üzerinden) saniyede 10 örnek (10 Hz) çözünürlükle alınan PMU (Fazör Ölçüm Birimi) verilerini inceleyerek elektromekanik salınımları (0.1 Hz - 4.5 Hz) tespit eden gelişmiş bir dijital sinyal işleme (DSP) uygulamasıdır. 

Bu modül, basit bir alarm sistemi üretmekten ziyade mühendislik analizi ve raporlama aracı olarak tasarlanmıştır. Güç sisteminde meydana gelebilecek küçük genlikli ancak uzun süreli salınımların (inter-area oscillations) grid (şebeke) stabilitesini tehdit etmesini önlemek adına, geniş alan (wide-area) bazında mod şekli (mode shape), genlik (amplitude) ve sönümleme (damping) metriklerini sunar.

Modern web mimarisine sahip bu yapı:
*   **Frontend**: React 19, TypeScript ve Vite ile hızlı ve tip güvenli bir yapı sunar.
*   **Durum (State) Yönetimi**: Zustand kütüphanesi kullanılarak, `oscillationStore.ts` dosyası üzerinden tüm UI ve arka plan işlemlerinin senkronizasyonu sağlanır.
*   **Grafikleştirme**: Apache ECharts kütüphanesi kullanılarak, on binlerce veri noktasına sahip zaman serisi grafiklerinde progressive rendering ve `dataZoom` bağlantısı ile performanslı çizim yapılır.
*   **Asenkron Hesaplama**: Ağır Hızlı Fourier Dönüşümü (FFT) ve doğrusal olmayan sinyal işleme algoritmalarının UI thread'ini (ana iş parçacığı) bloke etmemesi için `Web Worker` teknolojisi kullanılmıştır.
*   **Backend İletişimi**: Uygulama, Tauri ve Rust çekirdeği ile çalışmakta olup, IPC (Inter-Process Communication) mekanizması ile doğrudan işletim sistemi üzerinden YTBS sunucularına TCP/IP tabanlı sorgular gönderip almaktadır.

---

## 2. Modül Dosya Ağacı ve Dosya Görevleri

Sistemin kaynak kodları `src/features/oscillation/` dizini altında organize edilmiştir. Bu modüler mimari, kodun sürdürülebilirliğini ve test edilebilirliğini artırmayı amaçlamaktadır.

### 2.1. `types/` (Tip Tanımlamaları)
Bu klasör, TypeScript'in statik tip denetiminden maksimum fayda sağlamak için uygulamanın tüm veri modellerini içerir.
*   `oscillationTypes.ts`: 
    *   **`PmuSample`**: Ham PMU verilerini temsil eder. İçerisinde `timestampMs` (zaman damgası), `frequency` (Frekans), `voltage` (Gerilim), `activePower` (Aktif Güç) ve `reactivePower` (Reaktif Güç) gibi ölçümler barınır. Fazör genlikleri ve açıları (Örn: `voltageMagnitudeA`, `voltageAngleA`) da desteklenir.
    *   **`OscillationBandId`**: Sistemdeki analiz bantlarının tanımlayıcıları (`INTERAREA`, `LOCAL`, `FORCED`, `TORSION_PASSIVE`).
    *   **`SignalBandMetric`**: Her bir bant için analiz sonucu çıkan baskın frekans (`dominantFrequencyHz`), band RMS (`bandRms`), tepe genlik (`peakAmplitude`), sönümleme oranı (`dampingRatioPercent`) gibi istatistikleri tutar.
    *   **`OscillationWindowMetric`**: Zaman ekseni boyunca kayan pencerelerin (sliding windows) anlık durumunu raporlar. Grafikler bu tipe göre beslenir.
    *   **`OscillationClassification`**: Çıkan sayısal sonuçların kategorize edilerek string etiketlere (`TR_INTERAREA_GUCLU_MOD`, `RINGDOWN_ADAY`, `MOD_YOK` vb.) dökülmesini sağlayan tiptir.

### 2.2. `store/` (Durum Yönetimi)
Zustand kullanılarak global durum yönetimi sağlanır. React bileşenlerinin "prop drilling" olmadan veriye ulaşmasını kolaylaştırır.
*   `oscillationStore.ts`: Sistemin kalbidir. Toplamda 300+ satırlık bir yapıda şunları içerir:
    *   `selectionMode`: 'single' (Tekli PMU) veya 'multi' (Çoklu PMU) modu.
    *   `selectedPmuIds`: Kullanıcının seçtiği PMU'ların kimlik listesi (maksimum 6 adet).
    *   `amplitudeThresholds`: Kullanıcı tarafından UI'dan değiştirilebilen ve mod tespitini sağlayan eşik değerleri (Örn: `frequencyMhz: 10`, `voltagePercent: 2`).
    *   `windowSeconds` ve `stepSeconds`: Kayan pencerenin boyutunu ve adım miktarını saniye cinsinden tutar. Varsayılan olarak 120s pencere ve 30s adım kullanılır.
    *   `rawSamples`: Tauri'den dönen ve parse edilen ham verilerin depolandığı büyük dizi.
    *   `analysisResult`: Sinyal analizi bittikten sonra sonuçların UI bileşenlerine dağıtılmak üzere tutulduğu nesne.
    *   `fetchPmuData()`: Backend'den asenkron veri çeken metod.
    *   `runAnalysis()`: Ham veri geldikten sonra Web Worker'ı tetikleyen fonksiyon.

### 2.3. `utils/` (Çekirdek Algoritmalar)
Matematiksel analizlerin, sinyal işlemenin ve veri transformasyonlarının yapıldığı dizindir.
*   `bands.ts`: Bant sınırlarını tanımlar. Örnekleme hızı (Sampling Rate) 10 Hz olarak, Nyquist frekansı ise 5 Hz olarak belirlenmiştir. Bantlar `fMin` ve `fMax` limitleri ile yapılandırılmıştır.
*   `signalProcessing.ts`: Temel DSP kütüphanesi olarak çalışır. `linearDetrend`, `buildSpectrum`, `estimatePeakAmplitude`, `estimateDampingRatio` gibi kritik işlevleri içerir (Detayları 4. Bölümde anlatılacaktır).
*   `oscillationMetrics.ts`: Sinyalleri analiz edip bantlara oturtan iş kuralları dosyasıdır. `calculateOscillationAnalysis` fonksiyonu ile sistemin tüm iş yükü (kalite hesaplama, kayan pencere oluşturma, eşik filtrelemesi, mod sınıflandırması) bir araya getirilir.
*   `coherence.ts` ve `modeShape.ts`: Birden fazla PMU'nun kendi aralarındaki korelasyonlarını (Coherence Matrix) ve bağıl faz açılarını (Relative Phase) bulmak için kullanılır. Özellikle geniş alan salınımlarında jeneratör gruplarının ayrışmasını tespit etmek için kritiktir.
*   `analysisWorker.ts` ve `runAnalysisWorker.ts`: Web Worker mimarisini inşa eden dosyalardır. `workerContext.onmessage` event listener'ı ile ana iplikten (main thread) gelen `samplesByPmuEntries` matrisini alır, analizleri yapar ve `workerContext.postMessage` ile `status: 'ok'` bayrağıyla geri gönderir.
*   `sequentialQuery.ts`: Backend (`ytbs_query_range`) komutunu çağırır. 4 saate kadar çıkabilen devasa sorguları YTBS sunucusunu yormamak adına ardışık 30 dakikalık parçalar (chunks) halinde ileten mekanizmadır.

### 2.4. `components/` (Kullanıcı Arayüzü Bileşenleri)
Uygulamanın görsel katmanını oluşturan React (TSX) bileşenleridir. ECharts sarmalayıcılarını ve UI kartlarını barındırır.
*   `OscillationPage.tsx`: Genel sayfa düzenini kontrol eden (Layout) ana bileşen.
*   `OscillationFilterBar.tsx`: Filtre barı. `zustand` store'undaki setter fonksiyonlarını tetikleyen input elemanlarını (Tarih, PMU listesi, Mod seçimi, Genlik Eşiği, Sinyaller) içerir.
*   `RawDataCharts.tsx`: Zaman serisi ham veri grafiklerini çizer. Frekans, Gerilim ve Güç alt alta, aynı zaman eksenine hizalı şekilde render edilir.
*   `WindowMetricsCharts.tsx`: Kayan pencereler bazında sönümleme ve mod atlamalarını çizen `ModeDampingChart` ile enerji dalgalanmalarını çizen `EnergyAmplitudeCharts` bileşenlerini içerir.
*   `ModeShapePanel.tsx` ve `CoherenceMatrix.tsx`: Çoklu analiz modundayken PMU'ların fazör açılarını radar / polar grafiklerde ve matris verilerini ısı haritasında (heatmap) görselleştirir.

---

## 3. Durum (State) Yönetimi ve Arka Plan İletişimi

Uygulamanın çalışması için verilerin alınması ve UI ile senkronize edilmesi aşamalı bir mimariye dayanır.

### 3.1. Zustand Store'un Yapısı
Store içerisinde sadece UI'ın o anki değerleri (örneğin seçilen tab) değil, gigabaytlarca veriyi temsil edebilecek veri yapıları da saklanır.
*   `samplesByPmu`: Dictionary (sözlük) formatındadır. `Record<string, PmuSample[]>` tipindedir. Anahtar (Key) PMU'nun ID'si, değer (Value) ise o PMU'ya ait ölçüm dizisidir.
*   `queryProgress`: `OscillationQueryProgress` tipinde olup, Tauri'den gelen çok parçalı sorguların UI'daki loading (yükleniyor) bariyerine yüzdelik dilim (Örn: 2/8 parça tamamlandı) yansıtmasını sağlar.

### 3.2. Sequential Query ve Chunking Mantığı
PMU verisi çok yoğundur (1 saatlik veri 10Hz'den = 36.000 veri noktası eder). Kullanıcı 4 saatlik bir veri isteyebilir. `sequentialQuery.ts` içerisindeki `fetchSequentialPmuRawData` fonksiyonu şu stratejiyi uygular:
1.  Başlangıç ve bitiş zamanı milisaniye cinsine çevrilir. Süre farkı hesaplanır.
2.  Maksimum izin verilen YTBS sorgu penceresi 30 dakikadır (1.800.000 ms).
3.  Eğer süre 30 dakikadan uzunsa, matematiksel bir döngüyle dizi parçalara (`chunks`) ayrılır. Örneğin 4 saat = 8 chunk.
4.  Çoklu PMU durumu varsa, her bir PMU için bu 8 chunk sırayla sorgulanır. Paralel atılmaz (YTBS sunucusuna DDoS etkisi yapmamak için).
5.  `invoke('ytbs_query_range', { ...request })` kullanılarak Rust tarafındaki Tauri command'i tetiklenir ve sonuç JSON formatında React'e alınır.

---

## 4. Matematiksel Sinyal İşleme Algoritmaları

`signalProcessing.ts` dosyasında yer alan algoritmalar sistemin analitik beynidir.

### 4.1. Linear Detrending (Doğrusal Eğimden Arındırma)
Güç sistemlerinde 50 Hz olan nominal frekans, şebeke koşullarına göre (Örn: 49.95 Hz ile 50.05 Hz arasında) çok yavaş değişen bir DC offset veya trend gösterir. Bu durum düşük frekans analizini imkansızlaştırır. `linearDetrend` algoritması şu formülasyonla çalışır:
```typescript
const xMean = (n - 1) / 2;
const yMean = mean(values);
// ... En küçük kareler (Least Squares) regresyon hesabı:
const slope = denominator > 0 ? numerator / denominator : 0;
const intercept = yMean - slope * xMean;
// Orijinal sinyalden doğrunun çıkarılması
return values.map((value, index) => value - (intercept + slope * index));
```
Böylece veri seti tamamen 0 merkezli bir dalgalanmaya dönüştürülür.

### 4.2. Hızlı Fourier Dönüşümü (FFT/Welch Algoritması)
Sinyalin frekans domainine aktarılması için `buildSpectrum` fonksiyonunda Ayrık Fourier Dönüşümü (DFT) formülü uygulanır.
1.  **Pencereleme (Windowing)**: Veri setindeki kesintilerden doğacak spektral sızıntıyı (spectral leakage) engellemek için `hannWindow` (Hann Penceresi) uygulanır: $w(n) = 0.5 \cdot \left[1 - \cos\left(\frac{2\pi n}{N-1}\right)\right]$
2.  **Harmonik Analizi**: Seçilen `fMin` ve `fMax` arasındaki frekanslar için k-indeksleri belirlenir.
3.  Her bir k-indeksi için Reel ve İmajiner bileşenler hesaplanır:
    *   $Real = \sum (x[n] \cdot w[n]) \cdot \cos\left(\frac{2\pi \cdot k \cdot n}{N}\right)$
    *   $Imag = -\sum (x[n] \cdot w[n]) \cdot \sin\left(\frac{2\pi \cdot k \cdot n}{N}\right)$
4.  Güç spektrumu (Power Spectrum) Reel ve İmajiner kısımların kareleri toplamının normalize edilmesiyle bulunur.

### 4.3. Genlik Hesabı ve Mod Karar Algoritması
Bulunan DFT sonuçları üzerinden `estimatePeakAmplitude` ile baskın frekans noktasında genlik değerine (Amplitude) geri dönülür.
Bu nokta, `calculateWindowMetricsForSeries` tarafından alınarak eşik testine tabi tutulur:
1.  UI'dan gelen `amplitudeThresholds` okunur. Örneğin Frekans için 10 mHz (=0.010 Hz). Diğer sinyaller (Gerilim, Güç) için sinyalin ortalamasının %2'si olarak dinamik eşik hesaplanır.
2.  İlgili bandın tepe genliği bu eşiği aşıyorsa (`amplitude > thresholdValue`), `activeCandidates` dizisine eklenir.
3.  Birden çok bant eşiği aşıyorsa, eşiğe oranı (`ratio = amplitude / thresholdValue`) en yüksek olan bant kazanır.
4.  Kazanılan bandın `modeValue` değeri pencere sonucuna yazılır (Örn: Interarea kazandıysa Mod 2 atanır).
5.  Hiçbir bant eşiği aşamadıysa, pencerenin sonucu Mod 0 (Salınım Yok) olarak kaydedilir.

### 4.4. Logaritmik Sönümleme Oranı (Damping Ratio - Zeta)
Eğer salınım tespit edilmişse sistem `estimateDampingRatio` fonksiyonuna geçer.
Bu algoritmada "Peak Picking" (Tepe Seçimi) metodu kullanılır:
1.  Sinyalin mutlak değerlerinin ($|x[n]|$) lokal maksimumları bulunur.
2.  Frekansa bağlı olarak ardışık tepeler arası minimum mesafe (`minPeakDistance`) ile gürültüler elenir.
3.  Logaritmik Azalma ($\delta$) hesaplanır: $\delta = \frac{1}{n-1} \ln\left(\frac{y_0}{y_{n-1}}\right)$ (Burada $y_0$ ilk tepe, $y_{n-1}$ son tepe genliğidir).
4.  Damping Ratio yüzdesi ($\zeta \%$) bulunur: $\zeta (\%) = \left( \frac{\delta}{\sqrt{(2\pi)^2 + \delta^2}} \right) \times 100$
Damping oranı pozitifse (Örn: %3) salınım sönümleniyordur ("Ringdown"). Sıfıra yakınsa sürekli salınım ("Forced"), negatifse büyüyen tehlikeli salınımdır. Bu veriler sınıflandırma etiketlerine dökülür.

### 4.5. Mode Shape ve Kompleks Katsayılar
Çoklu PMU analizinde (Multi-PMU Mode), farklı santrallerdeki PMU'ların aynı salınım frekansında birbiriyle nasıl dans ettiklerini görmek için Mode Shape hesaplanır.
1.  Ortak bir baskın mod frekansı ($f_0$) bulunur.
2.  Her bir PMU'nun sinyali için o frekanstaki kompleks katsayı $C_i$ Euler dönüşümü ile ($e^{-j \omega t}$) çözülür.
3.  Reel ve İmajiner bileşenlerden `Math.atan2(imaginary, real)` fonksiyonuyla faz açısı bulunur.
4.  UI'dan seçilen "Referans PMU"nun faz açısı diğer tüm PMU'ların açısından çıkarılarak Bağıl Faz (Relative Phase) elde edilir. Böylece santrallerin birbirine göre In-Phase veya Out-of-Phase (180 derece zıt) hareket ettiği anlaşılır.

---

## 5. Salınım Bantları ve Sınıflandırma Mantığı

Sistem, `bands.ts` dosyasında aşağıdaki frekans spektrumlarını analiz edecek şekilde ayarlanmıştır. Parametrik eşik (Örn: 10 mHz) yalnızca aktif bantlar (0.1 - 4.5 Hz) için karar döngüsünde test edilir.

### 5.1. Analiz Bantları (Frequency Bands)
*   **Bant 1 (INTERAREA - Bölgeler Arası)**: Frekans Aralığı 0.1 Hz - 0.4 Hz. Elektrik şebekesinin geniş coğrafyalarında oluşan yavaş salınımlardır. **Mod Değeri = 2**.
*   **Bant 2 (LOCAL - Yerel)**: Frekans Aralığı 0.4 Hz - 2.0 Hz. Tek bir santralin veya yakın jeneratör grubunun şebekeye karşı salınımıdır. **Mod Değeri = 1**.
*   **Bant 3 (FORCED - Zorlanmış)**: Frekans Aralığı 2.0 Hz - 4.5 Hz. Jeneratör kontrolcülerindeki (PSS, AVR) ayarlamaların bozulmasından kaynaklanan yapay, zorlanmış salınımlardır. **Mod Değeri = 3**.
*   **Bant 4 (TORSION_PASSIVE - Pasif Torsiyon)**: Frekans Aralığı 4.5 Hz - 5.0 Hz. 10 Hz'lik sinyalin Nyquist limitidir. Bu bölgede aktif mod tespiti yapılmaz (`passive: true`). Ancak sistem yüksek enerji saptarsa **Mod Değeri = 4** atar ve bunu uyarı maksatlı saklar. Analiz sonuçlarında pasif torsiyon olarak işaretlenir.

### 5.2. Sonuçların Sınıflandırılması (Classification Labels)
Hesaplamalar tamamlandığında sistem, kullanıcıyı yormamak adına metinsel etiketler (`OscillationClassification`) oluşturur. Bu işlem `oscillationMetrics.ts` içerisindeki `classifyMetric` fonksiyonunda yapılır:
*   `VERI_KALITESI_YETERSIZ`: İlgili pencerede veri eksikliği %95'in üzerindeyse.
*   `MOD_YOK`: Hiçbir frekansta genlik eşiği (Örn: 10 mHz) aşılamadıysa.
*   `RINGDOWN_ADAY`: Eşik aşılmış ve Damping Ratio pozitif ise (%0.5'ten büyük). Salınımın sönümlendiği ve tehlike arz etmediği anlaşıldığında.
*   `TR_INTERAREA_GUCLU_MOD`: Interarea bandında, genlik eşiği geçilmiş, 1'den çok PMU'da aynı frekans görülmüşse bu güçlü bir bulgu olarak etiketlenir.
*   `FORCED_ADAY`: Yüksek frekanslı (Bant 3) ve sönümlenmeyen bir salınım görüldüğünde atanır.

---

## 6. Kullanıcı Arayüzü (ECharts ve Düzen)

`components` dizini altındaki dosyalar görselleştirmeden sorumludur. ECharts ile oluşturulan grafikler oldukça yeteneklidir.

### 6.1. RawDataCharts (Zaman Serisi - Ham Veriler)
Sistemin en üstünde bulunur. Gelen sinyalleri (Frekans, Gerilim, Güç) ayrı panellerde (veya çoklu Y eksenlerinde) gösterir. ECharts konfigürasyonunda `echarts.connect(['chart1', 'chart2', 'chart3'])` benzeri `group` mantığı kurularak kullanıcı bir grafikte detay görmek için zoom yaptığında (DataZoom Slider ile), diğer tüm grafiklerin de milisaniye hassasiyetinde o zaman aralığına senkronize olması sağlanır.

### 6.2. WindowMetricsCharts (Kayan Pencere Grafikleri)
Bu bölüm iki ana grafikten oluşur:
1.  **Mod ve Sönümleme Grafiği (`ModeDampingChart`)**: 
    *   *Sol Y Ekseni*: Tespit edilen mod. ECharts `series.step: 'end'` yapılandırması kullanılarak mod değişimleri dijital sinyal gibi köşeli (basamaklı) çizilir.
    *   *Sağ Y Ekseni*: Sönümleme oranı (%). Sadece modun "0" olmadığı zamanlarda nokta (scatter) olarak çizilir.
2.  **Enerji ve Genlik Grafikleri (`EnergyAmplitudeCharts`)**:
    *   Sinyalin RMS (Kök Ortalama Kare) enerjisini ve Tepe Genliğini (Amplitude) zaman ekseninde çizgi veya alan (Area Chart) olarak gösterir. Böylece salınımın başladığı noktadaki enerji patlaması kolayca gözlemlenebilir.

### 6.3. Detay Sekmeleri ve Tablolar
`OscillationDetailsTabs.tsx` sayfası altında veriler detaylı tablolara dökülür. Burada `analysisResult.windowMetrics` dizisi satır satır render edilerek, her bir 30 saniyelik adımda sistemin hangi parametreleri bulduğu mühendise sunulur. Eğer çoklu PMU analizi yapıldıysa, PMU'lar arası Koherens matrisi ısı haritası olarak (Heatmap) ve Bağıl faz açıları Radar grafik olarak bu sekmelerde sunulur.

---

## 7. Veri İhracı ve Raporlama Sistemi

Sistem sadece grafiksel görselleştirme sunmaz; aynı zamanda offline analiz için iki tür çıktı üretir:
*   **CSV İhracı (`exportCsv` / `buildOscillationCsv`)**: Ham veri dizisini (timestamp, frekans, aktif güç vb.), virgülle ayrılmış (CSV) metin formatına çevirerek `SALINIM_PMU_VERI_ZAMAN.csv` adıyla kullanıcının bilgisayarına indirir.
*   **Markdown Raporlama (`generateReport` / `buildMarkdownReport`)**: Sinyal analiz işleminin (`runAnalysis`) bitmesinin ardından otomatik bir Markdown raporu oluşturulur. Bu raporda seçilen PMU fiderleri, parametrik eşikler (Örn: 10 mHz Genlik, %2 Güç Genliği), pencerelerin analizi sonucu elde edilen baskın frekanslar, Mode Shape verileri ve sınıflandırma etiketleri teknik bir makale formatında dizilir.

Bu eksiksiz mimari sayesinde, YTBS verilerinden otomatik, hızlı ve bloklanmayan bir yöntemle ileri seviye PMU modal analizi gerçekleştirilerek enterkonnekte elektrik şebekesinin dinamiği izlenebilir hale getirilmiştir.
