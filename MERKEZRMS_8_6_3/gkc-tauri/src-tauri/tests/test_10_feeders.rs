use chrono::{Duration, Local};
use gkc_tauri_lib::ytbs_client::YtbsClient;
use std::fs;

#[tokio::test]
async fn test_10_fider_query() -> Result<(), Box<dyn std::error::Error>> {
    // .env dosyasından satır satır okuyalım
    let env_content = fs::read_to_string("../.env").unwrap_or_default();
    let mut username = String::new();
    let mut password = String::new();
    let mut kanal = "EPOSTA".to_string();

    for line in env_content.lines() {
        if line.starts_with("YTBS_USERNAME=") {
            username = line.trim_start_matches("YTBS_USERNAME=").to_string();
        } else if line.starts_with("YTBS_PASSWORD=") {
            password = line.trim_start_matches("YTBS_PASSWORD=").to_string();
        } else if line.starts_with("YTBS_KANAL=") {
            kanal = line.trim_start_matches("YTBS_KANAL=").to_string();
        }
    }

    if username.is_empty() || password.is_empty() {
        panic!("YTBS_USERNAME veya YTBS_PASSWORD .env içinde bulunamadı");
    }

    println!("YTBS Test Senaryosu Başlatılıyor...");
    println!("1. YTBS Login işlemi yapılıyor...");

    let mut client = YtbsClient::new().expect("YtbsClient oluşturulamadı");
    client.login(&username, &password, &kanal).await?;
    println!("-> Login başarılı!");

    let now = Local::now();
    let start = now - Duration::hours(1);
    let start_str = start.format("%d.%m.%Y %H:%M").to_string();
    let end_str = now.format("%d.%m.%Y %H:%M").to_string();

    println!("2. Zaman Aralığı: {} - {}", start_str, end_str);
    println!("3. 10 Farklı GKÇ Fideri için Sorgu Başlatılıyor...\n");

    // Rastgele bilinen bazı test cihaz ID'leri (MGKP'de bulunan ID'ler tahmin veya sıralı test ediliyor)
    // Eğer bir ID yoksa Hata döndürür, varsa RmsData döndürür.
    // Başarılı olan 10 cihaz sayacağız.
    let mut basarili_sorgular = 0;

    // 380'den başlayıp 450'ye kadar deneyelim, ilk 10 başarılıyı bulalım
    for test_id in 380..450 {
        if basarili_sorgular >= 10 {
            break;
        }

        let device_id = test_id.to_string();
        print!("Cihaz ID {} sorgulanıyor... ", device_id);

        match client
            .query_device(&device_id, "PQ", &start_str, &end_str, "", "1")
            .await
        {
            Ok((data, _raw_json)) => {
                if !data.is_empty() {
                    println!("BAŞARILI! ({} adet veri noktası okundu)", data.len());
                    basarili_sorgular += 1;
                } else {
                    println!("BAŞARILI ama BOŞ veri döndü.");
                }
            }
            Err(e) => {
                println!("HATA: {}", e);
            }
        }
    }

    println!(
        "\nTest Tamamlandı! Toplam başarılı fider sorgusu: {}",
        basarili_sorgular
    );

    Ok(())
}
