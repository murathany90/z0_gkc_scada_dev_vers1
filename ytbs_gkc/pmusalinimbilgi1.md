# GKÇ Salınım Algılayıcı Sayfası için Güncellenmiş Bant, Analiz ve UI Raporu

Bu güncellemede önceki varsayılan bant yapısı düzeltilmelidir. Çünkü dünyadaki PMU tabanlı salınım algılama sistemlerinde bantlar genellikle elektromekanik mod tiplerine göre tanımlanır; ancak sizin uygulamanızdaki veri **10 örnek/saniye** olduğu için RTDMS/NASPI’de verilen tüm bantlar aynen alınamaz. NASPI/RTDMS örneğinde salınım algılama için 0.01–0.15 Hz governor bandı, 0.15–1.0 Hz inter-area elektromekanik bandı, 1.0–5.0 Hz lokal/kontrol sistemi bandı ve 5.0–14 Hz torsiyonel dinamik bandı kullanılmıştır.  Fakat 10 örnek/saniye veride Nyquist sınırı 5 Hz olduğu için **5–14 Hz torsiyonel bandı kesinlikle analiz dışı bırakılmalıdır**; 1–5 Hz bandı da pratikte 1–4.5 Hz olarak sınırlandırılmalıdır.

Türkiye özelinde SAS şartnamesinde hedeflenen sistem, 0.1–0.2 Hz aralığındaki bölgeler arası salınımları algılayıp SVK/STATKOM/BESS gibi FACTS elemanlarına hızlı binary komut göndererek sönümlemeye katkı sağlayan bir kontrol sistemidir. Şartnamede bu bant için 10 mHz eşik, 9 mHz altında tepki vermeme, 11 mHz üzerinde mutlaka tepki verme ve bant dışı 0.085 Hz altı / 0.23 Hz üstü bileşenlere tepki vermeme kriterleri tanımlanmıştır.  Sizin geliştirilecek **GKÇ İzleme > Salınım Algılayıcı** sayfanız ise SAS-C gibi kontrol üretmeyecek; **PMU verisinden salınım modlarını tespit edip raporlayacak** bir analiz ve gözlem sayfası olacaktır. Bu nedenle tasarımda “alarm”, “sesli uyarı”, “binary çıkış”, “kapasitif/endüktif aksiyon” yerine **bulgu, mod tespiti, enerji seviyesi, damping ratio, mod şekli ve rapor** kavramları kullanılmalıdır.

---

## 1. 10 örnek/saniye PMU verisiyle kullanılacak güncel bant yapısı

10 örnek/saniye veri için:

[
f_s = 10 \text{ Hz}
]

[
f_{Nyquist} = \frac{f_s}{2} = 5 \text{ Hz}
]

Bu nedenle 5 Hz üzerindeki hiçbir mod güvenilir şekilde tespit edilemez. Ayrıca filtre geçiş bandı ve aliasing etkileri nedeniyle üst analiz sınırı 5.0 Hz değil, pratikte **4.5 Hz** alınmalıdır.

Önerilen uygulama bantları aşağıdaki gibi olmalıdır:

| Bant kodu |  Frekans aralığı | Adı                                            | Amaç                                                                                          | 10 örnek/s için durum       |
| --------- | ---------------: | ---------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------- |
| B0        |     0.02–0.05 Hz | Çok yavaş salınım / trend ayrımı               | Çok uzun periyotlu sistem salınımı veya trend etkisi                                          | Raporlanabilir, güven düşük |
| B1        |     0.05–0.10 Hz | Düşük frekanslı geniş alan salınımı            | Türkiye SAS bandı dışındaki çok yavaş geniş alan davranışı                                    | Raporlanabilir              |
| B2        | **0.10–0.20 Hz** | **Türkiye inter-area / SAS gözlem bandı**      | Türkiye’de SAS cihazlarının hedeflediği bölgeler arası salınım bandı                          | Ana bant                    |
| B3        |     0.20–0.70 Hz | Genel inter-area elektromekanik bant           | Dünya uygulamalarındaki daha geniş inter-area modlar                                          | Raporlanabilir              |
| B4        |     0.70–2.00 Hz | Lokal jeneratör / lokal elektromekanik mod     | Santral, üretim bölgesi, lokal salınım                                                        | Raporlanabilir              |
| B5        |     2.00–4.50 Hz | Kontrol sistemi / zorlanmış salınım göstergesi | SVC, HVDC, inverter, kontrol çevrimi kaynaklı hızlı salınımlar için düşük çözünürlüklü tarama | Sınırlı güven               |
| B6        |     4.50–5.00 Hz | Nyquist tampon bölgesi                         | Analiz yapılmaz                                                                               | Kullanılmamalı              |
| B7        |    5.00–14.00 Hz | Torsiyonel dinamik bandı                       | RTDMS/NASPI’de vardır                                                                         | 10 örnek/s ile desteklenmez |

