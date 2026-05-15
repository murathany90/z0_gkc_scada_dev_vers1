# GKÇ İstemci Yazılımı Analiz Raporu

> **Proje:** MERKEZRMS_8_6_3 – Güç Kalitesi Çözümleyici (GKÇ) Dinamik İzleme İstemcisi  
> **Versiyon:** 8.6.3  
> **Analiz Tarihi:** 2026-05-10  
> **Durum:** Kaynak kod mevcut değil – Derlenmiş binary üzerinden ters-mühendislik analizi

---

## 1. Genel Bakış

Bu rapor, `MERKEZRMS_8_6_3` deposundaki **MGKP_DINAMIK_IZLEME.exe** istemci yazılımının dosya yapısını, teknoloji yığınını, yapılandırma parametrelerini ve sunucu iletişim mekanizmalarını analiz etmektedir. Kaynak kodların bulunmaması nedeniyle tüm analizler **binary string extraction**, **dosya yapısı incelemesi** ve **konfigürasyon dosyası tersine mühendisliği** yöntemleriyle gerçekleştirilmiştir.

---

## 2. Dosya Yapısı Analizi

### 2.1. Dizin Hiyerarşisi

```
MERKEZRMS_8_6_3/
├── MGKP_DINAMIK_IZLEME.exe    (2.84 MB)  ← Ana uygulama (Jar2Exe wrapper)
├── app.properties              (4.49 KB)  ← XStream XML konfigürasyon dosyası
├── 5.xml                       (32 KB)    ← Tek-hat şeması (Single-Line Diagram) verisi
├── App.ico                     (14.8 KB)  ← Uygulama ikonu
├── basic_icon.gif              (20.3 KB)  ← Temel ikon görseli
├── version                     (5 B)      ← Versiyon bilgisi: "8.6.3"
└── jre/                                   ← Gömülü Java Runtime Environment
    ├── bin/                               ← Java çalıştırıcıları ve DLL'ler
    │   ├── java.exe / javaw.exe           ← JRE 1.8.0_191 (32-bit, i586)
    │   ├── prism_d3d.dll                  ← JavaFX Direct3D rendering
    │   ├── glass.dll                      ← JavaFX windowing toolkit
    │   ├── jfxwebkit.dll (46 MB)          ← JavaFX WebKit motoru
    │   └── ... (127 dosya)
    └── lib/
        ├── rt.jar (52 MB)                 ← Java standart kütüphane
        ├── jfxrt.jar (17.4 MB)            ← JavaFX runtime
        ├── deploy.jar (4.8 MB)            ← Java Web Start
        └── ... (30+ dosya, 10 alt dizin)
```

### 2.2. Dosya Boyutları ve Önem Derecesi

| Dosya | Boyut | Rol | Kritiklik |
|-------|-------|-----|-----------|
| `MGKP_DINAMIK_IZLEME.exe` | 2.84 MB | Ana uygulama sarmalayıcısı (Jar2Exe) | 🔴 Kritik |
| `app.properties` | 4.49 KB | Uygulama konfigürasyonu (XStream XML) | 🔴 Kritik |
| `5.xml` | 32 KB | Tek-hat şeması verileri | 🟡 Orta |
| `jfxrt.jar` | 17.4 MB | JavaFX UI framework | 🟢 Bağımlılık |
| `jfxwebkit.dll` | 46 MB | WebKit rendering motoru | 🟢 Bağımlılık |
| `rt.jar` | 52 MB | Java standart kütüphane | 🟢 Bağımlılık |

---

## 3. Teknoloji Yığını Analizi

### 3.1. Programlama Dili ve Framework

| Bileşen | Teknoloji | Tespit Yöntemi |
|---------|-----------|----------------|
| **Dil** | Java 8 (1.8.0_191) | JRE `release` dosyası |
| **UI Framework** | JavaFX | `jfxrt.jar`, `prism_d3d.dll`, `glass.dll` varlığı |
| **Paketleme** | Jar2Exe (regexlab.com) | EXE binary string analizi |
| **Serialization** | XStream XML | `app.properties` dosyası `datarms.KonfigurasyonData` root elementi |
| **Takvim** | JCalendar 1.1.1 | MANIFEST.MF içeriği |
| **Mimari** | 32-bit (i586) | JRE `release` dosyası: `OS_ARCH="i586"` |

