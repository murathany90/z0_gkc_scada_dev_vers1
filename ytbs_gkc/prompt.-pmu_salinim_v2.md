Aşağıdaki promptu `prompt.md` içeriği olarak doğrudan IDE agent’a verebilirsin. Güncellemede; sorgu süresini **4 saat**, PMU seçim sınırını **1–6 GKÇ PMU fideri**, sayfa amacını **alarm/kontrol değil salınım modu tespit ve raporlama**, varsayılan ana bandı da **Türkiye inter-area 0.10–0.20 Hz** olarak düzelttim. Proje mimarisi README’deki React, TypeScript, Zustand, ECharts ve Tauri/Rust yapısına göre kurgulandı . SAS dokümanındaki 0.1–0.2 Hz, 10 mHz ve SVK/STATKOM/BESS ile sönümleme mantığı sadece referans/bağlam olarak ele alındı; bu sayfada kontrol çıkışı veya alarm üretimi istenmeyecek . PMU salınım uygulamalarında frekans, genlik, damping ve mode shape analizi kullanılan temel çıktılardır; NASPI dokümanı da bu tip sistemlerde mode, damping ve enerji seviyesinin izlendiğini gösterir . 10 örnek/s veride Nyquist sınırı 5 Hz olduğundan analiz üst sınırı 4.5 Hz ile sınırlandırılmalıdır; Nyquist kuralına göre örnekleme hızı işaret bant genişliğinin en az iki katı olmalıdır ([Vikipedi][1]). Bu v2 prompt, repo gerçeklerine göre ayrıca mevcut PMU parse/mapping düzeltmelerini, `30 dk` YTBS PMU sorgu limitinin frontend’de `4 saat / 8 parça` sıralı sorguya çıkarılmış halini ve çoklu PMU seçiminde her PMU’nun sırayla sorgulanması gereğini içerir.

````md
# IDE AGENT PROMPT — GKÇ İzleme > Salınım Algılayıcı Sayfası

Sen bu projede kıdemli React + TypeScript + Tauri/Rust + ECharts geliştiricisi olarak çalışacaksın. Mevcut GKC SCADA uygulamasında `GKÇ İzleme` sekmesi altında yeni bir `Salınım Algılayıcı` sayfası geliştir.

Bu sayfa SAS-C cihazı gibi kontrol çıkışı, binary komut, sesli/görsel alarm veya SVK/STATKOM/BESS aksiyonu üretmeyecek. Sayfanın amacı, YTBS GKÇ PMU verilerinden salınım modlarını tespit etmek, analiz etmek, karşılaştırmak, grafiklemek ve raporlamaktır.

Uygulama mevcut mimariye uyumlu olacak:
- Frontend: React 19 + TypeScript + Vite
- State: Zustand
- Grafik: ECharts
- Backend / desktop çekirdek: Tauri + Rust
- Veri akışı: YTBS sorgu/parsing → Tauri IPC → Zustand store → React UI → ECharts grafikler
- Mevcut `YTBS GKÇ Verileri` sayfasındaki filtre, grafik, veri çekme ve ham Excel/PMU veri gösterim yapıları incelenip mümkün olduğunca yeniden kullanılacak.

Repo gerçekleri ve mevcut altyapı:
- PMU veri sorgusu için önce mevcut dosyaları oku: `src/stores/ytbsStore.ts`, `src/utils/ytbsQueryChunks.ts`, `src/utils/ytbsPmu.ts`, `src/App.tsx`, `src-tauri/src/data_models.rs`, `src-tauri/src/ytbs_client.rs`.
- Backend `ytbs_query_range` komutu PMU için kullanılabilir durumdadır; `YtbsGrafikVerisi` artık `y16` alanını taşır, `dd.MM.yyyy HH:mm:ss.SSS` milisaniyeli timestamp parse edilir ve PMU mapping PQ’dan ayrıdır.
- PMU alan haritası repo içinde doğrulanmıştır: frekans `y1`, gerilim büyüklüğü `y2/y3/y4`, gerilim fazörü `y5/y6/y7`, akım büyüklüğü `y8/y9/y10`, akım fazörü `y11/y12/y13`, güç `y14/y15/y16`.
- Mevcut frontend PMU helper’ı `buildYtbsChartGroups` PMU’da 6 grafik grubu üretir: Güç, Gerilim Büyüklüğü, Gerilim Fazörü, Akım Büyüklüğü, Akım Fazörü, Frekans. Zaman ekseni PMU için `millisecond` çözünürlüktedir.
- Mevcut `buildYtbsQueryChunks` PMU seçiliyken `30 dk` parçalar, maksimum `4 saat`, maksimum `8` sıralı parça üretir. `useYtbsStore.queryRange` PMU’da bu parçaları sırayla çağırır, timestamp’e göre sıralayıp tekilleştirir ve `ytbsQueryNotice` / `ytbsQueryProgress` ile hafif UI bilgisi sağlar.
- Yeni salınım sayfası bu altyapıyı tekrar yazmamalı; tekli PMU ve çoklu PMU sorgularında mevcut PMU query/mapping helper’ları yeniden kullanılmalı. Çoklu PMU’da PMU fiderleri ve her fiderin 30 dakikalık parçaları paralel değil, sırayla sorgulanmalıdır.

---

## 1. Sayfa adı ve menü yerleşimi

Yeni sayfa şu konumda açılacak:

```text
GKÇ İzleme
  └── Salınım Algılayıcı
````

Sayfa başlığı:

```text
Salınım Algılayıcı — PMU Modal Analiz ve Raporlama
```

Alt açıklama:

```text
YTBS GKÇ PMU fiderlerinden alınan 10 örnek/saniye çözünürlüklü frekans, gerilim, aktif güç ve reaktif güç verileriyle salınım modu, baskın frekans, band enerjisi, damping ratio, PMU katılımı ve mode shape analizi yapılır. Bu ekran alarm veya kontrol çıkışı üretmez; mühendislik analiz ve raporlama ekranıdır.
```

---

## 2. Veri kaynağı ve sorgu kuralları

Veri, `YTBS GKÇ Verileri` sayfasında PMU olarak filtrelenebilen GKÇ cihazlarından alınacaktır.

Sorgu kısıtları:

```text
Örnekleme hızı: 10 örnek/saniye
Minimum PMU fider seçimi: 1
Maksimum PMU fider seçimi: 6
YTBS tek PMU sorgu limiti: 30 dakika
Uygulama maksimum sorgu süresi: 4 saat
4 saatlik PMU sorgu yöntemi: 30 dakikalık en fazla 8 parça, sıralı
Sorgulanacak ana ölçümler:
  1. Aktif Güç
  2. Reaktif Güç
  3. Frekans
  4. Gerilim
Opsiyonel / varsa kullanılacak ek veriler:
  - Gerilim fazörü genliği
  - Gerilim fazörü açısı
  - Akım fazörü genliği
  - Akım fazörü açısı
  - PMU veri kalite etiketi