Bu tabloya göre uygulamada varsayılan ana odak **B2: 0.10–0.20 Hz Türkiye inter-area bandı** olmalıdır. Dünya uygulamalarına uyum için B3 ve B4 eklenmelidir. RTDMS’teki 5–14 Hz torsiyonel bandı, mevcut veri hızıyla gösterilmemeli veya “desteklenmiyor” olarak pasif görünmelidir. Inter-area salınımların literatürde genellikle 0.1–1 Hz aralığında ele alındığı da yaygın bir kabuldür; örneğin geniş alan sönümleme çalışmalarında inter-area frekans aralığı 0.1–1 Hz olarak verilir. ([arXiv][1])

---

## 2. Türkiye inter-area bandı nasıl ele alınmalı?

Türkiye için yazılımda özel bir “TR Inter-Area” profili tanımlanmalıdır:

```text
Profil adı: TR_INTERAREA_SAS_OBSERVATION
Ana bant: 0.10–0.20 Hz
Gözlem tamponu: 0.085–0.23 Hz
Rapor metriği: frekans, genlik, band RMS, damping ratio, mod fazı, PMU katılımı
Kontrol/aksiyon: yok
Alarm: yok
Rapor etiketi: Inter-area aday mod / doğrulanmış mod / zayıf bulgu
```

Burada 0.085–0.23 Hz aralığı kontrol için değil, **analiz tamponu** için kullanılmalıdır. Çünkü gerçek veride filtre geçişleri, spektral sızıntı ve pencere etkileri nedeniyle 0.10 Hz veya 0.20 Hz sınırına yakın bileşenler tam sınırda görünmeyebilir. Ancak sonuç raporunda “Türkiye inter-area modu” olarak sınıflandırmak için nihai baskın frekansın 0.10–0.20 Hz içinde olması gerekir.

SAS şartnamesindeki 10 mHz eşik, SAS-C’nin SVK/STATKOM/BESS aksiyonuna geçmesi için verilmiş bir kontrol eşiğidir. Sizin GKÇ Salınım Algılayıcı yazılımınızda bu değer **alarm eşiği değil**, sadece “SAS şartname referansı” olarak gösterilmelidir. Örneğin:

```text
Baskın mod: 0.143 Hz
Frekans salınım genliği: 1.41 mHz
SAS referans eşiği: 10 mHz
Yorum: SAS aksiyon seviyesinin altında, ancak raporlanabilir inter-area aday mod.
```

---

## 3. Frekans, gerilim, aktif güç ve reaktif güç için ayrı bant mı tanımlanmalı?

Kısa cevap: **Frekans bantları aynı olmalı, metrik ve eşik yapısı ayrı olmalıdır.**

Salınım modu fiziksel olarak sistemin bir dinamik modudur. Aynı 0.15 Hz inter-area mod, frekansta mHz seviyesinde, aktif güçte MW seviyesinde, reaktif güçte MVAr seviyesinde, gerilimde kV veya pu seviyesinde görülebilir. Bu nedenle her ölçüm için farklı frekans bandı tanımlamak doğru değildir. Doğru yaklaşım:

```text
Aynı modal frekans bantları:
B0, B1, B2, B3, B4, B5

Ayrı sinyal metrikleri:
Frekans: mHz, band RMS, tepe genlik
Gerilim: kV veya pu, band RMS, tepe genlik
Aktif güç: MW, band RMS, enerji
Reaktif güç: MVAr, band RMS, enerji
```

Önerilen yapı:

