// GKÇ İstemci - YTBS Yedek Veri İstemcisi
// https://ytbs.teias.gov.tr/ytbs/ üzerinden MGKP ölçüm verilerini çeker
// JSF/PrimeFaces ViewState yönetimi, cookie jar ve AJAX POST ile çalışır

use crate::data_models::{
    RmsData, YtbsGrafikVerisi, YtbsScadaOptions, YtbsScadaQueryResult, YtbsScadaSample,
    YtbsSelectOption, YtbsSessionStatus,
};
use regex::Regex;
use reqwest::{cookie::Jar, Client};
use std::sync::Arc;

const YTBS_LOGIN_URL: &str = "https://ytbs.teias.gov.tr/ytbs/frm_login.jsf";
const YTBS_SMS_URL: &str = "https://ytbs.teias.gov.tr/ytbs/frm_sms_dogrulama.jsf";
const YTBS_MAIN_URL: &str = "https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf";

/// YTBS web portalıyla etkileşim kuran istemci
/// Cookie jar ve ViewState token yönetimi ile JSF/PrimeFaces lifecycle'ı takip eder
pub struct YtbsClient {
    client: Client,
    view_state: Option<String>,
    sms_channel: Option<String>,
    goster_button_id: Option<String>,
    pub status: YtbsSessionStatus,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
    is_on_mgkp_page: bool,
    is_on_scada_page: bool,
}

#[cfg(test)]
mod scada_parser_tests {
    use super::*;

    fn read_repo_fixture(relative_path: &str) -> Option<String> {
        let manifest_dir = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let repo_root = manifest_dir.parent()?.parent()?.parent()?;
        std::fs::read_to_string(repo_root.join(relative_path)).ok()
    }

    #[test]
    fn parse_scada_grafik_verisi_extracts_single_value_series() {
        let response = r#"
            <partial-response><changes><update id="form"><![CDATA[
                <script>
                    var grafik_yapisi_json = {"baslik":"Ölçüm (MVAr)","sorguListesi":[{"birim":"MVAr","ad":"Ölçüm"}]};
                    var grafik_verisi_json = [{"deger":26.45,"zaman":"15.05.2026 17:00:17.000"},{"deger":-9.68,"zaman":"15.05.2026 18:25:00.000"}];
                </script>
            ]]></update></changes></partial-response>
        "#;

        let result = YtbsClient::parse_scada_grafik_verisi(response).unwrap();

        assert_eq!(result.title, "Ölçüm (MVAr)");
        assert_eq!(result.unit, "MVAr");
        assert_eq!(result.data.len(), 2);
        assert_eq!(result.data[0].zaman, "15.05.2026 17:00:17.000");
        assert_eq!(result.data[0].deger, 26.45);
        assert_eq!(result.data[1].deger, -9.68);
        assert!(result.raw_json.contains("\"deger\":26.45"));
    }

    #[test]
    fn parse_scada_grafik_verisi_treats_no_result_response_as_empty() {
        let response = r#"<?xml version='1.0' encoding='UTF-8'?>
<partial-response><changes><eval><![CDATA[PrimeFaces.showMessageInDialog({severity:"INFO 0",summary:"YTBS",detail:"Aradığınız kriterlere uygun sonuç bulunamadı. ",escape:false});;]]></eval></changes></partial-response>"#;

        let result = YtbsClient::parse_scada_grafik_verisi(response).unwrap();

        assert!(result.data.is_empty());
        assert_eq!(result.raw_json, "[]");
    }

    #[test]
    fn parse_scada_options_extracts_select_values() {
        let response = r#"
            <select id="form:b1Id_input" name="form:b1Id_input">
                <option value="">B1 seçiniz</option>
                <option value="CAYIRHAN" selected="selected">CAYIRHA</option>
            </select>
            <select id="form:b2Id_input" name="form:b2Id_input">
                <option value="">B2 seçiniz</option>
                <option value="380">380</option>
            </select>
            <select id="form:b3Id_input" name="form:b3Id_input">
                <option value="">B3 seçiniz</option>
                <option value="ADA-2">ADA-2</option>
            </select>
            <select id="form:scadaId_input" name="form:scadaId_input">
                <option value="">Element seçiniz</option>
                <option value="0a053a14-8d68-4c8d-9d02-6f0b914b918c">Q</option>
            </select>
        "#;

        let options = YtbsClient::parse_scada_options_from_response(response);

        assert_eq!(options.b1[0].value, "CAYIRHAN");
        assert_eq!(options.b1[0].label, "CAYIRHA");
        assert_eq!(options.b2[0].value, "380");
        assert_eq!(options.b3[0].label, "ADA-2");
        assert_eq!(
            options.elements[0].value,
            "0a053a14-8d68-4c8d-9d02-6f0b914b918c"
        );
        assert_eq!(options.elements[0].label, "Q");
    }

    #[test]
    fn parse_scada_options_extracts_primefaces_panel_values_from_fixtures() {
        let Some(b1_raw) = read_repo_fixture("ytbs_scada/b1.txt") else {
            return;
        };
        let Some(b2_raw) = read_repo_fixture("ytbs_scada/b2.txt") else {
            return;
        };
        let Some(b3_raw) = read_repo_fixture("ytbs_scada/b3.txt") else {
            return;
        };
        let Some(element_raw) = read_repo_fixture("ytbs_scada/element.txt") else {
            return;
        };

        let b1 = YtbsClient::parse_scada_options_from_response(&b1_raw);
        let b2 = YtbsClient::parse_scada_options_from_response(&b2_raw);
        let b3 = YtbsClient::parse_scada_options_from_response(&b3_raw);
        let element = YtbsClient::parse_scada_options_from_response(&element_raw);

        assert!(b1
            .b1
            .iter()
            .any(|option| option.value == "OYAK1GES" && option.label == "OYAKANKA"));
        assert!(b2
            .b2
            .iter()
            .any(|option| option.value == "154" && option.label == "154"));
        assert!(b3
            .b3
            .iter()
            .any(|option| option.value == "BB-A" && option.label == "BB-A"));
        assert!(element.elements.iter().any(|option| option.value
            == "c0a8cb3d-f35f-4586-b162-c1c47e7481d9"
            && option.label == "U"));
    }

    #[test]
    fn parse_scada_grafik_verisi_extracts_fixture_series() {
        let Some(response) = read_repo_fixture("ytbs_scada/sayfa_html 2.txt") else {
            return;
        };
        let result = YtbsClient::parse_scada_grafik_verisi(&response).unwrap();

        assert_eq!(result.title, "Ölçüm (MVAr)");
        assert_eq!(result.unit, "MVAr");
        assert!(result.data.len() > 100);
        assert_eq!(result.data[0].zaman, "15.05.2026 17:00:17.000");
        assert_eq!(result.data[0].deger, 26.45);
    }

    #[test]
    fn build_scada_query_params_matches_primefaces_payload() {
        let params = YtbsClient::build_scada_query_params(
            "form:j_idt14326",
            "16.05.2026 09:58",
            "16.05.2026 10:58",
            "OYAK1GES",
            "154",
            "BB-A",
            "c0a8cb3d-f35f-4586-b162-c1c47e7481d9",
            "7352171594015893575:-7847406347822810243",
        );

        assert!(params.contains(&("jakarta.faces.partial.ajax".to_string(), "true".to_string())));
        assert!(params.contains(&(
            "jakarta.faces.source".to_string(),
            "form:j_idt14326".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.execute".to_string(),
            "@all".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.render".to_string(),
            "form growlMessage".to_string()
        )));
        assert!(params.contains(&("form:j_idt14326".to_string(), "form:j_idt14326".to_string())));
        assert!(params.contains(&(
            "form:scadaId_input".to_string(),
            "c0a8cb3d-f35f-4586-b162-c1c47e7481d9".to_string()
        )));
    }

