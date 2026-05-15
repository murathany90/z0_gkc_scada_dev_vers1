// GKÇ İstemci - Tauri IPC Komutları
// Frontend ile Rust backend arasındaki iletişim komutları

use crate::config;
use crate::data_models::{
    DataSource, KonfigurasyonData, YtbsGrafikVerisi, YtbsHealthCheckResult, YtbsSessionStatus,
    YtbsStatusInfo,
};
use crate::ytbs_client::YtbsClient;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::Mutex;
use tokio::time::{interval, Duration};

/// Polling servisinin çalışma durumu
pub struct AppState {
    pub is_polling: Arc<Mutex<bool>>,
    pub config: Arc<Mutex<KonfigurasyonData>>,
    pub ytbs_client: Arc<Mutex<Option<YtbsClient>>>,
    pub active_data_source: Arc<Mutex<DataSource>>,
    pub active_device_id: Arc<Mutex<Option<String>>>,
}

/// Konfigürasyon dosyasını oku ve JSON olarak döndür
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<KonfigurasyonData, String> {
    let config = state.config.lock().await;
    Ok(config.clone())
}

/// Konfigürasyon dosyasını diskten yeniden yükle
#[tauri::command]
pub async fn reload_config(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<KonfigurasyonData, String> {
    let app_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Kaynak dizini bulunamadı: {}", e))?;

    let new_config = config::load_config(&app_dir)?;
    let mut config = state.config.lock().await;
    *config = new_config.clone();
    Ok(new_config)
}

/// MerkezRMS birincil sunucu anlık izleme başlat
/// YTBS ile ilgisi yok — YTBS sorguları ayrı sekmeden yapılır
#[tauri::command]
pub async fn start_monitoring(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut is_polling = state.is_polling.lock().await;
    if *is_polling {
        return Err("İzleme zaten aktif".into());
    }
    *is_polling = true;
    drop(is_polling);

    let is_polling_ref = state.is_polling.clone();
    let config = state.config.lock().await;
    let interval_secs = config.rms_interval;
    drop(config);

    let active_source_ref = state.active_data_source.clone();

    // MerkezRMS birincil sunucu polling görevi
    tokio::spawn(async move {
        let poll_interval = interval_secs.max(3);
        let mut ticker = interval(Duration::from_secs(poll_interval));

        loop {
            ticker.tick().await;

            let running = is_polling_ref.lock().await;
            if !*running {
                break;
            }
            drop(running);

            // MerkezRMS birincil sunucu bağlantısı (Faz 3'te implement edilecek)
            // Şu an sunucu erişilemez — bilgilendirme mesajı
            let _ = app.emit(
                "connection-error",
                "MerkezRMS birincil sunucu (212.174.153.18:8080) erişilemez. IP izni gerekli.",
            );
            let mut source = active_source_ref.lock().await;
            *source = DataSource::None;
        }
    });

    Ok(())
}

/// İzlemeyi durdur
#[tauri::command]
pub async fn stop_monitoring(state: State<'_, AppState>) -> Result<(), String> {
    let mut is_polling = state.is_polling.lock().await;
    *is_polling = false;
    Ok(())
}

/// Tek-hat şeması XML dosyasını oku
#[tauri::command]
pub async fn get_tekhat_schema(app: AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Kaynak dizini bulunamadı: {}", e))?;

    let schema_path = app_dir.join("5.xml");
    if schema_path.exists() {
        std::fs::read_to_string(&schema_path)
            .map_err(|e| format!("Tek-hat şeması okunamadı: {}", e))
    } else {
        Err("Tek-hat şeması dosyası bulunamadı".into())
    }
}

// ─── YTBS Komutları ───

/// YTBS'ye giriş yap
#[tauri::command]
pub async fn ytbs_login(
    state: State<'_, AppState>,
    username: String,
    password: String,
    kanal: String,
) -> Result<String, String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;

    // Yeni YTBS istemcisi oluştur
    let mut client = YtbsClient::new()?;
    let result = client.login(&username, &password, &kanal).await?;

    let status_msg = match result {
        YtbsSessionStatus::SmsRequired => "SMS doğrulaması gerekli".to_string(),
        YtbsSessionStatus::Connected => {
            // Doğrudan bağlandı, MGKP sayfasına git
            match client.navigate_to_mgkp().await {
                Ok(()) => "Bağlantı başarılı, MGKP sayfasına yönlendirildi".to_string(),
                Err(e) => {
                    // Navigasyon başarısız olsa bile bağlantıyı koru
                    // Status'u Connected olarak geri yükle
                    client.status = YtbsSessionStatus::Connected;
                    format!("Bağlantı başarılı ancak MGKP navigasyonu başarısız: {}. İlk sorgu ile otomatik denenecek.", e)
                }
            }
        }
        _ => format!("Durum: {:?}", result),
    };

    *ytbs_lock = Some(client);
    Ok(status_msg)
}

/// SMS doğrulama kodu gönder
#[tauri::command]
pub async fn ytbs_verify_sms(state: State<'_, AppState>, code: String) -> Result<String, String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;

    let client = ytbs_lock
        .as_mut()
        .ok_or("YTBS istemcisi başlatılmamış. Önce giriş yapın.")?;

    client.verify_sms(&code).await?;

    // SMS doğrulama başarılı, MGKP sayfasına navigasyon yap
    client.navigate_to_mgkp().await?;

    Ok("SMS doğrulaması başarılı, MGKP sayfasına yönlendirildi".to_string())
}

