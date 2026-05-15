# GKÇ İstemci Modernizasyonu (Tauri v2)

Bu proje, mevcut Java/JavaFX tabanlı Güç Kalitesi Çözümleyici (GKÇ) SCADA istemcisinin (MERKEZRMS_8_6_3) Tauri v2, Rust ve React (TypeScript) kullanılarak modernize edilmiş halidir.

Daha hafif, performanslı ve taşınabilir (portable) bir Windows masaüstü uygulaması olarak tasarlanmıştır.

## 🌟 Modernizasyon Hedefleri

- **Performans:** Java Runtime (JRE) bağımlılığını ortadan kaldırarak bellek kullanımını %80, başlangıç süresini %90 oranında iyileştirmek.
- **Taşınabilirlik:** Tek bir `.exe` dosyası ile kurulum gerektirmeden (portable) her bilgisayarda çalışabilme.
- **Görsel Mükemmellik:** ECharts ve D3.js kullanarak interaktif, akıcı ve yüksek çözünürlüklü grafikler sunma.
- **Güvenilirlik:** Rust dilinin sunduya "Memory Safety" avantajıyla çalışma zamanı hatalarını (NullPointerException vb.) minimize etme.
- **Veri Esnekliği:** Birincil sunucuya erişilemediğinde YTBS (Milli Güç Kalitesi Sistemi) üzerinden otomatik yedek veri çekme.

---

## 🏗️ Teknik Mimari (System Architecture)

Uygulama, modern bir "Sidecar" mimarisi üzerine kurulmuştur:

### 1. Backend (Rust / Tauri Core)
Rust backend, uygulamanın "motor" kısmıdır ve şu sorumlulukları üstlenir:
- **Asenkron Veri Toplama:** `tokio` runtime kullanarak MerkezRMS sunucularına 10 saniyelik periyotlarla HTTP GET/POST istekleri atar.
- **YTBS Web Client (`ytbs_client.rs`):** YTBS portalının karmaşık JSF/PrimeFaces yapısını simüle eden gelişmiş bir web istemcisi içerir. 
  - `CookieJar` yönetimi (JSESSIONID, F5 BIG-IP).
  - `javax.faces.ViewState` takibi ve otomatik güncellenmesi.
  - SMS Doğrulama (2FA) akışının yönetilmesi.
  - Çok bloklu (multi-block) CDATA/JSON yanıtlarının `Regex` ve `HashMap` ile birleştirilmesi (Union).
- **Veri Dönüştürme:** YTBS'den gelen ham `y1-y15` telemetri kanallarını standart `RmsData` formatına dönüştürür.
- **IPC (Inter-Process Communication):** Frontend ile JSON tabanlı komutlar ve olaylar (Events) üzerinden haberleşir.

### 2. Frontend (React / TypeScript)
Kullanıcı arayüzü, en güncel web teknolojileriyle inşa edilmiştir:
- **Zustand State Management:** 
  - `rmsStore.ts`: Anlık telemetri verilerini yönetir.
  - `ytbsStore.ts`: YTBS oturum durumunu, SMS süreçlerini ve geçmiş sorgu verilerini tutar.
  - `logStore.ts`: Tüm sistem ve ağ loglarını merkezi olarak toplar.
- **ECharts Entegrasyonu:** `TimeChart` bileşeni ile binlerce veri noktası "ConnectNulls" özelliğiyle akıcı bir şekilde çizilir.
- **Filtreleme ve Arama:** 264 farklı GKÇ cihazı arasından gerilim seviyesi, ölçüm modu veya isim ile anlık arama yapabilen gelişmiş UI bileşenleri.

---

## 📡 Veri Kanalları ve Protokoller

Uygulama iki ana veri kaynağını destekler:

| Özellik | MerkezRMS (Birincil) | YTBS (Yedek/Arşiv) |
| :--- | :--- | :--- |
| **İletişim** | XML/REST | AJAX/POST (JSF) |
| **Veri Tipi** | Anlık (Real-time) | Geçmiş (Historical) / 1dk Arşiv |
| **Güvenlik** | Basic Auth | Form Login + SMS (2FA) |
| **Gecikme** | < 10 saniye | ~15-20 dakika (Arşiv gecikmesi) |

### Ölçüm Kanalları (Mapping):
- `y1, y2, y3`: Gerilim (L1, L2, L3)
- `y4, y5, y6`: Akım (L1, L2, L3)
- `y7, y8, y9`: Aktif Güç (P1, P2, P3)
- `y10, y11, y12`: Reaktif Güç (Q1, Q2, Q3)
- `y15`: Frekans (Hz)

---

## 🧪 GKÇ Sağlık Taraması (Health Scan)