```

Sorgu uygulama kuralı:

* YTBS PMU sayfası tek istekte en fazla 30 dakikalık PMU verisi döndürür. Bu sınırı backend’i zorlayarak aşmaya çalışma.
* Uygulamada 30 dakikadan uzun ve 4 saate kadar aralıklar `src/utils/ytbsQueryChunks.ts` içindeki mevcut mantıkla 30 dakikalık parçalara bölünür.
* Tekli PMU’da bu parçalar sırayla sorgulanır ve tek PMU veri seti olarak birleştirilir.
* Çoklu PMU’da seçilen PMU fiderleri de sırayla sorgulanır: PMU-1’in tüm parçaları tamamlanır, sonra PMU-2’ye geçilir. Paralel YTBS isteği atma.
* Herhangi bir PMU veya parça hata verirse ilgili PMU için kontrollü hata üret; kısmi veri/eksik PMU durumu UI’da görünür olsun.
* `4 saatten fazla` aralıkta veri çekme başlatma; inline uyarı göster ve butonu pasif tut.

4 saatlik maksimum sorgu için veri hacmi hesabı UI ve servis tarafında dikkate alınacak:

```text
4 saat = 4 * 60 * 60 = 14400 saniye
10 örnek/saniye = 144000 örnek / sinyal / PMU

4 ana sinyal için:
144000 * 4 = 576000 nokta / PMU

