# GKÇ İstemci Modernizasyon Projesi (MERKEZRMS)

Bu proje, eski Java/JavaFX tabanlı Güç Kalitesi Çözümleyici (GKÇ) dinamik izleme istemcisinin **Rust + Tauri v2** ve **React + Vite** teknolojileriyle modernize edilmiş masaüstü uygulamasıdır. 

## 🚀 Teknolojiler
- **Backend:** Rust, Tauri v2, Tokio (Asenkron işlemler), Reqwest
- **Frontend:** React, TypeScript, Vite, Zustand (State Management)
- **Grafik & UI:** Apache ECharts, CSS3

## ⚡ Özellikler
1. **MerkezRMS Veri (Hazırlık Aşaması):** Doğrudan ana sunucudan canlı veri akışı ile dinamik izleme.
2. **YTBS GKÇ Veri (Gelişmiş Veri Hattı - Tamamlandı):** 
   - **Çoklu Grafik Birleştirme:** YTBS portalından gelen parçalı JSON bloklarını (Güç, Gerilim, Akım, Frekans) zaman damgasına göre asenkron olarak birleştirir.
   - **Asenkron Zaman Uyumluluğu:** Farklı örnekleme hızlarına sahip verileri ECharts `time` ekseni üzerinde milisaniye hassasiyetiyle senkronize eder.
   - **Veri İzlenebilirliği:** Grafik lejantlarında ve tooltiplerde verinin kaynağı olan orijinal YTBS anahtarları (y1-y15) açıkça belirtilir.
   - **Format Standardı:** Uygulama genelinde ve dışa aktarmada uluslararası **Nokta-Ondalık (.)** ve **Virgül-Binlik (,)** standardı uygulanır.
3. **Gelişmiş Veri Aktarımı (CSV Export):** 
   - Tüm 15 telemetri kanalını (y1-y15) içeren, asenkron verilerdeki boşlukları koruyan, "Yan Yana" kolon yapısında detaylı CSV raporlama.
4. **Güvenlik ve Oturum:** SMS doğrulama desteği, JSESSIONID/ViewState yönetimi ve otomatik keep-alive mekanizması.
5. **Ayarlar ve Log Yönetimi:** Cihaz konfigürasyonları ve sistem olaylarının anlık takibi.

## 🛠 Geliştirme Ortamı ve Derleme

Projeyi derlemek veya canlı önizleme ile geliştirmek için özel PowerShell/CMD bat betiklerini kullanabilirsiniz. (Bu betikler Windows ortamındaki Türkçe karakter sorununu çözer):

*   **`dev.bat`** : Uygulamayı geliştirici (Development) modunda, anlık güncellemeleri dinleyecek şekilde çalıştırır.
*   **`build.bat`** : Uygulamayı production-ready taşınabilir (Portable) `.exe` ve kurulum arşivi olarak derler. Portable kopya `portable-builds\gkc-scada-test_vYYMMDD_versX.exe` formatında adlandırılır.
*   **`npm run build:portable`** : Aynı derleme ve otomatik portable isimlendirme akışını komut satırından çalıştırır. Aynı gün içinde her yeni çıktı `vers1`, `vers2`, `vers3` şeklinde artar.

*(Not: Bu scriptler sisteminizdeki Cargo (Rust) modüllerini otomatik algılayarak yola (PATH) ekler).*

## 🧪 Test
Projede YTBS entegrasyonu testleri için Rust entegrasyon testleri bulunmaktadır:
```bash
cd src-tauri
cargo test --test test_10_feeders -- --nocapture
```
Bu test, `.env` içerisindeki giriş bilgilerinizle 10 farklı GKÇ fiderini otomatik sorgulayarak CDATA veri ayıklayıcı mekanizmasının sağlamlığını kanıtlar.
