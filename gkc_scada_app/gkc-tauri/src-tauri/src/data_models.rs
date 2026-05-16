// GKÇ İstemci - Veri Modelleri
// Sunucudan gelen RMS, PMU ve PMUX verilerinin yapısal tanımları

use serde::{Deserialize, Serialize};

/// RMS (Root Mean Square) veri yapısı
/// Sunucudan her 3 saniyede bir çekilen temel elektriksel ölçümler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RmsData {
    pub timestamp: i64,
    pub frekans: f64,
    pub aktif_guc: f64,
    pub reaktif_guc: f64,
    pub gorunen_guc: f64,
    pub guc_faktoru: f64,
    pub frekans_sapma: f64,
    pub df_dt: f64,
    pub gerilim: GerilimData,
    pub akim: AkimData,
}

/// Üç fazlı gerilim verileri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GerilimData {
    pub faz_a: f64,
    pub faz_b: f64,
    pub faz_c: f64,
}

/// Üç fazlı akım verileri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AkimData {
    pub faz_a: f64,
    pub faz_b: f64,
    pub faz_c: f64,
}

/// PMU (Phasor Measurement Unit) veri yapısı
/// Fazör tabanlı ölçümler
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmuData {
    pub timestamp: i64,
    pub frekans1: f64,
    pub frekans2: f64,
    pub frekans_fark: f64,
    pub gerilim_fasor1: FasorData,
    pub gerilim_fasor2: FasorData,
    pub akim_fasor1: FasorData,
    pub akim_fasor2: FasorData,
    pub guc1: f64,
    pub guc2: f64,
}

/// Fazör veri yapısı (büyüklük + açı)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FasorData {
    pub buyukluk: f64,
    pub aci: f64,
}

/// PMUX (Genişletilmiş PMU) veri yapısı
/// Faz bazlı güç ölçümleri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmuxData {
    pub timestamp: i64,
    pub frekans: f64,
    pub toplam_aktif_guc: f64,
    pub toplam_reaktif_guc: f64,
    pub toplam_gorunen_guc: f64,
    pub faz_a: FazGucData,
    pub faz_b: FazGucData,
    pub faz_c: FazGucData,
}

/// Tek faz için güç verileri
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FazGucData {
    pub aktif_guc: f64,
    pub reaktif_guc: f64,
    pub gorunen_guc: f64,
}

/// Bağlantı durumu
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BaglantiDurumu {
    Baglandi,
    Baglanıyor,
    BaglantıKesildi,
    Hata(String),
}

/// Uygulama konfigürasyonu (app.properties'den okunan)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KonfigurasyonData {
    pub tekhat_width: i32,
    pub tekhat_height: i32,
    pub db_server: String,
    pub db_port: u16,
    pub rms_interval: u64,
    pub time_diff: i64,
    pub graph_length: i64,
    pub graph_length_pmu: i64,
    pub max_samples: usize,
    pub language: String,
    pub version: String,
    // Kanal seçimleri
    pub frekans_selected: bool,
    pub guc_selected: bool,
    pub akim_selected: bool,
    pub gerilim_selected: bool,
    pub guc_faktoru_selected: bool,
    pub frekans_deviation_selected: bool,
    pub frekans_dfdt_selected: bool,
}

impl Default for KonfigurasyonData {
    fn default() -> Self {
        Self {
            tekhat_width: 1280,
            tekhat_height: 900,
            db_server: "212.174.153.18".into(),
            db_port: 8080,
            rms_interval: 3,
            time_diff: 1,
            graph_length: 3600,
            graph_length_pmu: 300,
            max_samples: 10000,
            language: "Türkçe".into(),
            version: "Full".into(),
            frekans_selected: true,
            guc_selected: true,
            akim_selected: false,
            gerilim_selected: true,
            guc_faktoru_selected: false,
            frekans_deviation_selected: false,
            frekans_dfdt_selected: true,
        }
    }
}

// ─── YTBS Yedek Veri Kaynağı Modelleri ───

/// YTBS oturum durumu
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum YtbsSessionStatus {
    Disconnected,
    LoggingIn,
    SmsRequired,
    Connected,
    SessionExpired,
}

