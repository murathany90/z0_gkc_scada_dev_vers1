# Son Oturum Notlari

Tarih: 2026-05-16 / 2026-05-17

## 2026-05-17 Oturum Ozeti - Salinim Algilayici

Bu oturumda `ytbs_gkc/prompt.-pmu_salinim_v2.md` kapsamindaki Salinim Algilayici plani uygulandi, mock/sentetik PMU veri kullanimi kaldirildi, sayfa UI sorunlari giderildi ve Tauri/Vite ortaminda dogrulama yapildi.

### Uygulanan Ana Ozellikler

- `GKÇ Izleme > Salinim Algilayici` sayfasi yeni feature modulu olarak eklendi.
  - Ana kod alani: `gkc_scada_app/gkc-tauri/src/features/oscillation/`
  - Tipler: `types/oscillationTypes.ts`
  - Analiz ve yardimci araclar: `utils/`
  - State yonetimi: `store/oscillationStore.ts`
  - UI bilesenleri: `components/`

- Sayfa yalnizca gercek YTBS GKÇ PMU verisiyle calisacak sekilde duzenlendi.
  - Mock PMU veri uretimi yok.
  - Mock fallback yok.
  - Mock veri uzerinden analiz yok.
  - Veri yoksa veya PMU bos donerse UI bunu veri kalitesi/eksik veri bulgusu olarak gosterir.

- YTBS veri cekme akisi mevcut altyapi uzerinden kuruldu.
  - `ytbs_query_range`, `buildYtbsQueryChunks` ve `ytbsPmu.ts` mapping'i kullanilir.
  - Tekli PMU sorgusu 30 dakikalik parcalar halinde sirali calisir.
  - Coklu PMU sorgusunda PMU-1'in tum parcalari tamamlanir, sonra PMU-2'ye gecilir.
  - Paralel YTBS PMU istegi atilmaz.
  - Analiz yalnizca basariyla cekilen gercek PMU ornekleri uzerinde calisir.

- PMU mapping ve zaman hassasiyeti netlestirildi.
  - `y1`: frekans
  - `y2-y4`: gerilim genlikleri
  - `y5-y7`: gerilim acilari
  - `y8-y10`: akim genlikleri
  - `y11-y13`: akim acilari
  - `y14-y16`: guc/gorunur guc alanlari
  - `.000`, `.100`, `.900` gibi milisaniye bilgileri korunur.

- Analiz davranisi ve terminoloji guncellendi.
  - Varsayilan ana bant: `TR Inter-area / SAS Gozlem Bandi: 0.10-0.20 Hz`
  - 4.5-5.0 Hz Nyquist tampon bandi pasif.
  - 5-14 Hz torsiyonel band desteklenmiyor.
  - Sinyaller: frekans, gerilim, aktif guc, reaktif guc.
  - UI terminolojisi `Alarm` yerine `Bulgu`, `Mod`, `Siniflandirma`, `Rapor` olarak kullanilir.
  - Buyuk veri analizleri Web Worker uzerinden calisir.
  - Grafiklerde ECharts `sampling: lttb`, progressive render, zoom ve grafik disari aktarma desteklenir.
  - CSV ve yazdirilabilir rapor ciktilari sadece gercek sorgu verisinden uretilir.

### UI Inceleme ve Duzeltmeler

- `ytbs_gkc/ss1.PNG` ve `ytbs_gkc/ss2.PNG` incelendi.
- Sol sidebar'da `Salinim Algilayici` sayfa iconunun gorunmemesi duzeltildi.
  - Duzeltme: `src/App.tsx` icinde ilgili menu ogesine inline SVG icon eklendi.
- Sorgu sonrasinda `Salinim Algilayici PMU Modal Analiz ve Raporlama` filtre kartinin kaybolmasi duzeltildi.
  - Filtre karti `position: sticky`, `top: 0`, `z-index: 30`, `overflow: visible` ile sabitlendi.
  - `.card { overflow: hidden }` etkisini ezmek icin CSS sirasi ve sinifi duzenlendi.
  - Sorgu tamamlaninca ana icerik scroll pozisyonu tekrar ust kisma alinir.
