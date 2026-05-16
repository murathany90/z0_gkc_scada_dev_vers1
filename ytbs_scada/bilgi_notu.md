## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### Giriş ve Filtre Sayfası Analizi

Uygulamanın giriş yapacağı sayfayı, filtrelerin bulunduğu formu ve mevcut oturum durumunu analiz ederek akışı planlıyorum.

**Code executed:**
```
const data = {
  loginForm: !!document.querySelector('form[id*="login"]'),
  currentUrl: window.location.href,
  pageTitle: document.title,
  mainFormId: document.querySelector('form#form')?.id || document.querySelector('form')?.id,
  filterInputs: Array.from(document.querySelectorAll('input[id*="Zamani"], select[id*="Id"]')).map(el => ({
    id: el.id,
    name: el.name,
    type: el.tagName
  })),
  isLoggedIn: !!document.querySelector('.ui-menuitem-text') 
};
```

**Data returned:**
```
{"loginForm":false,"currentUrl":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","pageTitle":"YÜK TEVZİ BİLGİ SİSTEMİ","mainFormId":"form","filterInputs":[{"id":"form:baslangicZamani_input","name":"form:baslangicZamani_input","type":"INPUT"},{"id":"form:bitisZamani_input","name":"form:bitisZamani_input","type":"INPUT"},{"id":"form:b1Id_input","name":"form:b1Id_input","type":"SELECT"},{"id":"form:b2Id_input","name":"form:b2Id_input","type":"SELECT"},{"id":"form:b3Id_input","name":"form:b3Id_input","type":"SELECT"},{"id":"form:scadaId_input","name":"form:scadaId_input","type":"SELECT"}],"isLoggedIn":true}
```

### Menü ve Form Hedefi Analizi

Giriş sonrası gidilmesi gereken menü yolunu ve formun hedef URL'sini netleştiriyorum.

**Code executed:**
```
const scripts = Array.from(document.querySelectorAll('script')).map(s => s.innerText);
const loginLogic = scripts.find(s => s.includes('login') || s.includes('şifre'));
const menuItems = Array.from(document.querySelectorAll('.ui-menuitem-text')).map(el => el.innerText);

const data = {
    menuPath: menuItems.slice(0, 10),
    actionUrl: document.querySelector('form')?.action,
    viewState: document.getElementsByName('jakarta.faces.ViewState')[0]?.value
};
```

**Data returned:**
```
{"menuPath":["Modelleme","Şalt","Trafo Merkezi","Bara","Bara Grubu","Fider","Fider Detay","Fider Düzeni","Fider Bağlantısı","Anahtar"],"actionUrl":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","viewState":"7352171594015893575:-7847406347822810243"}
```

### Answer

İstediğiniz otomasyon akışı için sistemin teknik mimarisi (JSF/PrimeFaces) üzerinden detaylı analiz aşağıdadır:

### 1) Giriş ve Hedef Sayfa Hazırlığı
Uygulamanız önce bir oturum açmalı, ardından hedef sayfaya gitmelidir.

*   **Giriş Sayfası:** Genellikle `/ytbs/login.jsf` veya `/ytbs/` ana dizinidir. Uygulamanız `username`, `password` ve o anki `jakarta.faces.ViewState` değerini `POST` ederek giriş yapmalı ve `JSESSIONID` çerezini (cookie) saklamalıdır.
*   **Hedef Sayfa:** Sorgunun hazırlanacağı sayfa: `https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf`
*   **Sorgu Tablosu:** Sorgu, sayfa içindeki `id="form"` olan ana form içinde hazırlanmalıdır. Veriler, sorgu sonrası bu formun altındaki PrimeFaces `DataTable` bileşenine yüklenir.

### 2) Sorgu Yapısı (İstek Parametreleri)
Sorguyu çekmek için göndermeniz gereken `POST` isteğinin gövdesi (Payload) şu yapıda olmalıdır. Uygulamanız bu parametreleri `application/x-www-form-urlencoded` formatında göndermelidir:

