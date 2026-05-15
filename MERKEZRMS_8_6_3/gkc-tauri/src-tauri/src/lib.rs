// GKÇ İstemci - Tauri Uygulama Ana Modülü
// Güç Kalitesi Çözümleyici Dinamik İzleme İstemcisi

pub mod commands;
pub mod config;
pub mod data_models;
pub mod mock_service;
pub mod ytbs_client;

use commands::AppState;
use data_models::{DataSource, KonfigurasyonData};
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Uygulama durumunu başlat
    let app_state = AppState {
        is_polling: Arc::new(Mutex::new(false)),
        config: Arc::new(Mutex::new(KonfigurasyonData::default())),
        ytbs_client: Arc::new(Mutex::new(None)),
        active_data_source: Arc::new(Mutex::new(DataSource::None)),
        active_device_id: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::reload_config,
            commands::start_monitoring,
            commands::stop_monitoring,
            commands::get_tekhat_schema,
            // YTBS yedek kanal komutları
            commands::ytbs_login,
            commands::ytbs_verify_sms,
            commands::ytbs_status,
            commands::ytbs_disconnect,
            commands::ytbs_set_device,
            commands::ytbs_query_once,
            commands::ytbs_query_range,
            commands::ytbs_health_check,
        ])
        .run(tauri::generate_context!())
        .expect("GKÇ uygulaması başlatılırken hata oluştu");
}
