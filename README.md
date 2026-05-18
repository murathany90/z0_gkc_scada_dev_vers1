# GKC SCADA - Merkezi Gözlem ve Kontrol Sistemi Uygulaması

<p align="center">
  <strong>Geleceğin Enerji Altyapılarını Yönetmek İçin Geliştirilmiş, Yüksek Performanslı ve Güvenilir SCADA İstemcisi</strong>
</p>

---

## 1. MİSYON VE VİZYON

### Misyonumuz
GKC SCADA projesi, karmaşık ve hayati öneme sahip enerji üretim ve dağıtım altyapılarının (hidroelektrik santralleri, rüzgar türbinleri, trafo merkezleri) anlık (real-time) izlenmesi, kontrol edilmesi ve yönetilmesi amacıyla hayata geçirilmiştir. Enerji altyapılarında meydana gelebilecek en ufak bir gecikme veya veri kaybının geri döndürülemez sonuçlar doğurabileceğinin bilinciyle; güvenlik, hız ve kesintisizlik bu projenin temel yapı taşlarını oluşturur. Geleneksel ve hantal SCADA arayüzlerinin aksine, modern web teknolojilerinin gücüyle masaüstü performansını birleştiren bu sistem, operatörlere saniyenin kesirleri düzeyinde veri akışı sağlarken bilişsel yükü en aza indiren modern bir kullanıcı deneyimi (UX) sunmayı amaçlamaktadır.

### Vizyonumuz
Sadece mevcut enerji altyapılarını izleyen bir sistem olmanın ötesinde, yapay zeka destekli anomali tespiti yapabilen, gelecekteki arızaları önceden tahmin edebilen (predictive maintenance) ve karar destek mekanizmalarıyla operatörleri asiste eden otonom bir endüstriyel yönetim platformuna dönüşmek. Teknolojik bağımsızlığımızı koruyarak, dışa bağımlı sistemler yerine tamamen yerli, şeffaf ve özelleştirilebilir bir SCADA ekosistemi yaratmak projemizin uzun vadedeki en büyük vizyonudur.

---

## 2. PROJE MİMARİSİ VE TEKNOLOJİ YIĞINI (TECH STACK)

GKC SCADA, modern teknolojilerin getirdiği hız ve esnekliği, işletim sistemi seviyesindeki donanım erişimi ve performansıyla birleştiren bir "Native-Web" hibrit mimarisine sahiptir. 

### 2.1. Frontend (İstemci Arayüzü)
- **React 19:** Kullanıcı arayüzünün (UI) bileşen tabanlı, modüler ve yüksek performanslı şekilde oluşturulmasını sağlar.
- **TypeScript:** Tip güvenliği (type-safety) sayesinde çalışma zamanı (runtime) hatalarını compile aşamasında yakalayarak kurumsal seviyede güvenilir bir kod tabanı sunar.
- **Vite:** Geliştirme sürecindeki anlık güncellemeleri (HMR) milisaniyeler seviyesinde gerçekleştirerek developer deneyimini maksimize eder.
- **Zustand:** SCADA sistemindeki binlerce veri noktasının (tag/point) anlık durumunu performans darboğazı yaratmadan yöneten, minimal ancak son derece güçlü state management (durum yönetimi) kütüphanesi.
- **ECharts:** Canlı trend grafikleri, geçmişe dönük veri analizleri ve kompleks veri görselleştirmeleri için kullanılan, donanım hızlandırması destekli grafik motoru.

### 2.2. Backend (Masaüstü Çekirdeği)
- **Tauri (Rust):** Uygulamanın masaüstü kabuğunu oluşturur. Electron.js'in aksine Chromium veya Node.js içermediği için işletim sisteminin yerel (native) web view (Windows'ta WebView2) motorunu kullanır. Bu sayede RAM tüketimi minimuma iner (genellikle 50-100 MB civarı) ve dosya boyutu son derece küçüktür (taşınabilir .exe formatında).
- **Rust Language:** Bellek güvenliği (memory safety) ve eşzamanlılık (concurrency) konularında dünyanın en güvenilir dili olarak, YTBS (Yük Tevzi Bilgi Sistemi) ile kurulan yoğun network iletişimini, veri parse (ayrıştırma) işlemlerini ve arka plan loglamalarını sıfır çökme (zero crash) hedefiyle yürütür.

---

## 3. DİZİN VE DOSYA YAPISI

Proje, hem geliştiricilerin hem de sistem yöneticilerinin kolayca adapte olabilmesi için modüler bir şekilde organize edilmiştir. Dağınık yapı toparlanmış ve dokümantasyon merkezileştirilmiştir.

```text
z0_gkc_scada_dev_vers1/
│
├── docs/                             # Tüm dokümantasyon ve logların toplandığı ana dizin
│   ├── analiz/                       # Sistem analizleri, gereksinim dokümanları
│   │   ├── analiz_gkc_istemci.md     # İstemci ihtiyaç ve analiz raporu
│   │   ├── analiz_ytbs_sorgu.md      # YTBS veri sorgulama mimarisinin analizi
│   │   └── ...
│   ├── gelistirme/                   # Geliştirme aşamaları ve süreç raporları
│   │   ├── surec_faz1_proje_iskeleti.md
│   │   └── ...
│   ├── html_dokumleri/               # YTBS arayüzünden alınmış referans HTML sayfaları
│   └── veri_loglari/                 # Raw veri çıktıları, CSV'ler ve log txt dosyaları
│
├── gkc_scada_app/                    # SCADA İstemcisi Ana Proje Dizini
│   ├── gkc-tauri/                    # Aktif geliştirilen Tauri & React projesi
│   │   ├── src/                      # Frontend kaynak kodları (React, TS, Zustand)
│   │   ├── src-tauri/                # Backend kaynak kodları (Rust, Cargo)
│   │   ├── scripts/                  # CI/CD, build ve test betikleri (.ts, .mjs, .ps1)
│   │   ├── package.json              # Node.js bağımlılıkları ve npm scriptleri
│   │   └── tauri.conf.json           # Tauri masaüstü yapılandırma dosyası
│   │
│   └── referans---MERKEZRMS_8_6_3/   # Sistemin eski Java tabanlı referans uygulaması ve yedekleri
│
├── .gitignore                        # Git tarafından takip edilmeyecek dosya ve dizin kuralları
└── README.md                         # (Bu Dosya) Proje rehberi ve genel dokümantasyon
```

### 3.1. Neden Bu Yapı Kullanıldı?
Önceki yapıda, dokümantasyon ve test scriptleri kod tabanının içine homojen olmayan bir şekilde dağılmıştı. Yeni yapı ile **kod** ve **bilgi** birbirinden izole edildi. Geliştirici sadece `gkc-tauri` klasörüne odaklanırken, projeye yeni dahil olan bir sistem analisti sadece `docs` klasörünü inceleyerek sistemin tüm geçmişine hakim olabilir. Eski sistemlere referans yapabilmek adına `referans---MERKEZRMS_8_6_3` dizini bozulmadan arşivlenmiştir.

---

### 3.2. YTBS SCADA Sistemi Ölçüm Noktası ve  SCADA Sistemi Ölçüm Verisi Sayfaları Hakkında

1. **SCADA Sistemi Ölçüm Noktası Sayfası**

