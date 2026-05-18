# SALINIM ALGILAYICI KULLANICI ARAYÜZÜ (UI/UX) DETAYLI ANALİZ RAPORU

Bu rapor, GKÇ-SCADA Veri Analiz uygulamasında yeni eklenen **Salınım Algılayıcı (Oscillation Detector)** sayfasının görsel, işlevsel ve yapısal tasarımını incelemek; arayüzdeki yerleşim hatalarını, kullanılabilirlik (UX) problemlerini ve eski ekran kalıntılarını tespit ederek iyileştirme önerileri sunmak amacıyla hazırlanmıştır.

---

## 1. GÖRSEL VE YERLEŞİM (LAYOUT) HATALARI (BUGS)

### 1.1. Kritik Hata: Butonların Ekran Dışına Taşması ve Gizlenmesi (Responsive Grid Bug)
*   **Hata Tanımı:** Filtreleme ve analiz konfigürasyon barı (`OscillationFilterBar`), CSS Grid kullanılarak 8 sütunlu tek bir satır halinde tasarlanmıştır:
    `gridTemplateColumns: '110px minmax(280px, 1.4fr) 160px 150px 150px 140px minmax(260px, 1fr) 150px'`
    Bu sütun genişliklerinin minimum toplamı **1400px** civarındadır.
*   **Etkisi:** 1536px genişliğindeki standart bir laptop ekranında veya 1366x768 gibi standart HD ekranlarda, sol menü (sidebar) alanı çıkarıldığında ana içerik genişliği ~1280px kalmaktadır. Bu durumda, grid'in 8. sütununda yer alan en kritik iki eylem butonu olan **"Veriyi Getir"** ve **"Analizi Çalıştır"** butonları **ekranın sağından tamamen taşmakta ve görünmez hale gelmektedir.** Sayfada yatay kaydırma çubuğu da bulunmadığı için kullanıcı normal ekran boyutlarında analizi asla başlatamamaktadır. Ekran çözünürlüğü ancak 1920x1080 yapıldığında bu butonlar görünür olmaktadır.
*   **Ekran Koordinat Analizi:**
    *   1536px viewport'ta `Veriyi Getir` butonu DOM ağacında hiç yer almamaktadır (veya overflow: hidden nedeniyle tamamen kesilmiştir).
    *   1920px viewport'ta ise buton `(924, 192)` piksel koordinatlarında nihayet görünür olmaktadır.

### 1.2. Eşik Girişlerinin Sıkışması ve Etiketlerin Üste Binmesi (Overlapping Labels)
*   **Hata Tanımı:** "SALINIM GENLİK EŞİKLERİ" başlığı altında yer alan 4 adet input kutusu (`Frekans mHz`, `Gerilim %`, `MW %`, `MVAr %` eşikleri) yan yana çok dar bir alana sığdırılmaya çalışılmıştır. 
*   **Etkisi:** Giriş kutularının genişliği ~40px'e kadar düşmüş, kutuların hemen altında yer alan birim etiketleri (`Frekans mHz`, `Gerilim %`, `MW %`, `MVAr %`) yatayda birbirinin üzerine binmiştir. Bu durum arayüzün okunmasını neredeyse imkansız hale getirmekte ve profesyonel olmayan bir görünüm oluşturmaktadır.

### 1.3. Zaman ve Pencere/Adım Seçimlerinin Sıkışıklığı (Cluttered Inputs)
*   **Hata Tanımı:** "BAŞLANGIÇ", "BİTİŞ" ve "PENCERE / ADIM" seçicileri grid içinde dar alanlara sıkıştırılmıştır.
*   **Etkisi:** Pencere ve Adım seçimi için kullanılan iki adet select dropdown kutusu (`120 sn` / `30 sn`) tek bir küçük hücrede yan yana bitişik durmaktadır. Aralarında hiçbir boşluk veya ayırt edici görsel sınır bulunmadığı için tek bir alanmış gibi algılanmaktadır.

