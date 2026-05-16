# Faz 1: Proje İskeleti ve Temel Altyapı

> **Süre:** 1 hafta | **Durum:** 🔄 Devam ediyor  
> **Hedef:** Tauri v2 + React + TypeScript + Vite proje yapısını kurmak, temel konfigürasyon yönetimini ve IPC altyapısını hazırlamak.

---

## Görev Listesi

- [x] Rust toolchain kontrolü ve PATH ayarı
- [x] VS Build Tools kontrolü
- [x] Tauri CLI kurulumu (`cargo install tauri-cli`)
- [x] Tauri projesi oluşturma (`create-tauri-app`)
- [x] Proje dizin yapısını düzenleme
- [x] Rust backend modülleri (config, data_models, mock_service, commands)
- [x] Frontend temel bileşenler (App, Layout, Dashboard)
- [x] Konfigürasyon dosyası okuma (app.properties → JSON)
- [x] Tauri IPC komut tanımları
- [x] İlk çalışan build ✅ `cargo tauri dev` başarılı

---

## 1. Proje Oluşturma

```powershell
# PATH ayarı
$env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"

# Tauri projesi
npx -y create-tauri-app@latest gkc-tauri -- --template react-ts
cd gkc-tauri

# Frontend bağımlılıkları
npm install echarts echarts-for-react zustand react-router-dom fast-xml-parser
npm install -D @types/react-router-dom
```

## 2. Rust Backend Modülleri

### 2.1. Cargo.toml Ek Bağımlılıklar

```toml
[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json"] }
quick-xml = { version = "0.36", features = ["serialize"] }
tokio = { version = "1", features = ["full"] }
```

### 2.2. Konfigürasyon Modülü (config.rs)

`app.properties` XStream XML dosyasını okuyarak JSON formatında frontend'e sunar.

### 2.3. Veri Modelleri (data_models.rs)

RMS, PMU ve PMUX veri yapıları serde ile serialize/deserialize edilebilir formatta tanımlanır.

## 3. Frontend Temel Yapı

```
src/
├── App.tsx           # Router + Layout
├── main.tsx          # Entry point
├── index.css         # Global stiller (dark tema)
├── components/
│   └── Layout.tsx    # Ana yerleşim (sidebar + content)
├── pages/
│   ├── LoginPage.tsx
│   └── DashboardPage.tsx
└── stores/
    └── configStore.ts
```

## 4. Doğrulama Kriterleri

- [ ] `cargo tauri dev` komutu hatasız çalışır
- [ ] React frontend WebView'da görünür
- [ ] app.properties okunur ve frontend'e JSON olarak iletilir
- [ ] Dark tema uygulanır

---

> 📌 Bu faz tamamlandığında, boş ama çalışan bir Tauri masaüstü uygulaması hazır olacaktır.