6 PMU için:
576000 * 6 = 3456000 veri noktası
```

Bu nedenle:

* Ham veri grafiklerinde performans için ECharts sampling, progressive rendering veya downsample stratejisi kullanılacak.
* Analiz hesaplamaları mümkünse ayrı utility modüllerinde ve bloklanmayan yapıda çalıştırılacak.
* Çok büyük veri geldiğinde UI donmamalı.
* Grafiklerde zoom yapılınca orijinal çözünürlük gösterilebilmeli.
* Ana ekranda decimated veri, ayrıntı sekmesinde ham veri tablo/grafik erişimi sağlanmalı.

---

## 3. PMU seçim modu

Filtre barında kullanıcı iki seçim modundan birini seçebilecek:

```text
Seçim Modu:
[ Tekli PMU ] [ Çoklu PMU ]
```

### 3.1 Tekli PMU modu

Tekli modda:

* Kullanıcı yalnızca 1 adet GKÇ PMU fideri seçebilir.
* Analiz tek PMU üzerinde yapılır.
* Mode shape hesabı yapılmaz veya “tek PMU nedeniyle mode shape sınırlı” şeklinde gösterilir.
* Tek PMU için frekans, gerilim, aktif güç ve reaktif güç zaman serileri ve sinyal bazlı salınım analizleri gösterilir.

Tekli mod filtresi:

```text
Seçim Modu: Tekli PMU
PMU Fideri: [tek seçim dropdown]
Başlangıç Zamanı: [datetime]
Bitiş Zamanı: [datetime]
Süre Kontrolü: maksimum 4 saat
PMU Sorgu Bilgisi: 30 dk parçalar, 4 saate kadar en fazla 8 sıralı sorgu
Sinyaller: [Frekans] [Gerilim] [Aktif Güç] [Reaktif Güç]
Bant Profili: [TR Inter-area] [Genel Elektromekanik] [Özel]
Analiz Penceresi: [60 sn] [120 sn] [300 sn] [900 sn]
Adım: [10 sn] [30 sn] [60 sn]
Butonlar: [Veriyi Getir] [Analizi Çalıştır] [Rapor Oluştur] [CSV Dışa Aktar]
```

### 3.2 Çoklu PMU modu

Çoklu modda:

* Kullanıcı minimum 2, maksimum 6 PMU fideri seçebilir.
* 1 PMU seçilirse sistem kullanıcıyı tekli moda yönlendirebilir veya “çoklu analiz için en az 2 PMU seçiniz” uyarısı gösterebilir.
* Çoklu modda PMU karşılaştırma, band enerji ısı haritası, mode shape, faz grupları ve koherens analizi yapılır.
* Kullanıcı bir referans PMU seçebilir.

Çoklu mod filtresi:

```text
Seçim Modu: Çoklu PMU
PMU Fiderleri: [çoklu seçim, max 6]
Seçilen PMU sayısı: X / 6
Referans PMU: [dropdown, varsayılan ilk seçilen PMU]
Başlangıç Zamanı: [datetime]
Bitiş Zamanı: [datetime]
Süre Kontrolü: maksimum 4 saat
PMU Sorgu Bilgisi: her PMU için 30 dk parçalar, tüm PMU’lar sırayla
Sinyaller: [Frekans] [Gerilim] [Aktif Güç] [Reaktif Güç]
Bant Profili: [TR Inter-area] [Genel Elektromekanik] [Özel]
Analiz Penceresi: [60 sn] [120 sn] [300 sn] [900 sn]
Adım: [10 sn] [30 sn] [60 sn]
Butonlar: [Veriyi Getir] [Analizi Çalıştır] [Rapor Oluştur] [CSV Dışa Aktar]
```

Filtre validasyonları:

* Bitiş zamanı başlangıçtan önce olamaz.
* Sorgu süresi 4 saati geçemez.
* PMU sorguları 30 dakikalık parçalara bölünür; 4 saat tam aralık 8 sorgudur.
* Tekli modda 1 PMU’dan fazla seçilemez.
* Çoklu modda 6 PMU’dan fazla seçilemez.
* Çoklu PMU sorguları ve parçaları YTBS yükünü artırmamak için sıralı çalışır, paralel çalışmaz.
* Çoklu mode shape analizi için en az 2 PMU gerekir.
* Veri geldikten sonra PMU’ların zaman ekseni hizalanmalı; eksik timestamp varsa işaretlenmeli.

---

## 4. Bant profili ve varsayılan bantlar

Örnekleme 10 Hz olduğu için Nyquist frekansı:

```text
fs = 10 Hz
fNyquist = fs / 2 = 5 Hz
```

Bu nedenle 5 Hz ve üzeri salınım analizi yapılmayacak. Güvenli üst analiz sınırı 4.5 Hz olacak.

Varsayılan bant profili aşağıdaki gibi tanımlanacak:

```ts
export const OSCILLATION_BANDS = [
  {
    id: "B0",
    name: "Çok Yavaş Trend / Salınım",
    fMin: 0.02,
    fMax: 0.05,
    enabled: true,
    confidence: "low",
    description: "Çok uzun periyotlu davranış ve trend ayrımı için kullanılır."
  },
  {
    id: "B1",
    name: "Düşük Frekans Geniş Alan",
    fMin: 0.05,
    fMax: 0.10,
    enabled: true,
    confidence: "medium",
    description: "TR inter-area bandı altındaki yavaş geniş alan davranışları."
  },
  {
    id: "B2",
    name: "TR Inter-area / SAS Gözlem Bandı",
    fMin: 0.10,
    fMax: 0.20,
    enabled: true,
    primary: true,
    confidence: "high",
    description: "Türkiye için SAS bağlamında kritik bölgeler arası salınım gözlem bandı. Bu yazılımda kontrol/aksiyon değil modal raporlama amacıyla kullanılır."
  },
  {
    id: "B3",
    name: "Genel Inter-area Elektromekanik",
    fMin: 0.20,
    fMax: 0.70,
    enabled: true,
    confidence: "high",
    description: "Dünya uygulamalarında inter-area elektromekanik modların geniş alt bandı."
  },
  {
    id: "B4",
    name: "Lokal Elektromekanik",
    fMin: 0.70,
    fMax: 2.00,
    enabled: true,
    confidence: "medium",
    description: "Lokal jeneratör, santral veya bölgesel elektromekanik modlar."
  },
  {
    id: "B5",
    name: "Kontrol / Forced Aday Bandı",
    fMin: 2.00,
    fMax: 4.50,
    enabled: true,
    confidence: "limited",
    description: "Kontrol kaynaklı veya forced aday yüksek frekanslı bileşenler. 10 Hz veri nedeniyle 4.5 Hz üstü analiz edilmez."
  },
  {
    id: "B6",
    name: "Nyquist Tampon Bölgesi",
    fMin: 4.50,
    fMax: 5.00,
    enabled: false,
    confidence: "not-supported",
    description: "10 Hz veri için Nyquist sınırına yakın güvenilmez bölge. Analiz dışı."
  },
  {
    id: "B7",
    name: "Torsiyonel Dinamik",
    fMin: 5.00,
    fMax: 14.00,
    enabled: false,
    confidence: "not-supported",
    description: "10 örnek/saniye veriyle desteklenmez."
  }
];
```

Önemli:

* Frekans, gerilim, aktif güç ve reaktif güç için **aynı frekans bantları** kullanılacak.
* Ancak her sinyal için metrikler ayrı hesaplanacak.
* Frekans için mHz, gerilim için kV veya pu, aktif güç için MW, reaktif güç için MVAr gösterilecek.
* Kullanıcı isterse özel bant tanımlayabilecek ancak özel bandın üst sınırı 4.5 Hz’i aşamayacak.

---

## 5. Analiz metrikleri

Her PMU, her sinyal ve her bant için aşağıdaki metrikler hesaplanacak:

```text
dominantFrequencyHz
bandRms
peakAmplitude
peakToPeakAmplitude
spectralEnergy
dampingRatioPercent
dampingSigma
modePhaseDegree
dataQualityScore
missingSampleRatio
classificationLabel
```

### 5.1 Trend temizleme

Her sinyal için önce trend temizlenecek:

```text
xDetrended[n] = x[n] - trend(x[n])
```

Trend için basit yöntem:

* Mean removal
* Linear detrend
* Opsiyonel moving average detrend

### 5.2 Band RMS

Seçili bantta filtrelenmiş sinyal:

```text
xBand[n] = BPF(fMin, fMax, xDetrended[n])
```

Band RMS:

```text
bandRms = sqrt(sum(xBand[n]^2) / N)
```

Sinüzoidal kabulde tepe genlik:

```text
peakAmplitude = sqrt(2) * bandRms
```

### 5.3 Baskın frekans

Welch veya FFT spektrumu kullanılacak:

```text
dominantFrequencyHz = argmax(Pxx(f)) for f in [fMin, fMax]
```

### 5.4 Damping ratio

Hilbert zarfı veya peak-picking yaklaşımı kullanılabilir.

Zarf:

```text
envelope[n] = abs(hilbert(xBand[n]))
```

Log-zarf lineer regresyonu:

```text
ln(envelope[n]) = a + sigma * t[n]
```

Baskın açısal frekans:

```text
omegaD = 2 * PI * dominantFrequencyHz
```

Damping ratio:

```text
zeta = -sigma / sqrt(sigma^2 + omegaD^2)
dampingRatioPercent = 100 * zeta
```

Not:

* Damping pozitifse sönümlenen ringdown aday.
* Damping yaklaşık sıfırsa sustained/forced aday.
* Damping negatifse büyüyen salınım aday.
* Bu değer alarm üretmeyecek; sadece rapor etiketi olarak gösterilecek.

### 5.5 PMU mode shape

Çoklu PMU modunda seçilen baskın frekans için her PMU’da kompleks katsayı hesaplanacak:

```text
C_i(f0) = sum(x_i[n] * exp(-j * 2 * PI * f0 * n / fs))
```

Her PMU için:

```text
modeMagnitude_i = abs(C_i)
modePhase_i = angle(C_i)
relativePhase_i = modePhase_i - modePhase_reference
```

Gösterim:

* PMU katılım genliği bar grafiği
* PMU faz açıları polar grafik
* Referans PMU’ya göre faz farkı tablosu
* 0° ve 180° yakın faz grupları

### 5.6 PMU koherens analizi

Çoklu PMU modunda seçilen sinyal ve bant için PMU çiftleri arasında koherens hesaplanacak:

```text
coherence_xy(f) = |Pxy(f)|^2 / (Pxx(f) * Pyy(f))
```

Yorum:

* > 0.80: güçlü ortak mod
* 0.50–0.80: orta ilişki
* < 0.50: zayıf ilişki

Bu da alarm değil; yalnızca mod güvenilirlik göstergesidir.

---

## 6. Sınıflandırma etiketleri

Sistem alarm üretmeyecek. Aşağıdaki sınıflandırma etiketlerini üretecek:

```text
MOD_YOK
TEK_PMU_LOKAL_BULGU
GENIS_ALAN_ADAY_MOD
TR_INTERAREA_ADAY_MOD
TR_INTERAREA_GUCLU_MOD
LOKAL_ELEKTROMEKANIK_ADAY
FORCED_ADAY
RINGDOWN_ADAY
VERI_KALITESI_YETERSIZ
```

Örnek kurallar:

```text
TR_INTERAREA_ADAY_MOD:
  dominantFrequencyHz >= 0.10
  dominantFrequencyHz <= 0.20
  en az 1 PMU’da anlamlı band enerjisi

TR_INTERAREA_GUCLU_MOD:
  dominantFrequencyHz >= 0.10
  dominantFrequencyHz <= 0.20
  en az 2 PMU’da aynı frekans çevresinde band enerjisi
  PMU çiftleri arasında coherence > 0.80
  mode phase ayrımı belirgin

TEK_PMU_LOKAL_BULGU:
  yalnızca bir PMU seçili veya yalnızca bir PMU’da enerji belirgin

FORCED_ADAY:
  genlik uzun süre sabit
  dampingRatioPercent yaklaşık 0 veya negatif
  spektrumda dar bantlı sürekli enerji

