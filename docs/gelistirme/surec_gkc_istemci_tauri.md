# GKÇ İstemci – Tauri ile Modern Yeniden Yazım Kılavuzu

> **Amaç:** Mevcut Java/JavaFX tabanlı MGKP Dinamik İzleme istemcisini Tauri v2 ile portable, modern bir masaüstü uygulaması olarak baştan yazmak.  
> **Tarih:** 2026-05-10

---

## 1. Mimari Genel Bakış

### 1.1. Hedef Teknoloji Yığını

| Katman | Teknoloji | Gerekçe |
|--------|-----------|---------|
| **Backend (Rust)** | Tauri v2 | Hafif, güvenli, portable EXE üretimi |
| **Frontend** | React/TypeScript + Vite | Hızlı geliştirme, modern UI |
| **Grafik** | Apache ECharts / Plotly.js | Yüksek performanslı zaman serisi grafikleri |
| **Tek-Hat Şeması** | SVG + D3.js veya Konva.js | Etkileşimli elektrik diyagramları |
| **HTTP İstemci** | Rust `reqwest` (backend) | Güvenli, async sunucu iletişimi |
| **Durum Yönetimi** | Zustand | Hafif, React-uyumlu state management |
| **Styling** | CSS Modules + CSS Variables | Tema desteği, dark/light mode |

### 1.2. Mimari Diyagram

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell                    │
│  ┌───────────────────────────────────────────┐  │
│  │           Frontend (WebView)              │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ Login   │ │ RMS/PMU  │ │ Tek-Hat   │  │  │
│  │  │ Sayfası │ │ Grafik   │ │ Şeması    │  │  │
│  │  └────┬────┘ └────┬─────┘ └─────┬─────┘  │  │
│  │       └───────────┼─────────────┘         │  │
│  │              Zustand Store                │  │
│  └──────────────────┬────────────────────────┘  │
│                     │ invoke() / events          │
│  ┌──────────────────┴────────────────────────┐  │
│  │          Rust Backend (Tauri Core)         │  │
│  │  ┌──────────┐ ┌────────┐ ┌────────────┐  │  │
│  │  │ API      │ │ Config │ │ Data       │  │  │
│  │  │ Client   │ │ Manager│ │ Processor  │  │  │
│  │  └────┬─────┘ └────────┘ └────────────┘  │  │
│  └───────┼───────────────────────────────────┘  │
└──────────┼──────────────────────────────────────┘
           │ HTTP/REST (async polling)
     ┌─────▼─────────────┐
     │  RMS Sunucu       │
     │  212.174.153.18   │
     │  :8080            │
     └───────────────────┘
```

---

## 2. Proje Yapısı

```
gkc-tauri/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── src/
│   │   ├── main.rs              # Tauri bootstrap
│   │   ├── lib.rs               # Modül tanımları
│   │   ├── api_client.rs        # HTTP istemci (reqwest)
│   │   ├── config.rs            # Konfigürasyon yönetimi
│   │   ├── data_models.rs       # RMS/PMU veri yapıları
│   │   ├── polling.rs           # Arka plan veri çekme
│   │   └── commands.rs          # Tauri IPC komutları
│   └── icons/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── RmsChart.tsx
│   │   ├── PmuChart.tsx
│   │   ├── SingleLineDiagram.tsx
│   │   └── ConfigPanel.tsx
│   ├── stores/
│   │   ├── rmsStore.ts
│   │   └── configStore.ts
│   └── utils/
│       ├── xmlParser.ts
│       └── colorUtils.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 3. Arka Planda Sunucudan Veri Çekme

### 3.1. Rust Backend – Async Polling Servisi