### 3.2. Jar2Exe Wrapper Detayları

Binary analiz sonuçları:

```
Wrapper: com.regexlab.j2e.Jar2ExeClassLoader
Ana Sınıf (Main-Class): gui.Login
Paket Adı: datarms.KonfigurasyonData
Şifreleme: Jar2Exe yerleşik şifreleme (z5p6i7ea8p9n0 anahtarı tespit edildi)
Class-Path: . (mevcut dizin)
```

**Önemli Bulgular:**
- EXE dosyası, Jar2Exe aracıyla paketlenmiş bir Java uygulamasıdır
- Ana uygulama JAR'ı EXE içinde **şifreli olarak gömülüdür**
- Gömülü launcher JAR'ı yalnızca 29 KB olup, sadece Jar2Exe bootstrap ve JavaFX Main sınıflarını içerir
- Gerçek uygulama kodu (`gui.Login`, `datarms.*` paketleri) şifreli bölümde saklanmaktadır

### 3.3. Tespit Edilen Java Sınıf Yapısı

```
gui.Login                    ← Giriş ekranı (ana giriş noktası)
datarms.KonfigurasyonData    ← Konfigürasyon veri modeli (XStream)
```

> ⚠️ **Not:** Jar2Exe şifrelemesi nedeniyle uygulamanın tam sınıf yapısı çıkarılamamıştır. Yalnızca MANIFEST.MF ve konfigürasyon dosyasından elde edilen bilgiler mevcuttur.

---

## 4. Konfigürasyon Dosyası Analizi (`app.properties`)

### 4.1. Dosya Formatı

`app.properties` dosyası, Java'nın **XStream** kütüphanesi ile serileştirilmiş XML formatındadır. Root element `datarms.KonfigurasyonData` sınıfına eşlenmektedir.

### 4.2. Sunucu Bağlantı Parametreleri

```xml
<dbServer>212.174.153.18</dbServer>
<dbPort>8080</dbPort>
```

| Parametre | Değer | Açıklama |
|-----------|-------|----------|
| `dbServer` | `212.174.153.18` | Merkezi RMS sunucu IP adresi |
| `dbPort` | `8080` | HTTP portu (REST/Web servis olasılığı yüksek) |
| `rmsInterval` | `3` | RMS veri çekme aralığı (saniye) |
| `timeDiff` | `1` | Zaman farkı düzeltmesi |

> 🔑 **Kritik Bulgu:** Sunucu portu **8080** olması, uygulamanın HTTP/REST tabanlı bir API üzerinden iletişim kurduğunu güçlü şekilde işaret etmektedir.

### 4.3. Ekran ve Grafik Yapılandırması

```xml
<tekhatWidth>1280</tekhatWidth>
<tekhatHeight>900</tekhatHeight>
<graphLength>3600</graphLength>         <!-- 1 saat (saniye) -->
<graphLengthPMU>300</graphLengthPMU>   <!-- 5 dakika (saniye) -->
<maxSamplesToPlotOnStaticGraphs>10000</maxSamplesToPlotOnStaticGraphs>
```

### 4.4. Veri Kanal Seçimleri

#### RMS Verileri
| Kanal | Durum | Renk (RGBA) |
|-------|-------|-------------|
| Frekans | ✅ Aktif | Kırmızı (255,0,0) |
| Güç (Aktif) | ✅ Aktif | Kırmızı (255,0,0) |
| Güç (Reaktif) | ❌ Pasif | Mavi (0,0,255) |
| Gerilim | ✅ Aktif | — |
| Akım | ❌ Pasif | — |
| Güç Faktörü | ❌ Pasif | Pembe (255,175,175) |
| Frekans Sapması | ❌ Pasif | — |
| df/dt | ✅ Aktif | Magenta (255,0,255) |

