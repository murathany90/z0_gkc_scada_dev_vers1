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

1. Zaman filtresi değişince eski PMU verisinin yanlışlıkla analiz edilmesi engellendi.
2. Başlangıç zamanı, bitiş zamanı veya PMU seçimi değiştiğinde ham veri ve analiz sonucu temizlenir.
3. Pencere, adım veya eşik değiştiğinde yalnız analiz sonucu temizlenir; ham veri korunur.
4. Analizi Çalıştır butonu güncel ham veri yoksa devre dışı kalır.
5. Analiz worker akışı yüzde bazlı ilerleme mesajları üretir.
6. İlerleme çubuğu veri hazırlama, veri kalitesi, bant metrikleri, kayan pencere, ortak mod ve rapor aşamalarını gösterir.
7. Grafiklerde dataZoom kullanılırken kırmızı/yeşil tespit katmanlarının kaybolmasını önleyen sürekli segment yapısı eklendi.
8. Grafik tooltip alanlarında Salınım frekansı, salınım zamanı, süre, pencere ve adım bilgisi gösterilir.
9. Türkçe karakterlerin bozulmaması için HTML dili Türkçe olarak ayarlandı.
10. Karar Destek Sistemi alanı ham log görünümünden çıkarıldı.
11. Rapor alanı yönetici özeti, bulgular ve veri kalitesi tabloları içeren okunur bir yapıya taşındı.
12. PDF RAPOR butonu CSV Dışa Aktar butonunun yanına yerleştirildi.
13. PDF RAPOR çıktısı yalnız salınım raporunu basar; menü, filtre kartı ve uygulama kabuğu basılmaz.
14. PDF ilk sayfası yönetici özeti olarak düzenlendi.
15. PDF sonraki sayfaları Frekans, Gerilim, Aktif Güç ve Reaktif Güç için ayrı yatay sayfalardır.
16. Her metrik sayfasında grafikler üstte, özet ve bant tabloları altta yer alır.
17. Her metrik sayfasında ham PMU grafiği, Mod + DR grafiği ve Enerji + Genlik grafiği bulunur.
18. Tespit edilen salınım olayları kırmızı satır vurgusuyla raporlanır.
19. Negatif damping görülen olaylar kritik satır sınıfıyla ayrıca belirginleştirilir.
20. MOD_YOK gibi ham teknik kodlar operatör diline çevrilir.

### 11.3. Dört Modlu Salınım Sınıflandırması

Salınım Algılayıcı, dört temel modal bant üzerinden çalışır.

1. Mod 1 Interarea, yani Bölgeler Arası salınım bandıdır.
2. Mod 1 frekans aralığı 0.1 Hz ile 0.4 Hz arasındadır.
3. Mod 1 geniş alan sistem kararlılığı açısından en kritik elektromekanik banttır.
4. Mod 1 tespiti, uzak bölgeler arasında enerji alışverişi kaynaklı düşük frekanslı salınım riskini gösterir.
5. Mod 1 için negatif damping varsa olay büyüme eğiliminde kabul edilir.
6. Mod 1 raporlarında operatöre interarea salınım cümlesi üretilir.
7. Mod 2 Local, yani Yerel salınım bandıdır.
8. Mod 2 frekans aralığı 0.4 Hz ile 2 Hz arasındadır.
9. Mod 2 çoğunlukla tek bölge, santral veya yakın elektriksel alan davranışını temsil eder.
10. Mod 2 olayları yerel elektromekanik salınım adayı olarak raporlanır.
11. Mod 2 aktif güç ve gerilimde belirginleşebilir.
12. Mod 2 için sönümleme oranı izleme açısından önemlidir.
13. Mod 3 Forced, yani Zorlanmış salınım bandıdır.
14. Mod 3 frekans aralığı 2 Hz ile 4.5 Hz arasındadır.
15. Mod 3 sürekli dış etki, kontrol döngüsü veya ekipman kaynaklı zorlanmış bileşenleri temsil edebilir.
16. Mod 3 özellikle reaktif güç ve aktif güç sinyallerinde gözlemlenebilir.
17. Mod 3 olayları zorlanmış salınım adayı olarak raporlanır.
18. Mod 4 Torsiyon, pasif diagnostik banttır.
19. Mod 4 frekans aralığı 4.5 Hz ile 5 Hz arasındadır.
20. Mod 4 doğrudan aktif alarm sınıfı yerine diagnostik izleme amacıyla kullanılır.
21. Mod 4 tespitleri torsiyonel davranış şüphesi oluşturur.
22. Mod 4 raporda pasif torsiyon bilgisiyle ayrıştırılır.
23. Yok durumu salınım yok anlamına gelir.
24. Salınım yok ifadesi ham MOD_YOK kodu yerine kullanıcıya gösterilir.
25. Sınıflandırma etiketleri operatör diline çevrilir.