RINGDOWN_ADAY:
  olay sonrası genlik zarfı azalan yapı
  dampingRatioPercent pozitif
```

Sınıflandırma sonucu UI’da “Bulgu” olarak yazılacak, “Alarm” kelimesi kullanılmayacak.

---

## 7. UI genel yerleşimi

Sayfa 5 ana bölümden oluşacak:

```text
1. Üst filtre barı
2. Veri kapsam / kalite özeti
3. Ham veri grafikleri
4. Ham verilerin altında analiz panelleri
5. Aynı sayfada sekmeli ayrıntılar:
   - Analiz Özeti
   - Sinyal Bazlı Analiz
   - Modal Analiz
   - Veriler / Ayrıntılar
   - Rapor
```

---

## 8. Üst filtre barı ayrıntısı

Filtre barı sticky olmalı, sayfa aşağı kaydırılsa da üstte kalmalı.

```text
[Seçim Modu: Tekli PMU | Çoklu PMU]
[PMU GKÇ Fiderleri]
[Referans PMU] — sadece çoklu modda görünür
[Başlangıç Zamanı]
[Bitiş Zamanı]
[Süre etiketi: 00:00 - max 4 saat]
[Sorgu bilgisi: N PMU × M parça, 30 dk/parça, sıralı]
[Sinyaller: Frekans | Gerilim | Aktif Güç | Reaktif Güç]
[Bant Profili: TR Inter-area | Genel | Özel]
[Pencere: 60s | 120s | 300s | 900s]
[Adım: 10s | 30s | 60s]
[Veriyi Getir]
[Analizi Çalıştır]
[Rapor Oluştur]
[Dışa Aktar]
```

PMU seçim bileşeni:

* Tekli modda single-select dropdown.
* Çoklu modda checkbox veya multi-select.
* En fazla 6 seçim.
* Seçilen PMU’lar chip olarak gösterilecek.
* Her chip üzerinde PMU adı, TM, gerilim seviyesi, fider adı, veri durumu gösterilecek.

Süre validasyonu:

* 4 saatten fazla seçilirse “Maksimum sorgu süresi 4 saattir” mesajı göster.
* 30 dakikadan uzun PMU aralıklarında “N parça halinde sırayla sorgulanacak” bilgisini hafif inline uyarı olarak göster.
* Çoklu PMU’da “X PMU, toplam Y parça, sırayla sorgulanıyor” ilerleme bilgisini göster.
* Veri çekme butonu yalnızca geçersiz veya 4 saati aşan aralıkta pasif kalır; 30 dakikadan uzun geçerli PMU sorgularında parçalı sorgu bilgisi gösterilir ve sorgu başlatılabilir.

---

## 9. Veri kapsam / kalite özeti

Filtre barının altında kompakt kart satırı olacak.

Tekli PMU için kartlar:

```text
Kart 1: Seçilen PMU
Kart 2: Sorgu Süresi
Kart 3: Örnek Sayısı
Kart 4: Eksik Veri Oranı
Kart 5: Ana Bant
Kart 6: Analiz Durumu
```

Çoklu PMU için kartlar:

```text
Kart 1: Seçilen PMU Sayısı X/6
Kart 2: Sorgu Süresi
Kart 3: Toplam Veri Noktası
Kart 4: Ortalama Veri Kalitesi
Kart 5: Referans PMU
Kart 6: Ana Bant / Analiz Durumu
```

Örnek:

```text
Seçilen PMU: 4 / 6
Süre: 03:45:00
Örnek: 135000 / PMU / sinyal
Toplam veri: 2.160.000 nokta
Ana bant: TR Inter-area 0.10–0.20 Hz
Durum: Analiz tamamlandı
```

---

## 10. Ham veri grafikleri

Ham veri grafikleri analiz panellerinden önce gösterilecek ve mevcut `YTBS GKÇ Verileri` PMU grafik/parsing yapısı korunacak. Mevcut PMU kaynak grafikleri 6 gruptur: Güç (`y14/y15/y16`), Gerilim Büyüklüğü (`y2/y3/y4`), Gerilim Fazörü (`y5/y6/y7`), Akım Büyüklüğü (`y8/y9/y10`), Akım Fazörü (`y11/y12/y13`), Frekans (`y1`). Salınım analizinin ana görünümü frekans, gerilim, aktif güç ve reaktif güç üzerinde yoğunlaşır; fazör/akım büyüklüğü verileri varsa ayrıntı veya opsiyonel grafik olarak kullanılabilir.

### 10.1 Tekli PMU ham veri görünümü

Tekli PMU seçilirse ana analiz için en az 4 grafik alt alta:

```text
1. Frekans Zaman Serisi
2. Gerilim Zaman Serisi
3. Aktif Güç Zaman Serisi
4. Reaktif Güç Zaman Serisi
Opsiyonel: Gerilim Fazörü, Akım Büyüklüğü, Akım Fazörü detay grafikleri
```

Her grafikte:

* ECharts line chart
* tooltip
* dataZoom
* brush/zoom
* legend
* export image
* ham veri / filtrelenmiş veri toggle
* seçilen bant overlay opsiyonu
* eksik veri noktaları için gap gösterimi
* veri kalite etiketi varsa arka plan işareti

Grafik başlıkları:

```text
Frekans — PMU Adı — 10 örnek/s
Gerilim — PMU Adı — 10 örnek/s
Aktif Güç — PMU Adı — 10 örnek/s
Reaktif Güç — PMU Adı — 10 örnek/s
```

### 10.2 Çoklu PMU ham veri görünümü

Çoklu PMU seçilirse 4 ana analiz sinyali için sekmeli ham veri göster; mevcut PMU mapping’den gelen fazör ve akım büyüklüğü verileri ek ayrıntı sekmelerinde gösterilebilir:

```text
Ham Veriler sekmeleri:
[Frekans] [Gerilim] [Aktif Güç] [Reaktif Güç]
```

Her sekmede:

* Seçilen tüm PMU’lar aynı grafikte çoklu çizgi olarak gösterilecek.
* Legend üzerinden PMU aç/kapat yapılabilecek.
* Referans PMU çizgisi vurgulanacak.
* Veri çok büyükse varsayılan downsample gösterilecek.
* Zoom yapılınca daha yüksek çözünürlük gösterilecek.
* Grafiğin altında PMU bazlı mini veri kalite tablosu gösterilecek.

Çoklu PMU frekans grafiği örneği:

```text
Frekans — 6 PMU Karşılaştırma
Legend: PMU-1, PMU-2, PMU-3, PMU-4, PMU-5, PMU-6
Y ekseni: Hz
X ekseni: zaman
```

---

## 11. Ham verilerin altındaki analiz panelleri

Ham veri grafiklerinin hemen altında analiz sonuçları gösterilecek. Bu bölüm tekli ve çoklu modda farklılaşacak.

---

## 12. Tekli PMU analiz panelleri

Tekli PMU modunda ham verilerin altında şu paneller sırasıyla gösterilecek:

### 12.1 Analiz özeti kartları

```text
1. Baskın Mod Frekansı
2. Baskın Bant
3. En Yüksek Enerjili Sinyal
4. Damping Ratio
5. Mod Yorumu
6. Veri Kalitesi
```

Örnek içerik:

```text
Baskın Mod: 0.143 Hz
Bant: TR Inter-area / SAS Gözlem
En yüksek sinyal: Aktif Güç
Damping: %1.8
Yorum: 0.10–0.20 Hz bandında tek PMU modal bulgu gözlendi.
Veri kalitesi: %98.7
```

### 12.2 Bant enerji bar grafiği

Her sinyal için B0–B5 band RMS değerlerini göster:

```text
X ekseni: Bantlar
Y ekseni: RMS / Enerji
Seriler: Frekans, Gerilim, Aktif Güç, Reaktif Güç
```

### 12.3 Spektrum grafiği

Seçili sinyal için FFT/Welch spektrumu:

```text
X ekseni: Frekans Hz
Y ekseni: Spektral güç
Dikey işaretler:
  - 0.10 Hz
  - 0.20 Hz
  - dominantFrequencyHz