| Ölçüm                | Kullanılacak bantlar | Ana metrik           | Ek metrik               | Not                                                      |
| -------------------- | -------------------- | -------------------- | ----------------------- | -------------------------------------------------------- |
| Frekans              | B0–B5                | mHz genlik, band RMS | damping, baskın frekans | Türkiye inter-area için en kritik sinyal                 |
| Gerilim              | B0–B5                | kV veya pu genlik    | band RMS, faz ilişkisi  | SVC/SVK etkisini görmek için önemli                      |
| Aktif güç            | B0–B5                | MW salınım genliği   | enerji, mode shape      | Inter-area güç salınımında çok gözlenebilir              |
| Reaktif güç          | B0–B5                | MVAr salınım genliği | gerilimle korelasyon    | SVC/STATKOM etkisi için önemli                           |
| Gerilim fazörü açısı | B0–B5                | derece salınımı      | PMU arası açı farkı     | Mod şekli ve alan ayrımı için en güçlü sinyallerden biri |
| Akım fazörü          | B0–B5                | A veya pu            | güç hesabı doğrulama    | UI’da ikincil veri olarak tutulabilir                    |

Yani UI filtre barında “bant seçimi” ortak olmalı; ama “metrik seçimi” her sinyal için ayrı çalışmalıdır.

Örnek yapı:

```text
Bant seçimi:
[TR 0.10–0.20] [Genel inter-area 0.20–0.70] [Lokal 0.70–2.00] [Kontrol 2.00–4.50]

Sinyal seçimi:
[Frekans] [Gerilim] [Aktif Güç] [Reaktif Güç] [Gerilim Açısı]

Metrik seçimi:
[Band RMS] [Tepe Genlik] [Damping Ratio] [Baskın Frekans] [Mod Fazı] [Koherens]
```

---

## 4. 10 örnek/saniye veriyle yapılabilecek hesaplamalar

### 4.1 Pencere seçimi

30 dakika sınırı:

[
T_{max} = 30 \times 60 = 1800 \text{ s}
]

10 örnek/saniye için maksimum örnek sayısı:

[
N = 1800 \times 10 = 18000
]

Frekans çözünürlüğü:

[
\Delta f = \frac{1}{T}
]

30 dakika tüm pencere kullanılırsa:

[
\Delta f = \frac{1}{1800} = 0.000556 \text{ Hz}
]

Fakat operasyonel analiz için tek bir 30 dakikalık FFT yeterli değildir; kayan pencere kullanılmalıdır.

Önerilen pencere ayarları:

| Analiz amacı                      | Pencere |        Adım | Çözünürlük |
| --------------------------------- | ------: | ----------: | ---------: |
| Hızlı ön tarama                   |    60 s |        10 s |  0.0167 Hz |
| Türkiye inter-area kararlı analiz |   120 s |     10–20 s |  0.0083 Hz |
| Rapor kalitesi yüksek analiz      |   300 s |        30 s |  0.0033 Hz |
| 30 dk genel özet                  |  1800 s | tek pencere | 0.00056 Hz |

0.10–0.20 Hz aralığında bir salınımın periyodu:

[
T_{osc} = \frac{1}{f}
]

0.10 Hz için:

[
T_{osc}=10 \text{ s}
]

0.20 Hz için:

[
T_{osc}=5 \text{ s}
]

Bu nedenle 120 saniyelik pencere, 0.10 Hz mod için 12 çevrim; 0.20 Hz mod için 24 çevrim içerir. Bu, band RMS, FFT ve damping tahmini için yeterlidir.

---

### 4.2 Her sinyal için band RMS

Her PMU ve her sinyal için önce trend temizlenir:

[
x_d[n] = x[n] - \text{trend}(x[n])
]

Sonra seçilen bantta filtrelenir:

[
x_B[n] = BPF_{f_1,f_2}(x_d[n])
]

Band RMS:

[
A_{RMS,B} = \sqrt{\frac{1}{N}\sum_{n=1}^{N}x_B[n]^2}
]

Sinüzoidal kabulde tepe genlik:

[
A_{peak,B} = \sqrt{2} \cdot A_{RMS,B}
]

Bu hesap frekans için mHz, gerilim için kV/pu, aktif güç için MW, reaktif güç için MVAr olarak ayrı ayrı raporlanmalıdır.

---

### 4.3 Baskın frekans

