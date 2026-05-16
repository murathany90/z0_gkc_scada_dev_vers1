# Son Oturum Notlari

Tarih: 2026-05-16

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
