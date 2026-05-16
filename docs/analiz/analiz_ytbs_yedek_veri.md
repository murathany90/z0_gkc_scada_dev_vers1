# YTBS Yedek Veri Çekme Stratejisi - Analiz Raporu

**Tarih:** 2026-05-10  
**Konu:** MERKEZRMS_8_6_3 istemcisinin kurum dışından veri çekemediği durumlarda YTBS web sitesi üzerinden alternatif veri erişimi  

---

## 1. Mevcut Durum ve Problem

MERKEZRMS_8_6_3 uygulaması, `212.174.153.18:8080` adresindeki GKÇ sunucusuna **kurum içi ağdan** doğrudan HTTP/REST ile bağlanarak veri çekmektedir. Bu sunucuya erişim **IP izni** gerektirir ve kurum dışından erişim mümkün değildir.

**Çözüm:** Aynı GKÇ ölçüm verileri, TEİAŞ'ın `https://ytbs.teias.gov.tr/ytbs/` web portalında **"Veri Toplama → Ölçüm Sistemleri → MGKP Ölçüm Verisi"** sayfasından da sorgulanabilmektedir. Bu portal internet üzerinden erişilebilir olup, SMS doğrulamalı kullanıcı hesabı ile giriş yapılır.

---

## 2. YTBS Sistemi Teknik Analizi

### 2.1. Teknoloji Yığını
| Bileşen | Teknoloji |
|---|---|
| **Backend** | Jakarta Faces (JSF) / PrimeFaces 15.0.5 |
| **Grafik** | AmCharts 5 (Canvas tabanlı) |
| **Harita** | Google Maps API |
| **Raporlama** | `DinamikRaporlamaMotoru.js` (özel JS motoru) |
| **Oturum Yönetimi** | JSESSIONID Cookie + ViewState Token |
| **Veri Formatı** | İstek: `application/x-www-form-urlencoded`, Yanıt: `text/xml` (PrimeFaces Partial Response) |

### 2.2. Kimlik Doğrulama Süreci
1. **Giriş URL:** `https://ytbs.teias.gov.tr/ytbs/frm_login.jsf`
2. Kullanıcı adı ve şifre girilir
3. **SMS Doğrulaması:** Tek seferlik kod girilir (24 saat geçerli)
4. Başarılı giriş sonrası `JSESSIONID` ve `Teiasytbs` cookie'leri set edilir
5. Tüm sonraki isteklerde bu cookie'ler ve `jakarta.faces.ViewState` token'ı kullanılır

### 2.3. MGKP Ölçüm Verisi Sayfası - Sorgu Parametreleri

Sayfa: `Veri Toplama → Ölçüm Sistemleri → MGKP Ölçüm Verisi`

| Form Alanı | ID | Açıklama | Örnek Değer |
|---|---|---|---|
| Başlangıç Zamanı | `form:baslangicZamani_input` | Sorgu başlangıcı | `10.05.2026 16:36` |
| Bitiş Zamanı | `form:bitisZamani_input` | Sorgu bitişi | `10.05.2026 17:36` |
| Gerilim Seviyesi | `form:gerilim_input` | Filtreleme | `""` (Hepsi), `GERILIM_400KV`, `GERILIM_154KV`, `GERILIM_66KV`, `GERILIM_33KV` |
| Faz | `form:fazId_input` | Tek/Üç faz | `1` (Tek Faz), `3` (Üç Faz) |
| Ölçüm Tipi | `form:olcumTipi_input` | PQ veya PMU | `PQ`, `PMU` |
| Cihaz | `form:cihaz_input` | Cihaz FİDER ID | Örn: `1108` (BAŞTAŞ, 154 kV KIRIKKALE) |
| GÖSTER Butonu | `form:j_idt8635` | Sorguyu tetikler | - |

### 2.4. Yanıt Yapısı - Keşfedilen Veri Alanları

Sorgu sonrası, sunucu sayfaya **inline JavaScript** olarak grafik verisi enjekte eder. Veriler iki ana JSON değişkeninde tutulur:

#### `grafik_yapisi_json` — Grafik Konfigürasyonu
```json
{
  "sonucFormati": "CIZGI_GRAFIK",
  "tarihFormati": "dd.MM.yyyy HH:mm:ss",
  "zamanAraligi": 3,           // 3 saniyelik örnekleme
  "sorguListesi": [
    { "yDegerAlani": "y11", "ad": "Aktif Güç",     "birim": "MW" },
    { "yDegerAlani": "y12", "ad": "Reaktif Güç",   "birim": "MVAr" },
    { "yDegerAlani": "y13", "ad": "Görünen Güç",   "birim": "MVA" }
  ]
}
```