### 11.4. Dört Ölçüm Metriği

Salınım Algılayıcı dört PMU ölçüm metriğini birlikte değerlendirir.

1. Frekans metriği F harfiyle temsil edilir.
2. Frekans birimi Hz olarak raporlanır.
3. Frekans eşik değeri mHz cinsinden tanımlanır.
4. Varsayılan frekans salınım eşiği 10 mHz olarak kullanılır.
5. Frekans grafiği sistem frekansındaki düşük genlikli elektromekanik hareketleri izler.
6. Frekans interarea salınım tespitinde birincil sinyallerden biridir.
7. Frekans PDF sayfasında ham frekans, filtrelenmiş frekans, mod tespiti ve DR bilgisi yer alır.
8. Gerilim metriği V harfiyle temsil edilir.
9. Gerilim birimi kV olarak raporlanır.
10. Gerilim eşiği yüzde olarak tanımlanır.
11. Varsayılan gerilim salınım eşiği yüzde 5 olarak kullanılır.
12. Gerilim grafiği bara veya fider gerilimindeki salınım bileşenlerini izler.
13. Gerilim için per-unit görünüm desteklenir, ancak PDF raporda temel değer ekseni okunur şekilde verilir.
14. Gerilim PDF sayfasında ham gerilim, filtrelenmiş gerilim, mod tespiti ve enerji/genlik grafikleri bulunur.
15. Aktif Güç metriği P harfiyle temsil edilir.
16. Aktif Güç birimi MW olarak raporlanır.
17. Aktif Güç eşiği yüzde olarak tanımlanır.
18. Varsayılan aktif güç salınım eşiği yüzde 5 olarak kullanılır.
19. Aktif Güç yerel ve bölgeler arası güç salınımlarını anlamak için önemlidir.
20. Aktif Güç PDF sayfasında MW ekseni, mod sınıfı ve olay yorumları birlikte verilir.
21. Reaktif Güç metriği Q harfiyle temsil edilir.
22. Reaktif Güç birimi MVAr olarak raporlanır.
23. Reaktif Güç eşiği yüzde olarak tanımlanır.
24. Varsayılan reaktif güç salınım eşiği yüzde 5 olarak kullanılır.
25. Reaktif Güç özellikle zorlanmış salınım ve gerilim destek davranışları için takip edilir.
26. Reaktif Güç PDF sayfasında MVAr ekseni, enerji/genlik çizimi ve olay yorumu bulunur.

### 11.5. Eşik Mantığı

1. Frekans eşiği mutlak mHz büyüklüğüyle değerlendirilir.
2. Frekans sinyalinde 10 mHz üstü salınımlar aktif bulgu adayıdır.
3. Gerilim eşiği pencere ortalamasına göre yüzde olarak hesaplanır.
4. Aktif güç eşiği pencere ortalamasına göre yüzde olarak hesaplanır.
5. Reaktif güç eşiği pencere ortalamasına göre yüzde olarak hesaplanır.
6. Pencere ortalaması sıfıra yakınsa güvenli eşik hesaplama kullanılır.
7. Her sinyal için bant RMS, genlik ve baskın frekans hesaplanır.
8. Eşik üstü pencereler aktif mod olarak işaretlenir.
9. Eşik altı pencereler salınım yok olarak raporlanır.
10. Aktif pencereler ardışık ise tek olay altında gruplanır.
11. Olay başlangıcı ilk aktif pencerenin başlangıcıdır.
12. Olay bitişi son aktif pencerenin bitişidir.
13. Olay süresi saniye cinsinden hesaplanır.
14. PDF raporda olay süresi hem tablo hem yorum içinde görünür.
15. Negatif damping varsa olay kritik kabul edilir.
16. Pozitif veya sıfır damping varsa olay izlenen/sönümlenen salınım olarak değerlendirilir.
17. Damping Ratio yüzde cinsinden raporlanır.
18. DR yüzde 5 referans çizgisi ve pozitif/negatif eğilimler grafikte izlenebilir.
19. Kırmızı katman negatif damping veya büyüme eğilimini vurgular.
20. Yeşil katman sönümlenen veya izlenen salınımı vurgular.