- Ham PMU grafiklerinde 100 ms zaman gosterimi eklendi.
  - Tooltip ve x-ekseni milisaniye hassasiyetli formatlanir.
  - `.000/.100/.900` degerleri korunur.
  - Uzun araliklarda grafik ilk acilista son yaklasik 15 dakikayi gosterecek sekilde dataZoom baslangici hesaplanir.

### Canli Veri ve Tauri Dogrulamasi

- `.env` icindeki YTBS bilgileri kullanilarak canli backend PMU sorgusu yapildi; gizli bilgiler dokumana aktarilmadi.
- SMS dogrulamasi bu test kosusunda gerekmedi.
- Test edilen PMU olcum noktalari:
  - `285 TEMELLI, 400 kV YUNUS EMRE TES`: son 30 dakikada 18.000 parse edilmis PMU ornegi.
  - `704 YESILHISAR, 400 kV KARAPINAR MEKE GOLU`: son 30 dakikada 15.570 parse edilmis PMU ornegi.
- `npm run tauri dev` Vite'i `http://localhost:1420/` adresinde baslatti, Rust/Tauri derlemesi tamamlandi ve `target\debug\gkc-tauri.exe` calisti.
- Kodda yeni eklenen `tauri-plugin-mcp` derleme/test akisi icinde compile edildi; bu oturumdaki arac listesinde ayri `mcp-server-tauri` namespace'i bulunmadigi icin UI incelemesi Chrome DevTools MCP ile yapildi.
- UI incelemede Salinim sayfasi render'i, sidebar iconu, sticky filtre davranisi ve runtime console durumu kontrol edildi.

### Eklenen/Guncellenen Testler ve Dogrulama

- `npm run test:oscillation`
  - PMU secim validasyonu, 30 dk/31 dk/4 saat chunk davranisi, sirali coklu PMU akisi, timestamp milisaniye koruma, PMU mapping, analiz yardimcilari ve 100 ms grafik helper davranislari dogrulanir.

- `npm run test:ytbs-pmu`
  - Gercek YTBS export formatina uygun PMU parse/mapping davranisini dogrular.

- `npm run test:ui-state`
  - Tauri disi ortamda listener guard davranisi dahil UI state akisini dogrular.

- `cargo test`
  - Rust backend/Tauri testleri gecti; 17 unit test basarili, 2 canli test ignored, `test_10_fider_query` basarili.

- `npm run build`
  - Frontend production build basarili. Vite buyuk chunk uyarisi devam ediyor; derlemeyi engelleyen hata degil.

### Dikkat Edilecek Noktalar

- Salinim Algilayici icin mock fallback eklenmeyecek; veri yoksa veri yok/PMU bos dondu durumu raporlanacak.
- Canli YTBS oturumu veya SMS tamamlanamazsa canli test bloklandi olarak not edilmeli; mock ile basarili gibi isaretlenmemeli.
- `ytbs_gkc/ss1.PNG` ve `ytbs_gkc/ss2.PNG` kullanici tarafindan saglanan ekran goruntuleridir; bu oturumda duzenlenmedi.
- Mevcut git calisma agacindaki kullanici/gorev disi degisiklikler korunmustur.

## Yapilan Ana Degisiklikler

- YTBS SCADA Veri grafiginde threshold hesaplama seri bazli hale getirildi.
  - Ilk nokta atlanir.
  - Ardil analog degerler arasindaki delta ile threshold yuzdesi hesaplanir.
  - Sifir threshold hesaplari grafik, kart ve ozet istatistiklerden dislanir.
  - Threshold grafikte sag eksende nokta/seri olarak gosterilir.