Bu sayfa, TEİAŞ SCADA sistemi kapsamında iletim şebekesine yerleştirilmiş RTU'ların (Uzak Uç Birimi) ölçüm yaptığı noktaları kontrol etmek ve güncel listeyi hızlı bir şekilde temin etmek amacıyla kullanılmaktadır
. Haftalık olarak güncellenen bu liste içerisindeki her bir kayıt tek bir ölçüm birimini temsil eder ve kullanıcılar bu sayfa üzerinden doğrudan son 6 saatin ölçümlerine ulaşabilir
. Sayfada yer alan hiyerarşik yapı ve bilgiler şunlardır:
Katman Bilgileri: B1 (Trafo Merkezi), B2 (Gerilim Seviyesi) ve B3 (Fider veya Teçhizat) katmanlarının ID ve adlarını içerir
.
Element Türleri: B3 ile temsil edilen nesneye ait ölçüm elementleri detaylandırılır; örneğin Aktif Güç (P), Reaktif Güç (Q), Gerilim (U), Kademe (TapPosMv/Tap_Chan), Kesici (CB) ve Ayırıcı (Iso_Bb) gibi değerler transfer edilir
.
Eşleşme Durumu: Ölçüm noktasının YTBS sisteminde eşli olup olmadığı, eşleme yapıldıysa aktif veri çekiş talimatının verilip verilmediği veya bu noktanın eşlemeden tamamen muaf tutulup tutulmadığı gösterilir
.
2. **SCADA Ölçüm Verileri Sayfası**
Bu sayfa, ölçüm noktaları YTBS teçhizatlarıyla tam olarak eşleştirilmeden önce, gelen ölçüm verilerinin ve veri yönlerinin (polarizasyonlarının) doğruluğunu kontrol etmek için kullanılır
. Sayfa üzerinden RTU bulunan fiderler seçilerek belirtilen zaman aralığındaki veriler orijinal çözünürlüğünde grafiksel olarak incelenebilir
. Veriler, sorgulama anında doğrudan TEİAŞ SCADA sisteminden (Druid veri tabanını kullanan Büyük Veri Dışa Aktarım Sistemi web servisi üzerinden) çekilir ve istenildiğinde ham veriler Excel formatında indirilebilir
.
SCADA Ölçüm Verisi Maksimum Sorgulama Süresi Veri yoğunluğu sebebiyle SCADA ölçüm verileri, tek bir sorgulamada `en fazla 6 saatlik` bir zaman dilimini kapsayacak şekilde sorgulanabilmektedir

## 4. KURULUM VE GELİŞTİRME ORTAMI HAZIRLIĞI

GKC SCADA uygulamasını yerel bilgisayarınızda geliştirmek, derlemek veya sadece incelemek için aşağıdaki bağımlılıkların sisteminizde eksiksiz olarak kurulu olması gerekmektedir. 

### 4.1. Ön Koşullar (Prerequisites)