Welch veya FFT spektrumu:

[
P_{xx}(f)=|\text{FFT}(x_d)|^2
]

Seçilen bantta baskın frekans:

[
f_{dom} = \arg\max_{f \in [f_1,f_2]} P_{xx}(f)
]

Türkiye bandı için:

[
f_{dom,TR} = \arg\max_{f \in [0.10,0.20]} P_{xx}(f)
]

---

### 4.4 Damping ratio

Filtrelenmiş sinyalin zarfı Hilbert dönüşümüyle hesaplanabilir:

[
e[n] = |\mathcal{H}(x_B[n])|
]

Zarf logaritması doğrusal regresyona sokulur:

[
\ln(e[n]) = a + \sigma t_n
]

Burada (\sigma) sönüm katsayısıdır. Baskın açısal frekans:

[
\omega_d = 2\pi f_{dom}
]

Damping ratio:

[
\zeta = \frac{-\sigma}{\sqrt{\sigma^2+\omega_d^2}}
]

Yazılımda damping ratio yüzde olarak gösterilmelidir:

[
DR(%) = 100 \cdot \zeta
]

Sürekli/zorlanmış salınımda zarf azalmayabilir; bu durumda damping ratio “yaklaşık 0” veya “sürekli salınım / forced aday” olarak raporlanmalıdır. NASPI’deki RTDMS açıklamasında mode meter uygulamasının modal frekans, damping ratio, enerji genliği ve mode shape tahmin ettiği; forced oscillation uygulamasının da RMS enerji ve spektral şekil kullandığı belirtilmektedir. 

---

### 4.5 PMU arası mod şekli

Maksimum 6 PMU için aynı frekansta kompleks katsayı hesaplanır:

[
C_i(f_0)=\sum_{n=0}^{N-1}x_i[n]e^{-j2\pi f_0 n/f_s}
]

Her PMU için:

[
|C_i| = \text{mod katılım genliği}
]

[
\angle C_i = \text{mod fazı}
]

Referans PMU seçilir:

[
\Delta \phi_i = \angle C_i - \angle C_{ref}
]

UI’da bu veri şu şekilde gösterilmelidir:

| PMU   | Genlik | Referansa göre faz | Yorum                                   |
| ----- | -----: | -----------------: | --------------------------------------- |
| PMU-1 | yüksek |                 0° | Referans                                |
| PMU-2 | yüksek |               175° | Karşı faz / inter-area ayrım göstergesi |
| PMU-3 |  düşük |                20° | Zayıf katılım                           |
| PMU-4 |   orta |               160° | Karşı bölge adayı                       |

Inter-area modlarda farklı bölgelerdeki PMU’lar genellikle belirli faz gruplarına ayrılır. Tek PMU ile mod frekansı ve genlik bulunabilir; fakat gerçek mod şekli ve alanlar arası salınım yorumu için en az 2, tercihen 4–6 PMU gerekir.

---

## 5. “Salınım tespiti” değil, “salınım modu raporlama” yaklaşımı

Sizin notunuza göre bu sayfa alarm üreten bir kontrol ekranı değil, analiz ve raporlama ekranıdır. Bu nedenle terminoloji şu şekilde değiştirilmelidir:

| Önceki ifade                  | Yeni ifade                         |
| ----------------------------- | ---------------------------------- |
| Salınım alarmı                | Salınım bulgusu                    |
| Alarm seviyesi                | Enerji seviyesi / önem derecesi    |
| Sesli/görsel uyarı            | Rapor etiketi / analiz etiketi     |
| Eşik aşımı                    | Referans değer karşılaştırması     |
| Kontrol aksiyonu              | Yok                                |
| Pozitif/negatif çevrim çıkışı | Yok                                |
| Operatör müdahale ekranı      | Mühendislik analiz ve rapor ekranı |

SAS şartnamesindeki izleme modülü, SAS-C değişkenlerinin gösterilmesini, frekans/tepki grafiğini, PMU’dan alınan gerilim/güç/frekans grafiklerini, aktif ve reaktif güçlerin tek grafikte toplamla gösterilmesini ve grafiklerin dışa aktarılmasını ister.  Fakat GKÇ Salınım Algılayıcı sayfasında sesli/görsel alarm yerine **analiz sonucu ve rapor üretimi** önceliklendirilmelidir.