```

### 12.4 Spektrogram

```text
X ekseni: zaman
Y ekseni: frekans
Renk: enerji
Varsayılan frekans aralığı: 0.02–2.00 Hz
Kullanıcı isterse 0.02–4.50 Hz görüntüleyebilir.
```

### 12.5 Filtrelenmiş sinyal grafiği

Seçili bant için filtrelenmiş sinyal:

```text
xBand(t)
```

Sinyal seçici:

```text
[Frekans] [Gerilim] [Aktif Güç] [Reaktif Güç]
```

### 12.6 Damping analizi

Grafikte:

* Filtrelenmiş sinyal
* Hilbert zarfı
* Log-zarf fit çizgisi
* Hesaplanan damping ratio
* Yorum etiketi

### 12.7 Tek PMU sonuç tablosu

Kolonlar:

```text
Sinyal
Baskın Frekans
Bant
Band RMS
Tepe Genlik
Tepe-Tepe Genlik
Damping Ratio
Spektral Enerji
Sınıflandırma
Veri Kalitesi
```

---

## 13. Çoklu PMU analiz panelleri

Çoklu PMU modunda ham verilerin altında şu paneller gösterilecek:

### 13.1 Çoklu PMU özet kartları

2x3 grid olarak seçilen PMU’lar gösterilecek.

Her PMU kartında:

```text
PMU adı
Fider adı
Dominant frequency
TR band RMS
En yüksek enerjili sinyal
Damping ratio
Eksik veri oranı
```

Kart alarm rengi kullanmayacak. Sadece nötr analiz etiketleri:

```text
Düşük enerji
Orta enerji
Yüksek enerji
Ortak mod adayı
Veri kalitesi düşük
```

### 13.2 PMU x Bant enerji ısı haritası

ECharts heatmap kullanılacak.

```text
X ekseni: Bantlar B0–B5
Y ekseni: PMU fiderleri
Renk: normalize edilmiş band enerjisi
Sinyal seçici: Frekans / Gerilim / Aktif Güç / Reaktif Güç
```

Amaç:

* Hangi PMU’nun hangi bantta daha fazla salınım enerjisi taşıdığını göstermek.
* TR 0.10–0.20 Hz bandında çoklu PMU katılımını görselleştirmek.

### 13.3 Ortak baskın mod tablosu

Çoklu PMU’larda ortak frekanslar gruplanacak.

Kolonlar:

```text
Mod ID
Frekans Hz
Bant
Katılan PMU sayısı
Ortalama koherens
Ortalama damping
En yüksek sinyal
Sınıflandırma
```

Örnek:

```text
M1 | 0.143 Hz | TR Inter-area | 4/6 PMU | 0.86 | %1.9 | Aktif Güç | TR_INTERAREA_GUCLU_MOD
```

### 13.4 Mode shape paneli

Bu panel sadece çoklu PMU modunda gösterilecek.

Alt bileşenler:

1. PMU katılım genliği bar grafiği
2. PMU faz açısı polar grafiği
3. Referans PMU’ya göre faz farkı tablosu
4. Faz grupları listesi

PMU katılım grafiği:

```text
X ekseni: PMU
Y ekseni: modeMagnitude
```

Polar grafik:

* Her PMU bir vektör olarak çizilecek.
* Açı: relativePhase
* Uzunluk: normalized modeMagnitude

Faz grupları:

```text
Grup A: referansa yakın fazlı PMU’lar
Grup B: yaklaşık karşı fazlı PMU’lar
Belirsiz: genliği düşük veya fazı kararsız PMU’lar
```

### 13.5 Koherens matrisi

ECharts heatmap:

```text
X ekseni: PMU
Y ekseni: PMU
Renk: coherence
```

Koherens yorum eşiği:

* 0.80 üstü güçlü
* 0.50–0.80 orta
* 0.50 altı zayıf

### 13.6 PMU karşılaştırmalı spektrum

Seçili sinyal için PMU spektrumlarını üst üste göster:

```text
X ekseni: Hz
Y ekseni: spektral güç
Seriler: PMU-1 ... PMU-6
```

TR bandı arka plan highlight:

```text
0.10–0.20 Hz bölgesi hafif vurgulu
```

### 13.7 Çoklu PMU sonuç tablosu

Kolonlar:

```text
PMU
Sinyal
Baskın Frekans
Bant
Band RMS
Tepe Genlik
Damping Ratio
Mode Magnitude
Mode Phase
Referansa Göre Faz
Koherens Ortalama
Sınıflandırma
Veri Kalitesi
```

---

## 14. Aynı sayfa içinde sekmeli yapı

Ham verilerin ve temel analiz panellerinin altında veya sağ bölümde `Tabs` yapısı oluştur.

Sekmeler:

```text
[Analiz Özeti]
[Sinyal Bazlı Analiz]
[Modal Analiz]
[Veriler / Ayrıntılar]
[Rapor]
```

### 14.1 Analiz Özeti sekmesi

İçerik:

* Seçilen PMU’lar
* Zaman aralığı
* Örnek sayısı
* Ana bulgular
* TR inter-area bandı bulgusu
* Baskın mod listesi
* Veri kalitesi özeti

### 14.2 Sinyal Bazlı Analiz sekmesi

Her sinyal için ayrı accordion:

```text
Frekans
Gerilim
Aktif Güç
Reaktif Güç
```

Her accordion içinde:

* Band RMS tablosu
* Spektrum grafiği
* Filtrelenmiş sinyal grafiği
* Damping analizi
* Sinyal yorumu

### 14.3 Modal Analiz sekmesi

Tekli modda:

```text
Tek PMU seçildiği için mode shape ve koherens hesaplanamaz.
Bu sekmede tek nokta modal bulgu, baskın frekans ve damping bilgisi gösterilir.
```

Çoklu modda:

* Ortak mod tablosu
* Mode shape
* Faz grupları
* Koherens matrisi
* PMU katılım sıralaması

### 14.4 Veriler / Ayrıntılar sekmesi

Bu sekme aynı sayfa içinde olacak ve gerekirse sanal tablo kullanılacak.

Alt sekmeler:

```text
[Ham Veri]
[Analiz Sonuçları]
[PMU Kalite]
[Hesaplama Parametreleri]
```

Ham Veri tablosu:

* Timestamp
* PMU ID
* PMU adı
* Frekans
* Gerilim
* Aktif Güç
* Reaktif Güç
* Veri kalite etiketi

Analiz Sonuçları tablosu:

* PMU
* Sinyal
* Bant
* Dominant frequency
* Band RMS
* Peak amplitude
* Damping
* Classification

PMU Kalite tablosu:

* PMU
* Beklenen örnek sayısı
* Gelen örnek sayısı
* Eksik örnek oranı
* Zaman boşluğu sayısı
* Ortalama örnek aralığı
* Maksimum zaman boşluğu

Hesaplama Parametreleri:

* samplingRateHz
* windowSeconds
* stepSeconds
* selectedBands
* selectedSignals
* detrendMethod
* spectrumMethod
* filterMethod

### 14.5 Rapor sekmesi

Rapor sekmesinde otomatik metin üret:

```text
Seçilen zaman aralığında X adet PMU GKÇ fiderinden 10 örnek/saniye çözünürlükte veri alınmıştır. Analizde frekans, gerilim, aktif güç ve reaktif güç sinyalleri değerlendirilmiştir. Ana odak bandı Türkiye inter-area / SAS gözlem bandı olan 0.10–0.20 Hz aralığıdır. Sayfa herhangi bir alarm veya kontrol çıkışı üretmemektedir; sonuçlar mühendislik analizi amacıyla raporlanmaktadır.
```

Rapor içeriği:

* Sorgu bilgileri
* PMU listesi
* Veri kalitesi
* Bant profili
* Baskın modlar
* TR inter-area bulgusu
* Tekli/çoklu PMU yorumu
* Damping sonuçları
* Mode shape sonuçları
* Grafik özetleri
* CSV/PDF/PNG dışa aktarım butonları

---

## 15. TypeScript veri modelleri

Aşağıdaki modelleri oluştur veya mevcut modellere uygun şekilde genişlet:

```ts
export type PmuSelectionMode = "single" | "multi";