```rust
// src-tauri/src/polling.rs
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RmsData {
    pub timestamp: i64,
    pub frekans: f64,
    pub aktif_guc: f64,
    pub reaktif_guc: f64,
    pub gorunen_guc: f64,
    pub gerilim_a: f64,
    pub gerilim_b: f64,
    pub gerilim_c: f64,
    pub akim_a: f64,
    pub akim_b: f64,
    pub akim_c: f64,
    pub guc_faktoru: f64,
    pub df_dt: f64,
}

pub struct PollingService {
    client: Client,
    base_url: String,
    interval_secs: u64,
    is_running: Arc<Mutex<bool>>,
}

impl PollingService {
    pub fn new(server: &str, port: u16, interval_secs: u64) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .unwrap(),
            base_url: format!("http://{}:{}", server, port),
            interval_secs,
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    pub async fn start_rms_polling(&self, app: AppHandle) {
        let mut running = self.is_running.lock().await;
        *running = true;
        drop(running);

        let client = self.client.clone();
        let base_url = self.base_url.clone();
        let is_running = self.is_running.clone();
        let interval_secs = self.interval_secs;

        tokio::spawn(async move {
            let mut ticker = interval(Duration::from_secs(interval_secs));
            loop {
                ticker.tick().await;
                let running = is_running.lock().await;
                if !*running { break; }
                drop(running);

                match client.get(format!("{}/rms/data", base_url))
                    .send().await
                {
                    Ok(resp) => {
                        if let Ok(text) = resp.text().await {
                            // XML parse ve emit
                            if let Ok(data) = parse_rms_xml(&text) {
                                let _ = app.emit("rms-data", data);
                            }
                        }
                    }
                    Err(e) => {
                        let _ = app.emit("connection-error",
                            format!("Bağlantı hatası: {}", e));
                    }
                }
            }
        });
    }

    pub async fn stop(&self) {
        let mut running = self.is_running.lock().await;
        *running = false;
    }
}

fn parse_rms_xml(xml: &str) -> Result<RmsData, Box<dyn std::error::Error>> {
    // quick-xml veya roxmltree ile XML parse
    // Gerçek API yanıt formatına göre uyarlanacak
    todo!("API keşfinden sonra implemente edilecek")
}
```

### 3.2. Tauri IPC Komutları

```rust
// src-tauri/src/commands.rs
use tauri::State;
use crate::polling::PollingService;
use std::sync::Arc;
use tokio::sync::Mutex;

pub type PollingState = Arc<Mutex<Option<PollingService>>>;

#[tauri::command]
async fn start_monitoring(
    state: State<'_, PollingState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    let service = state.lock().await;
    if let Some(svc) = service.as_ref() {
        svc.start_rms_polling(app).await;
        Ok(())
    } else {
        Err("Servis başlatılmadı".into())
    }
}

#[tauri::command]
async fn stop_monitoring(state: State<'_, PollingState>) -> Result<(), String> {
    let service = state.lock().await;
    if let Some(svc) = service.as_ref() {
        svc.stop().await;
        Ok(())
    } else {
        Err("Servis bulunamadı".into())
    }
}

#[tauri::command]
async fn get_config() -> Result<serde_json::Value, String> {
    // app.properties XML dosyasını oku ve JSON olarak döndür
    todo!()
}
```

### 3.3. Frontend – Veri Dinleme

```typescript
// src/stores/rmsStore.ts
import { create } from 'zustand';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

interface RmsData {
  timestamp: number;
  frekans: number;
  aktifGuc: number;
  reaktifGuc: number;
  gerilimA: number;
  gerilimB: number;
  gerilimC: number;
}

interface RmsStore {
  data: RmsData[];
  isConnected: boolean;
  error: string | null;
  maxSamples: number;
  startListening: () => void;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
}

export const useRmsStore = create<RmsStore>((set, get) => ({
  data: [],
  isConnected: false,
  error: null,
  maxSamples: 10000,

  startListening: () => {
    listen<RmsData>('rms-data', (event) => {
      set((state) => ({
        data: [...state.data.slice(-state.maxSamples), event.payload],
        isConnected: true,
        error: null,
      }));
    });

    listen<string>('connection-error', (event) => {
      set({ isConnected: false, error: event.payload });
    });
  },

  startMonitoring: async () => {
    await invoke('start_monitoring');
  },

  stopMonitoring: async () => {
    await invoke('stop_monitoring');
  },
}));
```

---

## 4. API Keşif ve Entegrasyon Stratejisi

### 4.1. Adım 1: Ağ Trafiği Yakalama