---

## 6. 1 PMU GKÇ fideri için UI tasarımı

Tek PMU seçildiğinde amaç, seçilen fiderdeki 4 ana ölçümün salınım içeriğini göstermek olmalıdır.

### 6.1 Üst filtre barı

```text
GKÇ İzleme > Salınım Algılayıcı

[Başlangıç zamanı] [Bitiş zamanı]     Maksimum: 30 dakika
[GKÇ Cihaz Türü: PMU]
[PMU GKÇ Fideri seç]
[Sinyaller: Frekans | Gerilim | Aktif Güç | Reaktif Güç]
[Bant Profili: TR Inter-area 0.10–0.20 | Genel | Özel]
[Pencere: 60s | 120s | 300s]
[Analizi Başlat] [Excel Dışa Aktar] [Rapor Oluştur]
```

### 6.2 Özet bilgi kartları

Tek PMU için üstte 5 kart olmalıdır:

```text
Kart 1: Baskın Bant
TR Inter-area 0.10–0.20 Hz

Kart 2: Baskın Frekans
0.143 Hz

Kart 3: En Yüksek Katılım Sinyali
Aktif Güç / Frekans / Gerilim / Reaktif Güç

Kart 4: Damping Ratio
%X veya "sürekli / forced aday"

Kart 5: Rapor Yorumu
"0.10–0.20 Hz bandında zayıf/orta/yüksek enerji gözlendi"
```

Renkler alarm rengi gibi kullanılmamalıdır. “Kırmızı alarm” yerine nötr analiz etiketleri kullanılmalıdır:

```text
Düşük enerji
Orta enerji
Yüksek enerji
Raporlanabilir mod
Doğrulama gerekli
```

### 6.3 Ham veri grafikleri

YTBS GKÇ Verileri sayfasındaki grafik yapısı korunarak dört grafik alt alta verilmelidir:

```text
1. Frekans zaman serisi
2. Gerilim zaman serisi
3. Aktif güç zaman serisi
4. Reaktif güç zaman serisi
```

Her grafikte seçilen zaman aralığı, zoom, tooltip, export ve veri imleci bulunmalıdır.

### 6.4 Analiz grafikleri

Ham verilerin altında şu analiz blokları yer almalıdır:

| Blok                | Grafik tipi  | İçerik                             |
| ------------------- | ------------ | ---------------------------------- |
| Bant enerji özeti   | Bar grafik   | B0–B5 band RMS değerleri           |
| Spektrum            | Çizgi grafik | FFT/Welch spektrumu                |
| Spektrogram         | Isı haritası | Zaman-frekans enerji dağılımı      |
| Filtrelenmiş sinyal | Çizgi grafik | Seçilen banttaki salınım bileşeni  |
| Damping analizi     | Çizgi + zarf | Hilbert zarfı ve damping fit       |
| Rapor tablosu       | Tablo        | f_dom, genlik, RMS, damping, yorum |

Tek PMU’da “mode shape” gösterimi sınırlı olmalıdır; çünkü mode shape PMU’lar arası karşılaştırma gerektirir. Tek PMU için yalnızca “tek nokta modal bulgu” gösterilmelidir.

---

## 7. Maksimum 6 PMU GKÇ fideri için UI tasarımı

6 PMU seçildiğinde ekran tek tek PMU analizinden çok, karşılaştırmalı modal analiz ekranına dönüşmelidir.

### 7.1 Üst bölüm

```text
Seçilen PMU sayısı: 6 / 6
Zaman aralığı: 30 dk
Veri çözünürlüğü: 10 örnek/s
Bant profili: TR Inter-area 0.10–0.20
Referans PMU: PMU-1
```

### 7.2 PMU özet kart grid’i

6 PMU için 2x3 kart dizilimi önerilir:

```text
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PMU-1        │ │ PMU-2        │ │ PMU-3        │
│ f_dom        │ │ f_dom        │ │ f_dom        │
│ RMS          │ │ RMS          │ │ RMS          │
│ DR           │ │ DR           │ │ DR           │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ PMU-4        │ │ PMU-5        │ │ PMU-6        │
│ f_dom        │ │ f_dom        │ │ f_dom        │
│ RMS          │ │ RMS          │ │ RMS          │
│ DR           │ │ DR           │ │ DR           │
└──────────────┘ └──────────────┘ └──────────────┘
```