#### `grafik_verisi_json` — Gerçek Ölçüm Verileri
```json
[
  { "zaman": "10.05.2026 16:36:00", "y11": 33.023547, "y13": 34.896032, "y12": 11.2306965 },
  { "zaman": "10.05.2026 16:36:03", "y11": 32.736231, "y13": 34.616793, "y12": 11.206291 },
  ...
]
```

#### Tespit Edilen Veri Kanalları (PQ Modu)

| Grafik | Y Alanı | Değer | Birim |
|---|---|---|---|
| **Güç** | `y11` | Aktif Güç | MW |
| **Güç** | `y12` | Reaktif Güç | MVAr |
| **Güç** | `y13` | Görünen Güç | MVA |
| **Gerilim** | `y3` | Gerilim Büyüklüğü Faz A | kV |
| **Gerilim** | `y4` | Gerilim Büyüklüğü Faz B | kV |
| **Gerilim** | `y5` | Gerilim Büyüklüğü Faz C | kV |
| **Akım** | `y7` | Akım Büyüklüğü Faz A | A |
| **Akım** | `y8` | Akım Büyüklüğü Faz B | A |
| **Akım** | `y9` | Akım Büyüklüğü Faz C | A |
| **Frekans** | `y1` | Frekans | Hz |

> **Not:** Bu veri kanalları, mevcut `MERKEZRMS_8_6_3` uygulamasının `app.properties` dosyasındaki RMS alanlarıyla (frekans, gerilim, akım, aktif/reaktif güç) birebir örtüşmektedir.

---

## 3. Cihaz Envanteri (265 Cihaz)

`MGKP_CIHAZ_LISTESI.csv` dosyasından elde edilen envanter:

| İstatistik | Değer |
|---|---|
| Toplam Cihaz | 265 |
| Ölçüm Modu PQ | ~230 |
| Ölçüm Modu PMU | ~35 |
| Aktif Cihaz (`AKTİF=true`) | ~150 |
| Eşli Cihaz (`EŞLİ=true`) | ~130 |
| Bölge Müdürlükleri | 8. BM (Ankara), 9. BM (Konya/Karaman), 11. BM (Kayseri), 6. BM (Eskişehir) |

**CSV Sütunları:** `GKÇ FİDER ID; GKÇ TRAFO MERKEZİ ADI; FİDER ADI; İLİ; BÖLGE MÜDÜRLÜĞÜ; GERİLİM; ÖLÇÜM MODU; AÇIKLAMA; EŞLİ; AKTİF`

> `GKÇ FİDER ID` değeri, YTBS sorgusundaki `form:cihaz_input` parametresindeki `value` ile aynıdır.

---

## 4. Veri Çekme Mekanizması — AJAX POST İsteği

"GÖSTER" butonuna basıldığında tetiklenen gerçek HTTP isteği:

```
POST https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Faces-Request: partial/ajax
X-Requested-With: XMLHttpRequest
Cookie: JSESSIONID=<oturum_id>; Teiasytbs=<f5_cookie>
```

**İstek Gövdesi (URL-encoded):**
```
jakarta.faces.partial.ajax=true
&jakarta.faces.source=form%3Aj_idt8635
&jakarta.faces.partial.execute=%40all
&jakarta.faces.partial.render=form
&form%3Aj_idt8635=form%3Aj_idt8635
&form=form
&form%3AbaslangicZamani_input=10.05.2026+16%3A36
&form%3Agerilim_input=
&form%3AfazId_input=1
&form%3AbitisZamani_input=10.05.2026+17%3A36
&form%3AolcumTipi_input=PQ
&form%3Acihaz_input=1108
&jakarta.faces.ViewState=<view_state_token>
```

**Yanıt:** `text/xml` formatında PrimeFaces `<partial-response>` XML'i. Bu XML içinde `<update>` bloklarında:
- Grafik HTML/JS kodu (inline `<script>` blokları ile `grafik_verisi_json` değişkeni)
- `DinamikRaporlamaMotoru.js` referansı

---

## 5. Tauri Uygulamasına Entegrasyon Planı

### 5.1. Mimari Genel Bakış