### 11.6. Zaman Filtresi Güvenliği

1. Ham veri artık sorgu parametreleriyle birlikte saklanır.
2. Saklanan ham veri sorgusunda seçim modu bulunur.
3. Saklanan ham veri sorgusunda seçili PMU kimlikleri bulunur.
4. Saklanan ham veri sorgusunda başlangıç zamanı bulunur.
5. Saklanan ham veri sorgusunda bitiş zamanı bulunur.
6. Analiz başlatılırken mevcut filtreler ham veri sorgusuyla karşılaştırılır.
7. Filtreler uyuşmazsa analiz başlatılmaz.
8. Kullanıcıya verinin güncel olmadığı bilgisi gösterilir.
9. PMU değişirse ham veri temizlenir.
10. Başlangıç zamanı değişirse ham veri temizlenir.
11. Bitiş zamanı değişirse ham veri temizlenir.
12. Çoklu PMU seçimi değişirse ham veri temizlenir.
13. Pencere değişirse yalnız analiz temizlenir.
14. Adım değişirse yalnız analiz temizlenir.
15. Eşik değişirse yalnız analiz temizlenir.
16. Bu davranış eski ham verinin yeni zaman aralığı için yanlış yorumlanmasını engeller.

### 11.7. Analiz İlerleme Göstergesi

1. Analiz worker akışı artık progress mesajı üretir.
2. Veri hazırlama aşaması ilk ilerleme durumudur.
3. Veri kalitesi aşaması örnek sayısı ve eksiklik kontrollerini temsil eder.
4. Bant metrikleri aşaması spektral hesaplamaları temsil eder.
5. Kayan pencere aşaması zaman bazlı mod takibini temsil eder.
6. Ortak mod ve rapor aşaması olay gruplama ve yorum üretimini temsil eder.
7. Tamamlandı aşaması yüzde 100 olarak gösterilir.
8. Kullanıcı Analizi Çalıştır butonuna bastığında süreç geri bildirimi alır.
9. Progress bar filtre kartı içinde görünür.
10. Progress metni yüzde ile birlikte gösterilir.
11. Worker desteklenmiyorsa fallback analiz de progress üretir.
12. Bu yapı uzun PMU analizlerinde kullanıcı belirsizliğini azaltır.

### 11.8. Grafik Yapısı

1. Grafik 1 ham PMU verisini gösterir.
2. Grafik 1 filtrelenmiş sinyali de gösterir.
3. Grafik 1 üzerinde kırmızı ve yeşil tespit katmanları bulunur.
4. Kırmızı katman negatif damping veya kritik eğilim için kullanılır.
5. Yeşil katman sönümlenen veya izlenen olaylar için kullanılır.
6. Grafik 1 x ekseni Zaman olarak adlandırılır.
7. Grafik 1 y ekseni sinyal adına ve birime göre adlandırılır.
8. Grafik 2 Mod + DR grafiğidir.
9. Grafik 2 sol y ekseninde mod sınıfı bulunur.
10. Grafik 2 sağ y ekseninde DR yüzde değeri bulunur.
11. Grafik 2 üzerinde üçgen marker ile damping yönü gösterilir.
12. Yukarı üçgen büyüyen salınımı ifade eder.
13. Aşağı üçgen sönümlenen salınımı ifade eder.
14. Grafik 3 Enerji + Genlik grafiğidir.
15. Grafik 3 bant enerjisini ve salınım genliğini birlikte gösterir.
16. Grafik 3 olayın baskınlığını anlamaya yardımcı olur.
17. Tüm grafiklerde dataZoom filterMode none olarak kullanılır.
18. Bu ayar zoom sırasında overlay serilerinin kaybolmasını engeller.
19. Overlay çizimleri sparse-null seriler yerine sürekli segment olarak üretilir.
20. Bu yapı yakınlaştırma sonrası renkli tespit katmanlarını korur.