Her kartta sinyal seçici bulunmalıdır:

```text
[Frekans] [Gerilim] [P] [Q]
```

### 7.3 Çoklu PMU ham veri gösterimi

Her sinyal için çoklu çizgi grafiği:

```text
Frekans - 6 PMU üst üste
Gerilim - 6 PMU üst üste
Aktif güç - 6 PMU üst üste
Reaktif güç - 6 PMU üst üste
```

Grafikte PMU aç/kapat legend’i olmalıdır. Aynı anda 6 PMU x 4 sinyal gösterileceği için varsayılan görünümde sadece seçili sinyal açılmalı, diğerleri sekmeli olmalıdır.

### 7.4 PMU x bant enerji ısı haritası

Bu grafik 6 PMU için çok değerlidir:

| PMU / Bant |    B0 |    B1 |  B2 TR |    B3 |    B4 |    B5 |
| ---------- | ----: | ----: | -----: | ----: | ----: | ----: |
| PMU-1      | düşük | düşük | yüksek |  orta | düşük | düşük |
| PMU-2      | düşük | düşük | yüksek |  orta | düşük | düşük |
| PMU-3      | düşük | düşük |  düşük | düşük | düşük | düşük |
| PMU-4      | düşük | düşük | yüksek | düşük | düşük | düşük |
| PMU-5      | düşük | düşük |   orta | düşük | düşük | düşük |
| PMU-6      | düşük | düşük | yüksek | düşük | düşük | düşük |

Bu, hangi PMU’nun hangi bantta daha fazla salınım enerjisi taşıdığını gösterir.

### 7.5 Mode shape paneli

6 PMU için mod şekli paneli zorunlu olmalıdır:

```text
Seçilen mod: 0.143 Hz
Referans PMU: PMU-1

Grafikler:
- PMU genlik bar grafiği
- PMU faz açıları polar grafik
- Harita/şema üzerinde PMU katılım büyüklüğü
- PMU faz grubu: 0° grubu / 180° grubu
```

Özellikle 0.10–0.20 Hz Türkiye inter-area bandında iki PMU grubunun yaklaşık karşı fazlı görünmesi, bölgeler arası salınım yorumunu güçlendirir.

### 7.6 Koherens ve doğrulama paneli

6 PMU için her PMU çifti arasında seçilen frekansta koherens hesaplanabilir:

[
\gamma^2_{xy}(f)=\frac{|P_{xy}(f)|^2}{P_{xx}(f)P_{yy}(f)}
]

Yorum:

```text
Koherens > 0.8: Aynı mod güçlü olasılık
0.5–0.8: Orta ilişki
< 0.5: Zayıf ilişki
```

Bu panel, tek bir PMU’daki yerel gürültüyü gerçek geniş alan modundan ayırmaya yardımcı olur.

---

## 8. Güncellenmiş salınım sınıflandırma mantığı

Uygulama “alarm” üretmeyecek; aşağıdaki sınıflandırma etiketlerini üretecek:

| Etiket                   | Koşul                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Mod yok / belirgin değil | Bant enerjisi zayıf, PMU’lar arası koherens düşük           |
| Tek PMU lokal bulgu      | Sadece bir PMU’da enerji yüksek                             |
| Geniş alan aday mod      | En az 2 PMU’da aynı bantta baskın frekans var               |
| Inter-area aday mod      | 0.10–0.20 Hz içinde, en az 2 PMU’da ortak frekans var       |
| Güçlü inter-area mod     | 0.10–0.20 Hz, yüksek koherens, PMU faz ayrımı belirgin      |
| Forced aday              | Genlik uzun süre sabit, damping yaklaşık sıfır veya negatif |
| Ringdown aday            | Bozucu olay sonrası genlik zarfı azalan salınım             |

NASPI örneklerinde lokal salınımlarda bir veya birkaç PMU’nun, geniş alan salınımlarında ise geniş coğrafyadaki çok sayıda PMU’nun etkilendiği belirtilir.  Bu yaklaşım 6 PMU sınırı içinde “kaç PMU etkileniyor?” ve “faz ilişkisi nasıl?” mantığıyla uygulanmalıdır.