    #[test]
    fn build_scada_filter_change_params_matches_cascade_payload() {
        let params = YtbsClient::build_scada_filter_change_params(
            "form:b1Id",
            "form:b2Id,form:b3Id,form:scadaId",
            "OYAK1GES",
            "",
            "",
            "7352171594015893575:-7847406347822810243",
        );

        assert!(params.contains(&("jakarta.faces.partial.ajax".to_string(), "true".to_string())));
        assert!(params.contains(&("jakarta.faces.source".to_string(), "form:b1Id".to_string())));
        assert!(params.contains(&(
            "jakarta.faces.partial.execute".to_string(),
            "form:b1Id".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.render".to_string(),
            "form:b2Id,form:b3Id,form:scadaId".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.behavior.event".to_string(),
            "valueChange".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.event".to_string(),
            "change".to_string()
        )));
        assert!(params.contains(&("form:b1Id".to_string(), "form:b1Id".to_string())));
        assert!(params.contains(&("form:b1Id_input".to_string(), "OYAK1GES".to_string())));
    }

    #[test]
    fn build_mgkp_measurement_filter_change_params_matches_primefaces_payload() {
        let params = YtbsClient::build_mgkp_filter_change_params(
            "form:olcumTipi",
            "form:cihaz",
            "valueChange",
            "GERILIM_400KV",
            "3",
            "PQ",
            "view-state-1",
        );

        assert!(params.contains(&("jakarta.faces.partial.ajax".to_string(), "true".to_string())));
        assert!(params.contains(&(
            "jakarta.faces.source".to_string(),
            "form:olcumTipi".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.execute".to_string(),
            "form:olcumTipi".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.render".to_string(),
            "form:cihaz".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.behavior.event".to_string(),
            "valueChange".to_string()
        )));
        assert!(params.contains(&(
            "jakarta.faces.partial.event".to_string(),
            "change".to_string()
        )));
        assert!(params.contains(&(
            "form:gerilim_input".to_string(),
            "GERILIM_400KV".to_string()
        )));
        assert!(params.contains(&("form:fazId_input".to_string(), "3".to_string())));
        assert!(params.contains(&("form:olcumTipi_input".to_string(), "PQ".to_string())));
        assert!(params.contains(&("form:cihaz_input".to_string(), "-1".to_string())));
        assert!(params.contains(&(
            "jakarta.faces.ViewState".to_string(),
            "view-state-1".to_string()
        )));
    }

    #[test]
    fn detects_mgkp_response_measurement_type_from_graph_schema() {
        let pmu_response = r#"
            <script>
            var grafik_yapisi_json = {"zamanCozunurlugu":"millisecond","sorguListesi":[{"yDegerAlani":"y14"},{"yDegerAlani":"y15"},{"yDegerAlani":"y16"}],"baslik":"Guc"};
            </script>
        "#;
        let pq_response = r#"
            <script>
            var grafik_yapisi_json = {"zamanCozunurlugu":"second","sorguListesi":[{"yDegerAlani":"y11"},{"yDegerAlani":"y12"},{"yDegerAlani":"y13"}],"baslik":"Guc"};
            </script>
        "#;

        assert_eq!(
            YtbsClient::detect_mgkp_response_measurement_type(pmu_response),
            Some("PMU")
        );
        assert_eq!(
            YtbsClient::detect_mgkp_response_measurement_type(pq_response),
            Some("PQ")
        );
    }

    #[test]
    fn rejects_pmu_graph_schema_for_pq_request() {
        let response = r#"
            <partial-response><changes><update id="form"><![CDATA[
            <script>
            var grafik_yapisi_json = {"zamanCozunurlugu":"millisecond","sorguListesi":[{"yDegerAlani":"y14"},{"yDegerAlani":"y15"},{"yDegerAlani":"y16"}],"baslik":"Guc"};
            var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y14":-368.12,"y15":-66.01,"y16":374.11}];
            </script>
            ]]></update></changes></partial-response>
        "#;

        let error = YtbsClient::validate_mgkp_response_measurement_type(response, "PQ")
            .expect_err("PMU schema must not be accepted for a PQ request");

        assert!(error.contains("PMU"));
        assert!(error.contains("PQ"));
    }

    #[test]
    fn session_expired_detection_ignores_primefaces_login_error_page_config() {
        let logged_in_page = r#"
            <script>
              PrimeFaces.settings={errorPages:{'jakarta.faces.application.ViewExpiredException':'/ytbs/frm_login.jsf'}};
            </script>
            <form id="form"><select id="form:b1Id_input"></select><select id="form:scadaId_input"></select></form>
        "#;

        assert!(!YtbsClient::is_session_expired_response(logged_in_page));

        let login_page = r#"<form id="loginForm"><input id="loginForm:username" /></form>"#;
        assert!(YtbsClient::is_session_expired_response(login_page));
    }

    #[test]
    fn ytbs_sms_page_is_not_authenticated_even_with_main_div() {
        let response = r#"
            <script>PrimeFaces.settings={viewId:'/frm_sms_dogrulama.xhtml',contextPath:'/ytbs'};</script>
            <div id="main">
                <form id="loginSmsForm" name="loginSmsForm" method="post" action="/ytbs/frm_sms_dogrulama.jsf">
                    <input id="loginSmsForm:smskodu_input" name="loginSmsForm:smskodu_input" />
                    <button id="loginSmsForm:btnGiris" name="loginSmsForm:btnGiris">GIRIS</button>
                    <button id="loginSmsForm:btnSmsKodGonder" name="loginSmsForm:btnSmsKodGonder">YENI SIFRE GONDER</button>
                    <input type="hidden" name="jakarta.faces.ViewState" value="sms-view-state" />
                </form>
            </div>
        "#;

        assert!(YtbsClient::is_sms_verification_response(response));
        assert!(!YtbsClient::is_authenticated_response(response));
    }

    #[test]
    fn ytbs_sms_success_page_is_authenticated() {
        let response = r#"
            <script>PrimeFaces.settings={viewId:'/YTBSAnaSayfa.xhtml',contextPath:'/ytbs'};</script>
            <form id="formMenu" name="formMenu" method="post" action="/ytbs/YTBSAnaSayfa.jsf">
                <div id="formMenu:mb" class="menubar"></div>
            </form>
        "#;

        assert!(!YtbsClient::is_sms_verification_response(response));
        assert!(YtbsClient::is_authenticated_response(response));
    }

    #[test]
    fn ytbs_sms_verify_params_match_real_form_fields() {
        let params =
            YtbsClient::build_sms_verify_params("123456", "VODAFONE_FAST", "sms-view-state");

        assert!(params.contains(&("loginSmsForm".to_string(), "loginSmsForm".to_string())));
        assert!(params.contains(&(
            "loginSmsForm:kanal_input".to_string(),
            "VODAFONE_FAST".to_string()
        )));
        assert!(params.contains(&(
            "loginSmsForm:smskodu_input".to_string(),
            "123456".to_string()
        )));
        assert!(params.contains(&(
            "loginSmsForm:smskodu_hinput".to_string(),
            "123456".to_string()
        )));
        assert!(params.contains(&(
            "loginSmsForm:btnGiris".to_string(),
            "loginSmsForm:btnGiris".to_string()
        )));
    }
}

impl YtbsClient {
    /// Yeni bir YTBS istemcisi oluştur
    pub fn new() -> Result<Self, String> {
        let jar = Arc::new(Jar::default());
        let client = Client::builder()
            .cookie_provider(jar)
            .danger_accept_invalid_certs(true) // Kurumsal TLS sertifika sorunları için
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .build()
            .map_err(|e| format!("HTTP istemci oluşturulamadı: {}", e))?;

        Ok(Self {
            client,
            view_state: None,
            sms_channel: None,
            goster_button_id: None,
            status: YtbsSessionStatus::Disconnected,
            last_activity: None,
            is_on_mgkp_page: false,
            is_on_scada_page: false,
        })
    }