```
┌─────────────────────────────────────────────────┐
│              GKÇ Tauri Uygulaması               │
│                                                 │
│  ┌────────────┐    ┌───────────────────────┐    │
│  │  Birincil   │    │     Yedek (Fallback)  │    │
│  │  Veri Kanalı│    │     Veri Kanalı       │    │
│  │             │    │                       │    │
│  │ 212.174...  │    │  ytbs.teias.gov.tr    │    │
│  │ :8080       │    │  /ytbs/               │    │
│  │ (Doğrudan)  │    │  (Web Scraping)       │    │
│  └─────┬───────┘    └───────┬───────────────┘    │
│        │ XML                │ HTML+JSON          │
│        └────────┬───────────┘                    │
│                 ▼                                │
│       ┌─────────────────┐                        │
│       │  Veri Normalize  │                        │
│       │  Katmanı (Rust)  │                        │
│       └────────┬────────┘                        │
│                ▼                                 │
│       ┌─────────────────┐                        │
│       │  React Frontend  │                        │
│       │  (ECharts/Zustand)│                       │
│       └─────────────────┘                        │
└─────────────────────────────────────────────────┘
```

### 5.2. Fallback Akış Diyagramı

1. **Uygulama başlatılır** → Birincil kanal denenir (`212.174.153.18:8080`)
2. **Birincil kanal başarısız** → `connection-error` event'i frontend'e gönderilir
3. **Kullanıcı YTBS giriş bilgilerini girer** (Ayarlar sekmesinden)
4. **YTBS Oturum Açma:**
   - `frm_login.jsf` sayfasına GET → ViewState + JSESSIONID alınır
   - POST ile kullanıcı adı/şifre gönderilir
   - SMS doğrulama ekranı gelir → kullanıcıdan kod istenir
   - POST ile SMS kodu gönderilir → `JSESSIONID` güncellenir
5. **Veri Sorgulama (3 sn interval):**
   - `YTBSAnaSayfa.jsf` MGKP sayfasına geçiş yapılır
   - Her polling döngüsünde AJAX POST ile ölçüm sorgusu gönderilir
   - Yanıttaki `<partial-response>` XML'inden `grafik_verisi_json` parse edilir
   - Parse edilen JSON, mevcut `RmsData` struct'ına dönüştürülür
   - Frontend'e `rms-data` event'i ile gönderilir

### 5.3. Rust Backend İçin Gerekli Modüller

#### `src-tauri/src/ytbs_client.rs` (YENİ DOSYA)
```rust
// Ana sorumluluklar:
// 1. YTBS'ye login (ViewState yönetimi + cookie jar)
// 2. MGKP sayfasına navigasyon
// 3. Cihaz sorgusu gönderme
// 4. Partial-response XML parse etme
// 5. grafik_verisi_json çıkarma ve RmsData'ya dönüştürme

struct YtbsClient {
    http_client: reqwest::Client,    // cookie_store etkin
    view_state: Option<String>,
    session_active: bool,
    last_login: Option<DateTime>,
}

impl YtbsClient {
    async fn login(&mut self, username: &str, password: &str) -> Result<SmsRequired, Error>;
    async fn verify_sms(&mut self, code: &str) -> Result<(), Error>;
    async fn navigate_to_mgkp(&mut self) -> Result<(), Error>;
    async fn query_device(&self, device_id: u32, start: &str, end: &str, 
                          measurement_type: &str) -> Result<Vec<RmsData>, Error>;
    fn parse_partial_response(xml: &str) -> Result<Vec<RmsData>, Error>;
}
```

#### Gerekli Rust Crate'leri
| Crate | Kullanım |
|---|---|
| `reqwest` (mevcut) | HTTP istekleri, cookie jar yönetimi |
| `scraper` veya `select` | HTML/XML parse etme |
| `regex` | `grafik_verisi_json` çıkarma |
| `serde_json` (mevcut) | JSON parse |
| `chrono` (mevcut) | Tarih formatı dönüşümleri |

### 5.4. Frontend (React) Değişiklikleri

#### Ayarlar Sekmesi Güncellemeleri
1. **YTBS Giriş Bilgileri** bölümü (mevcut MerkezRMS bölümünün altına):
   - Kullanıcı Adı input
   - Şifre input
   - "YTBS'ye Bağlan" butonu
   - SMS Kodu input (sadece gerektiğinde görünür)
   - "SMS Doğrula" butonu
   - Bağlantı durumu göstergesi (Bağlı/Bağlı Değil/SMS Bekleniyor)

2. **Veri Kaynağı Göstergesi** (Dashboard header):
   - 🟢 "Birincil Kanal (Doğrudan)" — doğrudan sunucu bağlantısı
   - 🟡 "Yedek Kanal (YTBS)" — web portal üzerinden
   - 🔴 "Bağlantı Yok" — her iki kanal da başarısız
   - 🔵 "Mock Veri" — test modu

---

## 6. Kritik Dikkat Noktaları

### 6.1. ViewState Yönetimi
- Her sayfa gezintisi ve form submit sonrası `jakarta.faces.ViewState` değeri değişir
- Yeni ViewState, sunucu yanıtındaki `<update id="j_id1:jakarta.faces.ViewState:X">` bloğundan alınmalıdır
- ViewState süresi dolduğunda (`ViewExpiredException`), kullanıcı login sayfasına yönlendirilir → yeniden login gerekir

