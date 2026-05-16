# GKÇ Modernizasyon Projesi - Teknik Dökümantasyon

Bu doküman, uygulamanın mimari kararlarını ve teknik veri yapılarını detaylandırır.

## 1. YTBS Veri Hattı (Data Pipeline)

Uygulama, TEİAŞ YTBS portalından veri çekmek için gelişmiş bir "Scraper" mekanizması kullanır.

### Veri Birleştirme Mantığı
YTBS portalı, bir fider sorgulandığında verileri 4 farklı grafik bloğu (`var grafik_verisi_json`) olarak gönderir:
- **Blok 1:** Aktif/Reaktif/Görünen Güç (y11, y12, y13)
- **Blok 2:** Faz Gerilimleri (y3, y4, y5)
- **Blok 3:** Faz Akımları (y7, y8, y9)
- **Blok 4:** Frekans (y1)

**Çözüm:** Rust backend (`ytbs_client.rs`), bu blokların tamamını tarar ve `zaman` damgasına göre bir `HashMap` içinde birleştirir. Eğer bir saniyede sadece gerilim verisi varsa, diğer alanlar `null` (None) olarak işaretlenir.

### Asenkron Zaman Yönetimi
Farklı bloklar farklı saniyelerde veri içerebilir (Örn: Gerilim 12:00:02'de, Akım 12:00:03'te).
- **Grafik:** ECharts `time` ekseni kullanılarak her nokta gerçek zamanında gösterilir. `connectNulls: true` ile çizgiler akıcı bir şekilde birleştirilir.
- **Dışa Aktarma:** CSV dosyasında her benzersiz zaman damgası bir satır olarak yer alır. Eksik veriler o satırda boş hücre olarak gösterilir.

## 2. Veri Modelleri

### YtbsGrafikVerisi (Rust)
```rust
pub struct YtbsGrafikVerisi {
    pub zaman: String,
    pub y1: Option<f64>,  // Frekans
    pub y3: Option<f64>,  // Gerilim A
    // ... y15'e kadar devam eder
}
```

### RmsData (Genel Model)
Uygulama içi standartlaştırılmış model. YTBS'den gelen veriler bu modele dönüştürülürken ondalık hassasiyeti korunur.

## 3. Format ve Standartlar

- **Ondalık Ayırıcı:** Nokta (.) -> Örn: `50.001`
- **Binlik Ayırıcı:** Virgül (,) -> Örn: `1,250.50`
- **Tarih Formatı:** `GG.AA.YYYY SS:DD:SS` (YTBS Standardı)

## 4. Kullanıcı Arayüzü (UI)

- **Grafik Kütüphanesi:** Apache ECharts
- **Tema:** Modern Dark Mode (Glassmorphism esintili)
- **Traceability:** Her verinin yanında orijinal veri anahtarı `(yX)` gösterilir, bu sayede hata ayıklama kolaylaşır.

---
*Son Güncelleme: 11 Mayıs 2026*