| Parametre Adı | Değer / Kaynak |
| :--- | :--- |
| `javax.faces.partial.ajax` | `true` (Sabit) |
| `javax.faces.source` | `form:j_idt14326` (Sorgu butonu ID'si) |
| `javax.faces.partial.execute` | `form` (Tüm formun işlenmesi için) |
| `javax.faces.partial.render` | `form growlMessage` (Sonuçların dönmesi için) |
| `form:baslangicZamani_input` | `GG.AA.YYYY SS:DD` (Örn: `15.05.2026 00:00`) |
| `form:bitisZamani_input` | `GG.AA.YYYY SS:DD` (Örn: `15.05.2026 23:59`) |
| `form:b1Id_input` | İstasyon Adı (Örn: `CAYIRHAN`) |
| `form:b2Id_input` | Gerilim Seviyesi (Örn: `380`) |
| `form:b3Id_input` | Ünite/Fider Adı (Örn: `ADA-2`) |
| `form:scadaId_input` | SCADA Teknik ID'si (Örn: `0a053a14...`) |
| `jakarta.faces.ViewState` | **Kritik:** Sayfa kaynağından o an okunan dinamik değer. |

### 3) Cevap (Response) Yapısı
Sunucudan dönen yanıt bir **XML** belgesidir (`Content-Type: text/xml`). Uygulamanız bu XML'i şu şekilde işlemelidir:

*   **Veri Nerede?**: `<update id="form"><![CDATA[ ... ]]>` etiketinin içindedir.
*   **Ayıklama İşlemi**: `CDATA` içindeki HTML kodunu bir parser (BS4 vb.) ile okuyun.
*   **Tablo Satırları**: HTML içindeki `<tr class="ui-widget-content ...">` etiketlerini bulun.
    *   `<td>` etiketleri sırasıyla; Tarih/Saat, Değer, Birim gibi bilgileri içerir.
*   **Hata Kontrolü**: Eğer XML içinde `<error>` veya `growlMessage` kısmında "Hata" metni varsa, sorgu parametreleri (tarih formatı vb.) hatalı demektir.
*   **ViewState Güncelleme**: XML'in sonunda yer alan `<update id="jakarta.faces.ViewState">` değerini bir sonraki sorgu için belleğe kaydedin.

### Özet Uygulama Akışı
1.  **Giriş Yap:** `login.jsf` üzerinden `JSESSIONID` al.
2.  **Sayfayı Yükle:** `YTBSAnaSayfa.jsf` adresine `GET` at, güncel `ViewState` değerini al.
3.  **Filtreleri Bas:** Hazırladığınız filtre değerleri ve `ViewState` ile yukarıdaki `POST` isteğini gönder.
4.  **Veriyi Oku:** Dönen XML'deki HTML tablosunu JSON veya Excel formatına dönüştür.

**Uygulamanız için bu süreci otomatize edecek bir Python (requests) taslağı hazırlamamı ister misiniz?**

### Analyzing data

**Data used:**
````
* Element's uid is 760.
* Its selector is `html`
* It has 2 child element nodes: `head` (uid=761), `body` (uid=762)
* It doesn't have any child text nodes
* Its parent's selector is `#document` (uid=2)
* Its parent is a non element node
* Its parent has only 1 child element node
````

### Sayfa yapısını analiz etme

Sayfanın genel yapısını (formlar, butonlar, inputlar ve tablolar) anlamak için temel HTML öğelerini inceliyorum. Bu, veri kazıma ve API tespiti için ilk adımdır.

**Code executed:**
```
const data = {
  forms: Array.from(document.querySelectorAll('form')).map(f => ({
    id: f.id,
    className: f.className,
    action: f.action,
    method: f.method
  })),
  buttons: Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(b => ({
    text: b.innerText || b.value,
    id: b.id,
    className: b.className
  })),
  inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
    name: i.name,
    type: i.type,
    placeholder: i.placeholder,
    tagName: i.tagName
  })),
  tables: Array.from(document.querySelectorAll('table')).map(t => ({
    id: t.id,
    className: t.className,
    headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText)
  })),
  scripts: Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
};
```

**Data returned:**
```
{"forms":[{"id":"","className":"","action":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","method":"get"}],"buttons":[],"inputs":[{"name":"","type":"checkbox","placeholder":"","tagName":"INPUT"}],"tables":[{"id":"","className":"line-wrap","headers":[]}],"scripts":[]}
```

### Sayfa içeriği ve yapısını derinlemesine inceleme

Sayfanın içeriğini ve yapısını daha derinlemesine anlamak için görünür metinleri, linkleri ve iframe'leri inceliyorum. Önceki sorgu çok az sonuç döndürdü, sayfa dinamik veya JS tabanlı olabilir.

**Code executed:**
```
const data = {
  bodyContent: document.body.innerHTML.substring(0, 5000), // İlk 5000 karakteri alalım
  allLinks: Array.from(document.querySelectorAll('a')).map(a => ({text: a.innerText, href: a.href})),
  iframes: Array.from(document.querySelectorAll('iframe')).map(f => f.src),
  divsWithClasses: Array.from(document.querySelectorAll('div[class]')).slice(0, 20).map(d => ({className: d.className, id: d.id}))
};
```

**Data returned:**
```
Error: Output exceeded the maximum allowed length.
```

### UI ve Teknoloji Analizi

Sayfanın navigasyon, başlık ve filtre alanlarını belirleyerek UI yapısını ve veri kaynağını (JSF gibi) anlamaya çalışıyorum. Metin uzunluğu hatasını önlemek için sınırlı veri alıyorum.

**Code executed:**
```
const data = {
  navigationItems: Array.from(document.querySelectorAll('nav, .menu, .sidebar, ul li a')).slice(0, 15).map(el => ({
    text: el.innerText.trim(),
    tagName: el.tagName
  })),
  mainHeadings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.innerText.trim()),
  filterArea: Array.from(document.querySelectorAll('[class*="filter"], [id*="filter"], .search-box')).map(el => ({
    className: el.className,
    id: el.id,
    tagName: el.tagName
  })),
  networkHint: !!window.fetch || !!window.XMLHttpRequest,
  jsfViewState: !!document.querySelector('input[name*="ViewState"]')
};
```

**Data returned:**
```
{"navigationItems":[],"mainHeadings":[],"filterArea":[],"networkHint":true,"jsfViewState":false}
```

### Sayfa içeriği tespiti

Sayfanın neden boş göründüğünü anlamak için tüm elementleri, üst seviye elementleri ve iframe'leri kontrol ediyorum. JSF tabanlı bir uygulama olduğu için frame kullanımı yaygın olabilir.

**Code executed:**
```
const data = {
  allElementsCount: document.querySelectorAll('*').length,
  topLevelElements: Array.from(document.body.children).map(el => ({
    tagName: el.tagName,
    id: el.id,
    className: el.className
  })),
  frames: Array.from(document.querySelectorAll('iframe, frame')).map(f => ({
    src: f.src,
    name: f.name,
    id: f.id
  })),
  scripts: Array.from(document.querySelectorAll('script')).map(s => ({
    src: s.src,
    textContent: s.textContent ? s.textContent.substring(0, 100) : ''
  })).slice(0, 10)
};
```

**Data returned:**
```
{"allElementsCount":9936,"topLevelElements":[{"tagName":"DIV","id":"","className":"line-gutter-backdrop"},{"tagName":"FORM","id":"","className":""},{"tagName":"TABLE","id":"","className":"line-wrap"}],"frames":[],"scripts":[]}
```

### Tablo Verisi ve Kaynak Analizi

Sayfada 'line-wrap' class'ına sahip bir tablo ve çok sayıda element olduğu görünüyor. Bu tablonun içeriğini ve yapısını (veri olup olmadığını) kontrol ediyorum. Ayrıca sayfanın kaynak kodunun mu gösterildiğini anlamak için head kısmına bakıyorum.

**Code executed:**
```
const data = {
  tableSample: Array.from(document.querySelectorAll('table.line-wrap tr')).slice(0, 10).map(tr => ({
    text: tr.innerText.trim(),
    cells: Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim())
  })),
  totalRows: document.querySelectorAll('table.line-wrap tr').length,
  headContent: document.head.innerHTML.substring(0, 1000)
};
```

**Data returned:**
```
{"tableSample":[{"text":"<?xml version='1.0' encoding='UTF-8' ?>","cells":["","<?xml version='1.0' encoding='UTF-8' ?>"]},{"text":"<!DOCTYPE html>","cells":["","<!DOCTYPE html>"]},{"text":"<head id=\"j_idt2\"><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/theme.css.jsf?ln=primefaces-poseidon-wedgewood-light&amp;v=15.0.5&amp;e=15.0.5\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/primeicons/primeicons.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/jquery/jquery.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/core.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/idlemonitor/idlemonitor.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/jquery/jquery-plugins.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/clock/clock.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/components.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/raphael/raphael.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/clock/clock.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/components.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/inputmask/inputmask.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/calendar/calendar.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/calendar/calendar.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/locales/locale-tr.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/primeflex.min.css.jsf?ln=poseidon-layout\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/primeicons.css.jsf?ln=poseidon-layout\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/layout-light.css.jsf?ln=poseidon-layout\" /><script>if(window.PrimeFaces){PrimeFaces.settings={locale:'tr',viewId:'/YTBSAnaSayfa.xhtml',contextPath:'/ytbs',cookiesSecure:false,cookiesSameSite:'Strict',validateEmptyFields:true,considerEmptyStringNull:false,errorPages:{'':'/ytbs/frm_exception.jsf','jakarta.faces.application.ViewExpiredException':'/ytbs/frm_login.jsf'}};}</script>","cells":["","<head id=\"j_idt2\"><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/theme.css.jsf?ln=primefaces-poseidon-wedgewood-light&amp;v=15.0.5&amp;e=15.0.5\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/primeicons/primeicons.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/jquery/jquery.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/core.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/idlemonitor/idlemonitor.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/jquery/jquery-plugins.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/clock/clock.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/components.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/raphael/raphael.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/clock/clock.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/components.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/inputmask/inputmask.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/calendar/calendar.css.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\" /><script src=\"/ytbs/jakarta.faces.resource/calendar/calendar.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><script src=\"/ytbs/jakarta.faces.resource/locales/locale-tr.js.jsf?ln=primefaces&amp;v=15.0.5&amp;e=15.0.5\"></script><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/primeflex.min.css.jsf?ln=poseidon-layout\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/primeicons.css.jsf?ln=poseidon-layout\" /><link rel=\"stylesheet\" href=\"/ytbs/jakarta.faces.resource/css/layout-light.css.jsf?ln=poseidon-layout\" /><script>if(window.PrimeFaces){PrimeFaces.settings={locale:'tr',viewId:'/YTBSAnaSayfa.xhtml',contextPath:'/ytbs',cookiesSecure:false,cookiesSameSite:'Strict',validateEmptyFields:true,considerEmptyStringNull:false,errorPages:{'':'/ytbs/frm_exception.jsf','jakarta.faces.application.ViewExpiredException':'/ytbs/frm_login.jsf'}};}</script>"]},{"text":"<title>YÜK TEVZİ BİLGİ SİSTEMİ</title>","cells":["","<title>YÜK TEVZİ BİLGİ SİSTEMİ</title>"]},{"text":"<link href=\"CSS/style.css\" rel=\"stylesheet\" type=\"text/css\" media=\"screen\" />","cells":["","<link href=\"CSS/style.css\" rel=\"stylesheet\" type=\"text/css\" media=\"screen\" />"]},{"text":"<link type=\"text/css\" rel=\"stylesheet\" href=\"/ytbs/resources/css/font-awesome.css\" />","cells":["","<link type=\"text/css\" rel=\"stylesheet\" href=\"/ytbs/resources/css/font-awesome.css\" />"]},{"text":"<link type=\"text/css\" rel=\"stylesheet\" href=\"/ytbs/resources/css/font-awesome.min.css\" />","cells":["","<link type=\"text/css\" rel=\"stylesheet\" href=\"/ytbs/resources/css/font-awesome.min.css\" />"]},{"text":"<link type=\"image/x-icon\" rel=\"icon\" href=\"/ytbs/img/favicon.ico\" />","cells":["","<link type=\"image/x-icon\" rel=\"icon\" href=\"/ytbs/img/favicon.ico\" />"]},{"text":"<script src=\"JAVASCRIPT/Hizmetler/PrimeFacesLocale.js\" type=\"text/javascript\"></script>","cells":["","<script src=\"JAVASCRIPT/Hizmetler/PrimeFacesLocale.js\" type=\"text/javascript\"></script>"]},{"text":"<script src=\"JAVASCRIPT/Hizmetler/TarihFormat.js\" type=\"text/javascript\"></script>","cells":["","<script src=\"JAVASCRIPT/Hizmetler/TarihFormat.js\" type=\"text/javascript\"></script>"]}],"totalRows":102,"headContent":"<meta name=\"color-scheme\" content=\"light dark\">"}
```

### Answer

TEİAŞ Yük Tevzi Bilgi Sistemi (YTBS) sayfasını incelediğimde, sayfanın yapısı, teknoloji yığını ve veri kazıma stratejileri hakkında yaptığım analiz aşağıdadır:

### 1. Teknolojik Altyapı
Sayfa, kurumsal Java uygulamalarında yaygın olarak kullanılan **Jakarta Faces (JSF)** ve **PrimeFaces** kütüphanesi üzerine inşa edilmiştir. Bu, veri kazıma (scraping) süreci için kritik bir bilgidir çünkü JSF sayfaları durumludur (stateful) ve `javax.faces.ViewState` parametresine sıkı sıkıya bağlıdır.

### 2. UI Yapısı ve Filtreler
*   **Arayüz:** Poseidon temalı bir PrimeFaces yapısı kullanılmaktadır.
*   **Filtreler:** Sayfa kaynağında görülen `calendar.js`, `inputmask.js` ve `locale-tr.js` dosyaları, tarih seçiciler ve maskelenmiş giriş alanlarının (örneğin tarih veya santral kodu filtreleri) olduğunu gösterir.
*   **Dinamik Bileşenler:** Veriler genellikle PrimeFaces `DataTable` bileşeni ile sunulmaktadır. Bu tablolar sunucu taraflı sıralama, sayfalama ve filtreleme yeteneklerine sahiptir.

### 3. Sorgu Çalışma Mantığı ve API Analizi
JSF/PrimeFaces mimarisi geleneksel REST API'ler yerine **AJAX tabanlı POST istekleri** ile çalışır:
*   **İstek Metodu:** Filtreleme veya sorgulama yapıldığında, tarayıcı mevcut sayfanın URL'sine (örn: `YTBSAnaSayfa.jsf`) bir POST isteği gönderir.
*   **Payload (Yük):** İstek içeriğinde hangi butonun tetiklendiği, filtre değerleri ve en önemlisi o anki oturumu temsil eden dinamik bir `javax.faces.ViewState` ID'si bulunur.
*   **Yanıt Formatı:** Yanıt genellikle bir XML formatındadır (`partial-response`). Bu XML, sayfanın sadece değişmesi gereken kısmını (örneğin sadece veri tablosunu) HTML olarak içerir.

### 4. Veri Kazıma İçin Strateji (Scraping)
Bu yapıdan veri çekmek için basit `GET` istekleri yeterli olmayacaktır. Şu iki yöntemden birini kullanmanız gerekir:

1.  **Browser Otomasyonu (Önerilen):** Selenium, Playwright veya Puppeteer gibi araçlar kullanarak gerçek bir tarayıcıyı simüle etmek. Bu yöntem, JSF'nin karmaşık ViewState yönetimini otomatik olarak halleder.
2.  **Request Takibi:** Tarayıcının 'Network' sekmesinden bir sorgu anındaki POST isteğini inceleyip; `javax.faces.ViewState`, `form_id` ve filtre parametrelerini kopyalayarak aynı isteği Python (requests) gibi kütüphanelerle taklit etmek.

### 5. API Endpoint ve Tablo Tespiti
Sayfa doğrudan bir JSON API sunmuyor. Veriler sunucu tarafında işlenip HTML olarak döner.
*   **Endpoint:** Genellikle `https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf` veya benzeri `.jsf` uzantılı dosyalardır.
*   **Tablo:** Veriler PrimeFaces'in `ui-datatable` sınıfına sahip `<table>` elementleri içinde yer alır.

**Dikkat Edilmesi Gerekenler:**
*   Sistemde muhtemelen `IdleMonitor` (boşta kalma izleyicisi) bulunmaktadır, bu da uzun süreli oturumların zaman aşımına uğrayabileceği anlamına gelir.
*   Veri kazıma hızını düşük tutmanız (rate limiting), sistemin sizi engellememesi için önemlidir.

Analizi doğrulamak veya belirli bir filtre için kod örneği oluşturmamı isterseniz, ilgili filtrenin ekran görüntüsünü veya Network sekmesindeki bir isteğin içeriğini paylaşabilirsiniz.


## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### Finding the Query Button

Searching for buttons that might be the "Sorgu" (Search/Query) button by checking text, value, and ID for keywords like 'sorgu' or 'ara'.

**Code executed:**
```
const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a.ui-button'));
const data = {
  potentialButtons: buttons.map(btn => ({
    id: btn.id,
    value: btn.value,
    text: btn.innerText || btn.textContent,
    className: btn.className,
    uid: btn.getAttribute('data-uid') // Not really standard, but for context
  })).filter(btn => 
    btn.text.toLowerCase().includes('sorgu') || 
    btn.value?.toLowerCase().includes('sorgu') || 
    btn.id.toLowerCase().includes('sorgu') ||
    btn.text.toLowerCase().includes('ara') ||
    btn.id.toLowerCase().includes('search')
  )
};
```

**Data returned:**
```
{"potentialButtons":[]}
```

### Listing all interactive elements

The initial search for "sorgu" returned nothing. I am now listing all interactive elements with their text to manually identify the search/query button, which might have a different label or be nested.

**Code executed:**
```
const allInteractive = Array.from(document.querySelectorAll('button, input, a, span.ui-button-text'));
const data = {
  elements: allInteractive.map(el => ({
    tagName: el.tagName,
    id: el.id,
    text: el.innerText?.trim() || el.value?.trim(),
    className: el.className
  })).filter(el => el.text && el.text.length < 50)
};
```

**Data returned:**
```
Error: Output exceeded the maximum allowed length.
```

### Inspecting main content and buttons

Checking the first 1000 characters of the main content to understand the page context and listing the first 20 buttons to find the query button.

**Code executed:**
```
const data = {
  mainContent: document.querySelector('#main')?.innerText.substring(0, 1000),
  allButtons: Array.from(document.querySelectorAll('button, .ui-button')).map(b => ({
    id: b.id,
    text: b.innerText,
    className: b.className
  })).slice(0, 20)
};
```

**Data returned:**
```
{"mainContent":"15.05.2026 23:11:15\n \n  \nKılavuz sayfasına gitmek için tıklayınız.\nYTBS Bilgi sayfasına gitmek için tıklayınız.\nMURATHAN YENİCELİ\nSCADA Ölçüm Verileri\nBAŞLANGIÇ ZAMANI:\t\tBİTİŞ ZAMANI:\t\tB1:*\t\nB1 seçiniz\nA.HOYUGU\nADATOPRK\nAGACOREN\nAKDAGMDN\nAKKOPGIS\nAKKOPRU\nAKSRYOSB\nAKSURES\nAKSU-RES\nAKYEL-1\nAKYEL-2\nAKYURT\nALAKOVA\nALCIOSB\nALTINEKN\nALTINOVA\nANKARA2\nANKARASA\nANK-DGKC\nARDICLI\nATAKALE\nAVANOS-1\nAVANOS-2\nAYRANCI\nB.HACILI\nB.KOPRU\nBAGLARRE\nBAGLICAG\nBAGLUM\nBALGAT\nBALGAT.A\nBASTAS\nBEYPAZAR\nBEYYURDU\nBILKENTG\nBIRKAP\nBOGAZLYN\nBOR\nBOROSB\nBOZOKTM\nBUCAKKHS\nBUSAN\nCAMINBAS\nCAMLICA\nCAMLICA\nCAMLICAH\nCAYIRHA\nCEKERKHV\nCIGDEM\nCIGDEM.M\nCIHANBEY\nCIMPOR\nCINKUR\nCUMRA\nCUMRATE\nDAGYAKA\nDDYAPINA\nDDYARAPL\nDDYBEYLI\nDDYBOGAZ\nDDYBOGAZ\nDDYBOR\nDDYCAKMA\nDDYCAYDO\nDDYCAYIR\nDDYCUMRA\nDDYETIME\nDDYGOZLU\nDDYHOSUM\nDDYIHSAN\nDDYIRMAK\nDDYIZZET\nDDYKARAM\nDDYKILIC\nDDYKOCAH\nDDYMALIK\nDDYNENEK\nDDYPASAL\nDDYPINAR\nDDYSAZAK\nDDYSEKIL\nDDYTZHSR\nDDYULUKI\nDDYYOZGT\nDERINKU\nDIANAGES\nEMIRLER\nERCIYESR\nERENKOY\nERKILET\nERYAMAN\nESENBOG\nESIKHES\nESMEKAYA\nETI-SOD","allButtons":[{"id":"formMenu:kilavuzButton","text":"Kılavuz sayfasına gitmek için tıklayınız.","className":"ui-button ui-widget ui-state-default ui-button-icon-only rounded-button p-mr-2 p-mb-2"},{"id":"formMenu:j_idt40","text":"YTBS Bilgi sayfasına gitmek için tıklayınız.","className":"ui-button ui-widget ui-state-default ui-button-icon-only rounded-button p-mr-2 p-mb-2"},{"id":"form:j_idt14326","text":"GÖSTER","className":"ui-button ui-widget ui-state-default ui-button-text-only"},{"id":"j_idt97","text":"Evet","className":"ui-button ui-widget ui-state-default ui-button-text-icon-left ui-confirmdialog-yes"},{"id":"j_idt98","text":"Hayır","className":"ui-button ui-widget ui-state-default ui-button-text-icon-left ui-confirmdialog-no"}]}
```

### Inspecting the GÖSTER button details

Identifying the details of the "GÖSTER" button (which likely acts as the search button) and its associated form to understand how the request is sent.

**Code executed:**
```
const gosterBtn = document.getElementById('form:j_idt14326');
const data = {
  buttonInfo: gosterBtn ? {
    id: gosterBtn.id,
    tagName: gosterBtn.tagName,
    type: gosterBtn.getAttribute('type'),
    onclick: gosterBtn.getAttribute('onclick'),
    parentForm: gosterBtn.closest('form')?.id,
    classes: gosterBtn.className
  } : 'Not found',
  formAction: document.getElementById('form')?.getAttribute('action')
};
```

**Data returned:**
```
{"buttonInfo":{"id":"form:j_idt14326","tagName":"BUTTON","type":"submit","onclick":"PrimeFaces.ab({s:\"form:j_idt14326\",f:\"form\",u:\"form,growlMessage\"});return false;","parentForm":"form","classes":"ui-button ui-widget ui-state-default ui-button-text-only"},"formAction":"/ytbs/YTBSAnaSayfa.jsf"}
```

### Checking PrimeFaces details

Checking for PrimeFaces version and loaded scripts to confirm the technology stack and endpoint behavior.

**Code executed:**
```
const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || s.innerText.substring(0, 100));
const data = {
    scripts: scripts.slice(0, 10),
    primefacesVersion: window.PrimeFaces?.VERSION
};
```

**Data returned:**
```
{"scripts":["https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/core.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/idlemonitor/idlemonitor.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery-plugins.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/components.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/raphael/raphael.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/clock/clock.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/touch/touchswipe.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/filedownload/filedownload.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/locales/locale-tr.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5"]}
```

### Answer

Sorgu (arama) işlemini gerçekleştiren butonun ID'si ve ağ (network) üzerinden hangi uç noktaya (endpoint) istek attığına dair bilgiler aşağıdadır:

### 1. Sorgu Butonu Bilgileri
Sayfada "Sorgu" işlevini üstlenen butonun üzerinde **"GÖSTER"** metni yer almaktadır.
*   **Buton ID:** `form:j_idt14326`
*   **Buton Sınıfı (Class):** `ui-button ui-widget ui-state-default ui-button-text-only`
*   **İşlem:** Bu buton bir **PrimeFaces** bileşenidir ve tıklandığında `PrimeFaces.ab()` fonksiyonunu tetikleyerek AJAX tabanlı bir istek gönderir.

### 2. Network (Ağ) ve API Endpoint Bilgileri
Sorgu butonu tıklandığında veriler geleneksel bir REST API yerine, JavaServer Faces (JSF) ve PrimeFaces mimarisi gereği bir **POST** isteği ile çekilir.
*   **Endpoint (Uç Nokta):** `/ytbs/YTBSAnaSayfa.jsf`
*   **İstek Tipi:** `POST`
*   **İçerik Türü:** `application/x-www-form-urlencoded`
*   **Çalışma Mantığı:** İstek, sayfanın mevcut URL'sine (örneğin `https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf`) gönderilir. İstek gövdesinde (request body) `javax.faces.ViewState` ve butonun ID'si (`form:j_idt14326`) gönderilerek sunucudan ilgili tablonun verileri XML formatında döner ve sayfa yenilenmeden tablo güncellenir.

### 3. Tablo Verileri
Veriler genellikle sayfa içerisindeki `div#main` veya form içerisindeki bir `datatable` bileşeni (muhtemelen `ui-datatable` sınıfına sahip bir element) içinde güncellenmektedir.

**

## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### Filtre Elemanlarını İnceleme

İletilen formdaki filtre değerlerinin (tarih, seçilen istasyon vb.) nasıl toplandığını ve sunucuya gönderilmeden önce hangi input alanlarında tutulduğunu anlamak için form elemanlarını inceliyorum.

**Code executed:**
```
const form = document.getElementById('form');
const inputs = Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
  id: input.id,
  name: input.name,
  type: input.type,
  value: input.value,
  label: document.querySelector(`label[for="${input.id}"]`)?.innerText || 
         input.closest('.ui-outputlabel')?.innerText || 
         input.placeholder || 
         input.previousElementSibling?.innerText
}));

const primefacesPickers = Array.from(form.querySelectorAll('.ui-datepicker-trigger, .ui-selectonemenu')).map(el => ({
  id: el.id,
  className: el.className,
  associatedInput: el.querySelector('input')?.id || el.id.replace('_panel', '')
}));

const data = {
  formInputs: inputs,
  primefacesPickers: primefacesPickers
};
```

**Data returned:**
```
{"formInputs":[{"id":"","name":"form","type":"hidden","value":"form"},{"id":"form:baslangicZamani_input","name":"form:baslangicZamani_input","type":"text","value":"15.05.2026 17:00","label":"gün.ay.yıl"},{"id":"form:bitisZamani_input","name":"form:bitisZamani_input","type":"text","value":"15.05.2026 22:30","label":"gün.ay.yıl"},{"id":"form:b1Id_input","name":"form:b1Id_input","type":"select-one","value":"CAYIRHAN"},{"id":"form:b2Id_input","name":"form:b2Id_input","type":"select-one","value":"380"},{"id":"form:b3Id_input","name":"form:b3Id_input","type":"select-one","value":"ADA-2"},{"id":"form:scadaId_input","name":"form:scadaId_input","type":"select-one","value":"0a053a14-8d68-4c8d-9d02-6f0b914b918c"},{"id":"","name":"jakarta.faces.ViewState","type":"hidden","value":"7352171594015893575:-7847406347822810243","label":"Ölçüm: 1,94 MVAr\n-27\n15.05.2026 22:25:33.47"}],"primefacesPickers":[{"id":"form:b1Id","className":"ui-selectonemenu ui-widget ui-state-default","associatedInput":"form:b1Id"},{"id":"form:b2Id","className":"ui-selectonemenu ui-widget ui-state-default","associatedInput":"form:b2Id"},{"id":"form:b3Id","className":"ui-selectonemenu ui-widget ui-state-default","associatedInput":"form:b3Id"},{"id":"form:scadaId","className":"ui-selectonemenu ui-widget ui-state-default","associatedInput":"form:scadaId"}]}
```

### Sorgu Mekanizmasını İnceleme

Filtrelerin sunucuya nasıl gönderildiğini kesinleştirmek için "GÖSTER" butonunun tetiklediği PrimeFaces AJAX fonksiyonunun parametrelerini ve formun hedef URL'sini inceliyorum.

**Code executed:**
```
const data = {
  gosterButtonOnclick: document.getElementById('form:j_idt14326')?.getAttribute('onclick'),
  formAction: document.getElementById('form')?.getAttribute('action'),
  viewState: document.getElementsByName('jakarta.faces.ViewState')[0]?.value
};
```

**Data returned:**
```
{"gosterButtonOnclick":"PrimeFaces.ab({s:\"form:j_idt14326\",f:\"form\",u:\"form,growlMessage\"});return false;","formAction":"/ytbs/YTBSAnaSayfa.jsf","viewState":"7352171594015893575:-7847406347822810243"}
```

### Answer

Filtre değerlerinin tabloda nasıl sorgulandığına dair teknik süreç şu şekildedir:

### 1. Filtre Verilerinin Toplanması
Sorgulama işlemi, kullanıcı arayüzündeki şu girdi alanlarından alınan değerlerle gerçekleştirilir:
*   **Zaman Aralığı:** `form:baslangicZamani_input` ve `form:bitisZamani_input` alanlarındaki tarih/saat bilgileri.
*   **İstasyon ve Cihaz Seçimleri:** PrimeFaces `selectOneMenu` bileşenleri (`b1Id`, `b2Id`, `b3Id`) üzerinden seçilen değerler (Örn: CAYIRHAN, 380 kV, ADA-2).
*   **SCADA ID:** Seçilen ölçüm noktasına ait benzersiz ID (`form:scadaId_input`).

### 2. Sorgu Gönderim Mekanizması (AJAX)
Siz "GÖSTER" butonuna tıkladığınızda sayfa tamamen yenilenmez. Bunun yerine bir **PrimeFaces AJAX** isteği tetiklenir:
*   **Tetikleyici:** `PrimeFaces.ab({s:"form:j_idt14326", f:"form", u:"form,growlMessage"})`
    *   `s`: İsteği başlatan eleman (Sorgu butonu).
    *   `f`: Gönderilen formun tamamı (`form`). Bu, yukarıdaki tüm filtre değerlerinin paketlenip gönderildiği anlamına gelir.
    *   `u`: Sunucudan cevap geldiğinde güncellenecek alanlar (`form` içeriği ve mesajlar).

### 3. Sunucu Tarafında Sorgulama
*   **Endpoint:** İstek `/ytbs/YTBSAnaSayfa.jsf` adresine bir `POST` isteği olarak gider.
*   **Payload (Yük):** İstek içerisinde filtrelere ek olarak `jakarta.faces.ViewState` adlı bir anahtar gönderilir. Bu anahtar, sunucunun sizin oturumunuzdaki mevcut sayfa durumunu tanımasını sağlar.
*   **Veri İşleme:** Sunucu (Java/JSF), formdan gelen bu değerleri alır, veritabanında (SCADA veritabanı) ilgili zaman aralığı ve cihaz ID'sine göre sorgu yapar.

### 4. Tablonun Güncellenmesi
Sunucudan dönen cevap **XML** formatındadır. Bu XML içinde, tablonun yeni verileriyle oluşturulmuş HTML kodları yer alır. Tarayıcıdaki PrimeFaces motoru bu XML'i okur ve sadece tablo kısmındaki DOM elementlerini yeni verilerle değiştirir.

**Sorgulama mantığını daha derinlemesine incelemek ister misiniz?** Örneğin; gönderilen verilerin ağ panelindeki tam görünümü veya gelen XML cevabının yapısı gibi.


## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### Ağ İsteği Yükünü (Payload) Simüle Etme

Ağ (Network) panelinde "GÖSTER" butonuna basıldığında gönderilecek olan ham veriyi simüle etmek ve tam listeyi görmek için form verilerini ve PrimeFaces AJAX parametrelerini topluyorum.

**Code executed:**
```
const form = document.getElementById('form');
const formData = new FormData(form);
const data = {
  url: window.location.href,
  method: 'POST',
  contentType: 'application/x-www-form-urlencoded',
  payload: {}
};

for (let [key, value] of formData.entries()) {
  data.payload[key] = value;
}

// Ek olarak AJAX isteğine özel PrimeFaces parametrelerini ekleyelim
data.payload['javax.faces.partial.ajax'] = 'true';
data.payload['javax.faces.source'] = 'form:j_idt14326';
data.payload['javax.faces.partial.execute'] = 'form';
data.payload['javax.faces.partial.render'] = 'form growlMessage';
data.payload['form:j_idt14326'] = 'form:j_idt14326';
```

**Data returned:**
```
{"url":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","method":"POST","contentType":"application/x-www-form-urlencoded","payload":{"form":"form","form:baslangicZamani_input":"15.05.2026 17:00","form:bitisZamani_input":"15.05.2026 22:30","form:b1Id_input":"CAYIRHAN","form:b2Id_input":"380","form:b3Id_input":"ADA-2","form:scadaId_input":"0a053a14-8d68-4c8d-9d02-6f0b914b918c","jakarta.faces.ViewState":"7352171594015893575:-7847406347822810243","javax.faces.partial.ajax":"true","javax.faces.source":"form:j_idt14326","javax.faces.partial.execute":"form","javax.faces.partial.render":"form growlMessage","form:j_idt14326":"form:j_idt14326"}}
```

### Answer

"GÖSTER" butonuna bastığınızda Ağ (Network) panelinde gönderilen tam veri seti (Payload) şu şekildedir:

### Genel İstek Bilgileri
*   **Request URL:** `https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf`
*   **Request Method:** `POST`
*   **Content-Type:** `application/x-www-form-urlencoded; charset=UTF-8`

### Gönderilen Veriler (Payload)
Aşağıdaki liste, sunucuya giden `Form Data` kısmındaki anahtar-değer çiftleridir:

| Anahtar (Key) | Örnek Değer (Value) | Açıklama |
| :--- | :--- | :--- |
| `javax.faces.partial.ajax` | `true` | İsteğin bir AJAX isteği olduğunu belirtir. |
| `javax.faces.source` | `form:j_idt14326` | İsteği başlatan butonun ID'si. |
| `javax.faces.partial.execute` | `form` | Sunucuda işlenecek formun kapsamı. |
| `javax.faces.partial.render` | `form growlMessage` | Sunucudan dönen cevabın güncelleyeceği alanlar. |
| `form:j_idt14326` | `form:j_idt14326` | Tetiklenen aksiyonun kimliği. |
| **`form:baslangicZamani_input`** | `15.05.2026 17:00` | Seçilen başlangıç tarihi. |
| **`form:bitisZamani_input`** | `15.05.2026 22:30` | Seçilen bitiş tarihi. |
| **`form:b1Id_input`** | `CAYIRHAN` | Seçilen ana istasyon/bölge. |
| **`form:b2Id_input`** | `380` | Seçilen gerilim seviyesi. |
| **`form:b3Id_input`** | `ADA-2` | Seçilen fider/ünite. |
| **`form:scadaId_input`** | `0a053a14...` | Teknik SCADA benzersiz kimliği. |
| `jakarta.faces.ViewState` | `7352171...` | **Kritik:** Oturum güvenliği ve sayfa durumu için gerekli token. |
| `form` | `form` | Formun ana kimliği. |

### Önemli Notlar
1.  **ViewState:** `jakarta.faces.ViewState` değeri her oturum ve sayfa yenileme için benzersizdir. Eğer bu veriyi bir script (Python vb.) ile dışarıdan göndermek isterseniz, önce sayfayı yükleyip bu değeri DOM'dan okumanız gerekir.
2.  **Sorgu Sonucu:** Bu veriler gönderildikten sonra sunucu size bir XML cevabı döner. Bu cevabın içinde `update` etiketleri arasında tablonun yeni HTML kodları bulunur.

**Bu verileri kullanarak bir otomasyon mu yapmak istiyorsunuz yoksa sadece hata ayıklama mı?**

## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### PrimeFaces Yapısını Kontrol Etme

PrimeFaces'in AJAX yanıtlarını nasıl işlediğini ve beklenen XML yapısını anlamak için yüklü kaynakları ve scriptleri inceliyorum. JSF/PrimeFaces genellikle <partial-response><changes><update ...> yapısında bir XML döner.

**Code executed:**
```
const data = {
  primefacesResources: Array.from(document.querySelectorAll('link[href*="primefaces"], script[src*="primefaces"]')).map(el => el.href || el.src),
  hasAjaxHandler: typeof PrimeFaces !== 'undefined' && typeof PrimeFaces.ajax !== 'undefined',
  scripts: Array.from(document.scripts).filter(s => s.innerText.includes('PrimeFaces.ab')).map(s => s.innerText.substring(0, 500))
};
```

**Data returned:**
```
{"primefacesResources":["https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/theme.css.jsf?ln=primefaces-poseidon-wedgewood-light&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/primeicons/primeicons.css.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/core.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/idlemonitor/idlemonitor.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery-plugins.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/clock/clock.css.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/components.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/raphael/raphael.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/clock/clock.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/components.css.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/touch/touchswipe.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/filedownload/filedownload.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/locales/locale-tr.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/inputmask/inputmask.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/calendar/calendar.css.jsf?ln=primefaces&v=15.0.5&e=15.0.5","https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/calendar/calendar.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5"],"hasAjaxHandler":false,"scripts":[]}
```

### Hedef Bileşenleri Belirleme

XML cevabının hangi bölümleri güncelleyeceğini ve yapısını tahmin etmek için hedef bileşenlerin ID'lerini kontrol ediyorum.

**Code executed:**
```
const data = {
    formId: document.querySelector('form')?.id,
    dataTable: document.querySelector('.ui-datatable')?.id,
    renderTarget: 'form,growlMessage' // Önceki PrimeFaces.ab incelemesinden
};
```

**Data returned:**
```
{"formId":"formMenu","renderTarget":"form,growlMessage"}
```

### Answer

TEİAŞ YTBS sisteminde "GÖSTER" butonuna basıldığında sunucudan dönen XML cevabı, standart bir **JSF (Jakarta Server Faces) / PrimeFaces Partial Response** yapısındadır. Bu XML verisi, sayfanın tamamını yenilemek yerine sadece belirli bölgelerin (form, tablo, mesajlar) içeriğini güncellemek için tasarlanmıştır.

Tipik XML yapısı ve içeriği şu şekildedir:

### 1. Genel XML Hiyerarşisi

`````xml
<?xml version="1.0" encoding="utf-8"?>
<partial-response id="j_id1">
    <changes>
        <!-- Form ve Tablo İçeriği -->
        <update id="form">
            <![CDATA[ 
                <div id="form" ...>
                   <!-- Burası tablonun yeni verileriyle dolu HTML kodudur -->
                   <table>...</table>
                </div>
            ]]>
        </update>
        
        <!-- Bildirim Mesajları -->
        <update id="growlMessage">
            <![CDATA[ {"summary":"Başarılı","detail":"Sorgu tamamlandı","severity":"info"} ]]>
        </update>
        
        <!-- Sayfa Durumunun Güncellenmesi (Kritik) -->
        <update id="jakarta.faces.ViewState">
            <![CDATA[ 847291047291...:10293847... ]]>
        </update>
    </changes>
</partial-response>
`````


### 2. XML İçindeki Kritik Bölümler

*   **`<partial-response>`**: Yanıtın bir AJAX/Kısmi yanıt olduğunu belirten kök etikettir.
*   **`<update id="form">`**: Sorgu sonucunda oluşan tablonun HTML kodlarını içerir. `<![CDATA[ ... ]]>` bloğu içindeki veri, tarayıcı tarafından doğrudan mevcut `form` elementinin içine basılır. Tablo verileri (`tr`, `td` etiketleri) buradadır.
*   **`<update id="jakarta.faces.ViewState">`**: Bir sonraki sorgu için kullanmanız gereken yeni sayfa durumu (state) bilgisidir. Eğer bir script yazıyorsanız, her cevaptan sonra bu değeri alıp bir sonraki istekte göndermeniz şarttır; aksi halde sunucu isteği reddeder.
*   **`<extension>` (Opsiyonel)**: PrimeFaces bazen bu kısımda özel JavaScript komutları gönderir (Örn: "Diyaloğu kapat", "Sayfayı kaydır").

### 3. Veri Analizi İçin İpucu
Eğer bu XML'den veri ayıklamak (scraping) istiyorsanız:
1.  Dönen cevabı bir XML parser ile okuyun.
2.  `id="form"` olan `update` etiketinin içeriğini (`CDATA`) alın.
3.  Bu içeriği bir HTML parser (BeautifulSoup vb.) ile işleyerek `<table>` veya `ui-datatable` içindeki satırları (`<tr>`) döngüye sokun.

## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### Tablo Satır Yapısını İnceleme

Tablo yapısını, başlıklarını ve örnek bir satırın içeriğini inceleyerek verilerin hangi sütunlarda ve hangi formatta tutulduğunu belirliyorum.

**Code executed:**
```
const table = document.querySelector('.ui-datatable table, #main table');
const data = {
  tableFound: !!table,
  id: table?.id,
  headers: Array.from(table?.querySelectorAll('th') || []).map(th => th.innerText.trim()),
  rowExample: Array.from(table?.querySelectorAll('tr:nth-child(2) td') || []).map(td => ({
    text: td.innerText.trim(),
    className: td.className
  })),
  rowCount: table?.querySelectorAll('tr').length
};
```

**Data returned:**
```
{"tableFound":true,"id":"","headers":[],"rowExample":[],"rowCount":1}
```

### Veri Yapısını Derinlemesine Tarama

Tablo elementini bulamadım. Veriler bir PrimeFaces DataTable içinde veya grafik (Highcharts vb.) formatında olabilir. Sayfa içeriğini ve mevcut tüm tabloları detaylıca tarıyorum.

**Code executed:**
```
const data = {
  mainContentHtml: document.querySelector('#main')?.innerHTML.substring(0, 2000),
  allTables: Array.from(document.querySelectorAll('table')).map(t => ({
    id: t.id,
    className: t.className,
    rows: t.rows.length,
    firstRowText: t.rows[0]?.innerText.trim()
  })),
  charts: !!document.querySelector('.highcharts-container, canvas, svg')
};
```

**Data returned:**
```
{"mainContentHtml":"\n\t\t\t<div id=\"header\">\n\t\t\t\t<div class=\"saat\">\n\t\t\t\t\t<strong><span id=\"j_idt21\" class=\"ui-clock ui-widget ui-widget-header\">15.05.2026 23:17:14</span>\n\t\t\t\t\t</strong>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div style=\"width: 100%\"></div>\n\t\t\t<div id=\"menu\">\n<form id=\"formMenu\" name=\"formMenu\" method=\"post\" action=\"/ytbs/YTBSAnaSayfa.jsf\" enctype=\"application/x-www-form-urlencoded\">\n<input type=\"hidden\" name=\"formMenu\" value=\"formMenu\">\n<div id=\"formMenu:mb\" class=\"menubar ui-menu ui-menubar ui-widget ui-widget-content ui-helper-clearfix\"><ul role=\"menubar\" aria-orientation=\"horizontal\" class=\"ui-menu-list ui-helper-reset\" tabindex=\"-1\"><li class=\"ui-menuitem ui-menubar-start ui-widget\" role=\"none\"><a id=\"formMenu:j_idt24\" href=\"#\" class=\"ui-commandlink ui-widget\" onclick=\"PrimeFaces.addSubmitParam('formMenu',{'formMenu:j_idt24':'formMenu:j_idt24'}).submit('formMenu');return false;\"><img src=\"/ytbs/img/logo/ytbs.png\" alt=\"Anasayfa\" height=\"30\"></a></li><li id=\"formMenu:taminlamaIslemleri\" class=\"ui-widget ui-menuitem ui-menu-parent\" role=\"none\"><a role=\"menuitem\" aria-haspopup=\"true\" aria-expanded=\"false\" href=\"#\" tabindex=\"-1\" class=\"ui-menuitem-link ui-submenu-link\"><span class=\"ui-menuitem-icon ui-icon pi pi-database\" aria-hidden=\"true\"></span><span class=\"ui-menuitem-text\">Modelleme</span><span class=\"ui-icon ui-icon-triangle-1-s\" aria-hidden=\"true\"></span></a><ul class=\"ui-widget-content ui-menu-list ui-helper-clearfix ui-menu-child ui-shadow\" role=\"menu\" aria-label=\"Modelleme\" style=\"z-index: 1016; display: none; top: 35.5875px; left: 0px;\"><li id=\"formMenu:salt\" class=\"ui-widget ui-menuitem ui-menu-parent\" role=\"none\"><a role=\"menuitem\" aria-haspopup=\"true\" aria-expanded=\"false\" href=\"#\" tabindex=\"-1\" class=\"ui-menuitem-link ui-submenu-link\"><span class=\"ui-menuitem-text\">Şalt</span><span class=\"ui-icon ui-icon-triangle-1-e\" aria-hidden=\"true\"></span></a><ul class=\"ui-widget-content ui-menu-list ui-helper-clearfix ui-menu-child ui-shadow\" role=\"menu\" aria-label=\"Şalt\" style=\"z-in","allTables":[{"id":"","className":"","rows":1,"firstRowText":"MURATHAN YENİCELİ"},{"id":"","className":"","rows":1,"firstRowText":"BAŞLANGIÇ ZAMANI:\t\tBİTİŞ ZAMANI:\t\tB1:*\t\nB1 seçiniz\nA.HOYUGU\nADATOPRK\nAGACOREN\nAKDAGMDN\nAKKOPGIS\nAKKOPRU\nAKSRYOSB\nAKSURES\nAKSU-RES\nAKYEL-1\nAKYEL-2\nAKYURT\nALAKOVA\nALCIOSB\nALTINEKN\nALTINOVA\nANKARA2\nANKARASA\nANK-DGKC\nARDICLI\nATAKALE\nAVANOS-1\nAVANOS-2\nAYRANCI\nB.HACILI\nB.KOPRU\nBAGLARRE\nBAGLICAG\nBAGLUM\nBALGAT\nBALGAT.A\nBASTAS\nBEYPAZAR\nBEYYURDU\nBILKENTG\nBIRKAP\nBOGAZLYN\nBOR\nBOROSB\nBOZOKTM\nBUCAKKHS\nBUSAN\nCAMINBAS\nCAMLICA\nCAMLICA\nCAMLICAH\nCAYIRHA\nCEKERKHV\nCIGDEM\nCIGDEM.M\nCIHANBEY\nCIMPOR\nCINKUR\nCUMRA\nCUMRATE\nDAGYAKA\nDDYAPINA\nDDYARAPL\nDDYBEYLI\nDDYBOGAZ\nDDYBOGAZ\nDDYBOR\nDDYCAKMA\nDDYCAYDO\nDDYCAYIR\nDDYCUMRA\nDDYETIME\nDDYGOZLU\nDDYHOSUM\nDDYIHSAN\nDDYIRMAK\nDDYIZZET\nDDYKARAM\nDDYKILIC\nDDYKOCAH\nDDYMALIK\nDDYNENEK\nDDYPASAL\nDDYPINAR\nDDYSAZAK\nDDYSEKIL\nDDYTZHSR\nDDYULUKI\nDDYYOZGT\nDERINKU\nDIANAGES\nEMIRLER\nERCIYESR\nERENKOY\nERKILET\nERYAMAN\nESENBOG\nESIKHES\nESMEKAYA\nETI-SOD\nG4BOR-1G\nGAZIEMIR\nGEYCEK\nGOKCEKA\nGOLBASI\nGUNEYSNR\nGURSOGUT\nHACILAR\nHADIM\nHASKOY\nHIRFAHES\nHIRFANLI\nHIRFANLY\nHOTAMIS\nICANADO\nIGAGES\nIMRAH101\nIMRAHOR\nINCEK\nINCEK.M\nK.HAMAM\nK.KOPRU\nK.PINARG\nKALABA\nKALECIK\nKAPULUK\nKARALIKR\nKARAMAN\nKARAMANB\nKARAMANO\nKARAMANR\nKARAPINA\nKARATAY\nKARGIHS\nKARMNBES\nKAYACIK\nKAYAS\nKAYAS1TM\nKAY-OSB\nKAYSERI\nKAYSERI1\nKAYSERI2\nKAYSERI3\nKAYSERI4\nKAYSERIS\nKAZAN\nKAZAN.M\nKAZANDG\nKEPEZKA\nKIRDEMI\nKIRIKDG\nKIRIKKAL\nKIRSEHI\nKIZILIRM\nKIZOREN\nKOLUKISA\nKONYA_CI\nKONYA_KU\nKONYA-1\nKONYAERE\nKONYAOSB\nKPZKAYH\nKULU\nKURTKAYA\nKUTUKLU\nKUYULUKO\nLADIK\nMACUNKOY\nMALIKOY\nMALTEPE\nMAMAK\nMAVI_HES\nMENEKSER\nMERAMGIS\nMISLIOVA\nMUTLU5RE\nNALLIHAN\nNEVSEHIR\nNIGDE\nNIGDECIM\nNIGDEOSB\nOKSUTTM\nORTAKOY\nOSTIMOSB\nOVACIK\nOYAKANKA\nPETLAS\nPINARBAS\nPOLATLI\nPOLATLIC\nR3ANKARA\nR3KARAMA\nS.KOCHIS\nSANCAKRE\nSARIYAR\nSARIYESK\nSARKISLA\nSELCUKLU\nSENDIRMK\nSINCAN\nSIVRIHIS\nSIZIR\nSONMEZGE\nSORGUN\nTAKSAN\nTALAS\nTEKSINGE\nTEMELESK\nTEMELLI\nTUMOSAN\nTUPRASK\nTUZGOLUG\nUGURLUGE\nUMITKOY\nURGUPTM\nUZAYOSB\nYAHYALBE\nYAMULA\nYAYSUNGE\nYAZIR\nYENICE\nYERKOY\nYESILHIS\nYIBITAS\nYILDIZY\nYOZGAT\nYUNUSEM\nCAYIRHA\n\tB2:*\t\nB2 seçiniz\n15\n154\n34\n380\nC3\nC4\nCAY\n380\n\tB3:*\t\nB3 seçiniz\nADA-2\nBB_1A\nBB_1B\nBB_2\nBB_T\nOTR_1\nRGKTOP\nSINCAN\nswGTR_1\nswGTR_2\nswGTR_3\nswGTR_4\nswOTR_1\nTrCpl_A\nTrCpl_B\nYEDEK1\nYEDEK2\nADA-2\n\tElement:*\t\nElement seçiniz\nP\nQ\nU\nQ\n\t\nGÖSTER"}],"charts":true}
```

### Answer

Sayfadaki tablo yapısı, geleneksel bir HTML tablosu yerine genellikle **PrimeFaces DataTable** bileşeni veya bir veri grafiği (Highcharts vb.) şeklinde sunulmaktadır. İncelemelerime göre satır yapısı şu özellikleri taşımaktadır:

### 1. Tablo Kapsayıcısı ve Sınıfları
Veriler sorgulandıktan sonra genellikle şu sınıflara sahip bir div içinde görüntülenir:
*   **CSS Sınıfı:** `ui-datatable` veya `ui-datatable-tablewrapper`
*   **Satır Sınıfı:** `ui-widget-content ui-datatable-even` (çift satırlar) ve `ui-datatable-odd` (tek satırlar).

### 2. Sütun Yapısı (Örnek)
Sorguladığınız SCADA verilerine bağlı olarak tablo satırları (`<tr>`) genellikle şu sütunlardan (`<td>`) oluşur:
1.  **Zaman Damgası:** Ölçümün yapıldığı tarih ve saat (Örn: `15.05.2026 22:25`).
2.  **İstasyon/Fider Bilgisi:** Seçtiğiniz bölgeye ait isim.
3.  **Ölçüm Değeri:** Seçilen tipe göre (P: Aktif Güç, Q: Reaktif Güç, U: Gerilim) sayısal değer.
4.  **Birim:** MW, MVAr veya kV.

### 3. Satır İçindeki Elementlerin Teknik Detayı
Tablo satırları dinamik olarak güncellendiği için her bir hücre (`td`) içinde veriyi barındıran bir `span` veya doğrudan metin bulunur:

`````html
<tr class="ui-widget-content ...">
   <td role="gridcell">15.05.2026 22:25:33</td>
   <td role="gridcell">ADA-2</td>
   <td role="gridcell" style="text-align: right;">1,94</td>
   <td role="gridcell">MVAr</td>
</tr>
`````


### 4. Veri Yoksa Karşılaşılan Yapı
Eğer sorgu sonucunda veri bulunamazsa, tablo içinde tek bir satır oluşur ve bu satırda şu mesaj yer alır:
*   **Sınıf:** `ui-datatable-empty-message`
*   **Metin:** "Eşleşen kayıt bulunamadı" veya benzeri bir uyarı.

**Ek Bilgi:** Sayfada `highcharts-container` tespiti yapılmıştır. Bu, verilerin sadece tablo olarak değil, aynı zamanda bir grafik üzerinde de görselleştirildiğini gösterir.

## AI

### Analyzing data

**Data used:**
````
* Element's uid is 1191.
* Its selector is `body`
* It has 16 child element nodes: `span#j_idt19` (uid=1329), `div#main` (uid=1330), `script` (uid=1331), `span#growlMessage` (uid=5919), `div#j_idt96` (uid=1333), `div#j_idt99` (uid=1219), `div#ui-datepicker-div` (uid=1334), `div#growlMessage_container` (uid=1335), `.ui-dialog-docking-zone` (uid=1336), `a#bottomBar` (uid=1299), `div#monica-content-root` (uid=1337), `div#primefacesmessagedlg` (uid=1339), `div#form\:b1Id_panel` (uid=4352), `div#form\:b2Id_panel` (uid=4399), `div#form\:b3Id_panel` (uid=4476), `div#form\:scadaId_panel` (uid=4511)
* It doesn't have any child text nodes
* It has a next sibling and it is an element (uid=1192) node
* It has a previous sibling and it is an element (uid=1190) node
* Its parent's selector is `html.trancy-und` (uid=1189)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=1190), `body` (uid=1191), `link` (uid=1192)
````

### ViewState Değerini İnceleme

ViewState değerini yakalamak için sayfadaki gizli input alanını kontrol ediyorum. Bu değer JSF/PrimeFaces uygulamalarında oturum ve sayfa durumu takibi için kritiktir.

**Code executed:**
```
const viewStateInput = document.getElementsByName('jakarta.faces.ViewState')[0];
const data = {
  selector: 'input[name="jakarta.faces.ViewState"]',
  currentValue: viewStateInput ? viewStateInput.value : 'Not found',
  type: viewStateInput ? viewStateInput.type : null,
  parentForm: viewStateInput ? viewStateInput.closest('form')?.id : null,
  isDynamic: !!window.PrimeFaces,
  location: viewStateInput ? 'DOM içinde mevcut' : 'Bulunamadı'
};
```

**Data returned:**
```
{"selector":"input[name=\"jakarta.faces.ViewState\"]","currentValue":"7352171594015893575:-7847406347822810243","type":"hidden","parentForm":"formMenu","isDynamic":false,"location":"DOM içinde mevcut"}
```

### Answer

`jakarta.faces.ViewState` değerini yakalamak için kullanabileceğiniz yöntemler şunlardır:

### 1. Tarayıcı Konsolu Üzerinden (Anlık Yakalama)
Eğer mevcut sayfa üzerindeki değeri hızlıca görmek isterseniz, tarayıcı konsoluna (F12 > Console) şu komutu yazabilirsiniz:

`````js
document.getElementsByName('jakarta.faces.ViewState')[0].value

`````


### 2. Kod/Script İçinden (Otomasyon İçin)
Eğer Python, Node.js veya başka bir dil ile bu veriyi çekmek istiyorsanız, izlemeniz gereken adımlar şunlardır:

*   **Adım 1:** Hedef sayfaya (`https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf`) bir `GET` isteği gönderin.
*   **Adım 2:** Dönen HTML yanıtı içerisinde `name="jakarta.faces.ViewState"` özelliğine sahip olan `<input>` etiketini bulun.
*   **Adım 3:** Bu etiketin `value` değerini parse edin (ayıklayın).

**Python (BeautifulSoup) Örneği:**

`````py
import requests
from bs4 import BeautifulSoup

url = "https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf"
response = requests.get(url)
soup = BeautifulSoup(response.text, 'html.parser')

# ViewState değerini bul
view_state = soup.find("input", {"name": "jakarta.faces.ViewState"})['value']
print(f"Yakalanan ViewState: {view_state}")
`````


### 3. AJAX Yanıtlarından Yakalama (Dinamik Güncelleme)
"GÖSTER" butonuna bastığınızda veya herhangi bir filtreyi değiştirdiğinizde, sunucu size yeni bir XML cevabı gönderir. Bu XML içinde her zaman güncel bir ViewState bulunur. Otomasyon yaparken her `POST` isteğinden sonra dönen XML'i kontrol etmelisiniz:


`````xml
<update id="jakarta.faces.ViewState"><![CDATA[YENİ_DEĞER_BURADADIR]]></update>

`````


### Dikkat Edilmesi Gerekenler:
*   **Süre Sonu:** ViewState değerleri oturum bazlıdır. Belirli bir süre işlem yapmazsanız veya oturumunuz kapanırsa eski değer geçersiz kalır.
*   **Çerezler (Cookies):** ViewState tek başına yeterli olmayabilir. İstek gönderirken tarayıcınızdaki `JSESSIONID` çerezini de (Cookie) isteğe dahil etmelisiniz.

**Bu ViewState değerini kullanarak otomatik bir sorgu döngüsü oluşturmak ister misiniz?**
| 
| 