    /// YTBS'ye giriş yap
    /// kanal: Doğrulama kodu gönderme tercihi (VODAFONE_FAST, AVEA, VODAFONE, EPOSTA)
    /// Başarılı olursa SmsRequired veya Connected döner
    pub async fn login(
        &mut self,
        username: &str,
        password: &str,
        kanal: &str,
    ) -> Result<YtbsSessionStatus, String> {
        self.status = YtbsSessionStatus::LoggingIn;
        self.sms_channel = Some(kanal.to_string());

        // 1. Login sayfasını GET ile al → ViewState token ve JSESSIONID cookie çıkar
        let login_page = self
            .client
            .get(YTBS_LOGIN_URL)
            .send()
            .await
            .map_err(|e| format!("Login sayfası alınamadı: {}", e))?
            .text()
            .await
            .map_err(|e| format!("Login sayfası okunamadı: {}", e))?;

        self.view_state = Self::extract_view_state(&login_page);

        let view_state = self.view_state.as_ref().ok_or_else(|| {
            format!(
                "ViewState token bulunamadı. HTML Özeti: {}",
                &login_page[..login_page.len().min(500)]
            )
        })?;

        // 2. Login form'unu POST ile gönder
        // Gerçek form alan adları (frm_login.jsf'den doğrulanmış):
        //   loginForm:username, loginForm:password, loginForm:kanal_input, loginForm:btnLogin
        //   ViewState adı: jakarta.faces.ViewState (DOM analizinde doğrulandı)
        let form_params = [
            ("loginForm", "loginForm"),
            ("loginForm:username", username),
            ("loginForm:password", password),
            ("loginForm:kanal_input", kanal),
            ("loginForm:btnLogin", ""),
            ("jakarta.faces.ViewState", view_state),
        ];

        let response = self
            .client
            .post(YTBS_LOGIN_URL)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&form_params)
            .send()
            .await
            .map_err(|e| format!("Login isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Login yanıtı okunamadı: {}", e))?;

        // Yanıttan yeni ViewState çıkar
        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        // ─── Login Yanıtı Doğrulama (Düzeltilmiş öncelik sırası) ───

        // 1. AÇIK HATA KONTROLÜ: PrimeFaces hata mesajları
        if response_text.contains("ui-messages-error")
            || response_text.contains("Hatal")
            || response_text.contains("hatal")
            || response_text.contains("Ge\u{00e7}ersiz")
            || response_text.contains("error-summary")
        {
            self.status = YtbsSessionStatus::Disconnected;
            return Err("Kullanıcı adı veya şifre hatalı".into());
        }

        // 2. SMS DOĞRULAMA EKRANI MI?
        //    YTBS 24 saatlik doğrulama süresi dolunca login sonrası ayrı
        //    loginSmsForm tabanlı ekrana yönlendirir.
        if Self::is_sms_verification_response(&response_text) {
            self.status = YtbsSessionStatus::SmsRequired;
            return Ok(YtbsSessionStatus::SmsRequired);
        }

        // 3. LOGIN FORMU HÂLÂ GÖRÜNÜYOR MU? (En kritik kontrol)
        //    Yanlış şifrede sunucu login sayfasını tekrar gösterir
        //    loginForm:btnLogin veya loginForm:username hâlâ varsa → giriş başarısız
        let login_form_still_visible = Self::is_login_form_response(&response_text);

        if login_form_still_visible {
            // SMS formu yok ama login formu görünüyor → başarısız giriş
            self.status = YtbsSessionStatus::Disconnected;
            return Err(
                "Kullanıcı adı veya şifre hatalı. Sunucu login sayfasını tekrar gösterdi.".into(),
            );
        }

        // 4. DOĞRUDAN GİRİŞ BAŞARILI: Ana sayfa öğeleri varsa (login/SMS formu yok)
        if Self::is_authenticated_response(&response_text) {
            self.status = YtbsSessionStatus::Connected;
            self.last_activity = Some(chrono::Utc::now());
            return Ok(YtbsSessionStatus::Connected);
        }