---

## 9. Uygulamada önerilen varsayılan ayarlar

```json
{
  "samplingRateHz": 10,
  "maxQueryMinutes": 30,
  "defaultWindowSeconds": 120,
  "defaultStepSeconds": 10,
  "defaultProfile": "TR_INTERAREA_SAS_OBSERVATION",
  "bands": [
    {
      "id": "B0",
      "name": "Cok Yavas Trend / Salinim",
      "fMin": 0.02,
      "fMax": 0.05,
      "enabled": true,
      "purpose": "trend ayrimi"
    },
    {
      "id": "B1",
      "name": "Dusuk Frekans Genis Alan",
      "fMin": 0.05,
      "fMax": 0.10,
      "enabled": true,
      "purpose": "SAS bandi alti genis alan izleme"
    },
    {
      "id": "B2",
      "name": "TR Inter-area / SAS Gozlem",
      "fMin": 0.10,
      "fMax": 0.20,
      "enabled": true,
      "primary": true,
      "purpose": "Turkiye inter-area modu"
    },
    {
      "id": "B3",
      "name": "Genel Inter-area Elektromekanik",
      "fMin": 0.20,
      "fMax": 0.70,
      "enabled": true
    },
    {
      "id": "B4",
      "name": "Lokal Elektromekanik",
      "fMin": 0.70,
      "fMax": 2.00,
      "enabled": true
    },
    {
      "id": "B5",
      "name": "Kontrol / Forced Aday",
      "fMin": 2.00,
      "fMax": 4.50,
      "enabled": true,
      "confidence": "limited"
    },
    {
      "id": "B7",
      "name": "Torsiyonel Dinamik",
      "fMin": 5.00,
      "fMax": 14.00,
      "enabled": false,
      "reason": "10 ornek/s veri ile Nyquist siniri nedeniyle desteklenmez"
    }
  ],
  "signals": ["frequency", "voltage", "activePower", "reactivePower"],
  "analysisOutputs": [
    "dominantFrequency",
    "bandRms",
    "peakAmplitude",
    "dampingRatio",
    "modeShape",
    "coherence",
    "classification",
    "engineeringReport"
  ],
  "alarmEnabled": false,
  "controlEnabled": false
}
```

---

## 10. Sonuç

GKÇ İzleme sekmesindeki Salınım Algılayıcı sayfası için varsayılan bantlar şu şekilde güncellenmelidir:

1. **Ana bant Türkiye inter-area bandı olmalı:** 0.10–0.20 Hz.
2. **0.085–0.23 Hz sadece analiz tamponu olarak kullanılmalı:** sınıflandırma yine 0.10–0.20 Hz’e göre yapılmalı.
3. **Dünya uygulamalarıyla uyumlu genel elektromekanik bantlar eklenmeli:** 0.20–0.70 Hz ve 0.70–2.00 Hz.
4. **10 örnek/s nedeniyle 5–14 Hz torsiyonel bant kaldırılmalı:** desteklenmiyor olarak pasif kalmalı.
5. **Frekans, gerilim, aktif güç ve reaktif güç için aynı frekans bantları kullanılmalı:** ancak her ölçümün genlik, RMS, enerji ve rapor metrikleri ayrı olmalı.
6. **Tek PMU görünümünde ham veri + tek nokta spektrum/damping analizi sunulmalı.**
7. **6 PMU görünümünde karşılaştırmalı mod şekli, PMU x bant ısı haritası, koherens ve faz grupları gösterilmeli.**
8. **Alarm ve kontrol fonksiyonları çıkarılmalı:** sayfa sadece salınım modlarının tespiti, yorumlanması ve raporlanması için kullanılmalı.

Bu yapı hem Türkiye’deki SAS 0.10–0.20 Hz inter-area gerçeğine uyumlu olur, hem de dünyadaki PMU tabanlı salınım izleme sistemlerinde kullanılan modal analiz yaklaşımını 10 örnek/saniye veri kısıtı içinde doğru şekilde uygular.

[1]: https://arxiv.org/abs/1909.06687?utm_source=chatgpt.com "Measurement-Based Wide-Area Damping of Inter-Area Oscillations based on MIMO Identification"
