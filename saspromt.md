
**Rol ve Bağlam:**
Sen, yüksek performanslı web uygulamaları (Tauri + React + TypeScript) ve dijital sinyal işleme konularında uzman kıdemli bir yazılım mühendisisin. Projemizde yer alan `sas.md` mimarisine uygun olarak, TEİAŞ güç sistemlerindeki Fazör Ölçüm Birimi (PMU) verilerini analiz ettiğimiz "Salınım Algılayıcı" (Oscillation Detector) sayfasında bazı yapısal ve matematiksel güncellemeler yapmanı istiyorum. 

Sistem `Zustand` ile state yönetimi yapmakta, ağır hesaplamaları `Web Worker` içinde çözmekte ve grafikleri `Apache ECharts` (LTTB destekli) ile çizmektedir. Aşağıdaki yönergelere göre sistemi güncellemek için bana bir geliştirme planı ve gerekli mimari/algoritma güncellemelerini hazırla.

**GÖREV 1: Salınım Bantlarının Yeniden Tanımlanması**
Mevcut spektrum bant yapısını tamamen kaldırıp, aşağıdaki 4 yeni salınım bandını sisteme entegre etmelisin:
*   **Bant 1 (Interarea - Bölgeler Arası):** 0.1 Hz - 0.4 Hz
*   **Bant 2 (Local - Yerel):** 0.4 Hz - 2.0 Hz
*   **Bant 3 (Forced - Zorlanmış):** 2.0 Hz - 4.5 Hz
*   **Bant 4 (Torsiyon - Pasif):** 4.5 Hz ve üstü (10 Hz'lik PMU sınırları veya Nyquist teoremine göre bu bölge analiz dışı/pasif kabul edilecektir).

**GÖREV 2: Parametrik Eşik (Threshold) ve Filtre Çubuğu Geliştirmesi**
Sayfanın üst kısmında bulunan filtre/parametre çubuğuna (UI) "Salınım Genlik Eşiği (mHz)" adında yeni bir parametrik girdi alanı ekle. Varsayılan (default) değer **10 mHz** olmalıdır. Sinyal işleme motorumuz, yalnızca genliği bu parametrik değeri aşan bantları "salınım var" olarak etiketleyecektir.

**GÖREV 3: Algoritmalar ve Matematiksel Hesaplamalar (Web Worker İçin)**
Web Worker içerisindeki matematiksel analizi şu formüller ve algoritmalarla güncellemelisin:

*   **A. Genlik (Amplitude) Hesabı:** 
    Sinyalin "Linear Detrending" (doğrusal eğimden arındırma) işleminden geçtikten sonra, Kayan Pencere (Sliding Window) ve Hızlı Fourier Dönüşümü (FFT) veya Zarf Çıkarımı (Envelope/RMS) ile her pencere için genliği ($\hat{A}$) hesaplanmalıdır. İlgili frekans bandındaki spektral tepe noktasının genliği, UI'dan gelen "Genlik Eşiği (Örn: 10 mHz)" ile kıyaslanacaktır.
*   **B. Mod Karar Algoritması:**
    Kayan pencere zaman ekseninde ilerlerken, hangi bandın genliği eşiği (10 mHz) aşıyorsa o banda ait tamsayı değeri diziye yazılacaktır:
    *   Local bandı eşiği aşarsa: **1**
    *   Interarea bandı eşiği aşarsa: **2**
    *   Forced bandı eşiği aşarsa: **3**
    *   Torsiyon bandına girilirse: **4**
    *   Hiçbir bant eşiği aşmıyorsa (Salınım bittiyse): **0**
*   **C. Sönümleme Oranı (Damping Ratio - DR) Hesabı:**
    Sönümleme oranı, salınımın saptanması durumunda Logaritmik Azalma (Logarithmic Decrement) formülü ile hesaplanacaktır. Ardışık tepe noktaları ($y_0, y_1, ..., y_n$) için sönüm zarfı üzerinden logaritmik azalış değeri olan $\delta$ hesaplanacaktır: 
    $\delta = \frac{1}{n} \ln(\frac{y_0}{y_n})$
    Ardından Sönümleme Oranı (Damping Ratio) $\zeta$ formülü kullanılarak yüzde (%) cinsine çevrilecektir:
    $\zeta (\%) = \left( \frac{\delta}{\sqrt{(2\pi)^2 + \delta^2}} \right) \times 100$
    Hesaplanan bu % değer, modun tespit edildiği zaman pencerelerine eşlenecektir.
*   **D. Salınım Enerjisi Hesabı:**
    İlgili pencere içerisindeki Kök Ortalama Kare (RMS) enerjisi hesaplanacaktır. Zaman tanım bölgesindeki sinyal dizisi $x[n]$ ve pencere boyutu $N$ olmak üzere; 
    $E_{rms} = \sqrt{\frac{1}{N} \sum_{i=1}^{N} (x[i])^2}$ 
    Bu enerji değeri, genlik verisi ile birlikte ayrı bir veri dizisi (array) olarak arayüze aktarılacaktır.

**GÖREV 4: ECharts Grafik Hiyerarşisi ve UI Yerleşimi**
ECharts konfigürasyonlarını 3 ana grafik bloğu şeklinde alt alta dizmelisin. Çok önemli kural: **Tüm grafikler ECharts `group` özelliği veya `dataZoom` bağlantısı (echarts.connect) ile zaman ekseninde (X-Axis) birbirine mutlak suretle senkronize (locked) edilmelidir.**

*   **Grafik 1 (Ham Veri - Raw Data):**
    En üstte yer alacak bu grafikte; Frekans (Hz), Gerilim (kV), Aktif Güç (MW) ve Reaktif Güç (MVAr) değerleri tek bir zaman ekseninde çoklu Y ekseni (multi-y-axis) kullanılarak gösterilecektir.
*   **Grafik 2 (Mod ve Sönümleme Oranı - DR):**
    Ham veri grafiğinin hemen altında yer alacaktır. 
    *   *Sol Y Ekseni:* Tespit edilen salınım modunu (0, 1, 2, 3, 4) kesikli/basamaklı çizgi (step line) olarak çizecektir.
    *   *Sağ Y Ekseni:* Aynı anda tespit edilen modun % cinsinden Sönümleme Oranını (Damping Ratio) çizecektir.
*   **Grafik 3 (Enerji ve Genlik):**
    En altta yer alacaktır. Bu grafikte zaman ekseninde salınımın Genliği (mHz) ve Salınım Enerjisi yan yana çizgi veya alan (area) grafiği olarak yer alacaktır.