```powershell
# Wireshark ile mevcut Java uygulamasının trafiğini yakala
# Filter: ip.addr == 212.174.153.18 && tcp.port == 8080

# Alternatif: mitmproxy ile MITM
pip install mitmproxy
mitmproxy --listen-port 8888

# Java uygulamasını proxy ile başlat
$env:JAVA_TOOL_OPTIONS = "-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=8888"
.\MGKP_DINAMIK_IZLEME.exe
```

### 4.2. Adım 2: Endpoint Haritalama

Yakalanan trafikten endpoint'leri belgeleme:

| HTTP Method | Endpoint | Request | Response | Aralık |
|-------------|----------|---------|----------|--------|
| GET/POST | `/rms/data` | Session token? | XML (RmsData) | 3 sn |
| GET/POST | `/pmu/data` | Session token? | XML (PmuData) | sürekli |
| POST | `/login` | credentials | session/token | 1 kez |
| GET | `/tekhat/{id}` | — | XML (tek-hat) | 1 kez |

### 4.3. Adım 3: Proxy Katmanı (Geçiş Dönemi)

API tam keşfedilinceye kadar mevcut Java uygulamasını bir proxy olarak kullanma:

```
Tauri App → localhost proxy → Java App → RMS Sunucu
```

---

## 5. Tek-Hat Şeması Rendering (SVG)

### 5.1. XML'den SVG'ye Dönüşüm

```typescript
// src/utils/xmlParser.ts
interface SchemaElement {
  id: string;
  kind: 'Birlestirici' | 'Anahtar' | 'Kesici' | 'Bara' | 'Trafo' | 'Toprak' | 'Ok' | 'DataLabel';
  position: { x: number; y: number };
  color: string;
  rotation: number;
  scale: { x: number; y: number };
  stroke: number;
  links: string[];
  active?: 'On' | 'Off';
  text?: string;
}

function renderElement(el: SchemaElement): SVGElement {
  // Her eleman türü için SVG şekli oluştur
  switch (el.kind) {
    case 'Kesici':
      return renderCircuitBreaker(el);
    case 'Anahtar':
      return renderSwitch(el);
    case 'Bara':
      return renderBusbar(el);
    case 'Trafo':
      return renderTransformer(el);
    // ...
  }
}
```

---

## 6. Portable Dağıtım

### 6.1. Tauri Bundle Konfigürasyonu

```json
{
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "windows": {
      "nsis": {
        "installerIcon": "./icons/App.ico",
        "installMode": "currentUser"
      }
    }
  },
  "app": {
    "windows": [{
      "title": "MGKP Dinamik İzleme v2.0",
      "width": 1280,
      "height": 900,
      "resizable": true,
      "fullscreen": false
    }]
  }
}
```

### 6.2. Portable EXE Boyut Karşılaştırması

| Metrik | Mevcut (Java) | Hedef (Tauri) |
|--------|---------------|---------------|
| Toplam boyut | ~163 MB | ~15-25 MB |
| Başlangıç süresi | 5-10 sn | <1 sn |
| RAM kullanımı | 200-500 MB | 50-100 MB |
| JRE bağımlılığı | Evet (gömülü) | Yok |
| Mimari | 32-bit | 64-bit |

---

## 7. Geliştirme Yol Haritası

| Aşama | Süre | Çıktı |
|-------|------|-------|
| 1. API Keşfi | 1-2 hafta | Endpoint dokümantasyonu |
| 2. Proje İskeleti | 1 hafta | Tauri + React + Vite kurulumu |
| 3. Login & Config | 1 hafta | Kimlik doğrulama, ayarlar |
| 4. RMS Grafikleri | 2 hafta | Canlı zaman serisi grafikleri |
| 5. PMU/PMUX | 1 hafta | Genişletilmiş ölçüm grafikleri |
| 6. Tek-Hat Şeması | 2 hafta | SVG tabanlı etkileşimli diyagram |
| 7. Test & Polish | 1 hafta | Performans, UX iyileştirme |
| **Toplam** | **~9-10 hafta** | **Portable Tauri uygulaması** |

---

> 📌 Bu kılavuz, API keşif aşaması tamamlandıkça güncellenmelidir.