export type PmuSignalKey =
  | "frequency"
  | "voltage"
  | "activePower"
  | "reactivePower";

export interface PmuFider {
  id: string;
  name: string;
  substationName?: string;
  voltageLevel?: string;
  bayName?: string;
  isPmu: boolean;
  source?: "YTBS_GKC";
}

export interface PmuSample {
  timestamp: string;
  timestampMs: number;
  sourceZaman?: string;
  pmuId: string;
  frequency?: number;
  voltage?: number;
  activePower?: number;
  reactivePower?: number;
  voltageMagnitudeA?: number;
  voltageMagnitudeB?: number;
  voltageMagnitudeC?: number;
  voltageAngleA?: number;
  voltageAngleB?: number;
  voltageAngleC?: number;
  currentMagnitudeA?: number;
  currentMagnitudeB?: number;
  currentMagnitudeC?: number;
  currentAngleA?: number;
  currentAngleB?: number;
  currentAngleC?: number;
  quality?: string;
}

export interface OscillationBand {
  id: string;
  name: string;
  fMin: number;
  fMax: number;
  enabled: boolean;
  primary?: boolean;
  confidence: "low" | "medium" | "high" | "limited" | "not-supported";
  description?: string;
}

export interface SignalBandMetric {
  pmuId: string;
  signal: PmuSignalKey;
  bandId: string;
  dominantFrequencyHz: number | null;
  bandRms: number | null;
  peakAmplitude: number | null;
  peakToPeakAmplitude: number | null;
  spectralEnergy: number | null;
  dampingRatioPercent: number | null;
  dampingSigma: number | null;
  modePhaseDegree?: number | null;
  classificationLabel: OscillationClassification;
  dataQualityScore: number;
}

export type OscillationClassification =
  | "MOD_YOK"
  | "TEK_PMU_LOKAL_BULGU"
  | "GENIS_ALAN_ADAY_MOD"
  | "TR_INTERAREA_ADAY_MOD"
  | "TR_INTERAREA_GUCLU_MOD"
  | "LOKAL_ELEKTROMEKANIK_ADAY"
  | "FORCED_ADAY"
  | "RINGDOWN_ADAY"
  | "VERI_KALITESI_YETERSIZ";

export interface ModeShapePoint {
  pmuId: string;
  pmuName: string;
  magnitude: number;
  phaseDegree: number;
  relativePhaseDegree: number;
  coherenceAverage?: number;
}