Bu özellik, sistemdeki 264 cihazın anlık durumunu otomatik olarak kontrol eder:
1. **Prensip:** Mevcut zamandan 15-16 dakika öncesi için her fiderden 1 dakikalık veri sorgular.
2. **Kriter:** Eğer sorgu sonucunda en az 1 adet geçerli telemetri paketi dönüyorsa fider 🟢 (SAĞLIKLI), aksi halde 🔴 (VERİ YOK) olarak işaretlenir.
3. **Throttling:** Sunucu yükünü korumak adına her sorgu arasında 2 saniyelik bekleme süresi uygulanır.
4. **Kalıcılık:** Tarama sonuçları `localStorage` üzerinden önbelleğe alınır ve uygulama kapatılsa dahi silinmez.

---

## 📁 Proje Yapısı

- `gkc-tauri/src-tauri`: 
  - `src/main.rs`: Giriş noktası ve IPC tanımları.
  - `src/ytbs_client.rs`: YTBS scraping mantığı.
  - `src/commands.rs`: Frontend'in çağırdığı Rust fonksiyonları.
  - `src/data_models.rs`: Veri yapıları ve serileştirme.
- `gkc-tauri/src`:
  - `App.tsx`: Ana uygulama döngüsü ve UI Layout.
  - `components/TimeChart.tsx`: ECharts tabanlı grafik motoru.
  - `stores/`: Zustand store tanımları.
  - `data/deviceList.ts`: 264 cihazlık statik veri tabanı.

---

## 🚀 Derleme ve Dağıtım (Build & Deployment)

Bu proje tamamen `portable` (bağımsız) bir Windows EXE'si üretmek üzere tasarlanmıştır.

### Gerekli Kurulumlar:
1.  **Node.js** (v24+)
2.  **Rust Toolchain** (v1.94+)
3.  **Visual Studio Build Tools 2022** (C++ Desktop Development paketi seçili olmalı)
4.  **Tauri CLI:** `cargo install tauri-cli`

### Hızlı Derleme Betikleri:
Proje kök dizininde bulunan `.bat` dosyaları, Türkçe karakterli kullanıcı dizini problemlerini aşmak için `%USERPROFILE%` değişkenini kullanır:

- **`dev.bat`**: Uygulamayı geliştirme (development) modunda başlatır.
- **``**: Uygulamayı optimize edilmiş `release` modunda derler ve şu dosyaları üretir:
  - 👉 `gkc-tauri\src-tauri\target\release\gkc-tauri.exe` (Portable)
  - 👉 `...target\release\bundle\msi\gkc-tauri_0.1.0_x64.msi` (Kurulum Dosyası)

---

## ⚙️ Konfigürasyon

Uygulama ayarları iki düzeyde yönetilir:
1.  **Statik Konfigürasyon:** `src-tauri/resources/app.properties` (Sunucu URL'leri, Timeout ayarları).
2.  **Dinamik Konfigürasyon:** Uygulama içindeki "Ayarlar" sekmesi üzerinden girilen ve `localStorage`'da saklanan kullanıcı bilgileri.

### YTBS Oturum Yönetimi:
YTBS oturumları 24 saat geçerlidir. Oturum süresi dolduğunda backend bunu otomatik algılar ve kullanıcıyı SMS koduna yönlendirir.

---

## 🛠️ Kullanılan Yapay Zeka Agent'ları ve MCP'ler

Bu projenin geliştirilmesinde Antigravity AI tarafından kullanılan özel yetenekler:

1.  **StitchMCP:** UI/UX tasarımı ve React bileşen mimarisinin modernizasyonu.
2.  **Chrome-Devtools-MCP:** YTBS AJAX isteklerinin analizi ve grafik render performans ölçümü.
3.  **Figma-Developer-MCP:** Tasarım varlıklarının ve ikonların projeye aktarılması.
4.  **Rust-Analyzer & Clippy:** Bellek güvenliği ve performanslı kod yazımı denetimi.

---

## 📜 Oturum Kayıtları

Geliştirme sürecindeki tüm adım ve kararlar detaylı olarak kayıt altına alınmıştır. 
👉 **[agent_oturumlar.md](agent_oturumlar.md)**

---

## 📜 Kodlama Kuralları (GEMINI.md)

Proje geliştirilirken uyulması gereken temel kurallar ve teknik kısıtlamalar `GEMINI.md` dosyasında tanımlanmıştır. 

---

## ⚖️ Lisans ve Kullanım

Bu yazılım, Türkiye Elektrik İletim A.Ş. (TEİAŞ) bünyesindeki Güç Kalitesi İzleme süreçlerinin modernizasyonu amacıyla özel olarak geliştirilmiştir. İzinsiz kopyalanması veya ticari amaçla kullanılması yasaktır.

© 2026 - GKÇ Modernizasyon Ekibi