### 1.4. Frekans Bantlarının Okunaksız Listelenmesi (Frequency Bands Wrapping)
*   **Hata Tanımı:** Aktif/pasif bantlar satırı (`Bantlar: 2: INTERAREA 0.1-0.4 Hz, 1: LOCAL 0.4-2 Hz...`) düz metin olarak yan yana yazılmıştır.
*   **Etkisi:** Noktalı virgüller, tireler ve frekans aralıkları düz metin içinde birbirine karışmaktadır. Ayrıca bant durumunu belirten renkli daireler (aktif için mavi/yeşil, pasif için gri) metinlerin hemen yanında düzensiz bir şekilde durmakta, satır sonuna gelen metinler kelime ortasından kırılarak alt satıra geçmektedir.

---

## 2. ESKİ EKRAN KALINTILARI VE TUTARSIZLIKLAR (REMNANTS)

### 2.1. Tauri Bağımlılığı ve Web Tarayıcısı Hataları (MCP YTBS Giriş Testi Bulguları)
*   **Hata Tanımı:** Uygulama bir standart web tarayıcısı üzerinden (localhost) çalıştırıldığında, arka planda veri çekmek için Tauri'nin IPC mekanizmasını (`window.__TAURI__.invoke`) kullanmaya çalışmaktadır.
*   **MCP Testi ve .env Kullanımı:** Özel olarak MCP (Model Context Protocol - Chrome DevTools) aracı kullanılarak `.env` dosyasındaki şifrelerle "Ayarlar" sayfasından YTBS bağlantısı test edilmiştir (`murathan.yeniceli` ve `1990MmYy.98`). Kullanıcı adı ve şifre girilip "YTBS'ye Bağlan" butonuna tıklandığında, bağlantı denemesi doğrudan `TypeError: Cannot read properties of undefined (reading 'invoke')` hatasıyla başarısız olmuştur.
*   **Etkisi:** Bu durum, sadece "Veriyi Getir" butonunun değil, aynı zamanda temel YTBS bağlantı (login) ve log mekanizmasının da tamamen Tauri masaüstü ortamına bağımlı olduğunu kanıtlamaktadır. Uygulamanın web modunda (browser tabanlı SCADA gibi) çalışırken Tauri yerine standart API fetch işlemlerine veya yerel bir mock servise düşmesini sağlayacak hiçbir akıllı kontrol (`fallback`) bulunmamaktadır. Şifreler ve kimlik bilgileri doğru olsa dahi, tarayıcı üzerinden veri çekmek imkansızdır.

### 2.2. Arayüz Bileşenlerinin İsimlendirme Tutarsızlıkları
*   **Hata Tanımı:** Sayfanın sol üst köşesindeki ana başlıkta "Salınım Algılayıcı — PMU Modal Analiz ve Raporlama" yazarken, hemen altında küçük gri harflerle "Gerçek YTBS PMU verisi" ifadesi yer almaktadır. Ancak veri bulunmadığında alt kartlarda "Gerçek YTBS PMU verisi bekleniyor. Veri yoksa analiz veya demo grafik üretilmez." uyarısı çıkmaktadır.
*   **Etkisi:** YTBS ekranlarında görmeye alışık olduğumuz bu statik uyarılar (kopyala/yapıştır kalıntıları), kullanıcıya uygulamanın bir veri akışına bağlı olup olmadığını net olarak açıklayamamaktadır. "Gerçek Örnek: 0" statik etiketi, herhangi bir dinamik yükleme durumunda güncellense bile başlangıçta anlamsız bir sıfır değeriyle kötü bir ilk izlenim bırakmaktadır.

### 2.3. Grafik Boşlukları ve Stil Yoksunluğu
*   **Hata Tanımı:** Analiz sonucu henüz üretilmemişken gösterilen "Mod ve DR grafiği için analiz sonucu yok." ve "Enerji ve genlik grafiği için analiz sonucu yok." alanları, arka planı koyu gri olan düz boş kutulardan ibarettir.
*   **Etkisi:** Bu kutular modern bir "Boş Durum" (Empty State) tasarımı içermemektedir. Kullanıcıya sistemi nasıl çalıştıracağına dair rehberlik eden bir ikon veya yönlendirme metni bulunmamaktadır.

---

## 3. UI/UX GELİŞTİRME VE MODERNİZASYON ÖNERİLERİ

