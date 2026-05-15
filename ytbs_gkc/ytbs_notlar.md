Yük Tevzi Bilgi Sistemi'nde (YTBS) Güç Kalitesi Cihazı (GKÇ) verileri, TÜBİTAK Milli Güç Kalitesi Projesi (MGKP) entegrasyonu kapsamında web servisler aracılığıyla çekilmektedir. Bu verilerin sorgulama kuralları, içerdiği veri türleri ve uygulanan sistem limitleri temel olarak iki ana ölçüm moduna (PQ ve PMU) ayrılmaktadır:

**1. PQ (Güç Kalitesi) Ölçümleri ve Sorgulama Limitleri**
*   **İçerdiği Veriler:** Frekans (Hz), Faz A-B-C Gerilim Büyüklüğü (kV), Faz A-B-C Akım Büyüklüğü (A), Aktif Güç (MW), Reaktif Güç (MVAr) ve Görünen Güç (MVA). Tercihen akım bilgisi üç faz toplam, gerilim bilgisi ise üç faz ortalama veya faz başına detaylı olarak alınabilir.
*   **Veri Çözünürlüğü:** 3 saniyelik çözünürlükte kaydedilir.
*   **Sorgulama Limiti:** Tek bir sorgulamada **maksimum 6 saatlik** bir zaman dilimi aralığı sorgulanabilir.

**2. PMU (Fazör Ölçüm Birimi) Ölçümleri ve Sorgulama Limitleri**
*   **İçerdiği Veriler:** PQ verilerine ek olarak gerilim ve akımın **büyüklük ve fazör (açı) ölçümleri** de alınır. İçeriğinde; Aktif/Reaktif/Görünen Güç, Faz A-B-C Gerilim Büyüklüğü, Faz A-B-C Gerilim Fazörü (°), Faz A-B-C Akım Büyüklüğü, Faz A-B-C Akım Fazörü (°) ve Frekans verileri bulunur.
*   **Veri Çözünürlüğü:** 100 milisaniyelik (çok yüksek) çözünürlükte kaydedilir.
*   **Sorgulama Limiti:** Çok yoğun bir veri akışı olduğu için tek bir sorguda **maksimum 30 dakikalık** zaman dilimi sorgulanabilmektedir.

**Sorgulama Yöntemleri ve Otomasyon Kuralları:**
*   **Manuel Sorgulama ve İndirme:** Kullanıcılar, sistem eşleme işlemleri gerçekleştirilmeden önce ham verileri ve polarizasyonları kontrol etmek için "MGKP Ölçüm Verileri Sayfası"nı kullanırlar. Sorgulanan zaman aralığındaki veriler grafiksel olarak incelenebilir ve ham veriler Excel ortamında indirilebilir.
*   **Otomatik Veri Temini (Otomasyon):** Sistem, "Anlık MGKP Verisi Temini Görevi" ile verileri otomatik olarak kendi veri tabanına kaydeder. Bu görev **her 15 dakikada bir çalışır** ve veri toplanacak andan 1 dakika sonra tetiklenir. İlgili zamanın (örneğin saat 15:00) **+/- 60 saniyelik** zaman bandı (14:59 ile 15:01 arası) sorgulanır ve dönen veriler içerisinden tam hedeflenen ana en yakın olan ölçüm kullanılarak sisteme yazılır. 
*   **ENTSO-E Hatları:** Tüm bu ölçümlere ek olarak, Türkiye şebekesinin dış bağlantılarını temsil eden ENTSO-E hatları için de özel olarak yapılandırılmış PMU ve PQ veri temin servisleri mevcuttur. Ayrıca sistem frekansı da periyodik olarak TEKİS GKÇ ölçümleri üzerinden elde edilmektedir.