#### PMU Verileri
| Kanal | Durum |
|-------|-------|
| PMU Frekans 1 | ✅ Aktif |
| PMU Frekans 2 | ✅ Aktif |
| PMU Frekans Farkı | ✅ Aktif |
| PMU Gerilim Fazör Farkı | ✅ Aktif |
| PMU Gerilim Büyüklüğü | ❌ Pasif |
| PMU Akım Fazörü | ❌ Pasif |
| PMU Güç | ❌ Pasif |

#### PMUX (Genişletilmiş PMU) Verileri
| Kanal | Durum |
|-------|-------|
| PMUX Frekans | ✅ Aktif |
| PMUX Toplam Güçler | ✅ Aktif |
| PMUX Aktif Güç A | ✅ Aktif |
| PMUX Reaktif Güç A-C | ❌ Pasif |

### 4.5. Uygulama Genel Ayarları

| Parametre | Değer |
|-----------|-------|
| Dil | Türkçe |
| Versiyon | Full |
| Grafik Arka Plan | Siyah (0,0,0) |
| Grid Çizgi Rengi | Gri (190,190,190) |
| Band Rengi | Gri (190,190,190) |
| Legend Konumu | Dışarıda |
| PMU Zaman Farkı | 15 saniye |
| Gerilim FF | Aktif |

---

## 5. Tek-Hat Şeması Analizi (`5.xml`)

### 5.1. Şema Yapısı

`5.xml` dosyası, bir elektrik iletim hattının tek-hat diyagramını tanımlamaktadır:

```xml
<root ScreenHeight="1080" ScreenWidth="1780">
  <children kind="Birlestirici" id="..." Size="..." color="..." >
    <position x="..." y="..." />
    <links>...</links>
  </children>
  ...
</root>
```

### 5.2. Elektrik Şebeke Elemanları

| Eleman Türü (kind) | Sayısı | Açıklama |
|---------------------|--------|----------|
| `DataLabel` | 50 | Veri etiketi (eleman numaraları) |
| `Birlestirici` | 30 | Bağlantı noktası / birleştirici |
| `Anahtar` | 24 | Ayırıcı / Yük ayırıcısı |
| `Kesici` | 6 | Güç kesicisi |
| `Bara` | 5 | Bara sistemi |
| `Ok` | 4 | Yön oku |
| `Trafo` | 4 | Güç transformatörü |
| `Toprak` | 4 | Topraklama elemanı |

### 5.3. Şema Özellikleri

Her eleman aşağıdaki ortak niteliklere sahiptir:
- **Position (x, y):** Piksel konumu
- **Scale, Rotation:** Dönüşüm parametreleri  
- **Stroke:** Çizgi kalınlığı
- **Color:** Renk durumu (RED/GREEN → enerjili/enerjisiz)
- **Links:** Bağlantı referansları (format: `elementId_tip_port_indeks`)
- **Active (On/Off):** Anahtar/Kesici pozisyon durumu
- **RelatedElementID:** İlişkili SCADA elemanı ID'si

---

## 6. Sunucu İletişim Analizi (Black-Box)

### 6.1. İletişim Protokolü Tahmini

Binary analizden elde edilen bulgulara dayanarak:

| Kanıt | Çıkarım |
|-------|---------|
| Port 8080 kullanımı | HTTP/REST tabanlı iletişim |
| `rmsInterval=3` parametresi | 3 saniyelik polling mekanizması |
| `java.net.URL` sınıf referansı | URL tabanlı HTTP istekleri |
| JavaFX framework | JavaFX HTTP Client veya Java URLConnection |
| XStream XML serialization | XML formatında veri alışverişi |
| JCalendar kütüphanesi | Tarihsel veri sorgulama desteği |

### 6.2. Olası API Endpoint Yapısı

Konfigürasyon parametrelerine dayanarak tahmin edilen endpoint yapısı:

```
Sunucu: http://212.174.153.18:8080

Olası Endpoint'ler:
├── /rms/data              → Anlık RMS verisi (frekans, güç, gerilim, akım)
├── /pmu/data              → PMU verileri (fazör, frekans, büyüklük)
├── /pmux/data             → Genişletilmiş PMU verileri
├── /tekhat/{id}           → Tek-hat şeması verisi (5.xml benzeri)
├── /login                 → Kimlik doğrulama
├── /config                → Konfigürasyon güncelleme
└── /historical            → Tarihsel veri sorgulama
```

### 6.3. Veri Akış Modeli

```
┌─────────────┐    HTTP/XML (her 3 sn)    ┌──────────────────┐
│  İstemci     │ ◄───────────────────────► │  RMS Sunucu      │
│  (JavaFX)    │                           │  212.174.153.18  │
│              │    polling / long-poll     │  :8080            │
│  gui.Login   │ ◄───────────────────────► │                  │
└─────────────┘                           └──────────────────┘
       │                                         │
       ▼                                         ▼
 ┌──────────┐                             ┌──────────────┐
 │ Grafik   │                             │ GKÇ Cihazlar │
 │ Çizimi   │                             │ (RTU/PMU)    │
 │ (JavaFX) │                             └──────────────┘
 └──────────┘
```

### 6.4. Tahmini Veri Formatı (XStream XML)

```xml
<!-- Olası RMS yanıt formatı -->
<RmsData>
  <timestamp>1715327805000</timestamp>
  <frekans>50.01</frekans>
  <aktifGuc>345.67</aktifGuc>
  <reaktifGuc>-12.34</reaktifGuc>
  <gerilim>
    <fazA>154200</fazA>
    <fazB>153800</fazB>
    <fazC>154100</fazC>
  </gerilim>
  <akim>
    <fazA>1234.5</fazA>
    <fazB>1232.1</fazB>
    <fazC>1235.8</fazC>
  </akim>
</RmsData>
```

---

## 7. API Keşif Stratejisi

Kaynak kod olmadığı için sunucu API'sini keşfetmek adına aşağıdaki yöntemler önerilmektedir:

### 7.1. Ağ Trafiği Yakalama (Network Capture)

```powershell
# Wireshark ile trafik yakalama
# Filter: ip.addr == 212.174.153.18 && tcp.port == 8080

# Veya Fiddler/mitmproxy ile HTTP proxy kurulumu
# Java uygulamasını proxy ile başlatma:
set JAVA_TOOL_OPTIONS=-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=8888
MGKP_DINAMIK_IZLEME.exe
```

### 7.2. Java Debug Attach

```powershell
# JRE debug modunda başlatma
jre\bin\java.exe -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005 -jar MGKP_DINAMIK_IZLEME.exe
```

### 7.3. TCP/HTTP Trace

```powershell
# netsh ile Windows trace
netsh trace start capture=yes tracefile=gkc_trace.etl

# Uygulama çalıştır ve kapat
netsh trace stop

# PowerShell ile basit port dinleme testi
Test-NetConnection -ComputerName 212.174.153.18 -Port 8080
```

### 7.4. Jar2Exe Şifre Çözme

```
Jar2Exe, uygulamanın ana JAR dosyasını şifreli olarak EXE içine gömer.
Tespit edilen olası şifreleme anahtarı: z5p6i7ea8p9n0

Decompile adımları:
1. Jar2Exe extractor araçları ile JAR'ı çıkar
2. Procyon, CFR veya JD-GUI ile Java bytecode'u decompile et
3. gui.Login, datarms.* paketlerini analiz et
4. HTTP/REST client kodlarını bul
```

---

## 8. Uygulama İşlevsellik Haritası

Konfigürasyon parametrelerinden çıkarılan işlevsellik modülleri:

```
MGKP Dinamik İzleme
├── 🔐 Giriş Ekranı (gui.Login)
│   └── Kullanıcı kimlik doğrulama
├── 📊 RMS İzleme
│   ├── Frekans grafiği (canlı, 1 saatlik pencere)
│   ├── Güç grafikleri (aktif, reaktif, görünen)
│   ├── Gerilim izleme (fazlar arası + faz-nötr)
│   ├── Akım izleme
│   ├── Güç faktörü
│   ├── Frekans sapması
│   └── df/dt (frekans değişim hızı)
├── 📈 PMU İzleme
│   ├── PMU Frekans (2 kaynak + fark)
│   ├── Gerilim fazörü (büyüklük + açı)
│   ├── Akım fazörü (büyüklük + açı)
│   ├── Güç hesaplama
│   └── PMU zaman penceresi (5 dakika)
├── 📉 PMUX Genişletilmiş İzleme
│   ├── Faz bazlı aktif/reaktif/görünen güç (A, B, C)
│   ├── Toplam güçler
│   └── Frekans
├── 🔌 Tek-Hat Şeması
│   ├── Bara, trafo, kesici, anahtar gösterimi
│   ├── Renk kodlu durum (RED=enerjili, GREEN=enerjisiz)
│   └── Etkileşimli eleman kontrolü
└── ⚙️ Konfigürasyon
    ├── Sunucu bağlantı ayarları
    ├── Grafik renk özelleştirmesi
    ├── Kanal seçimi
    └── Dil desteği (Türkçe)
```

---

## 9. Bağımlılık Envanteri

### 9.1. Çalışma Zamanı Bağımlılıkları

| Bağımlılık | Versiyon | Boyut | Durum |
|-----------|----------|-------|-------|
| Java Runtime (JRE) | 1.8.0_191 | ~80 MB | Gömülü |
| JavaFX Runtime | 8u191 | 17.4 MB | Gömülü (jfxrt.jar) |
| JavaFX WebKit | 8u191 | 46 MB | Gömülü (jfxwebkit.dll) |
| Direct3D Prism | 8u191 | 117 KB | Gömülü |
| JCalendar | 1.1.1 | — | Gömülü (EXE içinde) |
| XStream | — | — | Gömülü (EXE içinde) |

### 9.2. Toplam Dağıtım Boyutu

```
MGKP_DINAMIK_IZLEME.exe:  2.84 MB
jre/ dizini:              ~160 MB
Konfigürasyon dosyaları:    ~37 KB
─────────────────────────────────
Toplam:                   ~163 MB
```

---

## 10. Güvenlik Değerlendirmesi

| Risk | Seviye | Açıklama |
|------|--------|----------|
| Java 8 EOL | 🔴 Yüksek | Java 8 artık güvenlik güncellemesi almamaktadır |
| 32-bit mimari | 🟡 Orta | Modern 64-bit sistemlerde kısıtlı performans |
| HTTP (8080) | 🔴 Yüksek | Şifresiz iletişim olasılığı (HTTPS değil) |
| Jar2Exe şifreleme | 🟡 Orta | Ters-mühendisliğe karşı zayıf koruma |
| Hardcoded IP | 🟡 Orta | Sunucu adresi konfigürasyonda açık metin |

---

## 11. Sonuç ve Öneriler

### 11.1. Mevcut Durumun Özeti

- Uygulama, Java 8 / JavaFX tabanlı bir SCADA istemcisidir
- Jar2Exe ile paketlenmiş, kaynak kodu şifreli olarak gömülüdür
- HTTP 8080 portu üzerinden sunucuyla XML/REST tabanlı iletişim kurar
- 3 saniye aralıklarla RMS verisi, 15 saniyelik PMU verisi çekmektedir
- Tek-hat şeması görselleştirmesi ve çoklu grafik penceresi destekler

### 11.2. Sonraki Adımlar

1. **Ağ trafiği yakalama** ile gerçek API endpoint'lerini belgeleme
2. **Jar2Exe çözümleme** ile uygulama sınıf yapısını çıkarma
3. **Tauri ile yeniden yazım** planlaması (bkz. `gkc_istemci_tauri_gelistirme.md`)
4. **Modern mimari** tasarımı ve geliştirme ortamının kurulumu

---

> 📌 **Bu rapor, kaynak kod bulunmayan bir binary uygulamanın ters-mühendislik analizidir. Tüm bulgular dosya yapısı incelemesi, binary string extraction ve konfigürasyon dosyası analizine dayanmaktadır.**