### 3.1. Filtre Barının İki Satırlı Yapıya Dönüştürülmesi (Refactoring the Filter Bar)
Mevcut sıkışıklığı gidermek ve butonları tüm ekran çözünürlüklerinde görünür kılmak için tek satırlık grid yapısından vazgeçilmeli ve filtre barı **iki satıra** veya **sol-sağ yerleşimli kart yapısına** bölünmelidir:
*   **Satır 1 (Seçimler ve Zaman):**
    *   `SEÇİM MODU` | `PMU GKÇ FİDERLERİ` | `REFERANS PMU` | `BAŞLANGIÇ` | `BİTİŞ`
*   **Satır 2 (Parametreler ve Eylemler):**
    *   `PENCERE / ADIM` (Daha geniş select kutuları)
    *   `SALINIM GENLİK EŞİKLERİ` (Giriş kutuları dikey etiket-input çiftleri halinde alt alta yerleştirilerek genişletilmeli)
    *   `SİNYALLER` (Checkbox grubu daha düzenli bir hizalamaya kavuşturulmalı)
*   **Eylem Butonları Konumu:** "Veriyi Getir" ve "Analizi Çalıştır" butonları, 2. satırın en sağında, belirgin boyutlarda ve kontrastı yüksek renklerle konumlandırılmalıdır.

### 3.2. Frekans Bantlarının "Badge" Yapısına Dönüştürülmesi
Düz metin halinde sıralanan bantlar, modern UI tasarımına uygun şekilde **renkli hap (badge)** veya **kart bileşenleri** halinde gösterilmelidir:
*   Her bir bant (Interarea, Local, Forced, Torsion) için durumuna göre (aktif: yeşil/mavi, pasif: gri) renk alan küçük kartçıklar yapılmalı.
*   Bant adları, frekans aralıkları ve aktiflik durumları bu kartçıkların içinde hiyerarşik ve okunaklı şekilde sergilenmelidir.

### 3.3. Çevrimdışı/Web Modu İçin Demo Veri Desteği (Demo Mode Toggle)
Uygulama Tauri dışındaki standart bir web tarayıcısında çalışırken Tauri IPC bağlantısı kuramadığı için:
*   Filtre barına belirgin bir **"Demo Verisi Yükle"** (Load Mock Data) butonu eklenmelidir.
*   Bu buton tıklandığında, `scripts/oscillation.test.ts` içindeki `gkc1.txt` veya benzeri statik salınım örnek verilerini doğrudan `rawSamples` store durumuna yüklemeli, böylece kullanıcının tarayıcı üzerinden bile tüm grafikleri, analiz sonuçlarını ve rapor modüllerini anında test etmesi sağlanmalıdır.

### 3.4. Profesyonel Boş Durum (Empty State) Tasarımları
Analiz yapılmamış grafik alanlarındaki düz gri kutular yerine:
*   Merkezinde hafif silik bir **sinyal/dalga boyu ikonu** yer alan,
*   "Analiz çalıştırılmadı. Başlamak için yukarıdaki filtreleri ayarlayın ve 'Veriyi Getir' ardından 'Analizi Çalıştır' butonuna tıklayın." veya "Demo Verisi Yükleyin" yönlendirmesi içeren modern grafik iskelet tasarımları (skeleton placeholders) kullanılmalıdır.

---

### ÖZET VE AKSİYON PLANI

1.  **Öncelik 1 (Kritik Arayüz Düzeltmesi):** `OscillationFilterBar.tsx` içerisindeki grid layout'unun genişliği acilen responsive hale getirilerek butonların 1536px ve altındaki tüm çözünürlüklerde ekranda kalması sağlanmalıdır.
2.  **Öncelik 2 (Çalıştırılabilirlik):** Tarayıcı üzerinde Tauri IPC çökmelerini engellemek amacıyla bir `window.__TAURI__` kontrolü eklenerek, Tauri bulunamadığında kullanıcıyı uyaran veya otomatik olarak demo moduna geçişi öneren bir mekanizma kurulmalıdır.
3.  **Öncelik 3 (Görsel İyileştirme):** Birim etiketlerinin üste binme problemi input genişlikleri ve marjinleri artırılarak çözülmeli, frekans bantları badge kartları halinde tasarlanmalıdır.