/// YTBS oturum durumunu sorgula
#[tauri::command]
pub async fn ytbs_status(state: State<'_, AppState>) -> Result<YtbsStatusInfo, String> {
    let ytbs_lock = state.ytbs_client.lock().await;
    let source_lock = state.active_data_source.lock().await;

    if let Some(ref client) = *ytbs_lock {
        Ok(YtbsStatusInfo {
            status: client.status.clone(),
            data_source: source_lock.clone(),
            message: match client.status {
                YtbsSessionStatus::Connected => {
                    if client.is_session_valid() {
                        "YTBS oturumu aktif".to_string()
                    } else {
                        "YTBS oturumu süresi dolmuş olabilir".to_string()
                    }
                }
                YtbsSessionStatus::SmsRequired => "SMS doğrulaması bekleniyor".to_string(),
                YtbsSessionStatus::LoggingIn => "Giriş yapılıyor...".to_string(),
                YtbsSessionStatus::SessionExpired => "Oturum süresi dolmuş".to_string(),
                YtbsSessionStatus::Disconnected => "Bağlı değil".to_string(),
            },
        })
    } else {
        Ok(YtbsStatusInfo {
            status: YtbsSessionStatus::Disconnected,
            data_source: source_lock.clone(),
            message: "YTBS yapılandırılmamış".to_string(),
        })
    }
}

/// YTBS bağlantısını kes
#[tauri::command]
pub async fn ytbs_disconnect(state: State<'_, AppState>) -> Result<(), String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;
    *ytbs_lock = None;

    let mut source = state.active_data_source.lock().await;
    *source = DataSource::None;

    Ok(())
}

/// Aktif cihaz ID'sini güncelle
#[tauri::command]
pub async fn ytbs_set_device(state: State<'_, AppState>, device_id: String) -> Result<(), String> {
    let mut dev = state.active_device_id.lock().await;
    *dev = Some(device_id);
    Ok(())
}

/// YTBS tarih aralığı sorgusu — Dashboard "GÖSTER" butonu için
#[tauri::command]
pub async fn ytbs_query_range(
    state: State<'_, AppState>,
    device_id: String,
    measurement_type: String,
    start_time: String,
    end_time: String,
    gerilim: String,
    faz_id: String,
) -> Result<String, String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;

    let client = ytbs_lock
        .as_mut()
        .ok_or("YTBS oturumu başlatılmamış. Ayarlar'dan YTBS'ye bağlanın.")?;

    let (data, raw_json) = client
        .query_device(
            &device_id,
            &measurement_type,
            &start_time,
            &end_time,
            &gerilim,
            &faz_id,
        )
        .await?;

    let response = serde_json::json!({
        "data": data,
        "raw_json": raw_json
    });

    let json = serde_json::to_string_pretty(&response)
        .map_err(|e| format!("JSON serialize hatası: {}", e))?;

    // TEST: Gelen verinin ilk elemanının yapısını görmek için log at
    println!("YTBS SORGUSU TAMAMLANDI. Veri sayısı: {}", data.len());

    Ok(json)
}

/// YTBS üzerinden GKÇ fider sağlık kontrolü yap
#[tauri::command]
pub async fn ytbs_health_check(
    state: State<'_, AppState>,
    device_id: String,
    measurement_type: String,
    start_time: String,
    end_time: String,
    gerilim: String,
    faz_id: String,
) -> Result<YtbsHealthCheckResult, String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;

    let client = ytbs_lock
        .as_mut()
        .ok_or("YTBS oturumu başlatılmamış. Ayarlar'dan YTBS'ye bağlanın.")?;

    let (_data, raw_json) = client
        .query_device(
            &device_id,
            &measurement_type,
            &start_time,
            &end_time,
            &gerilim,
            &faz_id,
        )
        .await?;

    let samples = match serde_json::from_str::<Vec<YtbsGrafikVerisi>>(&raw_json) {
        Ok(samples) => samples,
        Err(e) => {
            return Ok(YtbsHealthCheckResult::fail(format!(
                "YTBS ham veri parse edilemedi: {}",
                e
            )));
        }
    };

    Ok(YtbsHealthCheckResult::from_samples(&samples))
}

/// YTBS üzerinden tek seferlik test sorgusu (son 1 dk)
#[tauri::command]
pub async fn ytbs_query_once(
    state: State<'_, AppState>,
    device_id: String,
) -> Result<String, String> {
    let mut ytbs_lock = state.ytbs_client.lock().await;

    let client = ytbs_lock.as_mut().ok_or("YTBS istemcisi başlatılmamış")?;

    let now = chrono::Local::now();
    let start = now - chrono::Duration::minutes(1);
    let start_str = start.format("%d.%m.%Y %H:%M").to_string();
    let end_str = now.format("%d.%m.%Y %H:%M").to_string();

    let (data, raw_json) = client
        .query_device(&device_id, "PQ", &start_str, &end_str, "", "1")
        .await?;
    let response = serde_json::json!({
        "data": data,
        "raw_json": raw_json
    });
    let json = serde_json::to_string_pretty(&response)
        .map_err(|e| format!("JSON serialize hatası: {}", e))?;

    Ok(json)
}