export interface OscillationAnalysisResult {
  query: {
    selectionMode: PmuSelectionMode;
    pmuIds: string[];
    referencePmuId?: string;
    startTime: string;
    endTime: string;
    samplingRateHz: number;
    windowSeconds: number;
    stepSeconds: number;
    selectedSignals: PmuSignalKey[];
    selectedBands: string[];
  };
  dataQuality: {
    expectedSamplesPerSignal: number;
    totalSamples: number;
    missingSampleRatio: number;
    pmuQuality: Array<{
      pmuId: string;
      expected: number;
      received: number;
      missingRatio: number;
      maxGapMs?: number;
    }>;
  };
  metrics: SignalBandMetric[];
  commonModes: Array<{
    modeId: string;
    frequencyHz: number;
    bandId: string;
    participatingPmuIds: string[];
    averageCoherence?: number;
    averageDampingRatioPercent?: number;
    dominantSignal: PmuSignalKey;
    classificationLabel: OscillationClassification;
  }>;
  modeShape?: ModeShapePoint[];
}
```

---

## 16. Zustand store

Yeni store veya mevcut YTBS store genişletmesi oluştur:

```ts
useOscillationStore
```

State alanları:

```ts
selectionMode
selectedPmuIds
referencePmuId
startTime
endTime
selectedSignals
selectedBandProfile
selectedBands
windowSeconds
stepSeconds
rawSamples
analysisResult
queryNotice
queryProgress
loading
analyzing
error
activeTab
```

Actions:

```ts
setSelectionMode(mode)
setSelectedPmuIds(ids)
setReferencePmuId(id)
setDateRange(start, end)
setSelectedSignals(signals)
setBandProfile(profile)
fetchPmuData()
fetchSinglePmuData(pmuId)
fetchMultiPmuDataSequential(pmuIds)
runAnalysis()
clearAnalysis()
exportCsv()
generateReport()
```

Kurallar:

* `selectionMode = single` olduğunda `selectedPmuIds` uzunluğu en fazla 1.
* `selectionMode = multi` olduğunda `selectedPmuIds` uzunluğu en fazla 6.
* `endTime - startTime <= 4 saat`.
* `fetchPmuData` mevcut `src/utils/ytbsQueryChunks.ts` helper’ını veya `useYtbsStore.queryRange` akışını kullanarak PMU sorgusunu 30 dakikalık sıralı parçalara böler.
* Çoklu PMU’da seçilen PMU’lar paralel değil sırayla sorgulanır; her PMU için parça ilerlemesi `queryProgress` içinde gösterilir.
* Her PMU’nun ham `ytbsRawData` örnekleri `src/utils/ytbsPmu.ts` alan haritasıyla `PmuSample` modeline dönüştürülür; `.SSS` milisaniye bilgisi kaybolmaz.
* `runAnalysis` çağrılmadan önce ham veri var mı kontrol et.
* Hata mesajları Türkçe ve anlaşılır olsun.

---

## 17. Analiz utility modülleri

Aşağıdaki dosyaları oluştur:

```text
src/features/oscillation/
  components/
    OscillationPage.tsx
    OscillationFilterBar.tsx
    PmuSelectionControl.tsx
    RawDataCharts.tsx
    SinglePmuAnalysisPanel.tsx
    MultiPmuAnalysisPanel.tsx
    BandEnergyHeatmap.tsx
    SpectrumChart.tsx
    SpectrogramChart.tsx
    DampingChart.tsx
    ModeShapePanel.tsx
    CoherenceMatrix.tsx
    OscillationDetailsTabs.tsx
    OscillationReportPanel.tsx

  store/
    oscillationStore.ts

  utils/
    bands.ts
    signalProcessing.ts
    oscillationMetrics.ts
    modeShape.ts
    coherence.ts
    reportBuilder.ts

  types/
    oscillationTypes.ts
```

`signalProcessing.ts` içinde:

* detrend
* moving average
* bandpass filter
* FFT/Welch helper
* RMS
* peak amplitude
* STFT/spectrogram helper

`oscillationMetrics.ts` içinde:

* calculateBandMetrics
* estimateDominantFrequency
* estimateDampingRatio
* classifyOscillation

`modeShape.ts` içinde:

* calculateModeShape
* calculateRelativePhase
* groupPhaseClusters

`coherence.ts` içinde:

* calculatePairwiseCoherence
* buildCoherenceMatrix

`reportBuilder.ts` içinde:

* buildMarkdownReport
* buildCsvRows
* buildSummaryText

---

## 18. Backend / Tauri tarafı

Mevcut YTBS veri çekme yapısı incelenecek ve öncelikle yeniden kullanılacak. Repo gerçekliği: `ytbs_query_range` komutu ve frontend `useYtbsStore.queryRange` PMU sorgusunda zaten çalışır; `src/utils/ytbsQueryChunks.ts` PMU için 30 dakikalık parça üretir. Yeni backend command ancak salınım sayfası için gerçekten gerekli ek toplu/çoklu PMU adapter’ı gerekiyorsa eklenecek; mevcut PMU parse/mapping tekrar yazılmayacak.

Gerekirse yeni Tauri command eklenecek; bu command mevcut `ytbs_query_range`/client mantığını içeriden yeniden kullanmalı ve çoklu PMU’yu sırayla sorgulamalı:

```rust
#[tauri::command]
async fn fetch_ytbs_gkc_pmu_data(
    pmu_ids: Vec<String>,
    start_time: String,
    end_time: String,
    signals: Vec<String>
) -> Result<Vec<PmuSample>, String>
```

Kurallar:

* YTBS PMU tek sorgu limiti 30 dakikadır; 30 dakikadan uzun PMU aralıkları 30 dakikalık parçalara bölünecek.
* 4 saat tam aralık en fazla 8 PMU sorgu parçası demektir.
* Çoklu PMU’da hem PMU listesi hem de her PMU’nun parçaları sıralı çalışacak; paralel istek atılmayacak.
* 4 saatten uzun sorgu backend tarafında da reddedilecek.
* 6’dan fazla PMU backend tarafında da reddedilecek.
* `YtbsGrafikVerisi` PMU mapping gerçeğini koru: `y1`, `y2-y4`, `y5-y7`, `y8-y10`, `y11-y13`, `y14-y16`.
* Timestamp parse ederken `.000`, `.100`, `.900` gibi milisaniyeli değerleri ayrı örnekler olarak koru.
* Hata halinde `unwrap` veya `expect` kullanma; `Result<T, E>` ile kontrollü hata döndür.
* Veri parse edilemiyorsa PMU/sinyal bazında hata bilgisi üret.
* Mock service içine 10 örnek/s PMU veri üretimi eklensin:

  * frequency: 50 Hz çevresinde küçük salınım
  * voltage: nominal değer çevresinde küçük varyasyon
  * activePower: MW seviyesinde salınım
  * reactivePower: MVAr seviyesinde salınım
  * opsiyonel 0.15 Hz sinüzoidal bileşen

---

## 19. Grafik tasarım ilkeleri

Genel:

* Tema mevcut uygulama ile uyumlu olacak.
* Grafikler koyu/açık temaya uyumlu olacak.
* Tüm grafiklerde zoom, tooltip, legend ve dışa aktarma olmalı.
* Büyük veri için progressive rendering kullanılmalı.
* Ham veri ve analiz grafikleri ayrı renk mantığına sahip olmalı.
* Alarm rengi gibi kırmızı/sarı/yeşil zorunlu durum renkleri kullanılmayacak; sadece analiz yoğunluğu için nötr ölçek kullanılacak.

Ham veri:

* Çizgi grafik
* Zaman ekseni
* Veri boşlukları gap olarak gösterilecek
* Çoklu PMU’da legend üzerinden seri gizleme

Analiz:

* Bant enerji: bar chart
* PMU x bant enerji: heatmap
* Spektrum: line chart
* Spektrogram: heatmap
* Damping: line + envelope
* Mode shape: bar + polar
* Koherens: matrix heatmap
* Sonuçlar: tablo

---

## 20. Kabul kriterleri

Aşağıdaki kabul kriterleri sağlanmadan iş tamamlanmış sayılmayacak:

1. `GKÇ İzleme > Salınım Algılayıcı` sayfası menüden açılıyor.
2. Tekli PMU modu ile yalnızca 1 PMU fideri seçilebiliyor.
3. Çoklu PMU modu ile maksimum 6 PMU fideri seçilebiliyor.
4. Sorgu süresi maksimum 4 saat ile sınırlandırılıyor.
4a. PMU sorguları 30 dakikalık parçalara bölünüyor; 30 dk + 1 dk iki parça, tam 4 saat sekiz parça oluyor.
4b. Çoklu PMU seçildiğinde PMU’lar ve parçalar sırayla sorgulanıyor; UI’da hafif ilerleme bilgisi gösteriliyor.
5. 4 ana ölçüm çekiliyor: frekans, gerilim, aktif güç, reaktif güç.
5a. PMU kaynak verisindeki 6 grup mapping’i doğru korunuyor: Güç, Gerilim Büyüklüğü, Gerilim Fazörü, Akım Büyüklüğü, Akım Fazörü, Frekans.
5b. PMU timestamp değerleri `HH:mm:ss.SSS` çözünürlükte korunuyor; `.000`, `.100`, `.900` aynı saniyeye çökertilmeden ayrı nokta kalıyor.
6. Ham veriler mevcut `YTBS GKÇ Verileri` PMU grafik/mapping yapısına benzer şekilde gösteriliyor.
7. Ham verilerin altında analiz panelleri ayrıntılı gösteriliyor.
8. Frekans, gerilim, aktif güç ve reaktif güç için aynı bantlar kullanılıyor; metrikler ayrı hesaplanıyor.
9. Varsayılan ana bant `TR Inter-area / SAS Gözlem Bandı: 0.10–0.20 Hz`.
10. 10 örnek/s nedeniyle 5 Hz ve üzeri analiz yapılmıyor.
11. 4.5–5.0 Hz Nyquist tampon bölgesi pasif.
12. 5–14 Hz torsiyonel band pasif ve “desteklenmiyor” açıklamasıyla gösteriliyor.
13. Tekli PMU’da band RMS, FFT/Welch, spektrogram, filtrelenmiş sinyal ve damping gösteriliyor.
14. Çoklu PMU’da PMU x bant heatmap, ortak mod tablosu, mode shape, faz grupları ve koherens matrisi gösteriliyor.
15. Sayfa alarm üretmiyor.
16. Sayfa sesli/görsel ikaz üretmiyor.
17. Sayfa SVK/STATKOM/BESS kontrol çıkışı üretmiyor.
18. “Alarm” yerine “Bulgu”, “Mod”, “Sınıflandırma”, “Rapor” terminolojisi kullanılıyor.
19. `Veriler / Ayrıntılar` sekmesinde ham veri, analiz sonuçları, veri kalitesi ve hesaplama parametreleri gösteriliyor.
20. `Rapor` sekmesinde otomatik mühendislik raporu metni oluşturuluyor.
21. CSV dışa aktarma çalışıyor.
22. Grafik dışa aktarma çalışıyor.
23. Mock servisle 10 örnek/s PMU verisi simüle edilebiliyor.
24. TypeScript’te `any` kullanılmıyor.
25. Rust tarafında `unwrap` / `expect` kullanılmıyor.
26. UI büyük veriyle donmuyor.
27. Testler ekleniyor veya mevcut test yapısına uygun kontroller yazılıyor.

---

## 21. Test senaryoları

### 21.1 Tekli PMU testi

```text
Seçim modu: Tekli PMU
PMU: 1 adet
Süre: 2 saat
Sinyaller: Frekans, Gerilim, Aktif Güç, Reaktif Güç
Beklenen:
  - Ham veri grafikleri görünür
  - Tekli analiz panelleri görünür
  - Mode shape sekmesi sınırlı bilgi verir
  - Rapor oluşturulur