- SCADA Izleme menusu altina `YTBS SCADA Veri Kalitesi Raporu` sayfasi eklendi.
  - Baslangic Zamani, Bitis Zamani ve B1 Adi filtresi var.
  - Analog SCADA adresleri listelenir.
  - Satirlar X butonu ile tablodan kaldirilabilir.
  - SORGULA kalan satirlari sirayla sorgular; her sorgu arasinda 1 saniye bekler.
  - Ilerleme bilgisi `Toplam / Yapildi / Kalan` olarak gosterilir.
  - Durum metnine tiklayinca ilgili adres `YTBS SCADA Veri` sayfasinda filtrelenerek acilir.
  - Tablo kolonlari sag scroll gerektirmeyecek sekilde daraltilmistir.
  - Veri sayisi yanina veri/dk bilgisi eklendi.

- Veri Kalitesi Raporu sorgularinin sifir donmesi icin duzeltme yapildi.
  - Sorguda SCADA adresi uzak YTBS element opsiyonlarindan cozumlenir.
  - Element eslesmesi bulunamazsa yerel katalog ID kullanilir.

- B2/B3 gerilim seviyesi ondalik hatasi duzeltildi.
  - `63 -> 6.3`
  - `105 -> 10.5`
  - `144 -> 14.4`
  - `275 -> 27.5`
  - `315 -> 31.5`
  - `336 -> 33.6`
  - `345 -> 34.5`
  - Duzeltme sadece UI etiketi degil, SCADA nokta modeli, filtre state'i, uzak opsiyon birlestirme ve sorgu parametreleri icin de uygulanir.
  - `scripts/generate_scada_points.py` da guncellendi; katalog yeniden uretilirse ayni normalizasyon korunur.

- CSV ciktilari Excel uyumu icin ASCII-guvenli hale getirildi.
  - Turkce karakterler CSV icinde ASCII karsiliklarina cevrilir.
  - Ornek: `Olcum`, `Guc`, `B1 Adi`.
  - Sayisal CSV degerlerinde ondalik ayirici virgule cevrilir.
  - CSV dosyalari BOM ve `sep=;` ile uretilir.
  - YTBS GKC, YTBS SCADA, Veri Kalitesi Raporu ve Log CSV ciktilari kapsandi.

- Veri Kalitesi Raporu PDF cikisi print-to-PDF akisi ile duzeltildi.
  - Rapor HTML'i UTF-8 meta ile uretilir.
  - Gizli iframe icinde yazdirma penceresi acilir.
  - Kullanici hedef olarak PDF kaydet secmelidir.

- CSV/PDF export islemlerinde kullanici bildirimi eklendi.
  - Ana uygulama CSV exportlarinda toast bildirimi var.
  - Veri Kalitesi Raporu CSV/PDF exportlarinda sayfa ici durum bildirimi var.

## Eklenen/Guncellenen Testler

- `npm run test:csv-format`
  - CSV ondalik virgulu, semicolon ayraci ve ASCII karakter donusumunu dogrular.

- `npm run test:scada-details`
  - B2/B3 ondalik alias normalizasyonunu ve katalogda hatali `105/63/...` degerlerinin kalmadigini dogrular.

- `npm run test:scada-quality-report`
  - Rapor filtreleme, istatistik, CSV ve print HTML uretimini dogrular.

- `npm run test:scada-threshold`
  - Threshold seri hesaplama ve sifir threshold dislama davranisini dogrular.

## Dikkat Edilecek Noktalar

- CSV icinde Turkce karakter kullanilmiyor; bu tercih Excel/kod sayfasi sorunlarini onlemek icin bilincli yapildi.
- PDF cikisi dogrudan dosya indirme degil, tarayici/Tauri yazdirma penceresi uzerinden PDF kaydetme akisi.
- Build sirasinda Vite buyuk chunk uyarisi verebilir; derlemeyi engelleyen hata degildir.
- Baslangicta `rmsStore.ts` kaynakli mevcut bir promise/console hatasi gorulebilir; bu oturumdaki SCADA/CSV/PDF degisikliginin parcasi degil.
