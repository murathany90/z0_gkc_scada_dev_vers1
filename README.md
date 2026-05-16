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