/// YTBS'den gelen grafik verisi (tek satır)
/// grafik_verisi_json dizisinin her bir elemanı
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YtbsGrafikVerisi {
    pub zaman: String,
    #[serde(default)]
    pub y1: Option<f64>, // Frekans (Hz)
    #[serde(default)]
    pub y2: Option<f64>,
    #[serde(default)]
    pub y3: Option<f64>, // Gerilim Faz A (kV)
    #[serde(default)]
    pub y4: Option<f64>, // Gerilim Faz B (kV)
    #[serde(default)]
    pub y5: Option<f64>, // Gerilim Faz C (kV)
    #[serde(default)]
    pub y6: Option<f64>,
    #[serde(default)]
    pub y7: Option<f64>, // Akım Faz A (A)
    #[serde(default)]
    pub y8: Option<f64>, // Akım Faz B (A)
    #[serde(default)]
    pub y9: Option<f64>, // Akım Faz C (A)
    #[serde(default)]
    pub y10: Option<f64>,
    #[serde(default)]
    pub y11: Option<f64>, // Aktif Güç (MW)
    #[serde(default)]
    pub y12: Option<f64>, // Reaktif Güç (MVAr)
    #[serde(default)]
    pub y13: Option<f64>, // Görünen Güç (MVA)
    #[serde(default)]
    pub y14: Option<f64>,
    #[serde(default)]
    pub y15: Option<f64>,
    #[serde(default)]
    pub y16: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct YtbsSelectOption {
    pub value: String,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct YtbsScadaOptions {
    pub b1: Vec<YtbsSelectOption>,
    pub b2: Vec<YtbsSelectOption>,
    pub b3: Vec<YtbsSelectOption>,
    pub elements: Vec<YtbsSelectOption>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct YtbsScadaSample {
    pub zaman: String,
    pub deger: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct YtbsScadaQueryResult {
    pub title: String,
    pub unit: String,
    pub data: Vec<YtbsScadaSample>,
    pub raw_json: String,
}

/// GKÇ sağlık taraması sonucu
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YtbsHealthCheckResult {
    pub status: String,
    pub checked_at: i64,
    pub valid_sample_count: usize,
    pub reason: String,
}

/// Aktif veri kaynağı göstergesi
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DataSource {
    Primary,
    Ytbs,
    Mock,
    None,
}

/// YTBS oturum bilgisi (frontend'e gönderilecek)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YtbsStatusInfo {
    pub status: YtbsSessionStatus,
    pub data_source: DataSource,
    pub message: String,
}

impl YtbsGrafikVerisi {
    /// Sağlık taraması için frekans tek başına yeterli değildir.
    /// Fiderin kendi gerilim, akım veya güç kanallarından en az biri gelmelidir.
    pub fn has_fider_telemetry(&self) -> bool {
        Self::is_parseable_timestamp(&self.zaman)
            && (self.y2.is_some()
                || self.y3.is_some()
                || self.y4.is_some()
                || self.y5.is_some()
                || self.y6.is_some()
                || self.y7.is_some()
                || self.y8.is_some()
                || self.y9.is_some()
                || self.y10.is_some()
                || self.y11.is_some()
                || self.y12.is_some()
                || self.y13.is_some()
                || self.y14.is_some()
                || self.y15.is_some()
                || self.y16.is_some())
    }

    pub fn to_rms_data_for_measurement(&self, measurement_type: &str) -> RmsData {
        if measurement_type.eq_ignore_ascii_case("PMU") {
            self.to_pmu_rms_data()
        } else {
            self.to_rms_data()
        }
    }

    /// YTBS grafik verisini RmsData struct'ına dönüştür
    pub fn to_rms_data(&self) -> RmsData {
        // YTBS gerilim verileri kV cinsinden gelir, uygulamada V olarak tutulur
        let gerilim_carpan = 1000.0;

        RmsData {
            timestamp: Self::parse_ytbs_timestamp(&self.zaman),
            frekans: self.y1.unwrap_or(50.0),
            aktif_guc: self.y11.unwrap_or(0.0),
            reaktif_guc: self.y12.unwrap_or(0.0),
            gorunen_guc: self.y13.unwrap_or(0.0),
            guc_faktoru: {
                let s = self.y13.unwrap_or(1.0);
                let p = self.y11.unwrap_or(0.0);
                if s.abs() > 0.001 {
                    (p / s).abs().min(1.0)
                } else {
                    1.0
                }
            },
            frekans_sapma: self.y1.unwrap_or(50.0) - 50.0,
            df_dt: 0.0, // YTBS'de df/dt doğrudan mevcut değil
            gerilim: GerilimData {
                faz_a: self.y3.unwrap_or(0.0) * gerilim_carpan,
                faz_b: self.y4.unwrap_or(0.0) * gerilim_carpan,
                faz_c: self.y5.unwrap_or(0.0) * gerilim_carpan,
            },
            akim: AkimData {
                faz_a: self.y7.unwrap_or(0.0),
                faz_b: self.y8.unwrap_or(0.0),
                faz_c: self.y9.unwrap_or(0.0),
            },
        }
    }

    /// YTBS tarih formatını (dd.MM.yyyy HH:mm:ss) Unix timestamp'e çevir
    fn to_pmu_rms_data(&self) -> RmsData {
        let gerilim_carpan = 1000.0;
        let frekans = self.y1.unwrap_or(50.0);
        let aktif_guc = self.y14.unwrap_or(0.0);
        let reaktif_guc = self.y15.unwrap_or(0.0);
        let gorunen_guc = self.y16.unwrap_or(0.0);

        RmsData {
            timestamp: Self::parse_ytbs_timestamp(&self.zaman),
            frekans,
            aktif_guc,
            reaktif_guc,
            gorunen_guc,
            guc_faktoru: if gorunen_guc.abs() > 0.001 {
                (aktif_guc / gorunen_guc).abs().min(1.0)
            } else {
                1.0
            },
            frekans_sapma: frekans - 50.0,
            df_dt: 0.0,
            gerilim: GerilimData {
                faz_a: self.y2.unwrap_or(0.0) * gerilim_carpan,
                faz_b: self.y3.unwrap_or(0.0) * gerilim_carpan,
                faz_c: self.y4.unwrap_or(0.0) * gerilim_carpan,
            },
            akim: AkimData {
                faz_a: self.y8.unwrap_or(0.0),
                faz_b: self.y9.unwrap_or(0.0),
                faz_c: self.y10.unwrap_or(0.0),
            },
        }
    }

    fn parse_ytbs_timestamp(zaman: &str) -> i64 {
        Self::parse_ytbs_datetime(zaman)
            .map(|dt| dt.and_utc().timestamp_millis())
            .unwrap_or_else(|_| chrono::Utc::now().timestamp_millis())
    }

    fn is_parseable_timestamp(zaman: &str) -> bool {
        Self::parse_ytbs_datetime(zaman).is_ok()
    }

    fn parse_ytbs_datetime(zaman: &str) -> Result<chrono::NaiveDateTime, chrono::ParseError> {
        chrono::NaiveDateTime::parse_from_str(zaman, "%d.%m.%Y %H:%M:%S%.f")
            .or_else(|_| chrono::NaiveDateTime::parse_from_str(zaman, "%d.%m.%Y %H:%M:%S"))
            .or_else(|_| chrono::NaiveDateTime::parse_from_str(zaman, "%d.%m.%Y %H:%M"))
    }
}

impl YtbsHealthCheckResult {
    pub fn from_samples(samples: &[YtbsGrafikVerisi]) -> Self {
        let valid_sample_count = samples
            .iter()
            .filter(|sample| sample.has_fider_telemetry())
            .count();

        if valid_sample_count > 0 {
            Self {
                status: "ok".to_string(),
                checked_at: chrono::Utc::now().timestamp_millis(),
                valid_sample_count,
                reason: format!(
                    "{} geçerli fider telemetri örneği bulundu",
                    valid_sample_count
                ),
            }
        } else {
            Self {
                status: "fail".to_string(),
                checked_at: chrono::Utc::now().timestamp_millis(),
                valid_sample_count,
                reason: if samples.is_empty() {
                    "YTBS yanıtında veri noktası yok".to_string()
                } else {
                    "Frekans dışı fider telemetri kanalı bulunamadı".to_string()
                },
            }
        }
    }

    pub fn fail(reason: impl Into<String>) -> Self {
        Self {
            status: "fail".to_string(),
            checked_at: chrono::Utc::now().timestamp_millis(),
            valid_sample_count: 0,
            reason: reason.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_with(zaman: &str) -> YtbsGrafikVerisi {
        YtbsGrafikVerisi {
            zaman: zaman.to_string(),
            y1: None,
            y2: None,
            y3: None,
            y4: None,
            y5: None,
            y6: None,
            y7: None,
            y8: None,
            y9: None,
            y10: None,
            y11: None,
            y12: None,
            y13: None,
            y14: None,
            y15: None,
            y16: None,
        }
    }

    #[test]
    fn health_result_marks_empty_data_as_fail() {
        let result = YtbsHealthCheckResult::from_samples(&[]);

        assert_eq!(result.status, "fail");
        assert_eq!(result.valid_sample_count, 0);
    }

    #[test]
    fn health_result_does_not_accept_frequency_only_data() {
        let mut sample = sample_with("10.05.2026 20:31:00");
        sample.y1 = Some(50.0);

        let result = YtbsHealthCheckResult::from_samples(&[sample]);

        assert_eq!(result.status, "fail");
        assert_eq!(result.valid_sample_count, 0);
    }

    #[test]
    fn health_result_accepts_voltage_current_or_power_channels() {
        let mut voltage = sample_with("10.05.2026 20:31:00");
        voltage.y3 = Some(154.0);
        let mut current = sample_with("10.05.2026 20:31:03");
        current.y7 = Some(12.5);
        let mut power = sample_with("10.05.2026 20:31:06");
        power.y11 = Some(4.2);

        let result = YtbsHealthCheckResult::from_samples(&[voltage, current, power]);

        assert_eq!(result.status, "ok");
        assert_eq!(result.valid_sample_count, 3);
    }

    #[test]
    fn health_result_accepts_explicit_zero_fider_values() {
        let mut sample = sample_with("10.05.2026 20:31:00");
        sample.y11 = Some(0.0);

        let result = YtbsHealthCheckResult::from_samples(&[sample]);

        assert_eq!(result.status, "ok");
        assert_eq!(result.valid_sample_count, 1);
    }

    #[test]
    fn health_result_requires_parseable_timestamp() {
        let mut sample = sample_with("");
        sample.y11 = Some(10.0);

        let result = YtbsHealthCheckResult::from_samples(&[sample]);

        assert_eq!(result.status, "fail");
        assert_eq!(result.valid_sample_count, 0);
    }

    #[test]
    fn pmu_timestamp_preserves_milliseconds() {
        let mut sample = sample_with("16.05.2026 22:00:02.100");
        sample.y14 = Some(-368.12);

        let rms = sample.to_rms_data_for_measurement("PMU");
        let expected = chrono::NaiveDate::from_ymd_opt(2026, 5, 16)
            .unwrap()
            .and_hms_milli_opt(22, 0, 2, 100)
            .unwrap()
            .and_utc()
            .timestamp_millis();

        assert_eq!(rms.timestamp, expected);
    }

    #[test]
    fn pmu_mapping_uses_pmu_field_layout() {
        let mut sample = sample_with("16.05.2026 22:00:02.100");
        sample.y1 = Some(50.02);
        sample.y2 = Some(405.1);
        sample.y3 = Some(406.2);
        sample.y4 = Some(404.3);
        sample.y5 = Some(1.1);
        sample.y6 = Some(-118.9);
        sample.y7 = Some(121.0);
        sample.y8 = Some(980.0);
        sample.y9 = Some(981.0);
        sample.y10 = Some(982.0);
        sample.y11 = Some(10.0);
        sample.y12 = Some(-110.0);
        sample.y13 = Some(130.0);
        sample.y14 = Some(-368.12);
        sample.y15 = Some(-66.01);
        sample.y16 = Some(374.11);

        let rms = sample.to_rms_data_for_measurement("PMU");

        assert_eq!(rms.frekans, 50.02);
        assert_eq!(rms.aktif_guc, -368.12);
        assert_eq!(rms.reaktif_guc, -66.01);
        assert_eq!(rms.gorunen_guc, 374.11);
        assert_eq!(rms.gerilim.faz_a, 405100.0);
        assert_eq!(rms.gerilim.faz_b, 406200.0);
        assert_eq!(rms.gerilim.faz_c, 404300.0);
        assert_eq!(rms.akim.faz_a, 980.0);
        assert_eq!(rms.akim.faz_b, 981.0);
        assert_eq!(rms.akim.faz_c, 982.0);
    }
}