### 6.2. Oturum Süreleri
- **SMS doğrulaması:** 24 saat geçerli
- **Idle timeout:** 20 dakika (`PrimeFaces IdleMonitor` ile `timeout: 1200000 ms`)
- **Çözüm:** Her 15 dakikada bir keepalive isteği gönderilmeli

### 6.3. Hız Sınırlaması
- YTBS kurumsal bir sistem olup, aşırı istek rate-limiting'e veya IP engellemesine yol açabilir
- **Öneri:** Polling interval minimum 10 saniye olmalı (doğrudan kanaldaki 3 sn'den farklı)
- Mümkünse tarih aralığı genişletilerek toplu veri çekilip local cache'lenmeli

### 6.4. F5 Load Balancer Cookie'si
- `Teiasytbs=2046824620.36895.0000` — F5 BigIP persistence cookie
- Bu cookie'nin `reqwest` cookie jar'ında korunması şarttır

### 6.5. Veri Eşleştirme (MERKEZRMS ↔ YTBS)

| MERKEZRMS Alanı | YTBS JSON Alanı | Birim |
|---|---|---|
| `frekans` | `y1` | Hz |
| `gerilimA` | `y3` | kV |
| `gerilimB` | `y4` | kV |
| `gerilimC` | `y5` | kV |
| `akimA` | `y7` | A |
| `akimB` | `y8` | A |
| `akimC` | `y9` | A |
| `aktifGuc` | `y11` | MW |
| `reaktifGuc` | `y12` | MVAr |
| `gorunenGuc` | `y13` | MVA |

---

## 7. Geliştirme Fazları

### Faz 2A: YTBS Client Modülü (Rust)
- `ytbs_client.rs` oluşturma
- Login + SMS doğrulama akışı
- Cookie ve ViewState yönetimi
- Temel HTTP istek/yanıt döngüsü

### Faz 2B: Veri Parse ve Normalize
- `<partial-response>` XML parsing
- `grafik_verisi_json` regex ile çıkarma
- JSON → `RmsData` struct dönüşümü
- Tarih formatı çevirisi (`dd.MM.yyyy HH:mm:ss` → timestamp)

### Faz 2C: Fallback Entegrasyonu
- `commands.rs` içinde `start_monitoring` güncelleme
- Birincil kanal timeout → YTBS fallback otomatik geçiş
- Frontend'e kanal durumu bildirimi
- Ayarlar sekmesinde YTBS giriş UI

### Faz 2D: Oturum Yönetimi ve Dayanıklılık
- Keepalive mekanizması
- ViewState expire → otomatik re-login
- Hata loglarının `logStore`'a kaydedilmesi
- Rate limiting ve retry stratejisi

---

## 8. Örnek cURL Komutu (Referans)

Doğrulanmış, çalışan bir sorgu:

```bash
curl "https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf" \
  -H "Content-Type: application/x-www-form-urlencoded; charset=UTF-8" \
  -H "Faces-Request: partial/ajax" \
  -H "X-Requested-With: XMLHttpRequest" \
  -b "JSESSIONID=<OTURUM_ID>; Teiasytbs=<F5_COOKIE>" \
  --data-raw "jakarta.faces.partial.ajax=true\
&jakarta.faces.source=form%3Aj_idt8635\
&jakarta.faces.partial.execute=%40all\
&jakarta.faces.partial.render=form\
&form%3Aj_idt8635=form%3Aj_idt8635\
&form=form\
&form%3AbaslangicZamani_input=10.05.2026+16%3A36\
&form%3Agerilim_input=\
&form%3AfazId_input=1\
&form%3AbitisZamani_input=10.05.2026+17%3A36\
&form%3AolcumTipi_input=PQ\
&form%3Acihaz_input=1108\
&jakarta.faces.ViewState=<VIEW_STATE_TOKEN>"
```

---

## 9. Sonuç

YTBS web portalı, MERKEZRMS_8_6_3 uygulamasının doğrudan sunucuya erişemediği durumlarda **tam işlevsel bir yedek veri kaynağı** olarak kullanılabilir. Veriler birebir aynıdır (aynı GKÇ cihazları, aynı ölçüm parametreleri). 

Temel zorluk, JSF/PrimeFaces'in stateful yapısından kaynaklanan **ViewState yönetimi** ve **SMS doğrulaması** sürecidir. Ancak bu, Rust'ın `reqwest` crate'inin cookie jar desteği ve düzenli regex parsing ile çözülebilir bir mühendislik problemidir.