1. **Node.js (v18.x veya üzeri):**
   - Frontend bağımlılıklarının yönetimi ve Vite sunucusunun çalıştırılması için gereklidir.
   - İndirme: [Node.js Official](https://nodejs.org/)

2. **Rust ve Cargo:**
   - Tauri'nin masaüstü çekirdeğini derlemek için sisteminizde Rust yüklü olmalıdır.
   - Kurulum (Windows): `rustup-init.exe` dosyasını indirip çalıştırın.
   - İndirme: [Rustup](https://rustup.rs/)

3. **C++ Build Tools (Windows için):**
   - Rust'ın Windows üzerinde native derleme yapabilmesi için Visual Studio C++ Build Tools (veya Windows SDK) paketinin kurulu olması şarttır.
   - Visual Studio Installer üzerinden "Desktop development with C++" seçilerek kurulmalıdır.

4. **WebView2 Runtime:**
   - Windows 11'de varsayılan olarak yüklüdür. Windows 10 kullanıyorsanız Tauri uygulamasının arayüzü gösterebilmesi için WebView2 gereklidir.

### 4.2. Projeyi Klonlama ve Kurulum

Öncelikle terminal veya PowerShell açarak proje dizinine gidin ve bağımlılıkları yükleyin.

```powershell
# 1. Depoyu klonlayın (Eğer lokaldeyseniz doğrudan klasöre gidin)
cd c:\yazilim_projeler\z0_gkc_scada_dev_vers1\gkc_scada_app\gkc-tauri

# 2. Node bağımlılıklarını kurun
npm install

# (Opsiyonel) Eğer Rust bağımlılıklarında güncelleme yapmak isterseniz
cd src-tauri
cargo update
cd ..
```

---

## 5. GELİŞTİRME, TEST VE DERLEME KOMUTLARI

Uygulamanın geliştirme süreci Vite ve Tauri'nin entegre CLI araçları üzerinden yönetilir. 

### 5.1. Geliştirme Ortamı (Development Mode)
Geliştirme yaparken uygulamanın anlık güncellemeleri (Hot-Reload) desteklemesi için geliştirici modunda çalıştırılması gerekir. Bu modda, kodda yaptığınız her değişiklik anında arayüze yansır.

```powershell
# Proje dizininde (gkc-tauri) olduğunuzdan emin olun
npm run tauri dev
```
*Bu komut önce Vite sunucusunu başlatır, ardından Rust tabanlı Tauri uygulamasını derleyerek (debug modunda) ekrana getirir.*

### 5.2. Testlerin Çalıştırılması (Testing Flow)
Sistemin farklı modüllerini (UI State, SCADA Eşik Değerleri, Cihaz Tanımlamaları) doğrulamak için çeşitli test scriptleri yazılmıştır. Canlıya alımdan (deployment) önce tüm testlerin pass (başarılı) olması zorunludur.

```powershell
# SCADA Veri Eşik Değerleri Testi
# Gerçek dünyadaki voltaj, akım ve güç sınırlarının dışına çıkan verilerin doğru şekilde alarm üretip üretmediğini test eder.
npm run test:scada-threshold

# UI Durum (State) Yönetimi Testi
# Zustand store'larının (rmsStore, ytbsStore) doğru şekilde mount olup olmadığını, loglama mekanizmalarının UI ile sekronizasyonunu denetler.
npm run test:ui-state

# SCADA Noktası Ayrıntı Testi
# Özel SCADA tag'lerinin (B1, B2 vb.) veritabanı eşleşmelerini kontrol eder.
npm run test:scada-details

# Portable Naming (İsimlendirme) Testi
# Derleme sırasında exe dosyalarına verilecek isim ve versiyon (tarih_versiyon) algoritmalarını test eder.
npm run test:portable-name
```

### 5.3. Uygulamanın Derlenmesi (Production Build)
Uygulama son kullanıcı (operatörler) için hazırlanırken optimize edilmiş bir "Release" versiyonu oluşturulur. Bu sürümde debug logları kapalıdır ve kodlar minimize (minify) edilmiştir.

**Standart MSI ve Setup Derlemesi:**
Bu komut, Windows için standart kurulum dosyası (`.msi` ve `.exe` installer) üretir.
```powershell
npm run tauri build
# Üretilen dosyalar: src-tauri/target/release/bundle/msi/ ve nsis/ dizinlerinde yer alır.
```

**Taşınabilir (Portable) EXE Derlemesi:**
Sahadaki cihazlarda veya kurulum yetkisi olmayan makinelerde uygulamanın anında çalıştırılabilmesi için özel bir portable derleme scripti geliştirilmiştir. Bu script, derlenen dosyayı alır, güncel tarih ve versiyon numarasıyla adlandırarak özel bir klasöre çıkarır.

```powershell
# Portable exe derlemesini başlat
npm run build:portable
# Çıktı klasörü: gkc_scada_app/gkc-tauri/portable-builds/
# Çıktı formatı: gkc-scada-test_vYYAAGG_versX.exe
```

cd c:\yazilim_projeler\z0_gkc_scada_dev_vers1\gkc_scada_app\gkc-tauri
---

## 6. YTBS VERİ ENTEGRASYONU VE MİMARİSİ

Projenin en kritik damarı, TEİAŞ (Türkiye Elektrik İletişim A.Ş.) YTBS (Yük Tevzi Bilgi Sistemi) altyapısından alınan verilerin SCADA arayüzüne taşınmasıdır. Standart bir API sunulmadığından sistem karmaşık bir proxy ve mock mimarisi üzerinden işler.

### 6.1. Veri Akış Modeli (Data Flow)
1. **Veri Toplama (Scraping/Polling):**
   Uygulama, YTBS sisteminin HTML sayfalarına simüle edilmiş HTTP GET istekleri gönderir. (Analiz dokümanlarındaki `MGKP_OLCUM_VERISI._html.md` referansına bakınız).
2. **Ayrıştırma (Parsing):**
   HTML içeriğinde yer alan devasa `ViewState` ve DOM elemanları (tablolar, div gridleri), özel olarak yazılmış Rust fonksiyonları (`ytbs_client.rs`) aracılığıyla parse edilir.
3. **Formatlama ve Veri Modeli Çevrimi (Mapping):**
   Alınan ham veriler (Örn: `154 kV ADATOPRAKPINAR BB_A`), sistemin anlayacağı standart veri modellerine (`data_models.rs`) çevrilir. Bu aşamada `SCADA_OLCUM_NOKTASI_eslestirilmis.csv` dosyası bir lügat (dictionary) görevi görerek dış sistem ID'lerini iç sistem ID'lerine dönüştürür.
4. **State Güncellemesi:**
   Formatlanan temiz veriler, Tauri'nin IPC (Inter-Process Communication) köprüsü üzerinden mili saniyeler içerisinde React (Frontend) tarafındaki Zustand mağazalarına (`ytbsStore.ts`, `rmsStore.ts`) aktarılır.
5. **Görselleştirme:**
   Zustand'daki anlık değişimleri dinleyen UI bileşenleri (ECharts vb.) ekranı güncelleyerek operatöre görsel uyarı/bildirim olarak sunar.

### 6.2. Mock (Simülasyon) Servisi
YTBS sistemine bağlantının koptuğu veya geliştirme ortamında network erişiminin olmadığı durumlar için sistemde tamamen bağımsız bir "Mock Service" bulunmaktadır.
- `mock_service.rs` dosyası, rastgele ancak mantıklı (örn: voltajın 150kV ile 160kV arasında dalgalanması) SCADA verileri üretir.
- Geliştiriciler arayüzü tasarlarken bu simüle edilmiş veriyi kullanarak gerçeğe en yakın test senaryolarını çalıştırabilir.

---

## 7. SCADA EŞLEŞTİRME (MAPPING) MANTIĞI

YTBS'den gelen ham metinler ile sistem içindeki cihazların (kesici, ayırıcı, trafo) eşleştirilmesi için karmaşık bir algoritma devrededir.

**CSV Eşleştirme Sözlüğü (`SCADA_OLCUM_NOKTASI_eslestirilmis.csv`):**
Bu dosya sistemin kalbidir. Aşağıdaki kolon yapısını barındırır:
- `ID`: Sistemin kendi içindeki benzersiz donanım ID'si.
- `B1, B2, B3`: YTBS hiyerarşisindeki santral, ünite, nokta tanımlamaları.
- `Element ID / Element Adı`: Örneğin Kesici (CB), Ayırıcı (Iso_Bb), Aktif Güç (P).

Sistem, gelen verideki isim örüntülerini analiz eder (Örn: "ADATOPRAKPINAR Trafo_A Aktif Güç") ve bu CSV üzerindeki B1+B2+ELEM kombinasyonlarıyla örtüştürerek verinin tam olarak hangi grafiksel UI bileşenini temsil ettiğini bulur. `EŞLEŞME DURUMU` kolonu, bu işlemin yapay zeka/script tarafından manuel mi yoksa tam örüntü eşleşmesiyle mi yapıldığını raporlar.

---

## 8. HATA GİDERME (TROUBLESHOOTING) VE SSS

**S: Derleme sırasında `npm run tauri:build` hatası alıyorum.**
C: `package.json` yapısında komut `npm run tauri build` veya `npm run build:portable` olarak güncellenmiştir. Lütfen yeni dokümantasyondaki komutları kullanın.

**S: WebView2 yükleme hatası veya beyaz ekran görüyorum.**
C: Windows 10 kullanıcılarında WebView2 Runtime kurulu olmayabilir. Microsoft'un sitesinden "Evergreen Bootstrapper" indirip kurmanız beyaz ekran sorununu çözecektir.

**S: Testlerde "Element Adı Eşleşmedi" hatası veriyor.**
C: `SCADA_OLCUM_NOKTASI_eslestirilmis.csv` doyasındaki B1, B2 kolonlarında boşluk veya karakter kodlaması (UTF-8) hatası olabilir. CSV dosyasını VS Code üzerinden açıp BOM'suz UTF-8 olarak kaydedin.

---

## 9. KODLAMA STANDARTLARI VE KATKIDA BULUNMA (CONTRIBUTING)

GKC SCADA projesine katkıda bulunacak tüm geliştiricilerin uyması gereken temel kurallar:
1. **Tip Güvenliği (Type Safety):** Frontend üzerinde TypeScript'te hiçbir zaman `any` tipi kullanılmayacaktır. Gelen tüm veri tipleri interface veya type ile tanımlanmalıdır.
2. **Rust Hata Yönetimi:** Tauri tarafındaki backend komutlarında panik (`unwrap()`, `expect()`) kullanılmamalı, hata döndürebilecek tüm fonksiyonlar `Result<T, E>` yapısı ile sarmalanarak frontend'e kontrollü hata (Error message) döndürülmelidir.
3. **Dokümantasyon:** Yeni bir özellik veya SCADA eşleşme algoritması ekleniyorsa, işlemi anlatan detaylar öncelikle `docs/gelistirme/` klasörü içerisine yeni bir markdown (.md) dosyası ile raporlanmalıdır.

---

*Bu doküman, sistemin sürdürülebilirliğini sağlamak adına projeye dahil edilen her yeni özellik veya mimari değişiklik sonrası güncellenmek zorundadır. Enerjinin gücü, bilginin güvenliğinden geçer.*

---

## 10. GÜNCEL ÖZELLİKLER VE DOĞRULAMA NOTLARI (2026-05-17)

### 10.1. Salınım Algılayıcı - GKÇ PMU Modal Analiz

`GKÇ İzleme > Salınım Algılayıcı` sayfası, gerçek YTBS GKÇ PMU verisi üzerinden modal salınım incelemesi yapmak için eklenmiştir. Modül kodları frontend tarafında `gkc_scada_app/gkc-tauri/src/features/oscillation/` altındadır.

Temel kapsam:
- PMU seçimi tekli analizde 1, çoklu analizde 2-6 ölçüm noktası ile sınırlıdır.
- YTBS sorguları mevcut `ytbs_query_range`, `buildYtbsQueryChunks` ve `ytbsPmu.ts` altyapısı ile yapılır.
- Sorgular 30 dakikalık parçalar halinde sıralı çalışır; çoklu PMU'da bir PMU'nun tüm parçaları tamamlanmadan diğerine geçilmez.
- Analizler yalnızca başarıyla çekilmiş gerçek PMU örnekleri üzerinden yapılır.
- CSV ve rapor çıktıları yalnızca gerçek sorgu verisinden üretilir.

Mock kapsamı:
- Salınım Algılayıcı mock veya sentetik PMU veri üretmez.
- Salınım Algılayıcı mock fallback kullanmaz.
- Veri yoksa veya PMU boş dönerse arayüz bunu veri bulunamadı / PMU boş döndü bulgusu olarak raporlar.
- Mevcut `mock_service.rs` diğer geliştirme ve simülasyon akışları için korunur; Salınım Algılayıcı için genişletilmez.

Analiz ve grafik davranışı:
- Varsayılan ana bant `TR Inter-area / SAS Gözlem Bandı: 0.10-0.20 Hz` olarak gelir.
- 4.5-5.0 Hz Nyquist tampon bandı pasiftir.
- 5-14 Hz torsiyonel band desteklenmez.
- Frekans, gerilim, aktif güç ve reaktif güç sinyalleri için aynı bantlar kullanılır; metrikler ayrı hesaplanır.
- Büyük veri analizleri Web Worker üzerinden çalışır.
- Ham PMU grafiklerinde 100 ms zaman hassasiyeti korunur; `.000`, `.100`, `.900` gibi milisaniye değerleri x-ekseni ve tooltipte görünür.
- Grafiklerde ECharts LTTB sampling, progressive render, zoom ve grafik dışa aktarma desteklenir.
- Arayüz terminolojisinde `Alarm` yerine `Bulgu`, `Mod`, `Sınıflandırma` ve `Rapor` kullanılır.

### 10.2. UI Güncellemeleri

Salınım Algılayıcı sayfasında son UI düzeltmeleri:
- Sol sidebar'daki Salınım Algılayıcı menü öğesine sayfa iconu eklendi.
- Sorgu sonrasında filtre kartının görünür kalması için filtre kartı sticky hale getirildi.
- Sorgu tamamlandıktan sonra ana içerik tekrar üst bölüme kaydırılır; böylece analiz başlatma kontrolleri kaybolmaz.
- Ham veri grafiklerinde PMU'nun 100 ms örnekleme yapısına uygun milisaniyeli zaman gösterimi kullanılır.

### 10.3. PMU Veri Mapping Notları

YTBS PMU export satırları analiz için aşağıdaki alan eşleşmeleriyle kullanılır:
- `y1`: frekans
- `y2-y4`: gerilim genlikleri
- `y5-y7`: gerilim açıları
- `y8-y10`: akım genlikleri
- `y11-y13`: akım açıları
- `y14-y16`: güç/görünür güç alanları

Timestamp değerleri parse edilirken milisaniye bilgisi korunur. Bu davranış hem analiz hem de grafik gösterimi için kritiktir.

### 10.4. Güncel Test ve Derleme Komutları

Salınım Algılayıcı ve mevcut YTBS/SCADA akışları için önemli doğrulama komutları:

```powershell
cd c:\yazilim_projeler\z0_gkc_scada_dev_vers1\gkc_scada_app\gkc-tauri

npm run test:oscillation
npm run test:ytbs-pmu
npm run test:ui-state
cargo test
npm run build
```

Canlı Tauri geliştirme testi:

```powershell
cd c:\yazilim_projeler\z0_gkc_scada_dev_vers1\gkc_scada_app\gkc-tauri
npm run tauri dev
```

Notlar:
- `npm run build` sırasında Vite büyük chunk uyarısı verebilir; bu uyarı derlemeyi tek başına başarısız yapmaz.
- Canlı YTBS testleri `.env` içindeki bilgilerle yapılır; gizli bilgiler dokümantasyona yazılmamalıdır.
- SMS doğrulaması gerekirse kullanıcıdan kod alınmalıdır.
- Canlı oturum veya SMS tamamlanamazsa test sonucu bloklandı olarak raporlanmalı, mock fallback kullanılmamalıdır.

### 10.5. Canlı Veri Doğrulama Noktaları

Salınım Algılayıcı canlı veri testlerinde kullanılan PMU ölçüm noktaları:
- `285 TEMELLİ, 400 kV YUNUS EMRE TES`
- `704 YEŞİLHİSAR, 400 kV KARAPINAR MEKE GÖLÜ`

Bu noktalarda PMU verisi yoğun olabileceği için sorgu süreleri uzayabilir. Boş/verisiz dönen PMU sonuçları başarılı bir şekilde veri kalitesi bulgusu olarak gösterilmeli; analiz sadece gelen gerçek örnekler için çalışmalıdır.


codex oturum devam etme: C:\npm\codex.cmd resume --last -a never -s danger-full-access

---

## 11. Salınım Algılayıcı - PMU Modal Analiz ve Raporlama Geliştirmeleri

Bu bölüm, son geliştirme döngüsünde Salınım Algılayıcı sayfasına eklenen zaman filtresi güvenliği, modal analiz ilerlemesi, grafik üstü tespit katmanları, Karar Destek Sistemi çıktısı ve PDF rapor üretimi davranışını ayrıntılı biçimde açıklar.

### 11.1. Genel Amaç

Salınım Algılayıcı sayfası, PMU verisini WAMPAC odaklı bir operatör asistanı gibi yorumlamak üzere tasarlanmıştır.

Kullanıcı artık yalnızca ham sinyal grafiği görmez; sistem frekans, gerilim, aktif güç ve reaktif güç ölçümleri üzerinden salınım modlarını sınıflandırır.

Analiz sonucunda her ölçüm metriği için ham veri, filtrelenmiş veri, mod tespiti, damping ratio, enerji ve genlik bilgisi birlikte raporlanır.

Bu yaklaşım, kontrol odası operatörünün olay zamanını, olay süresini, salınım frekansını ve sönümleme eğilimini aynı raporda değerlendirmesini sağlar.

### 11.2. Son Geliştirme Özeti

Bu geliştirme döngüsünde Salınım Algılayıcı sekmesi, yalnız grafik gösteren bir analiz ekranından kontrol odası operatörüne karar desteği veren bir WAMPAC arayüzüne doğru taşındı. Amaç; PMU verisinin hangi zaman aralığına ait olduğunu güvence altına almak, analiz sürecini kullanıcıya görünür kılmak, grafik üzerindeki modal bulguları zoom sırasında korumak ve rapor çıktısını doğrudan operasyonel değerlendirme formatına yaklaştırmaktır.

Önceki davranışta kullanıcı zaman filtresini değiştirdiğinde bellekteki eski ham veri analiz için kullanılabiliyordu. Yeni akışta ham veri sorgusu, analiz sorgusu ve geçerlilik bilgisi ayrı ayrı izlenir. Başlangıç zamanı, bitiş zamanı veya PMU seçimi değiştiğinde ham veri ve analiz sonucu temizlenir; pencere, adım ve eşik değişikliklerinde ise ham veri korunup yalnız analiz sonucu geçersizleştirilir.

Analiz çalışırken uygulama artık sessiz kalmaz. Worker katmanı yüzde bazlı ilerleme mesajları üretir ve arayüz bu mesajları veri hazırlama, veri kalitesi, bant metrikleri, kayan pencere, ortak mod ve rapor aşamaları olarak gösterir. Bu sayede uzun PMU kayıtlarında operatör, işlemin devam ettiğini ve hangi aşamada olduğunu anlayabilir.

Raporlama tarafında ham Markdown veya log benzeri metin yerine yapılandırılmış bir Karar Destek Sistemi görünümü kullanılır. Bulgular tablo halinde verilir, MOD_YOK gibi kod ifadeleri operatör diline çevrilir, kritik osilasyon satırları kırmızı vurgulanır ve sonuç bölümü hesaplanan metrikleri anlamlandıran cümleler üretir.

| Geliştirme Alanı | Kullanıcı Etkisi | Teknik Dayanak |
| --- | --- | --- |
| Zaman filtresi güvenliği | Eski tarih aralığından kalan veriyle yanlış analiz yapılmaz. | `rawDataQuery`, `analysisQuery` ve `isRawDataStale` kontrolleri kullanılır. |
| Analiz ilerlemesi | Analizi Çalıştır sonrası kullanıcı süreçten haberdar olur. | Worker yanıtları `progress`, `ok` ve `error` tiplerine ayrılır. |
| Grafik zoom davranışı | Yakınlaştırma sonrası kırmızı/yeşil olay katmanları görünür kalır. | Overlay segmentleri sürekli aralıklar olarak üretilir ve `filterMode: 'none'` kullanılır. |
| Tooltip içeriği | Grafik üzerindeki bulgunun zamanı, süresi ve frekansı anlaşılır. | Tooltip payload içine olay, pencere ve adım bilgisi eklenir. |
| Dört metrik görünümü | F, V, P ve Q sinyalleri aynı modal mantıkla incelenir. | Frekans, Gerilim, Aktif Güç ve Reaktif Güç için ayrı grafik/rapor bölümleri üretilir. |
| Karar Destek Sistemi | Operatör yalnız değer değil, değerin anlamını da görür. | Olay tabloları yorum cümleleriyle birlikte sunulur. |
| PDF RAPOR akışı | Yazdırma çıktısı uygulama kabuğunu değil, raporun kendisini basar. | Print-only rapor alanı ve A4 landscape sayfa kuralları kullanılır. |
| Türkçe karakter desteği | PDF ve ekran çıktılarında bozuk karakter görülmez. | UTF-8 kaynak, `lang="tr"` ve tarayıcı print font zinciri korunur. |

Bu bölümdeki alt başlıklar, son geliştirmelerin nasıl çalıştığını ve hangi kullanıcı ihtiyacını karşıladığını ayrıntılı şekilde açıklar. README'nin diğer bölümlerinde anlatılan kurulum, test ve servis akışı korunmuştur; burada yalnız Salınım Algılayıcı sekmesine özel yeni davranışlar genişletilmiştir.

### 11.3. Dört Modlu Salınım Sınıflandırması

Salınım Algılayıcı, PMU sinyallerini dört modal bantta değerlendirir. Bu bantlar, elektrik güç sistemi dinamiklerinde farklı fiziksel kaynaklara karşılık geldiği için arayüzde ham kod olarak değil, operatörün anlayacağı terimlerle gösterilir.

| Mod | Operatör Etiketi | Frekans Bandı | Tipik Anlam | Rapor Davranışı |
| --- | --- | --- | --- | --- |
| Mod 1 | Bölgeler Arası Salınım | 0.1 Hz - 0.4 Hz | Uzak bölgeler arasında düşük frekanslı güç alışverişi salınımı. | Geniş alan kararlılığı açısından öncelikli bulgu olarak raporlanır. |
| Mod 2 | Yerel Salınım | 0.4 Hz - 2.0 Hz | Santral, fider veya yakın elektriksel alan davranışı. | Yerel elektromekanik salınım adayı olarak yorumlanır. |
| Mod 3 | Zorlanmış Salınım | 2.0 Hz - 4.5 Hz | Kontrol döngüsü, ekipman etkisi veya dış kaynaklı zorlanmış bileşen. | Kaynak araştırması gerektiren tekrarlı salınım adayı olarak verilir. |
| Mod 4 | Torsiyonel / Diagnostik Bant | 4.5 Hz - 5.0 Hz | Torsiyonel davranış şüphesi veya yüksek frekanslı diagnostik izleme. | Aktif alarm yerine ayrıntılı inceleme bilgisi olarak ayrıştırılır. |
| Yok | Salınım yok | Bant dışı veya eşik altı | Analiz penceresinde anlamlı modal bulgu yoktur. | Nötr satır olarak gösterilir, ham `MOD_YOK` metni kullanıcıya yansıtılmaz. |

Mod 1 interarea bandı, WAMPAC bağlamında en hassas alanlardan biridir. Bu bantta negatif damping görülmesi, salınımın sönümlenmek yerine büyüme eğiliminde olabileceğini düşündürür. Bu nedenle rapor cümleleri, özellikle Mod 1 ve negatif damping birlikteliğinde daha açık bir risk dili kullanır.

Mod 2 yerel bantta olay görüldüğünde yorum, tek bir fider, santral grubu veya yakın elektriksel bölge davranışına odaklanır. Bu bulgular çoğu zaman aktif güç ve gerilim sinyallerinde birlikte izlenir. Operatör, aynı zaman aralığında P ve V sayfalarındaki olayların üst üste gelip gelmediğine bakarak yerel karakteri daha iyi değerlendirebilir.

Mod 3 zorlanmış bant, doğal elektromekanik moddan çok dış kaynaklı periyodik uyarımlara işaret edebilir. Bu nedenle raporda yalnız frekans değeri verilmez; olay süresi, tekrar sayısı, enerji/genlik bilgisi ve hangi metrikte belirginleştiği birlikte sunulur.

Mod 4 torsiyonel bant pasif diagnostik amaçla tutulur. Bu bantta bir bulgu çıktığında sistem doğrudan alarm üretmez; bakım, santral ekipmanı veya kontrol sistemi incelemesi için ek işaret sağlar. PDF raporda bu bant, diğer kritik elektromekanik olaylarla karışmaması için ayrı etiketlenir.

### 11.4. Dört Ölçüm Metriği

Uygulama dört PMU ölçüm metriğini aynı modal analiz mantığıyla ele alır: frekans, gerilim, aktif güç ve reaktif güç. Ekrandaki metrik sekmeleri ile PDF rapor sayfaları aynı sırayı izler; böylece kullanıcı ekranda ne gördüyse raporda da aynı teknik karşılığı bulur.

| Kısa Ad | Metrik | Birim | Varsayılan Eşik | Ekran Ekseni | PDF Sayfası |
| --- | --- | --- | --- | --- | --- |
| F | Frekans | Hz | 10 mHz | Frekans (Hz) | Frekans metrik sayfası |
| V | Gerilim | kV veya p.u. | %5 | Gerilim (kV) veya Gerilim (p.u.) | Gerilim metrik sayfası |
| P | Aktif Güç | MW | %5 | Aktif Güç (MW) | Aktif Güç metrik sayfası |
| Q | Reaktif Güç | MVAr | %5 | Reaktif Güç (MVAr) | Reaktif Güç metrik sayfası |

Frekans metriği, özellikle interarea salınım tespiti için temel göstergedir. Frekans grafiğinde ham PMU verisi ve filtrelenmiş sinyal birlikte gösterilir. Eşik mHz cinsinden tanımlanır; raporda ise kullanıcıya Hz cinsinden okunabilir değerler ve baskın salınım frekansı verilir.

Gerilim metriği, bara veya fider gerilimindeki modal bileşenleri izler. Arayüzde değer ve p.u. görünümü desteklenir. PDF çıktısında kullanılan eksen başlığı seçilen görünümle tutarlı kalır; gerilim sayfasında ham/filtrelenmiş grafik, Mod + DR grafiği ve Enerji + Genlik grafiği birlikte bulunur.

Aktif Güç metriği, yerel ve bölgeler arası güç salınımlarının anlaşılması için önemlidir. P sinyalinde görülen salınımlar, özellikle F ve V sinyalleriyle aynı zaman aralığına denk geliyorsa raporda daha güçlü bir olay bağlamı oluşturur. Aktif güç sayfasında MW ekseni açık yazılır ve olay yorumu bu birimle ilişkilendirilir.

Reaktif Güç metriği, gerilim destek davranışı ve zorlanmış salınım şüphesi için ayrı önem taşır. Q sayfasında MVAr ekseni kullanılır. Zorlanmış salınım bandında Q sinyalinin yüksek enerji üretmesi, kontrol döngüsü veya kompanzasyon davranışı açısından ayrıca incelenmelidir.

Her metrik sayfasında aynı üç grafik bloğu bulunur. İlk grafik ham PMU ve filtrelenmiş sinyali, ikinci grafik mod sınıfı ve damping ratio değerini, üçüncü grafik ise bant enerjisi ve salınım genliğini gösterir. Bu tekrar eden yapı, operatörün F, V, P ve Q metrikleri arasında hızlı karşılaştırma yapmasını sağlar.

### 11.5. Eşik Mantığı

Eşik mantığı, tek bir örnek değerine bakmak yerine kayan pencere sonucunda üretilen bant metriklerini değerlendirir. Her pencerede RMS, genlik, baskın frekans, mod sınıfı ve damping bilgisi hesaplanır. Pencere eşik üstüne çıktığında olay adayı kabul edilir; ardışık aktif pencereler tek bir salınım olayı altında gruplanır.

| Metrik | Eşik Tipi | Varsayılan | Değerlendirme |
| --- | --- | --- | --- |
| Frekans | Mutlak genlik | 10 mHz | Frekans salınım genliği eşik üstüne çıkarsa aktif bulgu adayıdır. |
| Gerilim | Yüzdesel değişim | %5 | Pencere ortalamasına göre normalize edilen gerilim salınımı izlenir. |
| Aktif Güç | Yüzdesel değişim | %5 | MW değerindeki periyodik değişim pencere ortalamasına göre değerlendirilir. |
| Reaktif Güç | Yüzdesel değişim | %5 | MVAr davranışındaki modal enerji ve genlik birlikte yorumlanır. |

Pencere ortalaması sıfıra yakın olduğunda yüzdesel hesaplama güvenli moda alınır. Bu koruma özellikle P ve Q sinyallerinde düşük yük veya sıfıra yakın reaktif güç durumlarında yanlış yüksek yüzde üretimini engellemek için gereklidir.

Olay gruplama akışı şu mantıkla çalışır:

- İlk aktif pencere olay başlangıcı olarak alınır.
- Ardışık aktif pencereler aynı olayın parçası kabul edilir.
- Aktiflik kesildiğinde olay bitiş zamanı son aktif pencerenin bitişiyle kapatılır.
- Olay süresi başlangıç ve bitiş arasındaki farktan saniye cinsinden hesaplanır.
- Olayın baskın modu, pencerelerde en belirgin görülen modal banttan seçilir.
- Olayın damping yorumu, negatif veya pozitif eğilime göre üretilir.

Negatif damping, salınımın büyüme eğiliminde olabileceği anlamına gelir ve raporda kritik vurgu alır. Pozitif damping veya sıfıra yakın damping ise olayın izlenmesi gerektiğini, ancak aynı büyüme riskini taşımadığını gösterir. Bu ayrım hem tablo satırı renginde hem de karar destek cümlesinde görünür.

Grafiklerde kırmızı katman kritik veya büyüyen eğilimleri, yeşil katman ise sönümlenen ya da izlenen salınım olaylarını gösterir. Aynı renk dili PDF raporunda da korunur; böylece ekran ve yazdırma çıktısı arasında yorum farkı oluşmaz.

### 11.6. Zaman Filtresi Güvenliği

Zaman filtresi güvenliği, bu geliştirme döngüsünün en kritik düzeltmelerinden biridir. Kullanıcı tarih aralığını veya PMU seçimini değiştirdiğinde ekranda eski grafik kalması, analiz sonucunun yeni filtreye aitmiş gibi yorumlanmasına neden olabiliyordu. Yeni modelde ham veri sorgusu ve analiz sorgusu ayrı tutulduğu için bu risk azaltılır.

| Değişen Parametre | Ham Veri | Analiz Sonucu | Kullanıcı Etkisi |
| --- | --- | --- | --- |
| Başlangıç zamanı | Temizlenir | Temizlenir | Yeni zaman aralığı için yeniden veri çekilmesi gerekir. |
| Bitiş zamanı | Temizlenir | Temizlenir | Eski zaman aralığı yanlışlıkla analiz edilmez. |
| Tekli/çoklu PMU modu | Temizlenir | Temizlenir | Seçim modu ile veri kaynağı tutarlı kalır. |
| PMU listesi | Temizlenir | Temizlenir | Farklı fiderin eski verisi kullanılmaz. |
| Pencere süresi | Korunur | Temizlenir | Aynı ham veri yeni pencereyle yeniden analiz edilir. |
| Adım süresi | Korunur | Temizlenir | Kayan pencere çözünürlüğü yeniden hesaplanır. |
| Salınım eşikleri | Korunur | Temizlenir | Eşik değişikliği yalnız analiz sonucunu etkiler. |

Analizi Çalıştır butonu, mevcut filtrelerle uyumlu ham veri yoksa devre dışı kalır. Bu davranış kullanıcıyı engellemek için değil, yanlış zaman aralığıyla rapor üretilmesini önlemek için vardır. Arayüz, verinin güncel olmadığını belirten açıklayıcı bir durum mesajı gösterir.

Bu model özellikle gerçek YTBS/PMU sorgularında önemlidir. Operatör önce 17:40 - 18:00 aralığını çekip sonra 17:50 - 18:00 aralığına geçtiğinde, uygulama eski 20 dakikalık veriyi analiz etmeye devam etmez. Yeni aralık için verinin yeniden getirilmesi gerekir.

### 11.7. Analiz İlerleme Göstergesi

Analiz ilerleme göstergesi, kullanıcı geri bildirimini yalnız spinner seviyesinden çıkarır ve gerçek aşama bilgisi verir. Bu yapı, uzun zaman aralıklarında veya çoklu PMU seçimiyle çalışıldığında operatörün uygulamanın kilitlendiğini düşünmesini engeller.

| Aşama | Yaklaşık Aralık | Açıklama |
| --- | --- | --- |
| Veri hazırlama | %0 - %15 | Ham PMU örnekleri normalize edilir, ortak zaman ekseni hazırlanır. |
| Veri kalitesi | %15 - %30 | Örnek sayısı, boşluklar ve ölçüm sürekliliği değerlendirilir. |
| Bant metrikleri | %30 - %55 | F, V, P ve Q sinyalleri için modal bant hesapları yapılır. |
| Kayan pencere | %55 - %80 | Pencere/adım parametreleriyle zaman bazlı mod takibi üretilir. |
| Ortak mod ve rapor | %80 - %95 | Aktif pencereler olaylara gruplanır, karar destek cümleleri hazırlanır. |
| Tamamlandı | %100 | Grafikler, tablolar ve PDF rapor verisi kullanılabilir hale gelir. |

Worker desteklenmeyen ortamlarda fallback analiz yolu da aynı progress sözleşmesini kullanır. Böylece tarayıcı veya çalışma ortamı fark etmeksizin arayüz aynı kullanıcı deneyimini sunar.

İlerleme metni kısa tutulur; kullanıcıya hesaplama ayrıntılarını boğmadan hangi aşamanın işlendiğini gösterir. Hata oluşursa progress alanı hata mesajına dönüşür ve mevcut analiz sonucu yanlışlıkla başarılı gibi sunulmaz.

### 11.8. Grafik Yapısı

Grafik alanı üç tamamlayıcı grafikten oluşur. Bu grafikler hem ekranda hem de PDF raporunda aynı kavramsal sırayla kullanılır. Kullanıcı önce ham davranışı, sonra modal sınıfı ve damping bilgisini, son olarak da enerji/genlik büyüklüğünü görür.

| Grafik | İçerik | Operatörün Yanıtladığı Soru |
| --- | --- | --- |
| Grafik 1 | Ham PMU verisi, filtrelenmiş sinyal ve olay overlayleri | Sinyalde gerçekten görünür bir salınım var mı? |
| Grafik 2 | Mod sınıfı, DR (%) ve aktif mod markerları | Salınım hangi bantta ve damping eğilimi nasıl? |
| Grafik 3 | Bant enerjisi ve salınım genliği | Olay ne kadar baskın ve hangi aralıkta güçleniyor? |

Grafik 1 üzerinde kırmızı ve yeşil tespit katmanları, önceki sparse-null çizgi yaklaşımı yerine sürekli olay segmentleri olarak üretilir. Bu değişiklik, dataZoom yakınlaştırması yapıldığında olay çizimlerinin kaybolmasını önler. Segmentler olay başlangıç ve bitiş zamanına bağlıdır; bu nedenle görünür alan daralsa bile olayın ilgili kısmı korunur.

Grafik 2 sol eksende modal sınıfı, sağ eksende damping ratio değerini gösterir. Sol eksen kategorileri Salınım yok, Bölgeler Arası, Yerel, Zorlanmış ve Torsiyonel bant şeklinde okunur. Sağ eksen DR (%) olarak adlandırılır ve yüzde 5 referans seviyesiyle birlikte yorumlanır.

Grafik 3, bant enerjisini ve salınım genliğini birlikte gösterir. Enerji değeri olayın modal bantta ne kadar belirginleştiğini, genlik değeri ise sinyal üzerindeki pratik büyüklüğü anlamaya yardımcı olur. Bu grafik özellikle aynı zaman aralığında birden fazla metrikte olay göründüğünde karşılaştırma için kullanışlıdır.

Eksen adları kullanıcıya açık yazılır. Frekans için Frekans (Hz), gerilim için Gerilim (kV) veya Gerilim (p.u.), aktif güç için Aktif Güç (MW), reaktif güç için Reaktif Güç (MVAr) kullanılır. X eksenlerinde Zaman etiketi korunur.

Zoom davranışı için ortak `dataZoom` ayarı kullanılır. `filterMode: 'none'` seçimi, veri yakınlaştırılırken overlay serilerinin hesaplama dışına itilmesini engeller. Seri kimliklerinin sabit tutulması, ECharts yeniden çizimlerinde overlaylerin beklenmedik şekilde kaybolmasını azaltır.

### 11.9. Tooltip İçeriği

Tooltip alanları, grafik üzerindeki kısa temas anında operatöre olay bağlamını verir. Bu nedenle yalnız sayısal değer değil, olay zamanı ve analiz parametreleri de gösterilir.

| Tooltip Alanı | Açıklama |
| --- | --- |
| PMU / Fider | Verinin hangi ölçüm noktasına ait olduğunu gösterir. |
| Sinyal | Frekans, Gerilim, Aktif Güç veya Reaktif Güç bilgisini verir. |
| Salınım frekansı | Baskın modal frekansı Türkçe karakter sorunu olmadan gösterir. |
| Salınım zamanı | Olay başlangıç ve bitiş zamanını birlikte verir. |
| Salınım süresi | Olayın saniye veya dakika/saniye cinsinden süresini belirtir. |
| Mod | Bölgeler Arası, Yerel, Zorlanmış, Torsiyonel veya Salınım yok olarak yazılır. |
| Damping Ratio | DR değerini yüzde cinsinden gösterir ve kritik durumla ilişkilendirir. |
| Pencere / Adım | Analizde kullanılan pencere ve adım süresini açıklar. |

Türkçe karakter düzeltmesi özellikle "Salınım frekansı" ifadesi için yapılmıştır. Aynı kontrol; rapor başlıkları, eksen adları, tooltip satırları ve PDF çıktısındaki metinler için de geçerlidir. Kaynak dosyalar UTF-8 kabul edilir ve HTML dili Türkçe olarak tanımlanır.

Tooltip rengi olay sınıfıyla uyumlu kalır. Kritik veya negatif damping eğilimli olaylarda kırmızı vurgu, izlenen veya sönümlenen olaylarda yeşil vurgu kullanılır. Salınım yok durumunda nötr görünüm tercih edilir.

### 11.10. Karar Destek Sistemi

Karar Destek Sistemi, hesaplanan metrikleri yalnız değer olarak listelemez; bu değerlerin saha işletmesi açısından ne anlama geldiğini açıklar. Rapor önce tablo, sonra yorum prensibiyle çalışır. Önce bulgunun dayandığı sayısal veri gösterilir, ardından bu bulgunun olası anlamı cümleye dökülür.

Karar destek cümlesi şu bilgileri birleştirir:

- PMU veya fider adı.
- Olay başlangıç ve bitiş zamanı.
- Salınım süresi.
- Baskın salınım frekansı.
- Modal bant etiketi.
- Damping ratio değeri.
- Negatif damping varsa büyüme eğilimi uyarısı.
- İlgili sinyal metriği ve ölçüm birimi.

Örnek karar destek cümlesi:

`KARAMAN 154 kV fiderinde 17:52:00 - 17:54:00 zaman aralığında frekansı 0.101 Hz olan Bölgeler Arası salınım tespit edilmiştir. Salınımın sönümleme oranı %-0.01 olduğu için sistemde büyüme eğilimi gösteren kararsızlık riski izlenmelidir.`

Bu cümle alarm yerine geçmez; operatöre ve mühendise inceleme önceliği sağlar. Alarm üretimi ayrı iş kurallarına bağlıdır. Salınım Algılayıcı raporu, PMU modal analiz sonuçlarını anlaşılır bir değerlendirme olarak sunar.

Bulgular tablosu; metrik, mod, olay zamanı, süre, salınım frekansı, RMS, genlik ve damping bilgilerini içerir. Negatif damping veya kritik olay satırları kırmızı vurgulanır. Salınım yok durumları nötr gösterilir ve ham teknik kodlar kullanıcıya gösterilmez.

Veri kalitesi tablosu, raporun güvenilirliğini anlamak için kullanılır. Örnek sayısı, zaman aralığı, örnekleme frekansı, eksik veri oranı ve kullanılan pencere/adım bilgisi bu tabloda yer alır. Bu bölüm, karar destek cümlelerinin hangi veri kapsamına dayandığını şeffaflaştırır.

### 11.11. PDF RAPOR Butonu

PDF RAPOR butonu, CSV Dışa Aktar butonunun yanında konumlandırılır. Böylece veri dışa aktarma aksiyonları aynı kullanıcı alanında toplanır: CSV ham veya tablo verisi için, PDF RAPOR ise grafik ve yorum içeren operasyonel rapor için kullanılır.

Buton adı bilinçli olarak büyük ve açık yazılır: PDF RAPOR. Bu ad, tarayıcı yazdırma penceresinin yalnız rapor alanını basacağını ve çıktının ekran görüntüsünden daha düzenli bir doküman üreteceğini vurgular.

PDF RAPOR butonunun temel davranışları şunlardır:

- Analiz sonucu yoksa buton devre dışı kalır.
- Buton uygulama menülerini, yan navigasyonu ve filtre kartını yazdırmaz.
- Yazdırma hedefi yalnız print-only salınım raporu alanıdır.
- İlk sayfa yönetici özeti olarak düzenlenir.
- Sonraki sayfalar Frekans, Gerilim, Aktif Güç ve Reaktif Güç için ayrılır.
- Her metrik sayfası A4 landscape düzende grafik ve ayrıntı içerir.
- Türkçe karakterlerin korunması için UTF-8 metin ve Türkçe HTML dil ayarı kullanılır.

Bu düzenlemeden sonra yazdırma tuşu yalnız Karar Destek Sistemi metnini basan dar bir çıktı üretmez. Grafikler, olay tabloları, eşik bilgileri ve yorumlar aynı PDF rapor akışında yer alır. Bu, raporun kontrol odası sonrası değerlendirme veya mühendislik incelemesi için tek başına anlamlı olmasını sağlar.

### 11.12. PDF Sayfa Düzeni

PDF rapor, ekrandaki bütün uygulamayı yazdıran bir çıktı değildir. Rapor için ayrı bir print-only DOM alanı hazırlanır ve yazdırma sırasında yalnız bu alan görünür. Sayfa düzeni A4 landscape olarak tasarlanır; böylece grafikler daralmadan okunabilir.

İlk sayfa şu başlıkla başlar:

`Salınım Algılayıcı - PMU Modal Analiz ve Raporlama`

Yönetici özeti sayfasında analiz kapsamı kısa ve okunur şekilde verilir. Bu sayfa, raporu açan kişinin olayın hangi zaman aralığı, hangi PMU seçimi ve hangi eşiklerle üretildiğini hızlıca anlamasını sağlar.

| Yönetici Özeti Alanı | İçerik |
| --- | --- |
| Analiz başlığı | Salınım Algılayıcı - PMU Modal Analiz ve Raporlama |
| Zaman aralığı | Kullanıcının sorguladığı başlangıç ve bitiş zamanı |
| PMU kapsamı | Tekli veya çoklu PMU seçimi, fider adları |
| Analiz parametreleri | Pencere, adım, örnekleme frekansı |
| Eşik özeti | F, V, P ve Q için kullanılan salınım eşikleri |
| Veri kalitesi | Örnek sayısı, eksik veri oranı, ortak zaman ekseni durumu |
| Kritik bulgular | Negatif damping veya belirgin salınım olayları |
| Karar destek özeti | En önemli olayların kısa yorumları |

Yönetici özetinden sonra dört metrik sayfası gelir. Her sayfa aynı yapıyı izler, fakat yalnız ilgili metriğe ait grafik ve tabloları gösterir. Bu yapı, PDF içinde her metrik için ayrı inceleme alanı oluşturur.

| PDF Sayfası | Grafik 1 | Grafik 2 | Grafik 3 | Alt Rapor |
| --- | --- | --- | --- | --- |
| Frekans | Ham/filtrelenmiş Frekans (Hz) | Frekans Mod + DR (%) | Frekans Enerji + Genlik | Frekans olayları, eşik ve karar yorumu |
| Gerilim | Ham/filtrelenmiş Gerilim | Gerilim Mod + DR (%) | Gerilim Enerji + Genlik | Gerilim olayları, eşik ve karar yorumu |
| Aktif Güç | Ham/filtrelenmiş Aktif Güç (MW) | Aktif Güç Mod + DR (%) | Aktif Güç Enerji + Genlik | Aktif güç olayları, eşik ve karar yorumu |
| Reaktif Güç | Ham/filtrelenmiş Reaktif Güç (MVAr) | Reaktif Güç Mod + DR (%) | Reaktif Güç Enerji + Genlik | Reaktif güç olayları, eşik ve karar yorumu |

Her metrik sayfasında grafikler üst bölümde yer alır. Grafiklerin hemen altında olay özeti, bant metrikleri ve karar destek yorumu bulunur. Böylece grafik ile tablo farklı sayfalara kopmaz; kullanıcı gördüğü şekli aynı sayfada yorumuyla birlikte okuyabilir.

Sayfa kırılmaları metrik bazlıdır. Frekans, Gerilim, Aktif Güç ve Reaktif Güç ayrı sayfalarda başlar. Metrik sayfasında olay yoksa grafik yine yer alır, alt raporda ise "Bu metrik için eşik üstü salınım tespit edilmedi" gibi nötr bir açıklama gösterilir.

PDF çıktısında Türkçe karakter sorunu yaşanmaması için rapor metinleri doğrudan UTF-8 kaynaklardan gelir. Tarayıcı print akışı sistem fontlarını kullanır; başlık, tablo ve yorum alanlarında "ğ, ü, ş, İ, ı, ö, ç" karakterleri bozulmadan görünmelidir.

### 11.13. Operatör Kullanım Akışı

Operatör kullanım akışı, veri seçimiyle başlar ve rapor çıktısıyla tamamlanır. Normal senaryoda kullanıcı önce tekli veya çoklu PMU modunu seçer, ardından zaman aralığını belirler ve Veriyi Getir komutuyla ham PMU verisini yükler.

Veri geldikten sonra Analizi Çalıştır butonu aktif hale gelir. Kullanıcı analiz sürecini ilerleme çubuğundan takip eder. Tamamlanan analiz sonrasında metrik sekmeleri, grafikler, olay tabloları ve Karar Destek Sistemi alanı güncellenir.

Önerilen inceleme sırası şöyledir:

- Frekans sekmesinde sistem geneli düşük frekanslı modal hareketler kontrol edilir.
- Gerilim sekmesinde fider veya bara gerilimindeki salınım bileşenleri incelenir.
- Aktif Güç sekmesinde güç alışverişi kaynaklı salınım davranışı değerlendirilir.
- Reaktif Güç sekmesinde gerilim destek ve zorlanmış salınım şüpheleri araştırılır.
- Analiz Özeti sekmesinde tüm olaylar tek tabloda karşılaştırılır.
- Sinyal Bazlı Analiz sekmesinde her metrik için bant metrikleri okunur.
- Modal Analiz sekmesinde ortak modlar ve mod dağılımı izlenir.
- Rapor sekmesinde karar destek cümleleri ve veri kalitesi bilgisi değerlendirilir.

CSV Dışa Aktar, daha sonra harici analiz yapmak isteyen kullanıcı için ham veya tablo verisi sağlar. PDF RAPOR ise grafik, tablo ve yorumları birlikte taşıyan operasyonel dokümanı üretir. Bu iki butonun yan yana olması, dışa aktarma seçeneklerini daha kolay bulunur hale getirir.

### 11.14. Doğrulama Notları

Doğrulama iki katmanda yapılır: otomatik testler ve tarayıcı/PDF kalite kontrolü. Otomatik testler analiz kontratını korur; tarayıcı kontrolü ise grafik, zoom, print ve Türkçe karakter gibi görsel davranışları doğrular.

Önerilen otomatik test komutları:

| Komut | Doğruladığı Alan |
| --- | --- |
| `npm run test:oscillation` | Zaman filtresi, progress mesajları, olay süreleri, tooltip payload ve PDF rapor kontratı |
| `npm run test:ytbs-pmu` | Gerçek PMU parse davranışının korunması |
| `npm run test:scada-query-chunks` | SCADA sorgu chunk davranışının bozulmaması |
| `npm run build` | TypeScript ve Vite üretim derlemesinin başarılı olması |

Tarayıcı QA sırasında demo veri yüklenmeli, analiz çalıştırılmalı ve metrik sekmeleri tek tek gezilmelidir. Grafiklerde zoom yapıldığında kırmızı/yeşil olay katmanlarının kaybolmadığı kontrol edilmelidir. Tooltip üzerinde "Salınım frekansı", olay zamanı, süre, pencere ve adım bilgisi görünmelidir.

PDF QA sırasında PDF RAPOR butonunun CSV Dışa Aktar yanında bulunduğu doğrulanmalıdır. Print preview içinde uygulama menüsü, sidebar ve filtre kartları görünmemelidir. İlk sayfa yönetici özeti, sonraki sayfalar Frekans, Gerilim, Aktif Güç ve Reaktif Güç olarak ayrılmalıdır.

Türkçe karakter kontrolünde özellikle şu metinler incelenmelidir:

- Salınım Algılayıcı - PMU Modal Analiz ve Raporlama
- Salınım frekansı
- Bölgeler Arası salınım
- Reaktif Güç
- Yönetici özeti
- Sönümleme oranı
- Karar Destek Sistemi

Görsel QA için 1366 piksel masaüstü genişliği ve dar ekran görünümü ayrı ayrı denenmelidir. Tablo hücreleri taşmamalı, buton metinleri kırpılmamalı ve PDF önizleme sayfalarında grafikler rapor metinlerinden kopmamalıdır.

### 11.15. Bakım ve Genişletme Notları

Salınım Algılayıcı geliştirmelerinde en önemli bakım ilkesi, analiz sonucu ile veri sorgusunu birbirinden ayırmaya devam etmektir. Ham veri hangi zaman aralığı ve PMU seçimiyle geldiyse bu bilgi saklanmalı, analiz parametreleri değiştiğinde hangi katmanın geçersizleşeceği açıkça belirlenmelidir.

Yeni bir metrik eklenecekse yalnız grafik sekmesi eklemek yeterli değildir. Metrik için eşik tipi, birim, tooltip alanları, olay tablosu, karar destek yorumu ve PDF sayfası birlikte tasarlanmalıdır. Mevcut F, V, P ve Q düzeni bu genişletme için şablon olarak kullanılabilir.

Yeni bir modal bant eklenecekse sınıflandırma etiketi, operatör dili, renk davranışı ve rapor cümlesi birlikte güncellenmelidir. Ham kodların doğrudan kullanıcıya gösterilmemesi temel kuraldır. Teknik kodlar testlerde ve veri yapılarında kalabilir; arayüzde açıklayıcı Türkçe etiketler kullanılmalıdır.

PDF rapor geliştirmelerinde print-only alan korunmalıdır. Uygulama ekranını doğrudan yazdırmak kısa vadede kolay görünse de menü, filtre kartı, scroll alanları ve responsive kırılmalar rapor kalitesini düşürür. Bu nedenle rapor DOM'u ayrı kalmalı, grafik ve tablo içerikleri bu alana rapor mantığıyla aktarılmalıdır.

Karar Destek Sistemi metinleri genişletilirken alarm dili ile analiz yorumu ayrımı korunmalıdır. Uygulama bir modal analiz ve raporlama asistanıdır; doğrudan kesici açma, yük atma veya koruma eylemi önermez. Bunun yerine "izlenmelidir", "mühendislik incelemesi gerektirir", "büyüme eğilimi riski vardır" gibi karar desteği sağlayan ifadeler kullanır.

Türkçe karakter sorunları tekrar görülürse ilk kontrol noktaları kaynak dosya kodlaması, HTML `lang` ayarı, PDF/print font zinciri ve dışa aktarılan metinlerin encode edilme biçimidir. README ve arayüz metinleri UTF-8 olarak tutulmalıdır.

Bu bölüm, ileride yapılacak değişikliklerde "kolay görünen ama rapor kalitesini bozan" kısayolları önlemek için yazılmıştır. Salınım Algılayıcı sayfası artık yalnız bir grafik ekranı değil, ölçüm, tespit, yorum ve rapor üretiminden oluşan bütünlüklü bir WAMPAC operatör yardımcısı olarak ele alınmalıdır.