        // 5. TAMAMEN BELİRSİZ: Yanıt hiçbir kalıba uymuyorsa hata ver
        self.status = YtbsSessionStatus::Disconnected;
        let preview = &response_text[..response_text.len().min(500)];
        Err(format!(
            "Beklenmeyen login yanıtı. İlk 500 karakter: {}",
            preview
        ))
    }

    /// Doğrulama kodunu gönder (SMS veya Eposta ile gelen kod)
    pub async fn verify_sms(&mut self, code: &str) -> Result<(), String> {
        let view_state = self
            .view_state
            .as_ref()
            .ok_or("ViewState bulunamadı, önce login yapın")?;

        // Doğrulama form parametreleri
        // Form alan adları login yanıtından tespit edilmeli — yaygın PrimeFaces kalıpları denenir
        let kanal = self.sms_channel.as_deref().unwrap_or("VODAFONE_FAST");
        let form_params = Self::build_sms_verify_params(code, kanal, view_state);

        let response = self
            .client
            .post(YTBS_SMS_URL)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&form_params)
            .send()
            .await
            .map_err(|e| format!("Doğrulama isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("Doğrulama yanıtı okunamadı: {}", e))?;

        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        if response_text.contains("Hatalı")
            || response_text.contains("hatalı")
            || response_text.contains("HatalÄ±")
            || response_text.contains("geçersiz")
            || response_text.contains("Geçersiz")
            || response_text.contains("geÃ§ersiz")
            || response_text.contains("ui-messages-error")
        {
            self.status = YtbsSessionStatus::SmsRequired;
            Err("Doğrulama kodu geçersiz".into())
        } else if Self::is_authenticated_response(&response_text) {
            self.status = YtbsSessionStatus::Connected;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        } else if Self::is_sms_verification_response(&response_text) {
            self.status = YtbsSessionStatus::SmsRequired;
            Err("SMS doğrulaması tamamlanmadı. Kodu kontrol edip tekrar deneyin.".into())
        } else if Self::is_login_form_response(&response_text)
            || Self::is_session_expired_response(&response_text)
        {
            self.status = YtbsSessionStatus::Disconnected;
            Err("SMS doğrulama oturumu sona erdi, yeniden giriş gerekli".into())
        } else {
            self.status = YtbsSessionStatus::SmsRequired;
            let preview = &response_text[..response_text.len().min(500)];
            Err(format!(
                "Beklenmeyen SMS doğrulama yanıtı. İlk 500 karakter: {}",
                preview
            ))
        }
    }

    /// MGKP Ölçüm Verisi sayfasına navigasyon yap
    /// JSF form submit ile menü geçişi yapılır
    pub async fn navigate_to_mgkp(&mut self) -> Result<(), String> {
        if self.status != YtbsSessionStatus::Connected {
            return Err("YTBS'ye bağlı değil".into());
        }

        let view_state = self.view_state.as_ref().ok_or("ViewState bulunamadı")?;

        // Menü navigasyonu: formMenu:mgkpOlcumVerileri
        let form_params = [
            ("formMenu", "formMenu"),
            ("formMenu:mgkpOlcumVerileri", "formMenu:mgkpOlcumVerileri"),
            ("jakarta.faces.ViewState", view_state),
        ];

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&form_params)
            .send()
            .await
            .map_err(|e| format!("MGKP navigasyonu başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("MGKP yanıtı okunamadı: {}", e))?;

        // Yeni ViewState güncelle
        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        // GÖSTER butonu ID'sini güncelle
        if let Some(btn_id) = Self::extract_goster_button_id(&response_text) {
            self.goster_button_id = Some(btn_id);
        }

        if response_text.contains("MGKP") || response_text.contains("form:cihaz") {
            self.is_on_mgkp_page = true;
            self.is_on_scada_page = false;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        } else if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            Err("Oturum süresi dolmuş, yeniden giriş gerekli".into())
        } else {
            // Sayfa yüklendi ama MGKP teyidi yok — yine de devam et
            self.is_on_mgkp_page = true;
            self.is_on_scada_page = false;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        }
    }

    /// SCADA ölçüm verileri sayfasına navigasyon yap.
    pub async fn navigate_to_scada(&mut self) -> Result<(), String> {
        self.load_scada_page().await.map(|_| ())
    }

    async fn load_scada_page(&mut self) -> Result<String, String> {
        if self.status != YtbsSessionStatus::Connected {
            return Err("YTBS'ye bağlı değil".into());
        }

        let view_state = self.view_state.clone().ok_or("ViewState bulunamadı")?;

        let form_params = [
            ("formMenu", "formMenu"),
            ("formMenu:scadaOlcumVerileri", "formMenu:scadaOlcumVerileri"),
            ("jakarta.faces.ViewState", view_state.as_str()),
        ];

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header("Content-Type", "application/x-www-form-urlencoded")
            .form(&form_params)
            .send()
            .await
            .map_err(|e| format!("SCADA navigasyonu başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("SCADA yanıtı okunamadı: {}", e))?;

        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        if let Some(btn_id) = Self::extract_goster_button_id(&response_text) {
            self.goster_button_id = Some(btn_id);
        }

        if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_mgkp_page = false;
            self.is_on_scada_page = false;
            return Err("Oturum süresi dolmuş, yeniden giriş gerekli".into());
        }

        if !response_text.contains("form:b1Id_input")
            || !response_text.contains("form:scadaId_input")
        {
            self.is_on_scada_page = false;
            return Err(
                "SCADA ölçüm verileri sayfası doğrulanamadı; filtre formu bulunamadı.".into(),
            );
        }

        self.is_on_mgkp_page = false;
        self.is_on_scada_page = true;
        self.last_activity = Some(chrono::Utc::now());
        Ok(response_text)
    }

    pub async fn scada_options(
        &mut self,
        b1: Option<&str>,
        b2: Option<&str>,
        b3: Option<&str>,
    ) -> Result<YtbsScadaOptions, String> {
        if self.status != YtbsSessionStatus::Connected {
            return Err("YTBS'ye bağlı değil".into());
        }

        if b1.unwrap_or("").is_empty() && b2.unwrap_or("").is_empty() && b3.unwrap_or("").is_empty()
        {
            let response_text = self.load_scada_page().await?;
            return Ok(Self::parse_scada_options_from_response(&response_text));
        }

        if !self.is_on_scada_page {
            self.load_scada_page().await?;
        }

        self.apply_scada_filter_state(b1.unwrap_or(""), b2.unwrap_or(""), b3.unwrap_or(""))
            .await
    }

    pub async fn query_scada(
        &mut self,
        start_time: &str,
        end_time: &str,
        b1: &str,
        b2: &str,
        b3: &str,
        scada_id: &str,
    ) -> Result<YtbsScadaQueryResult, String> {
        if self.status != YtbsSessionStatus::Connected {
            return Err("YTBS'ye bağlı değil".into());
        }

        if !self.is_on_scada_page {
            self.load_scada_page().await?;
        }

        self.apply_scada_filter_state(b1, b2, b3).await?;

        let view_state = self.view_state.clone().ok_or("ViewState bulunamadı")?;
        let btn_id = self
            .goster_button_id
            .as_deref()
            .unwrap_or("form:j_idt14326");

        let params = Self::build_scada_query_params(
            btn_id,
            start_time,
            end_time,
            b1,
            b2,
            b3,
            scada_id,
            &view_state,
        );

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("Faces-Request", "partial/ajax")
            .header("X-Requested-With", "XMLHttpRequest")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("SCADA sorgu isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("SCADA sorgu yanıtı okunamadı: {}", e))?;

        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        if let Some(btn_id) = Self::extract_goster_button_id(&response_text) {
            self.goster_button_id = Some(btn_id);
        }

        if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_scada_page = false;
            return Err("Oturum süresi dolmuş".into());
        }

        self.last_activity = Some(chrono::Utc::now());
        Self::parse_scada_grafik_verisi(&response_text)
    }

    fn build_scada_query_params(
        btn_id: &str,
        start_time: &str,
        end_time: &str,
        b1: &str,
        b2: &str,
        b3: &str,
        scada_id: &str,
        view_state: &str,
    ) -> Vec<(String, String)> {
        vec![
            ("jakarta.faces.partial.ajax".to_string(), "true".to_string()),
            ("jakarta.faces.source".to_string(), btn_id.to_string()),
            (
                "jakarta.faces.partial.execute".to_string(),
                "@all".to_string(),
            ),
            (
                "jakarta.faces.partial.render".to_string(),
                "form growlMessage".to_string(),
            ),
            (btn_id.to_string(), btn_id.to_string()),
            ("form".to_string(), "form".to_string()),
            (
                "form:baslangicZamani_input".to_string(),
                start_time.to_string(),
            ),
            ("form:bitisZamani_input".to_string(), end_time.to_string()),
            ("form:b1Id_input".to_string(), b1.to_string()),
            ("form:b2Id_input".to_string(), b2.to_string()),
            ("form:b3Id_input".to_string(), b3.to_string()),
            ("form:scadaId_input".to_string(), scada_id.to_string()),
            (
                "jakarta.faces.ViewState".to_string(),
                view_state.to_string(),
            ),
        ]
    }

    async fn apply_scada_filter_state(
        &mut self,
        b1: &str,
        b2: &str,
        b3: &str,
    ) -> Result<YtbsScadaOptions, String> {
        let mut last_options = YtbsScadaOptions::default();

        if !b1.is_empty() {
            last_options = self
                .post_scada_filter_change(
                    "form:b1Id",
                    "form:b2Id,form:b3Id,form:scadaId",
                    b1,
                    "",
                    "",
                )
                .await?;
        }

        if !b2.is_empty() {
            last_options = self
                .post_scada_filter_change("form:b2Id", "form:b3Id,form:scadaId", b1, b2, "")
                .await?;
        }

        if !b3.is_empty() {
            last_options = self
                .post_scada_filter_change("form:b3Id", "form:scadaId", b1, b2, b3)
                .await?;
        }

        Ok(last_options)
    }

    async fn post_scada_filter_change(
        &mut self,
        source: &str,
        render: &str,
        b1: &str,
        b2: &str,
        b3: &str,
    ) -> Result<YtbsScadaOptions, String> {
        let view_state = self.view_state.clone().ok_or("ViewState bulunamadı")?;
        let params =
            Self::build_scada_filter_change_params(source, render, b1, b2, b3, &view_state);

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("Faces-Request", "partial/ajax")
            .header("X-Requested-With", "XMLHttpRequest")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("SCADA seçenek isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("SCADA seçenek yanıtı okunamadı: {}", e))?;

        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_scada_page = false;
            return Err("Oturum süresi dolmuş".into());
        }

        self.last_activity = Some(chrono::Utc::now());
        Ok(Self::parse_scada_options_from_response(&response_text))
    }

    async fn apply_mgkp_filter_state(
        &mut self,
        measurement_type: &str,
        gerilim: &str,
        faz_id: &str,
    ) -> Result<(), String> {
        self.post_mgkp_filter_change(
            "form:olcumTipi",
            "form:cihaz",
            "valueChange",
            gerilim,
            faz_id,
            measurement_type,
        )
        .await?;

        self.post_mgkp_filter_change(
            "form:gerilim",
            "form:cihaz",
            "change",
            gerilim,
            faz_id,
            measurement_type,
        )
        .await
    }

    async fn post_mgkp_filter_change(
        &mut self,
        source: &str,
        render: &str,
        behavior_event: &str,
        gerilim: &str,
        faz_id: &str,
        measurement_type: &str,
    ) -> Result<(), String> {
        let view_state = self.view_state.clone().ok_or("ViewState bulunamadı")?;
        let params = Self::build_mgkp_filter_change_params(
            source,
            render,
            behavior_event,
            gerilim,
            faz_id,
            measurement_type,
            &view_state,
        );

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("Faces-Request", "partial/ajax")
            .header("X-Requested-With", "XMLHttpRequest")
            .form(&params)
            .send()
            .await
            .map_err(|e| format!("MGKP filtre senkronizasyon isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("MGKP filtre senkronizasyon yanıtı okunamadı: {}", e))?;

        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        if let Some(btn_id) = Self::extract_goster_button_id(&response_text) {
            self.goster_button_id = Some(btn_id);
        }

        if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_mgkp_page = false;
            return Err("Oturum süresi dolmuş".into());
        }

        self.last_activity = Some(chrono::Utc::now());
        Ok(())
    }

    fn build_scada_filter_change_params(
        source: &str,
        render: &str,
        b1: &str,
        b2: &str,
        b3: &str,
        view_state: &str,
    ) -> Vec<(String, String)> {
        vec![
            ("jakarta.faces.partial.ajax".to_string(), "true".to_string()),
            ("jakarta.faces.source".to_string(), source.to_string()),
            (
                "jakarta.faces.partial.execute".to_string(),
                source.to_string(),
            ),
            (
                "jakarta.faces.partial.render".to_string(),
                render.to_string(),
            ),
            (
                "jakarta.faces.behavior.event".to_string(),
                "valueChange".to_string(),
            ),
            (
                "jakarta.faces.partial.event".to_string(),
                "change".to_string(),
            ),
            (source.to_string(), source.to_string()),
            ("form".to_string(), "form".to_string()),
            ("form:b1Id_input".to_string(), b1.to_string()),
            ("form:b2Id_input".to_string(), b2.to_string()),
            ("form:b3Id_input".to_string(), b3.to_string()),
            ("form:scadaId_input".to_string(), String::new()),
            (
                "jakarta.faces.ViewState".to_string(),
                view_state.to_string(),
            ),
        ]
    }

    fn build_mgkp_filter_change_params(
        source: &str,
        render: &str,
        behavior_event: &str,
        gerilim: &str,
        faz_id: &str,
        measurement_type: &str,
        view_state: &str,
    ) -> Vec<(String, String)> {
        vec![
            ("jakarta.faces.partial.ajax".to_string(), "true".to_string()),
            ("jakarta.faces.source".to_string(), source.to_string()),
            (
                "jakarta.faces.partial.execute".to_string(),
                source.to_string(),
            ),
            (
                "jakarta.faces.partial.render".to_string(),
                render.to_string(),
            ),
            (
                "jakarta.faces.behavior.event".to_string(),
                behavior_event.to_string(),
            ),
            (
                "jakarta.faces.partial.event".to_string(),
                "change".to_string(),
            ),
            (source.to_string(), source.to_string()),
            ("form".to_string(), "form".to_string()),
            ("form:gerilim_input".to_string(), gerilim.to_string()),
            ("form:fazId_input".to_string(), faz_id.to_string()),
            (
                "form:olcumTipi_input".to_string(),
                measurement_type.to_string(),
            ),
            ("form:cihaz_input".to_string(), "-1".to_string()),
            (
                "jakarta.faces.ViewState".to_string(),
                view_state.to_string(),
            ),
        ]
    }

    /// Belirli bir cihazdan tarih aralığına göre ölçüm verisi sorgula.
    /// PrimeFaces AJAX POST ile "GÖSTER" butonunu simüle eder.
    pub async fn query_device(
        &mut self,
        device_id: &str,
        measurement_type: &str, // "PQ" veya "PMU"
        start_time: &str,       // "dd.MM.yyyy HH:mm" formatında
        end_time: &str,         // "dd.MM.yyyy HH:mm" formatında
        gerilim: &str,          // "" = Hepsi, "380", "154", "33", "15"
        faz_id: &str,           // "1" = Tek Faz, "" = Üç Faz
    ) -> Result<(Vec<RmsData>, String), String> {
        if self.status != YtbsSessionStatus::Connected {
            return Err("YTBS'ye bağlı değil".into());
        }

        let measurement_type = if measurement_type.trim().eq_ignore_ascii_case("PMU") {
            "PMU"
        } else {
            "PQ"
        };

        // MGKP sayfasında değilsek önce navigasyon yap
        if !self.is_on_mgkp_page {
            self.navigate_to_mgkp().await?;
        }

        self.apply_mgkp_filter_state(measurement_type, gerilim, faz_id)
            .await?;

        let view_state = self.view_state.as_ref().ok_or("ViewState bulunamadı")?;

        let btn_id = self.goster_button_id.as_deref().unwrap_or("form:j_idt8635");
        let btn_id_encoded = urlencoding_simple(btn_id);

        // PrimeFaces AJAX POST parametreleri (jakarta.faces — DOM analizinde doğrulandı)
        let form_body = format!(
            "jakarta.faces.partial.ajax=true\
            &jakarta.faces.source={}\
            &jakarta.faces.partial.execute=%40all\
            &jakarta.faces.partial.render=form\
            &{}={}\
            &form=form\
            &form%3AbaslangicZamani_input={}\
            &form%3Agerilim_input={}\
            &form%3AfazId_input={}\
            &form%3AbitisZamani_input={}\
            &form%3AolcumTipi_input={}\
            &form%3Acihaz_input={}\
            &jakarta.faces.ViewState={}",
            btn_id_encoded,
            btn_id_encoded,
            btn_id_encoded,
            urlencoding_simple(start_time),
            gerilim,
            faz_id,
            urlencoding_simple(end_time),
            measurement_type,
            device_id,
            urlencoding_simple(view_state),
        );

        let response = self
            .client
            .post(YTBS_MAIN_URL)
            .header(
                "Content-Type",
                "application/x-www-form-urlencoded; charset=UTF-8",
            )
            .header("Faces-Request", "partial/ajax")
            .header("X-Requested-With", "XMLHttpRequest")
            .body(form_body)
            .send()
            .await
            .map_err(|e| format!("YTBS sorgu isteği başarısız: {}", e))?;

        let response_text = response
            .text()
            .await
            .map_err(|e| format!("YTBS yanıtı okunamadı: {}", e))?;

        // ViewState güncelle
        if let Some(vs) = Self::extract_view_state(&response_text) {
            self.view_state = Some(vs);
        }

        // GÖSTER butonu ID'sini de güncelle (sayfa/form render edilmişse)
        if let Some(btn_id) = Self::extract_goster_button_id(&response_text) {
            self.goster_button_id = Some(btn_id);
        }

        // Oturum süresi dolmuş mu kontrol et
        if Self::is_session_expired_response(&response_text) {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_mgkp_page = false;
            return Err("Oturum süresi dolmuş".into());
        }

        Self::validate_mgkp_response_measurement_type(&response_text, measurement_type)?;

        // Yanıttan grafik verisi JSON'ını çıkar
        let (grafik_verileri, raw_json) = Self::parse_grafik_verisi(&response_text)?;

        self.last_activity = Some(chrono::Utc::now());

        // YtbsGrafikVerisi → RmsData dönüşümü
        let rms_data: Vec<RmsData> = grafik_verileri
            .iter()
            .map(|gv| gv.to_rms_data_for_measurement(measurement_type))
            .collect();

        Ok((rms_data, raw_json))
    }

    /// Oturumu canlı tutmak için keepalive isteği gönder
    /// 15 dakikada bir çağrılmalı (YTBS IdleMonitor timeout: 20 dk)
    pub async fn keep_alive(&mut self) -> Result<(), String> {
        if self.status != YtbsSessionStatus::Connected {
            return Ok(());
        }

        let _response = self
            .client
            .get(YTBS_MAIN_URL)
            .send()
            .await
            .map_err(|e| format!("Keepalive başarısız: {}", e))?;

        self.last_activity = Some(chrono::Utc::now());
        Ok(())
    }

    /// Oturumun hâlâ geçerli olup olmadığını kontrol et
    pub fn is_session_valid(&self) -> bool {
        if self.status != YtbsSessionStatus::Connected {
            return false;
        }

        // Son aktiviteden 20 dakikadan fazla geçtiyse oturum muhtemelen sona ermiştir
        if let Some(last) = self.last_activity {
            let elapsed = chrono::Utc::now() - last;
            elapsed.num_minutes() < 18 // 2 dakika güvenlik payı
        } else {
            false
        }
    }

    // ─── Yardımcı Fonksiyonlar ───

    /// HTML/XML yanıtından ViewState token'ını çıkar
    /// YTBS, jakarta.faces.ViewState kullanıyor (DOM analizinde doğrulandı)
    fn is_sms_verification_response(response: &str) -> bool {
        let response_lower = response.to_lowercase();

        response_lower.contains("frm_sms_dogrulama")
            || response.contains("loginSmsForm")
            || response.contains("loginSmsForm:smskodu_input")
            || response.contains("loginSmsForm:btnGiris")
            || response.contains("loginSmsForm:btnSmsKodGonder")
    }

    fn is_login_form_response(response: &str) -> bool {
        response.contains("loginForm:username")
            || response.contains("loginForm:password")
            || response.contains("loginForm:btnLogin")
            || response.contains("id=\"loginForm\"")
            || response.contains("name=\"loginForm\"")
    }

    fn is_authenticated_response(response: &str) -> bool {
        if Self::is_sms_verification_response(response) || Self::is_login_form_response(response) {
            return false;
        }

        let redirects_to_home = response.contains("<redirect") && response.contains("YTBSAnaSayfa");
        let has_home_view = response.contains("YTBSAnaSayfa.jsf")
            || response.contains("YTBSAnaSayfa.xhtml")
            || response.contains("viewId:'/YTBSAnaSayfa.xhtml'")
            || response.contains("viewId=\"/YTBSAnaSayfa.xhtml\"");
        let has_real_menu = response.contains("id=\"formMenu\"")
            || response.contains("name=\"formMenu\"")
            || response.contains("formMenu:mb");

        redirects_to_home || (has_home_view && has_real_menu)
    }

    fn build_sms_verify_params(code: &str, kanal: &str, view_state: &str) -> Vec<(String, String)> {
        vec![
            ("jakarta.faces.partial.ajax".to_string(), "true".to_string()),
            (
                "jakarta.faces.source".to_string(),
                "loginSmsForm:btnGiris".to_string(),
            ),
            (
                "jakarta.faces.partial.execute".to_string(),
                "@all".to_string(),
            ),
            (
                "jakarta.faces.partial.render".to_string(),
                "loginSmsForm".to_string(),
            ),
            (
                "loginSmsForm:btnGiris".to_string(),
                "loginSmsForm:btnGiris".to_string(),
            ),
            ("loginSmsForm".to_string(), "loginSmsForm".to_string()),
            ("loginSmsForm:kanal_input".to_string(), kanal.to_string()),
            ("loginSmsForm:smskodu_input".to_string(), code.to_string()),
            ("loginSmsForm:smskodu_hinput".to_string(), code.to_string()),
            (
                "jakarta.faces.ViewState".to_string(),
                view_state.to_string(),
            ),
        ]
    }

    fn is_session_expired_response(response: &str) -> bool {
        let response_lower = response.to_lowercase();

        if response.contains("<error-name>")
            && response.contains("jakarta.faces.application.ViewExpiredException")
        {
            return true;
        }

        if response.contains("<redirect") && response_lower.contains("frm_login") {
            return true;
        }

        Self::is_login_form_response(response)
    }

    fn extract_view_state(html: &str) -> Option<String> {
        // 1. Öncelikli: jakarta.faces (YTBS DOM analizinde doğrulanmış)
        let re_jakarta =
            Regex::new(r#"name="jakarta\.faces\.ViewState"[^>]*value="([^"]+)""#).ok()?;
        if let Some(caps) = re_jakarta.captures(html) {
            return Some(caps[1].to_string());
        }

        // 2. id-based format — jakarta
        let re_id_jakarta =
            Regex::new(r#"id="j_id1:jakarta\.faces\.ViewState:\d+"[^>]*value="([^"]+)""#).ok()?;
        if let Some(caps) = re_id_jakarta.captures(html) {
            return Some(caps[1].to_string());
        }

        // 3. XML partial-response formatı (CDATA içinde) — AJAX yanıtları için
        let re_cdata = Regex::new(
            r#"<update\s+id="j_id1:jakarta\.faces\.ViewState:\d+">\s*<!\[CDATA\[([^\]]+)\]\]>"#,
        )
        .ok()?;
        if let Some(caps) = re_cdata.captures(html) {
            return Some(caps[1].to_string());
        }

        // 4. javax.faces yedek (eski JSF sürümleri için)
        let re_javax = Regex::new(r#"name="javax\.faces\.ViewState"[^>]*value="([^"]+)""#).ok()?;
        if let Some(caps) = re_javax.captures(html) {
            return Some(caps[1].to_string());
        }

        // 5. Genel value arama (her iki namespace için CDATA)
        let re_cdata_any =
            Regex::new(r#"<update\s+id="[^"]*ViewState[^"]*">\s*<!\[CDATA\[([^\]]+)\]\]>"#).ok()?;
        if let Some(caps) = re_cdata_any.captures(html) {
            return Some(caps[1].to_string());
        }

        None
    }

    /// HTML içerisinden GÖSTER butonunun dinamik PrimeFaces ID'sini çıkarır
    fn extract_goster_button_id(html: &str) -> Option<String> {
        // Örnek: name="form:j_idt14614" ... >GÖSTER</span>
        let re =
            Regex::new(r#"name="(form:j_idt\d+)"[^>]*>[^<]*<span[^>]*>G[ÖO]STER</span>"#).ok()?;
        if let Some(caps) = re.captures(html) {
            return Some(caps[1].to_string());
        }

        // Alternatif (Unicode sorunları için): . karakteri ile G.STER
        let re2 =
            Regex::new(r#"name="(form:j_idt\d+)"[^>]*>[^<]*<span[^>]*>G.STER</span>"#).ok()?;
        if let Some(caps) = re2.captures(html) {
            return Some(caps[1].to_string());
        }

        // Alternatif id araması
        let re3 = Regex::new(r#"id="(form:j_idt\d+)"[^>]*>[^<]*<span[^>]*>G.STER</span>"#).ok()?;
        if let Some(caps) = re3.captures(html) {
            return Some(caps[1].to_string());
        }

        None
    }

    /// PrimeFaces partial-response XML'inden grafik_verisi_json çıkar
    fn parse_grafik_verisi(response: &str) -> Result<(Vec<YtbsGrafikVerisi>, String), String> {
        // PrimeFaces uzun yanıtları CDATA bloklarına bölebilir.
        // XML CDATA etiketlerini temizleyerek orijinal metni birleştiriyoruz.
        let clean_response = response
            .replace("<![CDATA[", "")
            .replace("]]>", "")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
            .replace("&quot;", "\"");

        let start_time = std::time::Instant::now();
        let marker = "var grafik_verisi_json = ";
        let mut all_data_map: std::collections::HashMap<String, YtbsGrafikVerisi> =
            std::collections::HashMap::new();

        let mut search_pos = 0;
        while let Some(start_idx) = clean_response[search_pos..].find(marker) {
            let actual_start = search_pos + start_idx;
            let json_start = clean_response[actual_start + marker.len()..].trim_start();

            if let Some(end_idx) = json_start.find("];") {
                let json_content = &json_start[..end_idx + 1];
                search_pos = actual_start + marker.len() + end_idx;

                if let Ok(batch) = serde_json::from_str::<Vec<YtbsGrafikVerisi>>(json_content) {
                    for item in batch {
                        let entry =
                            all_data_map
                                .entry(item.zaman.clone())
                                .or_insert(YtbsGrafikVerisi {
                                    zaman: item.zaman.clone(),
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
                                });

                        if item.y1.is_some() {
                            entry.y1 = item.y1;
                        }
                        if item.y2.is_some() {
                            entry.y2 = item.y2;
                        }
                        if item.y3.is_some() {
                            entry.y3 = item.y3;
                        }
                        if item.y4.is_some() {
                            entry.y4 = item.y4;
                        }
                        if item.y5.is_some() {
                            entry.y5 = item.y5;
                        }
                        if item.y6.is_some() {
                            entry.y6 = item.y6;
                        }
                        if item.y7.is_some() {
                            entry.y7 = item.y7;
                        }
                        if item.y8.is_some() {
                            entry.y8 = item.y8;
                        }
                        if item.y9.is_some() {
                            entry.y9 = item.y9;
                        }
                        if item.y10.is_some() {
                            entry.y10 = item.y10;
                        }
                        if item.y11.is_some() {
                            entry.y11 = item.y11;
                        }
                        if item.y12.is_some() {
                            entry.y12 = item.y12;
                        }
                        if item.y13.is_some() {
                            entry.y13 = item.y13;
                        }
                        if item.y14.is_some() {
                            entry.y14 = item.y14;
                        }
                        if item.y15.is_some() {
                            entry.y15 = item.y15;
                        }
                        if item.y16.is_some() {
                            entry.y16 = item.y16;
                        }
                    }
                }
            } else {
                break;
            }
        }

        let duration = start_time.elapsed();
        println!(
            ">>> [PERFORMANS] YTBS Rust Birleştirme: {} veri noktası, Süre: {:?}",
            all_data_map.len(),
            duration
        );

        if all_data_map.is_empty() {
            return Ok((vec![], "[]".to_string()));
        }

        let mut verileri: Vec<YtbsGrafikVerisi> = all_data_map.into_values().collect();
        verileri.sort_by(|a, b| a.zaman.cmp(&b.zaman));

        let merged_json = serde_json::to_string(&verileri).unwrap_or_default();
        Ok((verileri, merged_json))
    }

    fn parse_scada_grafik_verisi(response: &str) -> Result<YtbsScadaQueryResult, String> {
        let clean_response = Self::clean_jsf_response(response);
        let raw_json =
            match Self::extract_js_assignment(&clean_response, "var grafik_verisi_json = ", "];") {
                Some(json) => json,
                None => {
                    return Ok(YtbsScadaQueryResult {
                        title: "Ölçüm".to_string(),
                        unit: String::new(),
                        data: vec![],
                        raw_json: "[]".to_string(),
                    });
                }
            };

        let data = serde_json::from_str::<Vec<YtbsScadaSample>>(&raw_json)
            .map_err(|e| format!("SCADA grafik verisi parse edilemedi: {}", e))?;

        let graph_json =
            Self::extract_js_assignment(&clean_response, "var grafik_yapisi_json = ", "};")
                .unwrap_or_else(|| "{}".to_string());
        let graph = serde_json::from_str::<serde_json::Value>(&graph_json)
            .unwrap_or_else(|_| serde_json::Value::Object(Default::default()));

        let title = graph
            .get("baslik")
            .and_then(|value| value.as_str())
            .unwrap_or("Ölçüm")
            .to_string();
        let unit = graph
            .get("sorguListesi")
            .and_then(|value| value.as_array())
            .and_then(|items| items.first())
            .and_then(|item| item.get("birim"))
            .and_then(|value| value.as_str())
            .unwrap_or("")
            .to_string();

        Ok(YtbsScadaQueryResult {
            title,
            unit,
            data,
            raw_json,
        })
    }

    fn detect_mgkp_response_measurement_type(response: &str) -> Option<&'static str> {
        let clean_response = Self::clean_jsf_response(response);
        let graph_re = Regex::new(r#"(?s)var grafik_yapisi_json\s*=\s*(\{.*?\});"#).ok()?;
        let mut has_pq_schema = false;

        for caps in graph_re.captures_iter(&clean_response) {
            let Some(graph_json) = caps.get(1).map(|item| item.as_str()) else {
                continue;
            };
            let Ok(graph) = serde_json::from_str::<serde_json::Value>(graph_json) else {
                continue;
            };

            if graph
                .get("zamanCozunurlugu")
                .and_then(|value| value.as_str())
                .is_some_and(|value| value.eq_ignore_ascii_case("millisecond"))
            {
                return Some("PMU");
            }

            let fields: Vec<&str> = graph
                .get("sorguListesi")
                .and_then(|value| value.as_array())
                .map(|items| {
                    items
                        .iter()
                        .filter_map(|item| item.get("yDegerAlani").and_then(|value| value.as_str()))
                        .collect()
                })
                .unwrap_or_default();

            if fields
                .iter()
                .any(|field| matches!(*field, "y14" | "y15" | "y16"))
            {
                return Some("PMU");
            }

            if fields.iter().any(|field| {
                matches!(
                    *field,
                    "y3" | "y4" | "y5" | "y7" | "y8" | "y9" | "y11" | "y12" | "y13"
                )
            }) {
                has_pq_schema = true;
            }
        }

        has_pq_schema.then_some("PQ")
    }

    fn validate_mgkp_response_measurement_type(
        response: &str,
        requested_measurement_type: &str,
    ) -> Result<(), String> {
        let requested = if requested_measurement_type.eq_ignore_ascii_case("PMU") {
            "PMU"
        } else {
            "PQ"
        };

        let Some(actual) = Self::detect_mgkp_response_measurement_type(response) else {
            return Ok(());
        };

        if actual == requested {
            Ok(())
        } else {
            Err(format!(
                "YTBS {} grafik şeması döndürdü ancak istek {} modundaydı. Grafiklerin karışmaması için sonuç çizilmedi; lütfen sorguyu tekrar deneyin.",
                actual, requested
            ))
        }
    }

    fn parse_scada_options_from_response(response: &str) -> YtbsScadaOptions {
        let clean_response = Self::clean_jsf_response(response);
        YtbsScadaOptions {
            b1: Self::extract_select_options(&clean_response, "form:b1Id_input"),
            b2: Self::extract_select_options(&clean_response, "form:b2Id_input"),
            b3: Self::extract_select_options(&clean_response, "form:b3Id_input"),
            elements: Self::extract_select_options(&clean_response, "form:scadaId_input"),
        }
    }

    fn extract_select_options(html: &str, select_id: &str) -> Vec<YtbsSelectOption> {
        let component_id = select_id.strip_suffix("_input").unwrap_or(select_id);

        let select_pattern = format!(
            r#"(?s)<select[^>]*id="{}"[^>]*>(.*?)</select>"#,
            regex::escape(select_id)
        );
        if let Ok(select_re) = Regex::new(&select_pattern) {
            if let Some(select_caps) = select_re.captures(html) {
                let option_re =
                    Regex::new(r#"(?s)<option[^>]*value="([^"]*)"[^>]*>(.*?)</option>"#).unwrap();
                let options: Vec<YtbsSelectOption> = option_re
                    .captures_iter(&select_caps[1])
                    .filter_map(|caps| {
                        let value = Self::html_unescape(caps.get(1)?.as_str())
                            .trim()
                            .to_string();
                        let label = Self::strip_tags(caps.get(2)?.as_str());
                        let label = Self::html_unescape(&label).trim().to_string();
                        Self::non_placeholder_select_option(value, label)
                    })
                    .collect();

                if !options.is_empty() {
                    return options;
                }
            }
        }

        Self::extract_primefaces_panel_options(html, component_id)
    }

    fn extract_primefaces_panel_options(html: &str, component_id: &str) -> Vec<YtbsSelectOption> {
        let escaped_component_id = regex::escape(component_id);
        let items_pattern = format!(
            r#"(?s)<div[^>]*id="{}_items"[^>]*>(.*?)</div>"#,
            escaped_component_id
        );
        let panel_html = Regex::new(&items_pattern)
            .ok()
            .and_then(|re| re.captures(html).map(|caps| caps[1].to_string()))
            .unwrap_or_else(|| html.to_string());

        let li_re = match Regex::new(r#"(?s)<li\b([^>]*)>(.*?)</li>"#) {
            Ok(re) => re,
            Err(_) => return vec![],
        };

        li_re
            .captures_iter(&panel_html)
            .filter_map(|caps| {
                let attrs = caps.get(1)?.as_str();
                let value = Self::extract_html_attr(attrs, "data-value")?;
                let label = Self::extract_html_attr(attrs, "data-label").unwrap_or_else(|| {
                    Self::strip_tags(caps.get(2).map(|m| m.as_str()).unwrap_or(""))
                });
                Self::non_placeholder_select_option(
                    Self::html_unescape(&value).trim().to_string(),
                    Self::html_unescape(&label).trim().to_string(),
                )
            })
            .collect()
    }

    fn extract_html_attr(attrs: &str, name: &str) -> Option<String> {
        let pattern = format!(r#"{}\s*=\s*"([^"]*)""#, regex::escape(name));
        Regex::new(&pattern)
            .ok()?
            .captures(attrs)
            .and_then(|caps| caps.get(1).map(|value| value.as_str().to_string()))
    }

    fn non_placeholder_select_option(value: String, label: String) -> Option<YtbsSelectOption> {
        if value.is_empty() {
            return None;
        }

        if label.is_empty() || label.to_lowercase().contains("seçiniz") {
            return None;
        }

        Some(YtbsSelectOption { value, label })
    }

    fn extract_js_assignment(response: &str, marker: &str, ending: &str) -> Option<String> {
        let start_idx = response.find(marker)?;
        let after_marker = response[start_idx + marker.len()..].trim_start();
        let end_idx = after_marker.find(ending)?;
        let include_len = ending.len().saturating_sub(1);
        Some(after_marker[..end_idx + include_len].trim().to_string())
    }

    fn clean_jsf_response(response: &str) -> String {
        Self::html_unescape(
            &response
                .replace("<![CDATA[", "")
                .replace("]]>", "")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&quot;", "\""),
        )
    }

    fn strip_tags(text: &str) -> String {
        Regex::new(r#"(?s)<[^>]+>"#)
            .map(|re| re.replace_all(text, "").to_string())
            .unwrap_or_else(|_| text.to_string())
    }

    fn html_unescape(text: &str) -> String {
        text.replace("&quot;", "\"")
            .replace("&#34;", "\"")
            .replace("&#39;", "'")
            .replace("&apos;", "'")
            .replace("&nbsp;", " ")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&amp;", "&")
    }
}

/// Basit URL encoding (sadece kritik karakterler)
fn urlencoding_simple(s: &str) -> String {
    s.replace(' ', "+").replace(':', "%3A").replace('/', "%2F")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore = "Canlı YTBS oturumu ve 2FA gerektirir"]
    async fn ytbs_live_test() {
        let user = std::env::var("YTBS_USERNAME").expect("YTBS_USERNAME gerekli");
        let pass = std::env::var("YTBS_PASSWORD").expect("YTBS_PASSWORD gerekli");
        let kanal = std::env::var("YTBS_KANAL").unwrap_or_else(|_| "VODAFONE_FAST".to_string());

        let mut client = YtbsClient::new().unwrap();
        println!("Login deneniyor... User: {}", user);
        match client.login(&user, &pass, &kanal).await {
            Ok(_) => println!("Login basarili."),
            Err(e) => {
                println!("Login hatasi: {}", e);
                return;
            }
        }

        println!("Veri sorgulanıyor...");
        let now = chrono::Utc::now();
        let end_time = now.format("%d.%m.%Y %H:%M").to_string();
        let start_time = (now - chrono::Duration::minutes(60))
            .format("%d.%m.%Y %H:%M")
            .to_string();

        let _dashboard_html = client
            .client
            .get("https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf")
            .send()
            .await
            .unwrap()
            .text()
            .await
            .unwrap();

        client.navigate_to_mgkp().await.unwrap();
        println!("MGKP sayfasina navigate edildi.");

        let device_id = "1108";
        match client
            .query_device(device_id, "PQ", &start_time, &end_time, "", "")
            .await
        {
            Ok((data, _raw_json)) => println!("Başarılı! {} adet veri çekildi.", data.len()),
            Err(e) => println!("HATA: {}", e),
        }
    }

    #[tokio::test]
    #[ignore = "Canlı YTBS oturumu ve gerekirse SMS doğrulaması gerektirir"]
    async fn ytbs_live_scada_test() {
        let user = std::env::var("YTBS_USERNAME").expect("YTBS_USERNAME gerekli");
        let pass = std::env::var("YTBS_PASSWORD").expect("YTBS_PASSWORD gerekli");
        let kanal = std::env::var("YTBS_KANAL").unwrap_or_else(|_| "VODAFONE_FAST".to_string());

        let mut client = YtbsClient::new().unwrap();
        println!("YTBS SCADA canlı test login deneniyor...");
        let login_status = client.login(&user, &pass, &kanal).await.unwrap();
        if login_status == YtbsSessionStatus::SmsRequired {
            panic!("Canlı SCADA testi için SMS doğrulaması gerekiyor.");
        }

        client.navigate_to_scada().await.unwrap();
        let top_options = client.scada_options(None, None, None).await.unwrap();
        println!("Canlı B1 seçenek sayısı: {}", top_options.b1.len());
        assert!(
            top_options
                .b1
                .iter()
                .any(|option| option.value == "OYAK1GES"),
            "Canlı B1 seçeneklerinde OYAK1GES bulunamadı"
        );

        let cascade_options = client
            .scada_options(Some("OYAK1GES"), Some("154"), Some("BB-A"))
            .await
            .unwrap();
        println!(
            "Canlı cascade seçenekleri: B2={}, B3={}, Element={}",
            cascade_options.b2.len(),
            cascade_options.b3.len(),
            cascade_options.elements.len()
        );
        assert!(
            cascade_options
                .elements
                .iter()
                .any(|option| option.value == "c0a8cb3d-f35f-4586-b162-c1c47e7481d9"),
            "Canlı element seçeneklerinde beklenen SCADA UUID bulunamadı"
        );

        let result = client
            .query_scada(
                "16.05.2026 09:58",
                "16.05.2026 10:58",
                "OYAK1GES",
                "154",
                "BB-A",
                "c0a8cb3d-f35f-4586-b162-c1c47e7481d9",
            )
            .await
            .unwrap();
        println!(
            "Canlı SCADA sorgusu tamamlandı: {} veri noktası, başlık={}, birim={}",
            result.data.len(),
            result.title,
            result.unit
        );
        assert!(!result.data.is_empty(), "Canlı SCADA sorgusu boş döndü");
    }

    #[test]
    fn parse_grafik_verisi_treats_no_result_response_as_empty() {
        let response = r#"<?xml version='1.0' encoding='UTF-8'?>
<partial-response><changes><eval><![CDATA[PrimeFaces.showMessageInDialog({severity:"INFO 0",summary:"YTBS",detail:"Aradığınız kriterlere uygun sonuç bulunamadı. ",escape:false});;]]></eval></changes></partial-response>"#;

        let (samples, raw_json) = YtbsClient::parse_grafik_verisi(response).unwrap();

        assert!(samples.is_empty());
        assert_eq!(raw_json, "[]");
    }

    #[test]
    fn parse_grafik_verisi_merges_pmu_series_and_keeps_y16() {
        let response = r#"<?xml version='1.0' encoding='UTF-8'?>
<partial-response><changes><update id="form"><![CDATA[
<script>
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y14":-368.12,"y15":-66.01,"y16":374.11}];
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y2":405.1,"y3":406.2,"y4":404.3}];
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y5":1.1,"y6":-118.9,"y7":121.0}];
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y8":980.0,"y9":981.0,"y10":982.0}];
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y11":10.0,"y12":-110.0,"y13":130.0}];
var grafik_verisi_json = [{"zaman":"16.05.2026 22:00:02.100","y1":50.02}];
</script>
]]></update></changes></partial-response>"#;

        let (samples, raw_json) = YtbsClient::parse_grafik_verisi(response).unwrap();

        assert_eq!(samples.len(), 1);
        let sample = &samples[0];
        assert_eq!(sample.y1, Some(50.02));
        assert_eq!(sample.y2, Some(405.1));
        assert_eq!(sample.y8, Some(980.0));
        assert_eq!(sample.y14, Some(-368.12));
        assert_eq!(sample.y15, Some(-66.01));
        assert_eq!(sample.y16, Some(374.11));
        assert!(raw_json.contains("\"y16\":374.11"));
    }
}
