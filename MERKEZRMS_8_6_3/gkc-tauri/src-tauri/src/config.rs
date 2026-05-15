// GKÇ İstemci - Konfigürasyon Yönetimi
// app.properties (XStream XML) dosyasını okuma ve JSON'a dönüştürme

use crate::data_models::KonfigurasyonData;
use std::fs;
use std::path::PathBuf;

/// app.properties XML dosyasını oku ve KonfigurasyonData'ya dönüştür
pub fn load_config(app_dir: &PathBuf) -> Result<KonfigurasyonData, String> {
    let config_path = app_dir.join("app.properties");

    if !config_path.exists() {
        return Ok(KonfigurasyonData::default());
    }

    let xml_content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Konfigürasyon dosyası okunamadı: {}", e))?;

    parse_xstream_xml(&xml_content)
}

/// XStream XML formatındaki konfigürasyon verisini parse et
fn parse_xstream_xml(xml: &str) -> Result<KonfigurasyonData, String> {
    let mut config = KonfigurasyonData::default();

    // Basit XML değer çıkarıcı (XStream formatı için)
    config.db_server = extract_xml_value(xml, "dbServer").unwrap_or(config.db_server);
    config.db_port = extract_xml_value(xml, "dbPort")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.db_port);
    config.rms_interval = extract_xml_value(xml, "rmsInterval")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.rms_interval);
    config.time_diff = extract_xml_value(xml, "timeDiff")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.time_diff);
    config.graph_length = extract_xml_value(xml, "graphLength")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.graph_length);
    config.graph_length_pmu = extract_xml_value(xml, "graphLengthPMU")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.graph_length_pmu);
    config.max_samples = extract_xml_value(xml, "maxSamplesToPlotOnStaticGraphs")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.max_samples);
    config.tekhat_width = extract_xml_value(xml, "tekhatWidth")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.tekhat_width);
    config.tekhat_height = extract_xml_value(xml, "tekhatHeight")
        .and_then(|v| v.parse().ok())
        .unwrap_or(config.tekhat_height);

    // Kanal seçimleri
    config.frekans_selected = extract_xml_bool(xml, "frekansSelected", config.frekans_selected);
    config.guc_selected = extract_xml_bool(xml, "gucSelected", config.guc_selected);
    config.akim_selected = extract_xml_bool(xml, "akimSelected", config.akim_selected);
    config.gerilim_selected = extract_xml_bool(xml, "gerilimSelected", config.gerilim_selected);
    config.guc_faktoru_selected =
        extract_xml_bool(xml, "gucfaktoruSelected", config.guc_faktoru_selected);
    config.frekans_deviation_selected = extract_xml_bool(
        xml,
        "frekansDeviationSelected",
        config.frekans_deviation_selected,
    );
    config.frekans_dfdt_selected =
        extract_xml_bool(xml, "frekansDfDtSelected", config.frekans_dfdt_selected);

    Ok(config)
}

/// XML etiketinden değer çıkar
fn extract_xml_value(xml: &str, tag: &str) -> Option<String> {
    let open_tag = format!("<{}>", tag);
    let close_tag = format!("</{}>", tag);

    if let Some(start) = xml.find(&open_tag) {
        let value_start = start + open_tag.len();
        if let Some(end) = xml[value_start..].find(&close_tag) {
            let value = xml[value_start..value_start + end].trim().to_string();
            return Some(value);
        }
    }
    None
}

/// XML'den boolean değer çıkar
fn extract_xml_bool(xml: &str, tag: &str, default: bool) -> bool {
    extract_xml_value(xml, tag)
        .map(|v| v == "true")
        .unwrap_or(default)
}
