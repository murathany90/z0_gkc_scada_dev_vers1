# Faz 2: Veri Katmanı ve Sunucu İletişimi

> **Süre:** 2 hafta | **Durum:** ⏳ Bekliyor  
> **Hedef:** Rust backend'de async HTTP polling servisi, Tauri event sistemi üzerinden frontend'e canlı veri akışı.

---

## Görev Listesi

- [ ] HTTP istemci modülü (api_client.rs)
- [ ] Async polling servisi (polling.rs)
- [ ] RMS veri çekme ve XML parse
- [ ] PMU veri çekme ve XML parse
- [ ] PMUX veri çekme ve XML parse
- [ ] Tauri event emit (rms-data, pmu-data, pmux-data)
- [ ] Bağlantı durumu yönetimi (connection-status event)
- [ ] Hata yönetimi ve otomatik yeniden bağlanma
- [ ] Zustand store'ları (rmsStore, pmuStore, pmuxStore)
- [ ] Login/kimlik doğrulama akışı

---

## 1. Rust Backend Modülleri

### 1.1. API İstemcisi (api_client.rs)

```rust
// Yapılandırılabilir HTTP istemci
// - Base URL: konfigürasyondan okunur
// - Timeout: 10 saniye
// - Retry: 3 deneme, exponential backoff
// - Session/Cookie yönetimi (login sonrası)
```

### 1.2. Polling Servisi (polling.rs)

```rust
// Arka plan görevleri:
// - RMS: her 3 saniyede bir (rmsInterval)
// - PMU: her 1 saniyede bir (sürekli akış)
// - PMUX: her 3 saniyede bir
// 
// Yaşam döngüsü:
// start() → polling döngüsü başlar
// stop() → graceful shutdown
// reconnect() → bağlantı koptuğunda otomatik
```

### 1.3. XML Parse Modülü

```rust
// quick-xml ile XStream XML yanıtlarını parse et
// Gerçek format API keşfinden sonra belirlenir
// Şimdilik mock/placeholder data ile çalış
```

## 2. Frontend Store'ları

### 2.1. RMS Store (rmsStore.ts)

```typescript
// Zustand store:
// - data: RmsData[] (ring buffer, maxSamples kadar)
// - isConnected: boolean
// - lastUpdate: timestamp
// - listen('rms-data') → otomatik güncelleme
```

### 2.2. Bağlantı Yönetimi

```typescript
// connectionStore.ts:
// - status: 'disconnected' | 'connecting' | 'connected' | 'error'
// - serverInfo: { host, port }
// - reconnectAttempts: number
```

## 3. Mock Data Servisi

API keşfi tamamlanana kadar geliştirme ve test için mock veri üreteci:

```rust
// mock_service.rs
// - Rastgele ama gerçekçi RMS verisi üret (50±0.1 Hz, vb.)
// - Frontend geliştirmesini engellemez
// - Gerçek API bulunduğunda kolayca değiştirilebilir
```

## 4. Doğrulama Kriterleri

- [ ] Mock data servisi çalışır ve frontend'e veri gönderir
- [ ] Zustand store veri biriktir (ring buffer)
- [ ] Bağlantı durumu UI'da gösterilir
- [ ] Start/Stop monitoring çalışır

---

> 📌 Bu faz, API keşfi paralelinde mock data ile ilerleyecektir. Gerçek endpoint'ler keşfedildikçe api_client güncellenir.