### 11.9. Tooltip İçeriği

1. Tooltip metinleri Türkçe karakterlerle gösterilir.
2. Salınım frekansı ifadesi doğru yazılır.
3. Salınım zamanı başlangıç ve bitiş olarak gösterilir.
4. Salınım süresi saniye veya dakika/saniye formatıyla gösterilir.
5. Analiz penceresi tooltip içine eklenir.
6. Analiz adımı tooltip içine eklenir.
7. PMU adı tooltip içinde okunur biçimde gösterilir.
8. Mod etiketi tooltip içinde operatör diliyle yer alır.
9. DR değeri yüzde olarak gösterilir.
10. Tooltip, grafik üzerindeki marker ile aynı renk mantığını kullanır.

### 11.10. Karar Destek Sistemi

1. Karar Destek Sistemi ham log metni üretmez.
2. Önce yönetici özeti verilir.
3. Ardından olay bazlı karar cümleleri üretilir.
4. Cümlelerde PMU fider adı yer alır.
5. Cümlelerde olay zaman aralığı yer alır.
6. Cümlelerde salınım süresi yer alır.
7. Cümlelerde baskın frekans yer alır.
8. Cümlelerde mod bandı yer alır.
9. Cümlelerde damping yorumlanır.
10. Negatif damping kararsızlık riski olarak yorumlanır.
11. Negatif olmayan damping izlenen/sönümlenen olay olarak yorumlanır.
12. Bulgular tablosu karar cümlelerinin dayandığı veriyi gösterir.
13. Veri kalitesi tablosu raporun güvenilirliğini gösterir.
14. Operatör raporu alarm üretmez; mühendislik değerlendirmesi sağlar.
15. Karar destek formatı WAMPAC arayüz mantığına yaklaştırılmıştır.

### 11.11. PDF RAPOR Butonu

1. PDF RAPOR butonu filtre kartındaki aksiyon grubunda bulunur.
2. PDF RAPOR butonu CSV Dışa Aktar butonunun yanına taşınmıştır.
3. Analiz sonucu yoksa PDF RAPOR butonu devre dışıdır.
4. PDF RAPOR butonu uygulama menülerini yazdırmaz.
5. PDF RAPOR butonu yalnız salınım raporu DOM alanını yazdırır.
6. PDF RAPOR çıktısında ilk sayfa yönetici özetidir.
7. PDF RAPOR çıktısında ikinci sayfa Frekans metriğidir.
8. PDF RAPOR çıktısında üçüncü sayfa Gerilim metriğidir.
9. PDF RAPOR çıktısında dördüncü sayfa Aktif Güç metriğidir.
10. PDF RAPOR çıktısında beşinci sayfa Reaktif Güç metriğidir.
11. PDF sayfaları A4 landscape düzendedir.
12. Her metrik sayfasında grafikler üst bölümde bulunur.
13. Her metrik sayfasında özet bilgiler grafiklerin hemen altında bulunur.
14. PDF raporda Türkçe karakterler HTML lang tr ve UTF-8 kaynaklarla korunur.
15. PDF çıktısında karar destek cümleleri, tablolar ve grafikler aynı raporda birleşir.

### 11.12. PDF Sayfa Düzeni

1. Yönetici özeti sayfasında ana başlık Salınım Algılayıcı - PMU Modal Analiz ve Raporlama olarak görünür.
2. Yönetici özeti sayfasında analiz kapsamı açıklanır.
3. Yönetici özeti sayfasında seçilen PMU sayısı gösterilir.
4. Yönetici özeti sayfasında PMU fiderleri listelenir.
5. Yönetici özeti sayfasında pencere ve adım bilgisi verilir.
6. Yönetici özeti sayfasında örnekleme frekansı verilir.
7. Yönetici özeti sayfasında salınım eşikleri tablo halinde verilir.
8. Yönetici özeti sayfasında veri kalitesi tablo halinde verilir.
9. Frekans sayfasında ham frekans grafiği bulunur.
10. Frekans sayfasında Mod + DR grafiği bulunur.
11. Frekans sayfasında Enerji + Genlik grafiği bulunur.
12. Gerilim sayfasında ham gerilim grafiği bulunur.
13. Gerilim sayfasında Mod + DR grafiği bulunur.
14. Gerilim sayfasında Enerji + Genlik grafiği bulunur.
15. Aktif Güç sayfasında ham MW grafiği bulunur.
16. Aktif Güç sayfasında Mod + DR grafiği bulunur.
17. Aktif Güç sayfasında Enerji + Genlik grafiği bulunur.
18. Reaktif Güç sayfasında ham MVAr grafiği bulunur.
19. Reaktif Güç sayfasında Mod + DR grafiği bulunur.
20. Reaktif Güç sayfasında Enerji + Genlik grafiği bulunur.
21. Her metrik sayfasında eşik ve birim bilgisi başlık satırında yer alır.
22. Her metrik sayfasında olay yorumu bulunur.
23. Her metrik sayfasında bant metrikleri tablosu bulunur.
24. Her metrik sayfasında tespit satırları kırmızı vurgulanır.
25. Her metrik sayfasında salınım yok satırları nötr kalır.

