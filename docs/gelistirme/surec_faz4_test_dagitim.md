# Faz 4: Test, Optimizasyon ve Portable Dağıtım

> **Süre:** 1 hafta | **Durum:** ⏳ Bekliyor  
> **Hedef:** Entegrasyon testleri, performans optimizasyonu, portable EXE build ve kullanıcı dokümantasyonu.

---

## Görev Listesi

- [ ] Gerçek sunucu ile entegrasyon testi
- [ ] Performans profiling (grafik render süresi, bellek)
- [ ] Bellek sızıntısı kontrolü (ring buffer doğrulaması)
- [ ] Hata senaryoları testi (bağlantı kopma, timeout)
- [ ] Tauri portable build (NSIS installer + standalone)
- [ ] Uygulama ikonu entegrasyonu (App.ico)
- [ ] Auto-update mekanizması (opsiyonel)
- [ ] Kullanıcı kılavuzu
- [ ] Versiyon bilgisi ve about sayfası

---

## 1. Test Stratejisi

### 1.1. Birim Testleri (Rust)

```rust
#[cfg(test)]
mod tests {
    // XML parse testleri
    // Konfigürasyon okuma testleri
    // Veri modeli dönüşüm testleri
}
```

### 1.2. Entegrasyon Testleri

```
- Sunucu bağlantı testi (212.174.153.18:8080)
- Veri akışı doğrulama (3 sn polling)
- Uzun süreli çalışma testi (1 saat)
- Bellek kullanımı izleme
```

## 2. Performans Hedefleri

| Metrik | Hedef | Ölçüm Yöntemi |
|--------|-------|----------------|
| Başlangıç süresi | < 2 saniye | Zamanlayıcı |
| RAM kullanımı | < 100 MB | Task Manager |
| Grafik FPS | > 30 fps | DevTools |
| CPU (idle) | < 5% | Task Manager |
| EXE boyutu | < 25 MB | Dosya boyutu |

## 3. Portable Build

```powershell
# Release build
cargo tauri build

# Çıktılar:
# src-tauri/target/release/gkc-tauri.exe (standalone)
# src-tauri/target/release/bundle/nsis/gkc-tauri_x.x.x_x64-setup.exe
```

### 3.1. tauri.conf.json Bundle Ayarları

```json
{
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "icon": ["icons/App.ico"],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "languages": ["Turkish"]
      }
    }
  }
}
```

## 4. Dağıtım Kontrol Listesi

- [ ] EXE dosyası bağımsız çalışır (JRE gerektirmez)
- [ ] app.properties aynı dizinden okunur
- [ ] 5.xml tek-hat şeması yüklenir
- [ ] Windows 10 64-bit'te sorunsuz çalışır
- [ ] Anti-virüs false positive kontrolü

## 5. Doğrulama Kriterleri

- [ ] Portable EXE < 25 MB
- [ ] Başlangıç süresi < 2 sn
- [ ] 1 saatlik kesintisiz çalışma
- [ ] Bellek sızıntısı yok

---

> 📌 Bu faz tamamlandığında, dağıtıma hazır portable bir GKÇ istemcisi üretilmiş olacaktır.