```

### 21.2 Çoklu PMU testi

```text
Seçim modu: Çoklu PMU
PMU: 6 adet
Süre: 4 saat
Beklenen:
  - Çoklu ham veri grafikleri görünür
  - PMU x bant heatmap oluşur
  - Ortak mod tablosu oluşur
  - Mode shape paneli çalışır
  - Koherens matrisi oluşur
  - Rapor oluşturulur
```

### 21.3 Süre sınırı testi

```text
Süre: 4 saat 1 dakika
Beklenen:
  - Veriyi Getir butonu pasif
  - “Maksimum sorgu süresi 4 saattir” mesajı görünür
```

### 21.3a PMU parçalı sorgu testi

```text
Süre: 30 dakika
Beklenen:
  - 1 parça sorgu oluşur

Süre: 31 dakika
Beklenen:
  - 2 parça sorgu oluşur
  - 2. parça ilk parçanın bitişinden başlar

Süre: 4 saat
Beklenen:
  - 8 parça sorgu oluşur
  - PMU sorguları sırayla çalışır

Çoklu PMU: 3 PMU, süre 1 saat
Beklenen:
  - Her PMU için 2 parça, toplam 6 sıralı sorgu çalışır
  - Paralel YTBS isteği atılmaz
  - Sonuçlar PMU ve timestamp bazlı hizalanır
```

### 21.3b PMU milisaniye ve mapping testi

```text
Girdi timestamp değerleri: 16.05.2026 22:00:02.000, 16.05.2026 22:00:02.100, 16.05.2026 22:00:02.900
Beklenen:
  - 3 ayrı nokta korunur
  - Eksen/tooltip HH:mm:ss.SSS gösterir
  - Güç y14/y15/y16, gerilim y2/y3/y4, frekans y1 alanlarından üretilir
```

### 21.4 PMU sınırı testi

```text
Çoklu modda 7 PMU seçilmeye çalışılır
Beklenen:
  - 7. seçim engellenir
  - “En fazla 6 PMU fideri seçilebilir” mesajı gösterilir
```

### 21.5 Bant sınırı testi

```text
Özel bant üst sınırı 5 Hz veya üzeri girilir
Beklenen:
  - Reddedilir
  - “10 örnek/s veri ile 4.5 Hz üzeri güvenilir analiz desteklenmez” mesajı gösterilir
```

---

## 22. Çıktı

İşi bitirdiğinde aşağıdaki çıktıları üret:

```text
1. Geliştirilen/eklenen dosyaların listesi
2. Kısa teknik açıklama
3. UI kullanım akışı
4. Hesaplama metotları özeti
5. Test senaryoları ve sonuçları
6. Varsa kalan riskler / TODO listesi
```

Kod okunabilir, modüler ve mevcut proje mimarisine uyumlu olacak. Sayfa bir kontrol/koruma ekranı değil, mühendislik amaçlı PMU salınım modu analiz ve raporlama ekranıdır.

En az şu mevcut doğrulama komutlarını çalıştır veya salınım sayfası için eşdeğer yeni testlerle birlikte raporla:

```text
npm run test:ytbs-pmu
npm run test:ui-state
cargo test
npm run build
```

```
::contentReference[oaicite:4]{index=4}
```

[1]: https://en.wikipedia.org/wiki/Nyquist%E2%80%93Shannon_sampling_theorem?utm_source=chatgpt.com "Nyquist–Shannon sampling theorem"