### 11.13. Operatör Kullanım Akışı

1. Operatör Salınım Algılayıcı sekmesine geçer.
2. Operatör tekli veya çoklu PMU seçim modunu belirler.
3. Operatör PMU GKÇ fiderlerini seçer.
4. Operatör başlangıç ve bitiş zamanını girer.
5. Operatör pencere ve adım değerlerini kontrol eder.
6. Operatör frekans, gerilim, aktif güç ve reaktif güç eşiklerini kontrol eder.
7. Operatör Veriyi Getir ile gerçek YTBS PMU sorgusu yapar.
8. Operatör demo doğrulama için Demo Verisi kullanabilir.
9. Operatör Analizi Çalıştır butonuna basar.
10. Operatör progress bar üzerinden analiz aşamasını izler.
11. Operatör Frekans, Gerilim, Aktif Güç ve Reaktif Güç sekmeleri arasında geçiş yapar.
12. Operatör Grafik 1 üzerinde ham ve filtrelenmiş sinyali inceler.
13. Operatör Grafik 2 üzerinde mod ve DR davranışını inceler.
14. Operatör Grafik 3 üzerinde enerji ve genlik davranışını inceler.
15. Operatör Analiz Özeti sekmesinde olay tablosunu inceler.
16. Operatör Sinyal Bazlı Analiz sekmesinde bant metriklerini inceler.
17. Operatör Modal Analiz sekmesinde ortak modları inceler.
18. Operatör Rapor sekmesinde Karar Destek Sistemi çıktısını inceler.
19. Operatör CSV Dışa Aktar ile ham PMU verisini alabilir.
20. Operatör PDF RAPOR ile grafik ve özet içeren raporu yazdırabilir.

### 11.14. Doğrulama Notları

1. `npm run test:oscillation` salınım analiz kontratını doğrular.
2. Testler zaman filtresi temizliğini doğrular.
3. Testler progress mesajlarını doğrular.
4. Testler salınım olaylarının süre üretmesini doğrular.
5. Testler sınıflandırma etiketlerinin insan diline çevrilmesini doğrular.
6. Testler tooltip payload içinde Salınım frekansı metnini doğrular.
7. Testler kırmızı/yeşil overlay segmentlerinin sürekli olmasını doğrular.
8. Testler PDF rapor yapısının dört metrik sayfası üretmesini doğrular.
9. Testler her metrik sayfasında üç grafik slotu olmasını doğrular.
10. `npm run build` TypeScript ve Vite üretim derlemesini doğrular.
11. `npm run test:ytbs-pmu` gerçek PMU parse davranışını korur.
12. `npm run test:scada-query-chunks` SCADA sorgu chunk davranışını korur.
13. Tarayıcı QA sırasında demo veri yüklenmelidir.
14. Tarayıcı QA sırasında analiz çalıştırılmalıdır.
15. Tarayıcı QA sırasında PDF RAPOR butonunun aktif olduğu doğrulanmalıdır.
16. Tarayıcı QA sırasında print DOM içinde grafik alanları aranmalıdır.
17. Tarayıcı QA sırasında konsolda hata ve uyarı olmamalıdır.
18. Tarayıcı QA sırasında 1366 piksel masaüstü görünüm kontrol edilmelidir.
19. Tarayıcı QA sırasında dar genişlik görünüm kontrol edilmelidir.
20. PDF önizleme sırasında özet + dört metrik sayfası ayrı sayfalarda görünmelidir.
