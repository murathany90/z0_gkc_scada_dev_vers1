// GKÇ İstemci - Mock Veri Servisi
// API keşfi tamamlanana kadar geliştirme/test için sahte veri üretici

use crate::data_models::*;
use chrono::Utc;
use rand::Rng;

/// Gerçekçi RMS verisi üret
/// Frekans: 49.95-50.05 Hz aralığında
/// Güç değerleri: makul endüstriyel aralıklarda
pub fn generate_mock_rms() -> RmsData {
    let mut rng = rand::thread_rng();
    let now = Utc::now().timestamp_millis();

    RmsData {
        timestamp: now,
        frekans: 50.0 + rng.gen_range(-0.05..0.05),
        aktif_guc: 300.0 + rng.gen_range(-50.0..50.0),
        reaktif_guc: rng.gen_range(-30.0..30.0),
        gorunen_guc: 310.0 + rng.gen_range(-40.0..40.0),
        guc_faktoru: 0.95 + rng.gen_range(-0.05..0.05),
        frekans_sapma: rng.gen_range(-0.03..0.03),
        df_dt: rng.gen_range(-0.01..0.01),
        gerilim: GerilimData {
            faz_a: 154000.0 + rng.gen_range(-500.0..500.0),
            faz_b: 153800.0 + rng.gen_range(-500.0..500.0),
            faz_c: 154100.0 + rng.gen_range(-500.0..500.0),
        },
        akim: AkimData {
            faz_a: 1200.0 + rng.gen_range(-100.0..100.0),
            faz_b: 1195.0 + rng.gen_range(-100.0..100.0),
            faz_c: 1210.0 + rng.gen_range(-100.0..100.0),
        },
    }
}

/// Gerçekçi PMU verisi üret
pub fn generate_mock_pmu() -> PmuData {
    let mut rng = rand::thread_rng();
    let now = Utc::now().timestamp_millis();

    PmuData {
        timestamp: now,
        frekans1: 50.0 + rng.gen_range(-0.02..0.02),
        frekans2: 50.0 + rng.gen_range(-0.02..0.02),
        frekans_fark: rng.gen_range(-0.01..0.01),
        gerilim_fasor1: FasorData {
            buyukluk: 154000.0 + rng.gen_range(-200.0..200.0),
            aci: rng.gen_range(-5.0..5.0),
        },
        gerilim_fasor2: FasorData {
            buyukluk: 153500.0 + rng.gen_range(-200.0..200.0),
            aci: rng.gen_range(-5.0..5.0),
        },
        akim_fasor1: FasorData {
            buyukluk: 1200.0 + rng.gen_range(-50.0..50.0),
            aci: rng.gen_range(-30.0..30.0),
        },
        akim_fasor2: FasorData {
            buyukluk: 1180.0 + rng.gen_range(-50.0..50.0),
            aci: rng.gen_range(-30.0..30.0),
        },
        guc1: 300.0 + rng.gen_range(-20.0..20.0),
        guc2: 295.0 + rng.gen_range(-20.0..20.0),
    }
}
