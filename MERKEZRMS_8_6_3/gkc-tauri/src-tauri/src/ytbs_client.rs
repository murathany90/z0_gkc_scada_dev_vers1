// GKÇ İstemci - YTBS Yedek Veri İstemcisi
// https://ytbs.teias.gov.tr/ytbs/ üzerinden MGKP ölçüm verilerini çeker
// JSF/PrimeFaces ViewState yönetimi, cookie jar ve AJAX POST ile çalışır

use crate::data_models::{RmsData, YtbsGrafikVerisi, YtbsSessionStatus};
use regex::Regex;
use reqwest::{cookie::Jar, Client};
use std::sync::Arc;

const YTBS_LOGIN_URL: &str = "https://ytbs.teias.gov.tr/ytbs/frm_login.jsf";
const YTBS_MAIN_URL: &str = "https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf";

/// YTBS web portalıyla etkileşim kuran istemci
/// Cookie jar ve ViewState token yönetimi ile JSF/PrimeFaces lifecycle'ı takip eder
pub struct YtbsClient {
    client: Client,
    view_state: Option<String>,
    goster_button_id: Option<String>,
    pub status: YtbsSessionStatus,
    pub last_activity: Option<chrono::DateTime<chrono::Utc>>,
    is_on_mgkp_page: bool,
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
            goster_button_id: None,
            status: YtbsSessionStatus::Disconnected,
            last_activity: None,
            is_on_mgkp_page: false,
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

        // 2. LOGIN FORMU HÂLÂ GÖRÜNÜYOR MU? (En kritik kontrol)
        //    Yanlış şifrede sunucu login sayfasını tekrar gösterir
        //    loginForm:btnLogin veya loginForm:username hâlâ varsa → giriş başarısız
        let login_form_still_visible = response_text.contains("loginForm:btnLogin")
            || response_text.contains("loginForm:username")
            || response_text.contains("loginForm:password");

        if login_form_still_visible {
            // Login formu hâlâ görünüyor — SMS doğrulama da login sayfasında olabilir
            // SMS kontrolü yap
            if response_text.contains("dogrulamaKodu")
                || response_text.contains("btnDogrula")
                || response_text.contains("Do\u{011f}rulama Kodu")
            {
                self.status = YtbsSessionStatus::SmsRequired;
                return Ok(YtbsSessionStatus::SmsRequired);
            }

            // SMS formu yok ama login formu görünüyor → başarısız giriş
            self.status = YtbsSessionStatus::Disconnected;
            return Err(
                "Kullanıcı adı veya şifre hatalı. Sunucu login sayfasını tekrar gösterdi.".into(),
            );
        }

        // 3. DOĞRUDAN GİRİŞ BAŞARILI: Ana sayfa öğeleri varsa (login formu yok)
        //    formMenu, idlemonitor, formTable → ana sayfadayız
        if response_text.contains("idlemonitor")
            || response_text.contains("IdleMonitor")
            || response_text.contains("formMenu")
            || response_text.contains("formTable")
            || response_text.contains("YTBSAnaSayfa")
            || response_text.contains("id=\"main\"")
        {
            self.status = YtbsSessionStatus::Connected;
            self.last_activity = Some(chrono::Utc::now());
            return Ok(YtbsSessionStatus::Connected);
        }

        // 4. TAMAMEN BELİRSİZ: Yanıt hiçbir kalıba uymuyorsa hata ver
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
        let form_params = [
            ("loginForm", "loginForm"),
            ("loginForm:dogrulamaKodu", code),
            ("loginForm:btnDogrula", ""),
            ("jakarta.faces.ViewState", view_state),
        ];

        let response = self
            .client
            .post(YTBS_LOGIN_URL)
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

        if response_text.contains("formMenu")
            || response_text.contains("YTBSAnaSayfa")
            || response_text.contains("Anasayfa")
        {
            self.status = YtbsSessionStatus::Connected;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        } else if response_text.contains("Hatalı") || response_text.contains("geçersiz") {
            Err("Doğrulama kodu geçersiz".into())
        } else {
            // Yanıt belirsiz ama devam edelim
            self.status = YtbsSessionStatus::Connected;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
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
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        } else if response_text.contains("frm_login") {
            self.status = YtbsSessionStatus::SessionExpired;
            Err("Oturum süresi dolmuş, yeniden giriş gerekli".into())
        } else {
            // Sayfa yüklendi ama MGKP teyidi yok — yine de devam et
            self.is_on_mgkp_page = true;
            self.last_activity = Some(chrono::Utc::now());
            Ok(())
        }
    }

    /// Belirli bir cihazdan tarih aralığına göre ölçüm verisi sorgula
    /// PrimeFaces AJAX POST ile "GÖSTER" butonunu simüle eder
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

        // MGKP sayfasında değilsek önce navigasyon yap
        if !self.is_on_mgkp_page {
            self.navigate_to_mgkp().await?;
        }

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
        if response_text.contains("ViewExpiredException") || response_text.contains("frm_login") {
            self.status = YtbsSessionStatus::SessionExpired;
            self.is_on_mgkp_page = false;
            return Err("Oturum süresi dolmuş".into());
        }

        // Yanıttan grafik verisi JSON'ını çıkar
        let (grafik_verileri, raw_json) = Self::parse_grafik_verisi(&response_text)?;

        self.last_activity = Some(chrono::Utc::now());

        // YtbsGrafikVerisi → RmsData dönüşümü
        let rms_data: Vec<RmsData> = grafik_verileri.iter().map(|gv| gv.to_rms_data()).collect();

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

    #[test]
    fn parse_grafik_verisi_treats_no_result_response_as_empty() {
        let response = r#"<?xml version='1.0' encoding='UTF-8'?>
<partial-response><changes><eval><![CDATA[PrimeFaces.showMessageInDialog({severity:"INFO 0",summary:"YTBS",detail:"Aradığınız kriterlere uygun sonuç bulunamadı. ",escape:false});;]]></eval></changes></partial-response>"#;

        let (samples, raw_json) = YtbsClient::parse_grafik_verisi(response).unwrap();

        assert!(samples.is_empty());
        assert_eq!(raw_json, "[]");
    }
}
