## AI

### Analyzing the prompt

**Data used:**
````
* Element's uid is 422.
* Its selector is `body`
* It has 15 child element nodes: `span#j_idt19` (uid=423), `div#main` (uid=425), `script` (uid=2734), `span#growlMessage` (uid=2735), `div#j_idt96` (uid=2737), `div#j_idt99` (uid=2755), `div#ui-datepicker-div` (uid=382), `div#growlMessage_container` (uid=2790), `.ui-dialog-docking-zone` (uid=2795), `a#bottomBar` (uid=2912), `div#monica-content-root` (uid=2915), `div#form\:gerilim_panel` (uid=3854), `div#form\:fazId_panel` (uid=3882), `div#form\:olcumTipi_panel` (uid=3920), `div#form\:cihaz_panel` (uid=4737)
* It doesn't have any child text nodes
* It has a previous sibling and it is an element (uid=421) node
* Its parent's selector is `html.trancy-und` (uid=381)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=384), `link` (uid=421), `body` (uid=422)
````

### Analyzing page structure and frameworks

I am checking for forms, scripts, and signs of frameworks like PrimeFaces or JSF to understand how the page handles data requests and API calls.

**Code executed:**
```
const data = {
  forms: Array.from(document.forms).map(form => ({
    id: form.id,
    action: form.action,
    method: form.method,
    inputs: Array.from(form.elements).map(el => ({
      name: el.name,
      id: el.id,
      type: el.type,
      value: el.value
    }))
  })),
  scripts: Array.from(document.scripts).map(script => ({
    src: script.src,
    id: script.id
  })),
  primefaces: !!window.PrimeFaces,
  jsf: !!window.jsf
};
```

**Data returned:**
```
{"forms":[{"id":"formMenu","action":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","method":"post","inputs":[{"name":"formMenu","id":"","type":"hidden","value":"formMenu"},{"name":"formMenu:j_idt36","id":"","type":"hidden","value":"formMenu:j_idt36"},{"name":"formMenu:j_idt36:j_idt37","id":"formMenu:j_idt36:j_idt37","type":"text","value":""},{"name":"formMenu:j_idt36:j_idt38","id":"","type":"submit","value":""},{"name":"jakarta.faces.ViewState","id":"j_id1:jakarta.faces.ViewState:0","type":"hidden","value":"-2013264473584112054:-3042489964169619854"},{"name":"formMenu:kilavuzButton","id":"formMenu:kilavuzButton","type":"submit","value":""},{"name":"formMenu:j_idt40","id":"formMenu:j_idt40","type":"button","value":""},{"name":"jakarta.faces.ViewState","id":"","type":"hidden","value":"-2013264473584112054:-3042489964169619854"}]},{"id":"form","action":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","method":"post","inputs":[{"name":"form","id":"","type":"hidden","value":"form"},{"name":"form:baslangicZamani_input","id":"form:baslangicZamani_input","type":"text","value":"10.05.2026 16:36"},{"name":"form:gerilim_input","id":"form:gerilim_input","type":"select-one","value":""},{"name":"form:fazId_input","id":"form:fazId_input","type":"select-one","value":"1"},{"name":"form:bitisZamani_input","id":"form:bitisZamani_input","type":"text","value":"10.05.2026 17:36"},{"name":"form:olcumTipi_input","id":"form:olcumTipi_input","type":"select-one","value":"PQ"},{"name":"form:cihaz_input","id":"form:cihaz_input","type":"select-one","value":"1108"},{"name":"form:j_idt8635","id":"form:j_idt8635","type":"submit","value":""},{"name":"jakarta.faces.ViewState","id":"","type":"hidden","value":"-2013264473584112054:-3042489964169619854"}]}],"scripts":[{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/core.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/idlemonitor/idlemonitor.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/jquery/jquery-plugins.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/components.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/raphael/raphael.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/clock/clock.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/inputmask/inputmask.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/calendar/calendar.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/locales/locale-tr.js.jsf?ln=primefaces&v=15.0.5&e=15.0.5","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Hizmetler/PrimeFacesLocale.js","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Hizmetler/TarihFormat.js","id":""},{"src":"https://maps.googleapis.com/maps/api/js?key=AIzaSyDlvDrI2BuyAM5ENfblnyRIh7EufUX1leE","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/index.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/xy.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/percent.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/map.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/themes/Animated.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/themes/Dark.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/locales/tr_TR.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/plugins/exporting.js.jsf?ln=amcharts5","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/jakarta.faces.resource/deps/xlsx.js.jsf?ln=amcharts5","id":""},{"src":"https://maps.googleapis.com/maps-api-v3/api/js/64/12d/intl/tr_ALL/common.js","id":""},{"src":"https://maps.googleapis.com/maps-api-v3/api/js/64/12d/intl/tr_ALL/util.js","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js","id":""},{"src":"","id":""},{"src":"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Hizmetler/StringFiltre.js","id":""}],"primefaces":false,"jsf":false}
```

### Verifying Framework Objects and Form Handlers

The previous check for PrimeFaces and JSF returned false, which is unexpected given the script URLs. I am re-checking for global objects to confirm the framework and look for event handlers on the forms.

**Code executed:**
```
const data = {
  primeFacesObj: typeof PrimeFaces !== 'undefined',
  jsfObj: typeof jsf !== 'undefined',
  mojarra: typeof mojarra !== 'undefined',
  allGlobalVars: Object.keys(window).filter(key => ['PrimeFaces', 'jsf', 'mojarra', 'Faces'].includes(key)),
  formElements: Array.from(document.querySelectorAll('form')).map(f => ({
    id: f.id,
    onchange: f.getAttribute('onchange'),
    onsubmit: f.getAttribute('onsubmit')
  }))
};
```

**Data returned:**
```
{"primeFacesObj":false,"jsfObj":false,"mojarra":false,"allGlobalVars":[],"formElements":[{"id":"formMenu","onchange":null,"onsubmit":null},{"id":"form","onchange":null,"onsubmit":null}]}
```

### Deep Dive into Framework and Events

I need to confirm the technology stack. The URLs suggest PrimeFaces/Jakarta Faces, but the global objects weren't found (possibly due to timing or sandbox). I'm looking for indicators in the DOM and inline event handlers.

**Code executed:**
```
const data = {
  primeFacesDetected: !!document.querySelector('link[href*="primefaces"], script[src*="primefaces"]'),
  jakartaFacesDetected: !!document.querySelector('input[name*="jakarta.faces.ViewState"]'),
  allAjaxEvents: Array.from(document.querySelectorAll('*'))
    .filter(el => el.onclick || el.onchange || el.onblur)
    .map(el => ({
      tag: el.tagName,
      id: el.id,
      onclick: el.onclick ? el.onclick.toString().substring(0, 100) : null,
      onchange: el.onchange ? el.onchange.toString().substring(0, 100) : null
    })).slice(0, 20),
  formDetails: Array.from(document.forms).map(f => ({
    id: f.id,
    action: f.action,
    hiddenInputs: Array.from(f.querySelectorAll('input[type="hidden"]')).map(i => ({name: i.name, value: i.value}))
  }))
};
```

**Data returned:**
```
{"primeFacesDetected":true,"jakartaFacesDetected":true,"allAjaxEvents":[],"formDetails":[{"id":"formMenu","action":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","hiddenInputs":[{"name":"formMenu","value":"formMenu"},{"name":"formMenu:j_idt36","value":"formMenu:j_idt36"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"}]},{"id":"form","action":"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf","hiddenInputs":[{"name":"form","value":"form"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"}]}]}
```

### Inspecting Button Handlers and Widgets

I am attempting to locate the specific PrimeFaces widgets and button click handlers. This will reveal which AJAX calls are triggered when a user performs a search or query.

**Code executed:**
```
const data = {
  primeFacesWidgets: typeof PrimeFaces !== 'undefined' ? Object.keys(PrimeFaces.widgets) : 'PrimeFaces not found',
  buttonHandlers: Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.ui-commandlink'))
    .map(el => ({
      id: el.id,
      val: el.value || el.innerText,
      onclick: el.getAttribute('onclick'),
      classes: el.className
    })).filter(b => b.onclick || b.classes.includes('ui-'))
};
```

**Data returned:**
```
{"primeFacesWidgets":"PrimeFaces not found","buttonHandlers":[{"id":"formMenu:j_idt24","val":"","onclick":"PrimeFaces.addSubmitParam('formMenu',{'formMenu:j_idt24':'formMenu:j_idt24'}).submit('formMenu');return false;","classes":"ui-commandlink ui-widget"},{"id":"formMenu:kilavuzButton","val":"Kılavuz sayfasına gitmek için tıklayınız.","onclick":"PrimeFaces.ab({s:\"formMenu:kilavuzButton\",f:\"formMenu\"});return false;","classes":"ui-button ui-widget ui-state-default ui-button-icon-only rounded-button p-mr-2 p-mb-2"},{"id":"formMenu:j_idt40","val":"YTBS Bilgi sayfasına gitmek için tıklayınız.","onclick":"window.open('https://ytbsbilgi.teias.gov.tr/ytbsbilgi/', '_blank')","classes":"ui-button ui-widget ui-state-default ui-button-icon-only rounded-button p-mr-2 p-mb-2"},{"id":"form:j_idt8635","val":"GÖSTER","onclick":"PrimeFaces.ab({s:\"form:j_idt8635\",f:\"form\",u:\"form\"});return false;","classes":"ui-button ui-widget ui-state-default ui-button-text-only"},{"id":"j_idt97","val":"Evet","onclick":null,"classes":"ui-button ui-widget ui-state-default ui-button-text-icon-left ui-confirmdialog-yes"},{"id":"j_idt98","val":"Hayır","onclick":null,"classes":"ui-button ui-widget ui-state-default ui-button-text-icon-left ui-confirmdialog-no"}]}
```

### Answer

Analiz raporu aşağıdadır:

Sistem, **Jakarta Faces (JSF)** ve **PrimeFaces 15** kütüphanelerini kullanan kurumsal bir Java tabanlı mimari ile çalışmaktadır. Bu sistemlerde geleneksel REST API endpoint'leri yerine, sayfanın kendi URL'sine yapılan **POST** istekleri ve "Partial Page Rendering" (Kısmi Sayfa Güncelleme) mekanizması kullanılır.

### 1. Endpoint Analizi
Sorgu yaparken kullanılan ana endpoint:
*   **URL:** `https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf`
*   **Yöntem:** HTTP POST
*   **İşleyiş:** Sayfa yenilenmeden, arka planda (AJAX/XHR) aynı URL'ye veri gönderilir ve sadece değişen tablo/grafik alanları sunucudan gelen XML yanıtı ile güncellenir.

### 2. Sorgu Parametreleri (API Payload)
Sorgu butonuna basıldığında (`form:j_idt8635` - "GÖSTER" butonu), sunucuya aşağıdaki anahtar veriler gönderilir:
*   **`jakarta.faces.ViewState`:** Oturumun güvenliğini ve durumunu sağlayan kritik belirteç (token).
*   **`form:cihaz_input`:** Seçilen cihaz ID'si (Örn: `1108`).
*   **`form:olcumTipi_input`:** Ölçüm türü (Örn: `PQ` - Power Quality).
*   **`form:baslangicZamani_input` & `form:bitisZamani_input`:** Tarih aralıkları.
*   **`form:fazId_input`:** Seçilen faz bilgisi.

### 3. Kullanılan Tablolar ve Veri Kaynakları (DOM Yapısı)
Sayfada verilerin işlendiği ve gösterildiği tespit edilen bileşenler:
*   **`div#form:gerilim_panel` / `div#form:cihaz_panel`:** Dinamik açılır listeler (SelectOneMenu).
*   **`div#growlMessage_container`:** Sorgu sonuçları veya hatalar için kullanılan bildirim katmanı.
*   **AmCharts 5:** Sayfadaki grafiklerin çizimi için `amcharts5/index.js` ve `xy.js` kütüphaneleri kullanılıyor. Bu, verilerin grafiksel olarak da sunulduğunu gösterir.
*   **Google Maps API:** Harita tabanlı lokasyon analizi için entegre edilmiştir.

### 4. Veri Transfer Formatı
*   **İstek (Request):** `application/x-www-form-urlencoded` formatında form verisi.
*   **Yanıt (Response):** `text/xml` formatında, PrimeFaces'e özel `<partial-response>` blokları.

**Özet:** Bu sayfada bağımsız bir JSON API bulunmamaktadır. Veriler, JSF Lifecycle üzerinden sunucu tarafında (Server-Side) işlenip HTML/XML parçacıkları olarak döner. Eğer bu verileri dışarıdan almak isterseniz, `jakarta.faces.ViewState` değerini koruyarak aynı POST isteğini taklit etmeniz gerekir.
## AI

### Analyzing the prompt

**Data used:**
````
* Element's uid is 422.
* Its selector is `body`
* It has 15 child element nodes: `span#j_idt19` (uid=423), `div#main` (uid=425), `script` (uid=2734), `span#growlMessage` (uid=2735), `div#j_idt96` (uid=2737), `div#j_idt99` (uid=2755), `div#ui-datepicker-div` (uid=382), `div#growlMessage_container` (uid=2790), `.ui-dialog-docking-zone` (uid=2795), `a#bottomBar` (uid=2912), `div#monica-content-root` (uid=2915), `div#form\:gerilim_panel` (uid=3854), `div#form\:fazId_panel` (uid=3882), `div#form\:olcumTipi_panel` (uid=3920), `div#form\:cihaz_panel` (uid=4737)
* It doesn't have any child text nodes
* It has a previous sibling and it is an element (uid=421) node
* Its parent's selector is `html.trancy-und` (uid=381)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=384), `link` (uid=421), `body` (uid=422)
````

### Tablo ve Veri Yapısını İnceleme

Sorgu sonucunda oluşan tablo yapısını (PrimeFaces DataTable veya standart HTML table) ve grafik alanlarını tespit ederek kazıma stratejisi belirlemek istiyorum.

**Code executed:**
```
const data = {
  tables: Array.from(document.querySelectorAll('div.ui-datatable, table')).map(el => ({
    id: el.id,
    className: el.className,
    rowCount: el.querySelectorAll('tr').length,
    headers: Array.from(el.querySelectorAll('th')).map(th => th.innerText.trim())
  })),
  charts: !!document.querySelector('div[id*="chart"], .am5-html-container'),
  primefacesWidgets: typeof PrimeFaces !== 'undefined' ? Object.keys(PrimeFaces.widgets).filter(w => w.includes('table') || w.includes('Table')) : []
};
```

**Data returned:**
```
{"tables":[{"id":"","className":"","rowCount":1,"headers":[]},{"id":"","className":"","rowCount":2,"headers":[]}],"charts":true,"primefacesWidgets":[]}
```

### Dinamik Veri Kaplarını Arama

Görünürde standart bir HTML tablosu çok az satıra sahip (rowCount: 1, 2). Bu durum verilerin dinamik bir panel, rapor motoru veya grafik içinde olabileceğini gösterir. Verinin nerede saklandığını bulmak için büyük metin içeren div'leri inceliyorum.

**Code executed:**
```
const data = {
  dynamicContent: Array.from(document.querySelectorAll('#form div')).filter(el => el.innerText.length > 50).map(el => ({
    id: el.id,
    preview: el.innerText.substring(0, 100),
    tag: el.tagName
  })),
  possibleDataContainers: Array.from(document.querySelectorAll('.ui-outputpanel, .ui-panel-content, [id*="table"], [id*="rapor"]')).map(el => ({
    id: el.id,
    className: el.className,
    textLength: el.innerText.length
  }))
};
```

**Data returned:**
```
{"dynamicContent":[{"id":"form:toolbar","preview":"BAŞLANGIÇ ZAMANI:\t\tGERİLİM SEVİYESİ:\t\nHepsi\n400 kV\n154 kV\n66 kV\n33 kV\nHepsi\n\tFAZ:\t\nTek Faz\nÜç Faz\nTe","tag":"DIV"},{"id":"","preview":"BAŞLANGIÇ ZAMANI:\t\tGERİLİM SEVİYESİ:\t\nHepsi\n400 kV\n154 kV\n66 kV\n33 kV\nHepsi\n\tFAZ:\t\nTek Faz\nÜç Faz\nTe","tag":"DIV"},{"id":"form:cihaz","preview":"Cihaz seçiniz\nAĞAÇÖREN SKM, 400 kV KAPASİTÖR BANK GÜNEY (YEŞİLHİSAR - TEMELLİ - II) (2653)\nAĞAÇÖREN ","tag":"DIV"},{"id":"","preview":"Cihaz seçiniz\nAĞAÇÖREN SKM, 400 kV KAPASİTÖR BANK GÜNEY (YEŞİLHİSAR - TEMELLİ - II) (2653)\nAĞAÇÖREN ","tag":"DIV"},{"id":"container","preview":"Aktif Güç: -0,87 MW\nReaktif Güç: 18,11 MVAr\nGörünen Güç: 18,14 MVA\n20\n10.05.2026 17:32:30\n: kV\n: kV\n","tag":"DIV"},{"id":"guc","preview":"Aktif Güç: -0,87 MW\nReaktif Güç: 18,11 MVAr\nGörünen Güç: 18,14 MVA\n20\n10.05.2026 17:32:30","tag":"DIV"},{"id":"","preview":"Aktif Güç: -0,87 MW\nReaktif Güç: 18,11 MVAr\nGörünen Güç: 18,14 MVA\n20\n10.05.2026 17:32:30","tag":"DIV"},{"id":"","preview":"Aktif Güç: -0,87 MW\nReaktif Güç: 18,11 MVAr\nGörünen Güç: 18,14 MVA\n20\n10.05.2026 17:32:30","tag":"DIV"}],"possibleDataContainers":[{"id":"formMenu:raporIslemleri","className":"ui-widget ui-menuitem ui-menu-parent","textLength":0},{"id":"formMenu:raporlamaMotoru","className":"ui-widget ui-menuitem ui-menu-parent","textLength":62},{"id":"formMenu:raporSorgusu","className":"ui-menuitem-link","textLength":22},{"id":"panel_content","className":"ui-panel-content ui-widget-content","textLength":11097},{"id":"j_idt8618_content","className":"ui-panel-content ui-widget-content","textLength":11050}]}
```

### Answer

Sorgu sonuçlarını kazımak için sistemin yapısına göre iki farklı yöntem izleyebilirsiniz. Bu sayfada veriler doğrudan bir HTML tablosu yerine, genellikle dinamik paneller (`panel_content`) içinde veya **AmCharts** grafik objelerinde tutulmaktadır.

### Yöntem 1: JavaScript ile Tarayıcı Konsolu Üzerinden Kazıma
Veriler sayfada yüklü olduğu için aşağıdaki script'i Tarayıcı Konsolu'na (F12 > Console) yapıştırarak metin tabanlı verileri çekebilirsiniz:


`````js
// panel_content içindeki verileri satır bazlı yakalar
let rawData = document.querySelector('#panel_content').innerText;
let lines = rawData.split('\n').filter(line => line.trim() !== "");

// Verileri CSV formatına benzer şekilde konsola dök
console.table(lines.map(line => ({ "Veri Satırı": line })));
`````


### Yöntem 2: AmCharts Grafik Verilerini Çekme (Daha Hassas)
Sayfada AmCharts kullanıldığı için veriler aslında birer JavaScript dizisi (array) olarak mevcuttur. Eğer veriler grafik üzerindeyse şu yöntemle ham veriye ulaşabilirsiniz:


`````js
// AmCharts 5 verilerini yakalamaya çalışır
am5.registry.rootElements.forEach(root => {
  root.container.children.values.forEach(chart => {
    if(chart.series) {
      chart.series.values.forEach(s => {
        console.log("Seri Adı:", s.get("name"));
        console.log("Veriler:", s.data.values);
      });
    }
  });
});
`````


### Yöntem 3: Python (Selenium) ile Otomatik Kazıma
Eğer bu işlemi düzenli yapacaksanız, Selenium kullanarak şu adımları izlemelisiniz:
1.  **Formu Doldur:** Tarih, Cihaz ve Ölçüm Tipi alanlarını `send_keys` ile doldurun.
2.  **Sorgula:** `form:j_idt8635` ID'li butona `click()` yapın.
3.  **Bekle:** Verilerin yüklenmesi için `WebDriverWait` ile `panel_content` elementinin güncellenmesini bekleyin.
4.  **Veriyi Al:** `driver.find_element(By.ID, "panel_content").text` ile veriyi çekin veya `BeautifulSoup` ile parse edin.

### Dikkat Edilmesi Gerekenler:
*   **ViewState

## AI

### Analyzing the prompt

**Data used:**
````
* Element's uid is 422.
* Its selector is `body`
* It has 15 child element nodes: `span#j_idt19` (uid=423), `div#main` (uid=425), `script` (uid=2734), `span#growlMessage` (uid=2735), `div#j_idt96` (uid=2737), `div#j_idt99` (uid=2755), `div#ui-datepicker-div` (uid=382), `div#growlMessage_container` (uid=2790), `.ui-dialog-docking-zone` (uid=2795), `a#bottomBar` (uid=2912), `div#monica-content-root` (uid=2915), `div#form\:gerilim_panel` (uid=3854), `div#form\:fazId_panel` (uid=3882), `div#form\:olcumTipi_panel` (uid=3920), `div#form\:cihaz_panel` (uid=4737)
* It doesn't have any child text nodes
* It has a previous sibling and it is an element (uid=421) node
* Its parent's selector is `html.trancy-und` (uid=381)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=384), `link` (uid=421), `body` (uid=422)
````

### Detaylı Bileşen ve Veri Analizi

Analizi derinleştirmek için sayfadaki dinamik tablo yapılarını, grafik alanlarını, gizli veri alanlarını ve gömülü script bloklarını inceliyorum. Bu, verinin tam olarak hangi DOM elementlerine basıldığını anlamamı sağlayacak.

**Code executed:**
```
const data = {
  dynamicTables: Array.from(document.querySelectorAll('div[id^="form:"]')).filter(el => el.className.includes('ui-datatable') || el.className.includes('ui-panel')),
  charts: Array.from(document.querySelectorAll('div')).filter(el => el.id.toLowerCase().includes('chart') || el.className.toLowerCase().includes('chart')),
  dialogs: Array.from(document.querySelectorAll('.ui-dialog')).map(d => ({ id: d.id, title: d.querySelector('.ui-dialog-title')?.innerText })),
  hiddenDataFields: Array.from(document.querySelectorAll('input[type="hidden"]')).map(i => ({ name: i.name, value: i.value.length > 50 ? i.value.substring(0, 50) + '...' : i.value })),
  scriptsInBody: Array.from(document.querySelectorAll('body > script')).map(s => s.innerText.substring(0, 200))
};
```

**Data returned:**
```
{"dynamicTables":[],"charts":[],"dialogs":[{"id":"j_idt96","title":""}],"hiddenDataFields":[{"name":"formMenu","value":"formMenu"},{"name":"formMenu:j_idt36","value":"formMenu:j_idt36"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"},{"name":"form","value":"form"},{"name":"jakarta.faces.ViewState","value":"-2013264473584112054:-3042489964169619854"}],"scriptsInBody":[""]}
```

### İçerik ve Panel Yapısının İncelenmesi

Sayfanın ana içerik alanını (#main) ve 'form:' ön ekiyle başlayan tüm elementleri inceliyorum. Bu, PrimeFaces tarafından yönetilen ve sorgu sonucunda güncellenen tabloları, grafik konteynerlarını veya veri panellerini bulmamı sağlayacak.

**Code executed:**
```
const data = {
  mainContent: document.querySelector('#main')?.innerHTML.substring(0, 1000),
  allPanelIds: Array.from(document.querySelectorAll('[id]'))
    .filter(el => el.id.includes('form:'))
    .map(el => ({id: el.id, tag: el.tagName, class: el.className})),
  possibleDataContainers: Array.from(document.querySelectorAll('.ui-widget-content, .ui-panel-content'))
    .map(el => ({id: el.id, textSample: el.innerText.substring(0, 100).replace(/\n/g, ' ')})).slice(0, 10)
};
```

**Data returned:**
```
{"mainContent":"\n\t\t\t<div id=\"header\">\n\t\t\t\t<div class=\"saat\">\n\t\t\t\t\t<strong><span id=\"j_idt21\" class=\"ui-clock ui-widget ui-widget-header\">10.05.2026 17:51:11</span>\n\t\t\t\t\t</strong>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<div style=\"width: 100%\"></div>\n\t\t\t<div id=\"menu\">\n<form id=\"formMenu\" name=\"formMenu\" method=\"post\" action=\"/ytbs/YTBSAnaSayfa.jsf\" enctype=\"application/x-www-form-urlencoded\">\n<input type=\"hidden\" name=\"formMenu\" value=\"formMenu\">\n<div id=\"formMenu:mb\" class=\"menubar ui-menu ui-menubar ui-widget ui-widget-content ui-helper-clearfix\"><ul role=\"menubar\" aria-orientation=\"horizontal\" class=\"ui-menu-list ui-helper-reset\" tabindex=\"-1\"><li class=\"ui-menuitem ui-menubar-start ui-widget\" role=\"none\"><a id=\"formMenu:j_idt24\" href=\"#\" class=\"ui-commandlink ui-widget\" onclick=\"PrimeFaces.addSubmitParam('formMenu',{'formMenu:j_idt24':'formMenu:j_idt24'}).submit('formMenu');return false;\"><img src=\"/ytbs/img/logo/ytbs.png\" alt=\"Anasayfa\" height=\"30\"></a></li><li id=\"formMenu:taminlamaIslemleri\" class=\"ui-widget ","allPanelIds":[{"id":"form:toolbar","tag":"DIV","class":"ui-toolbar ui-widget ui-widget-header"},{"id":"form:j_idt8620","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:baslangicZamani","tag":"SPAN","class":"ui-calendar ui-inputwrapper-filled"},{"id":"form:baslangicZamani_input","tag":"INPUT","class":"ui-inputfield ui-widget ui-state-default ui-state-filled hasDatepicker"},{"id":"form:j_idt8621","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:gerilim","tag":"DIV","class":"ui-selectonemenu ui-widget ui-state-default"},{"id":"form:gerilim_input","tag":"SELECT","class":""},{"id":"form:gerilim_label","tag":"SPAN","class":"ui-selectonemenu-label ui-inputfield"},{"id":"form:j_idt8624","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:fazId","tag":"DIV","class":"ui-selectonemenu ui-widget ui-state-default"},{"id":"form:fazId_input","tag":"SELECT","class":""},{"id":"form:fazId_label","tag":"SPAN","class":"ui-selectonemenu-label ui-inputfield"},{"id":"form:j_idt8627","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:j_idt8628","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:bitisZamani","tag":"SPAN","class":"ui-calendar ui-inputwrapper-filled"},{"id":"form:bitisZamani_input","tag":"INPUT","class":"ui-inputfield ui-widget ui-state-default ui-state-filled hasDatepicker"},{"id":"form:j_idt8629","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:olcumTipi","tag":"DIV","class":"ui-selectonemenu ui-widget ui-state-default"},{"id":"form:olcumTipi_input","tag":"SELECT","class":""},{"id":"form:olcumTipi_label","tag":"SPAN","class":"ui-selectonemenu-label ui-inputfield"},{"id":"form:j_idt8632","tag":"LABEL","class":"ui-outputlabel ui-widget"},{"id":"form:cihaz","tag":"DIV","class":"ui-selectonemenu ui-widget ui-state-default"},{"id":"form:cihaz_input","tag":"SELECT","class":""},{"id":"form:cihaz_label","tag":"SPAN","class":"ui-selectonemenu-label ui-inputfield"},{"id":"form:j_idt8635","tag":"BUTTON","class":"ui-button ui-widget ui-state-default ui-button-text-only"},{"id":"form:j_idt8636","tag":"svg","class":{}},{"id":"form:gerilim_panel","tag":"DIV","class":"ui-selectonemenu-panel ui-widget ui-widget-content ui-helper-hidden ui-shadow ui-input-overlay"},{"id":"form:gerilim_filter","tag":"INPUT","class":"ui-selectonemenu-filter ui-inputfield ui-inputtext ui-widget ui-state-default"},{"id":"form:fazId_panel","tag":"DIV","class":"ui-selectonemenu-panel ui-widget ui-widget-content ui-helper-hidden ui-shadow ui-input-overlay"},{"id":"form:fazId_filter","tag":"INPUT","class":"ui-selectonemenu-filter ui-inputfield ui-inputtext ui-widget ui-state-default"},{"id":"form:olcumTipi_panel","tag":"DIV","class":"ui-selectonemenu-panel ui-widget ui-widget-content ui-helper-hidden ui-shadow ui-input-overlay"},{"id":"form:olcumTipi_filter","tag":"INPUT","class":"ui-selectonemenu-filter ui-inputfield ui-inputtext ui-widget ui-state-default"},{"id":"form:cihaz_panel","tag":"DIV","class":"ui-selectonemenu-panel ui-widget ui-widget-content ui-helper-hidden ui-shadow ui-input-overlay"},{"id":"form:cihaz_filter","tag":"INPUT","class":"ui-selectonemenu-filter ui-inputfield ui-inputtext ui-widget ui-state-default"}],"possibleDataContainers":[{"id":"formMenu:mb","textSample":""},{"id":"","textSample":"ŞaltTrafo MerkeziBaraBara GrubuFiderFider DetayFider DüzeniFider BağlantısıAnahtarİletimDirek TürüDi"},{"id":"","textSample":"Trafo MerkeziBaraBara GrubuFiderFider DetayFider DüzeniFider BağlantısıAnahtar"},{"id":"","textSample":"Direk TürüDirekHat TürüHatHat GüzergahıDağıtım Hattı\tTrafo TürüTrafoKuplajİç Bağlantı"},{"id":"","textSample":"Lisanslı SantralSantral DetayLisanssız Santral Çağrı MektubuLisanssız SantralLisanssız Santral Tarih"},{"id":"","textSample":"Depolama TesisiDepolama Tesisi TarihçeDepolama ÜnitesiDepolama Ünitesi Tarihçe"},{"id":"","textSample":"Şönt EkipmanŞönt Ekipman DetaySeri KapasitörSeri Kapasitör Detay"},{"id":"","textSample":"Kontrolcü TürüKontrolcüKontrolcü Durum ÖzetiGerilim Kontrolcüsü"},{"id":"","textSample":"YükPlanlanan YükUluslararası Bağlantı\t"},{"id":"","textSample":"Akım TrafosuGerilim TrafosuRöle"}]}
```

### Answer

Analizime devam ediyorum. Sayfanın teknik altyapısı ve veri işleme süreçlerine dair ek detaylar şöyledir:

### 1. Veri Kaynağı ve Sorgu Alanları
Sorgulama ekranı (`form` id'li yapı) üzerinden aşağıdaki tabloların veya veri setlerinin sorgulandığı görülmektedir:
*   **Zaman Bazlı Tablolar:** `form:baslangicZamani` ve `form:bitisZamani` (Takvim bileşenleri).
*   **Gerilim Bilgileri:** `form:gerilim` (Filtrelenebilir açılır liste).
*   **Faz Detayları:** `form:fazId` (L1, L2, L3 vb. faz seçimi).
*   **Ölçüm Türleri:** `form:olcumTipi` (Muhtemelen `PQ` gibi kalite ölçüm parametreleri).
*   **Cihaz Envanteri:** `form:cihaz` (Sistemdeki ölçüm cihazları).

### 2. Grafiksel Analiz (AmCharts & SVG)
Sorgu sonucunda sadece metinsel tablo değil, aynı zamanda görsel grafiklerin de üretildiği tespit edilmiştir:
*   **`form:j_idt8636`:** Bu bir SVG (Scalable Vector Graphics) elementidir. PrimeFaces'in `p:chart` veya benzeri bir grafik bileşeniyle, AmCharts kütüphanesini kullanarak **gerilim dalgalanmaları, yük eğrileri veya harmonik analizleri** gibi verileri görselleştirdiği anlaşılmaktadır.

### 3. Menü ve Navigasyon Yapısı (İlişkili Tablolar)
`formMenu` üzerindeki kategoriler, arka planda hangi veritabanı tablolarıyla ilişkili olabileceğine dair ipuçları vermektedir:
*   **Şalt/Trafo Merkezleri & Baralar:** Elektrik şebekesi topolojisi.
*   **Fider & Hat Bilgileri:** İletim hatları ve fider detayları.
*   **Santral Envanteri:** Lisanslı/Lisanssız santraller ve depolama tesisleri.
*   **Ekipman Detayları:** Akım/Gerilim trafoları, Röleler, Şönt ekipmanlar.

### 4. Dinamik Filtreleme Mekanizması
Sistemde kullanılan her bir seçici (`selectOneMenu`), kendi içinde bir arama/filtreleme motoruna (`ui-selectonemenu-filter`) sahiptir. Bu, çok büyük veri setleri (binlerce cihaz veya merkez) içinden hızlıca seçim yapabilmek için sunucu tarafına anlık (Partial Processing) istekler gönderildiğini gösterir.

### 5. Kritik Teknik Detay (ViewState Sürekliliği)
Sayfada birden fazla `jakarta.faces.ViewState` gizli alanı bulunmaktadır. Bu durum, sayfanın iç içe geçmiş formlar veya `p:dialog` (Örn: `j_idt96`) gibi modal pencereler barındırdığını, her bir etkileşimin sunucudaki "Session" (Oturum) durumuyla senkronize olduğunu gösterir.

**Sonuç:** Sorgu yaptığınızda sistem; seçtiğiniz tarih aralığı, cihaz ve ölçüm tipi parametrelerini kullanarak TEİAŞ'ın merkezi veritabanından (muhtemelen Oracle veya PostgreSQL tabanlı bir CBS/YS yapısı) ilgili teknik verileri çeker ve hem tablo hem de AmCharts grafik bileşenleri üzerinden size sunar.

Analiz etmemi istediğiniz özel bir tablo alanı veya grafik verisi var mı?

## AI

### Analyzing the prompt

**Data used:**
````
* Element's uid is 422.
* Its selector is `body`
* It has 15 child element nodes: `span#j_idt19` (uid=423), `div#main` (uid=425), `script` (uid=2734), `span#growlMessage` (uid=2735), `div#j_idt96` (uid=2737), `div#j_idt99` (uid=2755), `div#ui-datepicker-div` (uid=382), `div#growlMessage_container` (uid=2790), `.ui-dialog-docking-zone` (uid=2795), `a#bottomBar` (uid=2912), `div#monica-content-root` (uid=2915), `div#form\:gerilim_panel` (uid=3854), `div#form\:fazId_panel` (uid=3882), `div#form\:olcumTipi_panel` (uid=3920), `div#form\:cihaz_panel` (uid=4737)
* It doesn't have any child text nodes
* It has a previous sibling and it is an element (uid=421) node
* Its parent's selector is `html.trancy-und` (uid=381)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=384), `link` (uid=421), `body` (uid=422)
````

### Sorgu Sonucu Tablo ve Panel Analizi Junk

Sorgu sonucunda oluşan tablo yapısını (DataTable veya TreeTable) ve veri içeren panelleri bulmak için DOM'u tarıyorum. PrimeFaces genellikle verileri 'ui-datatable' sınıflı div'ler içine basar.

**Code executed:**
```
const data = {
  dataTables: Array.from(document.querySelectorAll('.ui-datatable, .ui-treetable')).map(table => ({
    id: table.id,
    headers: Array.from(table.querySelectorAll('.ui-datatable-header, th')).map(th => th.innerText.trim()),
    rowCount: table.querySelectorAll('.ui-datatable-data tr').length,
    summary: table.getAttribute('summary'),
    className: table.className
  })),
  panels: Array.from(document.querySelectorAll('.ui-panel, .ui-outputpanel')).filter(p => p.innerText.length > 50).map(p => ({
    id: p.id,
    textPreview: p.innerText.substring(0, 200).replace(/\n/g, ' ')
  })),
  visibleButtons: Array.from(document.querySelectorAll('button, .ui-button')).map(b => b.innerText)
};
```

**Data returned:**
```
{"dataTables":[],"panels":[{"id":"panel","textPreview":"MİLLİ GÜÇ KALİTESİ SİSTEMİ, GKÇ Ölçüm Verileri BAŞLANGIÇ ZAMANI:\t\tGERİLİM SEVİYESİ:\t Hepsi 400 kV 154 kV 66 kV 33 kV Hepsi \tFAZ:\t Tek Faz Üç Faz Tek Faz \t BİTİŞ ZAMANI:\t\tÖLÇÜM TİPİ:\t PQ PMU PQ \tCİHAZ:"},{"id":"j_idt8618","textPreview":"MİLLİ GÜÇ KALİTESİ SİSTEMİ, GKÇ Ölçüm Verileri BAŞLANGIÇ ZAMANI:\t\tGERİLİM SEVİYESİ:\t Hepsi 400 kV 154 kV 66 kV 33 kV Hepsi \tFAZ:\t Tek Faz Üç Faz Tek Faz \t BİTİŞ ZAMANI:\t\tÖLÇÜM TİPİ:\t PQ PMU PQ \tCİHAZ:"}],"visibleButtons":["Kılavuz sayfasına gitmek için tıklayınız.","YTBS Bilgi sayfasına gitmek için tıklayınız.","GÖSTER","Evet","Hayır"]}
```

### Sorgu Sonucu Konteynır Analizi

Sorgu sonucunun nerede görüntülendiğini tam olarak belirlemek için #main ve #form elementlerinin alt dallarını detaylıca inceliyorum. Tablo veya veri konteynerı olabilecek yapıları arıyorum.

**Code executed:**
```
const data = {
  mainDivChildIds: Array.from(document.querySelector('#main')?.children || []).map(el => ({
    id: el.id,
    tagName: el.tagName,
    className: el.className
  })),
  formChildren: Array.from(document.querySelector('form#form')?.children || []).map(el => ({
    id: el.id,
    tagName: el.tagName,
    className: el.className
  })),
  outputPanels: Array.from(document.querySelectorAll('.ui-outputpanel')).map(el => ({
    id: el.id,
    text: el.innerText.substring(0, 100)
  })),
  hasTable: !!document.querySelector('table, .ui-datatable, .ui-treetable')
};
```

**Data returned:**
```
{"mainDivChildIds":[{"id":"header","tagName":"DIV","className":""},{"id":"","tagName":"DIV","className":""},{"id":"menu","tagName":"DIV","className":""},{"id":"","tagName":"DIV","className":""}],"formChildren":[{"id":"","tagName":"INPUT","className":""},{"id":"form:toolbar","tagName":"DIV","className":"ui-toolbar ui-widget ui-widget-header"},{"id":"form:j_idt8636","tagName":"svg","className":{}},{"id":"container","tagName":"DIV","className":""},{"id":"","tagName":"INPUT","className":""}],"outputPanels":[],"hasTable":true}
```

### Konteyner ve Tablo Verisi Detaylı İnceleme

'#container' ID'li elementin içeriğini ve sayfadaki tüm HTML tablolarını inceliyorum. Ayrıca sorgu sonucunda oluşan SVG grafiğinin yapısına bakarak verinin nasıl sunulduğunu anlamaya çalışıyorum.

**Code executed:**
```
const data = {
  containerContent: document.querySelector('#container')?.innerHTML.substring(0, 1000),
  allTables: Array.from(document.querySelectorAll('table')).map(t => ({
    id: t.id,
    headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText),
    firstRow: Array.from(t.querySelectorAll('tr:nth-child(2) td')).map(td => td.innerText)
  })),
  isDataTablePresent: !!document.querySelector('.ui-datatable'),
  specificData: document.querySelector('#form\\:j_idt8636')?.outerHTML.substring(0, 500)
};
```

**Data returned:**
```
{"containerContent":"\n\t\t<script src=\"JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js\" type=\"text/javascript\"></script>\n\t\t<div id=\"guc\" style=\"width: 100%; height: 500px; float: left; margin: auto;\"><div style=\"position: relative; width: 100%; height: 100%;\"><div aria-hidden=\"true\" style=\"position: absolute; width: 915px; height: 500px;\"><div><canvas class=\"am5-layer-0\" width=\"1143\" height=\"625\" style=\"position: absolute; top: 0px; left: 0px; width: 915px; height: 500px;\"></canvas><canvas class=\"am5-layer-30\" width=\"1143\" height=\"625\" style=\"position: absolute; top: 0px; left: 0px; width: 915px; height: 500px;\"></canvas></div></div><div class=\"am5-html-container\" style=\"position: absolute; pointer-events: none; overflow: hidden; width: 915px; height: 500px;\"></div><div class=\"am5-reader-container\" role=\"alert\" style=\"position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px);\"></div><div class=\"am5-focus-container\" role=\"graphics-document\" style=\"position: absolute","allTables":[{"id":"","headers":[],"firstRow":[]},{"id":"","headers":[],"firstRow":["BİTİŞ ZAMANI:","","ÖLÇÜM TİPİ:","PQ\nPMU\nPQ","CİHAZ:","Cihaz seçiniz\nAĞAÇÖREN SKM, 400 kV KAPASİTÖR BANK GÜNEY (YEŞİLHİSAR - TEMELLİ - II) (2653)\nAĞAÇÖREN SKM, 400 kV KAPASİTÖR BANK KUZEY (YEŞİLHİSAR - TEMELLİ - I ) (2652)\nAĞAÇÖREN SKM, 400 kV YEŞİLHİSAR - TEMELLİ -HAT 1 E.İ. HATTI SAPLAMA (2648)\nAĞAÇÖREN SKM, 400 kV YEŞİLHİSAR - TEMELLİ -HAT 2 E.İ. HATTI SAPLAMA (2649)\nAKKÖPRÜ GİS, 154 kV HASKÖY GİS KABLO (391)\nAKKÖPRÜ GİS, 33 kV TRANSFORMATÖR A (388)\nAKKÖPRÜ GİS, 33 kV TRANSFORMATÖR B (389)\nAKKÖPRÜ GİS, 33 kV TRANSFORMATÖR C (390)\nAKYEL 1 RES, 154 kV TRANSFORMATÖR A (2274)\nAKYEL 1 RES, 154 kV TRANSFORMATÖR B (2275)\nARDIÇLI RES, 154 kV TRANSFORMATÖR A (1857)\nARDIÇLI RES, 154 kV TRANSFORMATÖR B (1858)\nATAKALE RES, 154 kV TRANSFORMATÖR A (2292)\nAYBASTI RES, 154 kV TRANSFORMATÖR (2713)\nBAĞLAR RES, 154 kV TRANSFORMATÖR A (1978)\nBAĞLAR RES, 154 kV TRANSFORMATÖR B (1979)\nBAĞLUM, 154 kV BANK A (386)\nBAĞLUM, 154 kV BANK B (387)\nBAĞLUM, 400 kV KAYABAŞI MEHMET ESEN (385)\nBAĞLUM, 400 kV SİNCAN (384)\nBALGAT, 154 kV ÇİĞDEM GİS KABLO (1063)\nBALGAT, 154 kV MALTEPE GİS KABLO (1064)\nBALGAT, 154 kV TRANSFORMATÖR A (7)\nBALGAT, 154 kV TRANSFORMATÖR B (271)\nBALGAT, 33 kV TRANSFORMATÖR A (270)\nBALGAT, 33 kV TRANSFORMATÖR B (8)\nBAŞTAŞ, 154 kV KAYAŞ (462)\nBAŞTAŞ, 154 kV KIRIKKALE (1108)\nBAŞTAŞ, 33 kV TRANSFORMATÖR A (1109)\nBAŞTAŞ, 33 kV TRANSFORMATÖR B (463)\nBAYRAMHACILI HES, 154 kV TRANSFORMATÖR GRUP 1 (1633)\nBAYRAMHACILI HES, 154 kV TRANSFORMATÖR GRUP 2 (1634)\nÇAMINBAŞI RES, 154 kV KUYULUKOYAK RES (2270)\nÇAYIRHAN TES, 400 kV ADAPAZARI (289)\nÇAYIRHAN TES, 400 kV SİNCAN (290)\nÇAYIRHAN TES, 400 kV TRANSFORMATÖR GRUP 3 (1000)\nÇAYIRHAN TES, 400 kV TRANSFORMATÖR GRUP 4 (1001)\nDDY ARAPLI, 154 kV TRANSFORMATÖR A (1967)\nDDY AŞAĞIPINARBAŞI, 154 kV TRANSFORMATÖR TR-1 (1894)\nDDY AŞAĞIPINARBAŞI, 154 kV TRANSFORMATÖR TR-2 (1895)\nDDY BEYLİKKÖPRÜ, 154 kV TRANSFORMATÖR A (1878)\nDDY BOĞAZKÖPRÜ, 154 kV TRANSFORMATÖR A (1969)\nDDY BOR, 154 kV TRANSFORMATÖR A (1968)\nDDY ÇAYIRBAŞI, 154 kV TRANSFORMATÖR TR-1 (1898)\nDDY ÇAYIRBAŞI, 154 kV TRANSFORMATÖR TR-2 (1899)\nDDY ÇUMRA, 154 kV KARATAY - ÇUMRA E.İ. HATTI SAPLAMA (2110)\nDDY ETİMESGUT, 154 kV TRANSFORMATÖR A (1890)\nDDY ETİMESGUT, 154 kV TRANSFORMATÖR B (1891)\nDDY ETİMESGUT, 24 kV TRANSFORMATÖR A (2085)\nDDY GÖZLÜ, 154 kV TRANSFORMATÖR TR-1 (1896)\nDDY GÖZLÜ, 154 kV TRANSFORMATÖR TR-2 (1897)\nDDY KARAMAN, 154 kV DİANA OTEL GES - KARAMAN E.İ. HATTI SAPLAMA (2119)\nDDY KOCAHACILI, 154 kV TRANSFORMATÖR A (1892)\nDDY KOCAHACILI, 154 kV TRANSFORMATÖR B (1893)\nDDY MALİKÖY, 154 kV TRANSFORMATÖR A (1889)\nDDY NENEK, 154 kV TRANSFORMATÖR A (1977)\nDDY SAZAK, 154 kV TRANSFORMATÖR A (1862)\nERCİYES RES, 154 kV TRANSFORMATÖR A (2535)\nESENBOĞA, 154 kV TRANSFORMATÖR A (272)\nESENBOĞA, 33 kV TRANSFORMATÖR B (66)\nETİ SODA, 154 kV BEYPAZARI (1198)\nETİ SODA, 154 kV ÇAYIRHAN TES (1199)\nGEYCEK RES, 154 kV TRANSFORMATÖR A (1439)\nGEYCEK RES, 154 kV TRANSFORMATÖR B (1440)\nGÖKÇEKAYA HES, 10.5 kV GRUP 1 (1882)\nGÖKÇEKAYA HES, 10.5 kV GRUP 2 (1883)\nGÖKÇEKAYA HES, 10.5 kV GRUP 3 (1884)\nGÖKÇEKAYA HES, 400 kV AKSA GÖYNÜK TES (1983)\nGÖKÇEKAYA HES, 400 kV ESKİŞEHİR 3 (1982)\nGÖKÇEKAYA HES, 400 kV GÖLBAŞI (1981)\nGÖLBAŞI, 154 kV YEDEK 2 (273)\nGÖLBAŞI, 154 kV YEDEK 4 (363)\nGÖLBAŞI, 33 kV YEDEK (364)\nGÖLBAŞI, 33 kV YEDEK 50 (274)\nGÖLBAŞI, 400 kV GÖKÇEKAYA HES (362)\nGÖLBAŞI, 400 kV İÇANADOLU DGKÇS (23)\nGÖLBAŞI, 400 kV KAYAŞ (25)\nGÖLBAŞI, 400 kV KAYSERİ KAPASİTÖR GÜNEY (361)\nGÖLBAŞI, 400 kV KAYSERİ KAPASİTÖR KUZEY (360)\nGÖLBAŞI, 400 kV SİNCAN (359)\nHACILAR, 33 kV TRANSFORMATÖR C (1602)\nHACILAR, 33 kV TRANSFORMATÖR D (1603)\nHİRFANLI HES, 10.5 kV GRUP 1 (1935)\nHİRFANLI HES, 10.5 kV GRUP 2 (1936)\nHİRFANLI HES, 10.5 kV GRUP 3 (1937)\nHİRFANLI HES, 10.5 kV GRUP 4 (1938)\nHİRFANLI HES, 154 kV TRANSFORMATÖR GRUP 1 (1931)\nHİRFANLI HES, 154 kV TRANSFORMATÖR GRUP 2 (1932)\nHİRFANLI HES, 154 kV TRANSFORMATÖR GRUP 3 (1933)\nHİRFANLI HES, 154 kV TRANSFORMATÖR GRUP 4 (1934)\nİÇANADOLU DGKÇS, 400 kV TRANSFORMATÖR GRUP 1 (1721)\nİÇANADOLU DGKÇS, 400 kV TRANSFORMATÖR GRUP 2 (1720)\nİÇANADOLU DGKÇS, 400 kV TRANSFORMATÖR GRUP 3 (1719)\nKALECİK, 33 kV KALECİK HES (1789)\nKAPULUKAYA HES, 10.5 kV GRUP 1 (1869)\nKAPULUKAYA HES, 10.5 kV GRUP 2 (1870)\nKAPULUKAYA HES, 10.5 kV GRUP 3 (1871)\nKAPULUKAYA HES, 154 kV HACILAR (1872)\nKARAMAN, 154 kV DİANA OTEL GES (433)\nKARAMAN, 154 kV GEZENDE HES (435)\nKARAMAN, 154 kV KARAMAN OSB (2544)\nKARAMAN, 33 kV TRANSFORMATÖR A (434)\nKARAPINAR, 154 kV EREĞLİ KONYA (2453)\nKARAPINAR, 154 kV KARAPINAR ACIGÖL HAT1 (2452)\nKARATAY, 154 kV BANK A (396)\nKARATAY, 154 kV BANK B (397)\nKARATAY, 154 kV KAPASİTÖR (2607)\nKARATAY, 154 kV KAPASİTÖR NÖTR BARA (2608)\nKARATAY, 33 kV TRANSFORMATÖR B (399)\nKARATAY, 400 kV KARAPINAR MEKE GÖLÜ (394)\nKARATAY, 400 kV KONYA KUZEY (398)\nKARATAY, 400 kV MERSİN 380 (395)\nKAYACIK, 33 kV ORGANİZE SANAYİ 1 (YENİ) (1698)\nKAYACIK, 33 kV ORGANİZE SANAYİ 2 (YENİ) (1699)\nKAYACIK, 33 kV ORGANİZE SANAYİ 3 (1700)\nKAYACIK, 33 kV ORGANİZE SANAYİ 4 (1701)\nKAYACIK, 33 kV ORGANİZE SANAYİ 5 (1702)\nKAYACIK, 33 kV ORGANİZE SANAYİ 6 (1703)\nKAYSERİ 2, 33 kV MİMAR SİNAN OSB 1 (1308)\nKAYSERİ 2, 33 kV MİMAR SİNAN OSB 2 (1309)\nKAYSERİ 3, 33 kV DM 5-1 (1356)\nKAYSERİ 3, 33 kV DM 5-2 (1357)\nKAYSERİ 3, 33 kV ERCİYES 13-1 (1355)\nKAYSERİ 3, 33 kV ERCİYES 13-2 (1354)\nKAYSERİ 3, 33 kV TRANSFORMATÖR A (1351)\nKAYSERİ 3, 33 kV TRANSFORMATÖR B (1352)\nKAYSERİ 3, 33 kV TRANSFORMATÖR C (1353)\nKAYSERİ 4, 33 kV TRANSFORMATÖR A (1360)\nKAYSERİ 4, 33 kV TRANSFORMATÖR B (1361)\nKAYSERİ KAPASİTÖR, 154 kV BANK A (713)\nKAYSERİ KAPASİTÖR, 154 kV BANK B (714)\nKAYSERİ KAPASİTÖR, 33 kV TRANSFORMATÖR A (715)\nKAYSERİ KAPASİTÖR, 400 kV ELBİSTAN TES (708)\nKAYSERİ KAPASİTÖR, 400 kV GÖLBAŞI GÜNEY (712)\nKAYSERİ KAPASİTÖR, 400 kV GÖLBAŞI KUZEY (711)\nKAYSERİ KAPASİTÖR, 400 kV KEBAN ŞALT GÜNEY (710)\nKAYSERİ KAPASİTÖR, 400 kV KEBAN ŞALT KUZEY (709)\nKAZAN, 154 kV TRANSFORMATÖR A (766)\nKAZAN, 154 kV TRANSFORMATÖR B (768)\nKAZAN, 33 kV TRANSFORMATÖR A (767)\nKAZAN, 33 kV TRANSFORMATÖR B (769)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR (1810)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR GRUP 1 (1812)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR GRUP 2 (1811)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-1 (1804)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-2 (1805)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-3 (1806)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-4 (1807)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-5 (1808)\nKAZAN DGKÇS, 154 kV TRANSFORMATÖR PROSES-6 (1809)\nKEPEZKAYA HAVZA, 33 kV DAMLAPINAR-1 (1422)\nKEPEZKAYA HAVZA, 33 kV DAMLAPINAR-2 (1423)\nKEPEZKAYA HAVZA, 33 kV YAPISAN-1 (1582)\nKEPEZKAYA HAVZA, 33 kV YAPISAN-2 (1583)\nKEPEZKAYA HES, 154 kV TRANSFORMATÖR GRUP 1 (1391)\nKEPEZKAYA HES, 154 kV TRANSFORMATÖR GRUP 2 (1392)\nKIRDEMİR, 154 kV HACILAR HAT+TRANSFORMATÖR (1599)\nKIRIKKALE DGKÇS, 400 kV TRANSFORMATÖR GRUP 1 (1821)\nKIRIKKALE DGKÇS, 400 kV TRANSFORMATÖR GRUP 2 (1823)\nKIRIKKALE DGKÇS, 400 kV TRANSFORMATÖR GRUP 3 (1822)\nKIRŞEHİR 2, 33 kV TRANSFORMATÖR A (2650)\nKIRŞEHİR 2, 33 kV TRANSFORMATÖR B (2651)\nKONYA ÇİMENTO, 154 kV TRANSFORMATÖR A (1817)\nKONYA ÇİMENTO, 154 kV TRANSFORMATÖR B (1818)\nKONYA KUZEY, 154 kV BANK A (2454)\nKONYA KUZEY, 154 kV BANK B (2455)\nKURTKAYASI RES, 154 kV TRANSFORMATÖR A (1709)\nKUYULUKOYAK RES, 154 kV TRANSFORMATÖR A (2259)\nMACUNKÖY, 154 kV AKKÖPRÜ GİS HAT1 (923)\nMACUNKÖY, 154 kV ANKARA SANAYİ (922)\nMACUNKÖY, 33 kV TRANSFORMATÖR A (920)\nMACUNKÖY, 33 kV TRANSFORMATÖR B (921)\nMALTEPE ANKARA GİS, 154 kV TRANSFORMATÖR A (279)\nMALTEPE ANKARA GİS, 154 kV TRANSFORMATÖR D (281)\nMALTEPE ANKARA GİS, 33 kV TRANSFORMATÖR C (284)\nMALTEPE ANKARA GİS, 33 kV TRANSFORMATÖR D (282)\nMALTEPE ANKARA GİS, 6.3 kV TRANSFORMATÖR A (280)\nMALTEPE ANKARA GİS, 6.3 kV TRANSFORMATÖR B (283)\nMAVİ HES, 154 kV TRANSFORMATÖR GRUP 1 (2316)\nMUTLU RES 5, 154 kV TRANSFORMATÖR (2227)\nNİĞDE OSB, 33 kV ORGANIZE-1 (1364)\nNİĞDE OSB, 33 kV ORGANIZE-2 (1365)\nNİĞDE OSB, 33 kV ORGANIZE-3 (1366)\nNİĞDE OSB, 33 kV ORGANIZE-4 (1367)\nNİĞDE OSB, 33 kV ORGANIZE-5 (1696)\nNİĞDE OSB, 33 kV ORGANIZE-6 (1697)\nPETLAS, 33 kV ORGANİZE SANAYİ-1 (2493)\nPETLAS, 33 kV ORGANİZE SANAYİ-2 (2494)\nPETLAS, 33 kV TRANSFORMATÖR C (2491)\nPETLAS, 33 kV TRANSFORMATÖR D (2492)\nPETLAS, 6.3 kV TRANSFORMATÖR A (1124)\nPETLAS, 6.3 kV TRANSFORMATÖR B (1125)\nPOLATLI ÇİMENTO, 154 kV TRANSFORMATÖR A (1854)\nPOLATLI ÇİMENTO, 154 kV TRANSFORMATÖR B (1855)\nSARIYAR HES, 10.5 kV GRUP 1 (1110)\nSARIYAR HES, 10.5 kV GRUP 2 (1111)\nSARIYAR HES, 10.5 kV GRUP 3 (1112)\nSARIYAR HES, 10.5 kV GRUP 4 (1113)\nSARIYAR HES, 10.5 kV YARDIMCI SERVİS 1 (1114)\nSARIYAR HES, 10.5 kV YARDIMCI SERVİS 2 (1115)\nSARIYAR HES, 154 kV NALLIHAN HAT1 (1887)\nSARIYAR HES, 154 kV NALLIHAN HAT2 (1888)\nSARIYAR HES, 154 kV YEDEK (1885)\nSARIYAR HES, 154 kV YEDEK 1 (1886)\nSİNCAN, 154 kV BANK A (33)\nSİNCAN, 154 kV BANK B (30)\nSİNCAN, 154 kV UZAY OSB (1030)\nSİNCAN, 33 kV ORGANİZE-6 (1172)\nSİNCAN, 33 kV ORGANİZE-7 (1177)\nSİNCAN, 33 kV ORGANİZE-8 (1178)\nSİNCAN, 33 kV TRANSFORMATÖR 5 (1797)\nSİNCAN, 33 kV TRANSFORMATÖR A (371)\nSİNCAN, 33 kV TRANSFORMATÖR B (372)\nSİNCAN, 33 kV TRANSFORMATÖR C (1031)\nSİNCAN, 400 kV BAĞLUM (370)\nSİNCAN, 400 kV BANK A OTOTRANSFORMATÖR 1 (32)\nSİNCAN, 400 kV BANK B OTOTRANSFORMATÖR 4 (31)\nSİNCAN, 400 kV ÇAYIRHAN TES (368)\nSİNCAN, 400 kV GÖLBAŞI (369)\nSİNCAN, 400 kV KIRIKKALE DGKÇS (34)\nSİNCAN, 400 kV OSMANCA (29)\nSİNCAN, 400 kV TEMELLİ (367)\nSİNCAN, 400 kV ÜRGÜP GÜNEY (366)\nSİNCAN, 400 kV ÜRGÜP KUZEY (365)\nTEMELLİ, 154 kV BAYMİNA DGKÇS HAT1 (350)\nTEMELLİ, 154 kV BAYMİNA DGKÇS HAT3 (351)\nTEMELLİ, 33 kV TRANSFORMATÖR A (378)\nTEMELLİ, 33 kV TRANSFORMATÖR B (377)\nTEMELLİ, 400 kV ADA 1 DGKÇS (375)\nTEMELLİ, 400 kV İGA GES (374)\nTEMELLİ, 400 kV SİNCAN (376)\nTEMELLİ, 400 kV YEŞİLHİSAR GÜNEY (373)\nTEMELLİ, 400 kV YEŞİLHİSAR KUZEY (286)\nTEMELLİ, 400 kV YUNUS EMRE TES (285)\nTÜMOSAN, 154 kV EŞMEKAYA (332)\nTÜMOSAN, 33 kV TRANSFORMATÖR B (333)\nÜMİTKÖY, 154 kV SİNCAN (918)\nÜMİTKÖY, 154 kV TEMELLİ HAT1 (919)\nÜMİTKÖY, 33 kV TRANSFORMATÖR A (916)\nÜMİTKÖY, 33 kV TRANSFORMATÖR B (917)\nÜRGÜP, 400 kV ÇOBANBEYLİ (2597)\nÜRGÜP, 400 kV ELBİSTAN TES (2596)\nÜRGÜP, 400 kV SİNCAN GÜNEY (2595)\nÜRGÜP, 400 kV SİNCAN KUZEY (2594)\nYAHYALI BAK RES, 154 kV TRANSFORMATÖR A (1767)\nYAHYALI BAK RES, 154 kV TRANSFORMATÖR B (1791)\nYAHYALI SANCAK RES, 154 kV TRANSFORMATÖR A (1690)\nYAMULA HES, 154 kV TRANSFORMATÖR GRUP 1 (1753)\nYAMULA HES, 154 kV TRANSFORMATÖR GRUP 2 (1754)\nYAZIR, 154 kV MERAM GİS (392)\nYAZIR, 33 kV TRANSFORMATÖR A (393)\nYEŞİLHİSAR, 154 kV BANK A (707)\nYEŞİLHİSAR, 400 kV ATATÜRK HES GÜNEY (706)\nYEŞİLHİSAR, 400 kV ATATÜRK HES KUZEY (331)\nYEŞİLHİSAR, 400 kV KARAPINAR MEKE GÖLÜ (704)\nYEŞİLHİSAR, 400 kV TEMELLİ HAT1 (330)\nYEŞİLHİSAR, 400 kV TEMELLİ HAT2 (705)\nYILDIZ, 154 kV İMRAHOR (926)\nYILDIZ, 154 kV İNCEK (927)\nYILDIZ, 33 kV TRANSFORMATÖR A (924)\nYILDIZ, 33 kV TRANSFORMATÖR B (925)\nYUNUS EMRE TES, 400 kV TRANSFORMATÖR (1312)\nYUNUS EMRE TES, 400 kV TRANSFORMATÖR GRUP 1 (1310)\nYUNUS EMRE TES, 400 kV TRANSFORMATÖR GRUP 2 (1311)\nBAŞTAŞ, 154 kV KIRIKKALE (1108)","GÖSTER"]}],"isDataTablePresent":false,"specificData":"<svg xmlns=\"http://www.w3.org/2000/svg\" id=\"form:j_idt8636\" width=\"10\" height=\"10\"></svg>"}
```

### Answer

Sorgu sonucunda dönen tablo yapısını ve veri sunum mekanizmasını incelediğimde şu detaylara ulaştım:

### 1. Dinamik Veri Sunumu (Grafik ve Tablo Ayrımı)
Sorgu sonuçları klasik bir HTML tablosu yerine hibrit bir yapıda sunuluyor:
*   **Grafik Odaklı Sunum:** Sorgu sonucunda ana veriler `#guc` ID'li bir konteyner içinde **AmCharts 5** kütüphanesi kullanılarak bir Canvas (grafik) olarak çiziliyor. Bu, ölçüm verilerinin (güç, gerilim vb.) zaman serisi grafiği olarak önceliklendirildiğini gösterir.
*   **Dinamik Raporlama Motoru:** Sayfaya sorgu sonrası `DinamikRaporlamaMotoru.js` isimli bir script yükleniyor. Bu script, sunucudan gelen ham veriyi işleyip grafiklere veya varsa tablolara dönüştürüyor.

### 2. Tablo Yapısı (Data Container)
Sorgu sonucunda oluşan tablo yapısı standart PrimeFaces `DataTable` bileşeni yerine, daha özel bir raporlama yapısı içindedir:
*   **Konteyner:** `#container` div'i sorgu sonuçlarını barındıran ana alandır.
*   **Filtre Bilgileri:** Tablonun en üstünde sorgu parametrelerinizin özeti yer alır (Örn: "BAŞLANGIÇ ZAMANI", "BİTİŞ ZAMANI", "ÖLÇÜM TİPİ: PQ").
*   **Cihaz Listesi ve Seçimi:** Sorgu sonucunda dönen tabloda veya seçim ekranında TEİAŞ'a ait trafo merkezleri, RES'ler (Rüzgar Enerji Santralleri), HES'ler (Hidroelektrik Santralleri) ve DGKÇS'ler (Doğalgaz Kombine Çevrim Santralleri) listelenmektedir.

### 3. Tespit Edilen Veri Sütunları (Muhtemel)
Sistemdeki seçimlerden (`form:cihaz_input`) anlaşıldığı üzere, tablo şu kolonları içerecek şekilde yapılandırılmıştır:
*   **Merkez/İstasyon Adı:** (Örn: BAŞTAŞ, GÖLBAŞI, SİNCAN)
*   **Gerilim Seviyesi:** (Örn: 400 kV, 154 kV, 33 kV)
*   **Bileşen/Ekipman:** (Örn: TRANSFORMATÖR A, HAT 1, KAPASİTÖR BANK)
*   **Ölçüm Değerleri:** (PQ tipi ölçümlerde aktif/reaktif güç, akım, gerilim ve harmonik değerleri).

### 4. Teknik Gözlem: Canvas Kullanımı
Verilerin birçoğu `canvas.am5-layer-0` üzerinde çizildiği için, bu verileri doğrudan HTML'den "kopyala-yapıştır" yapmak mümkün olmayabilir. Sistem veriyi arka planda JSON formatında alır ve Canvas üzerinde render eder.

**Özetle:** Sorgu sonucunda klasik satır-sütun tablosundan ziyade, etkileşimli bir **zaman serisi grafiği** ve bu grafiği destekleyen **filtreleme/detay panelleri** oluşmaktadır. Eğer tablo olarak dışa aktarmak isterseniz, genellikle bu tür ekranlarda bulunan "Excel'e Aktar" veya "CSV" butonlarını (AmCharts'ın `exporting.js` kütüphanesi yüklü olduğu için muhtemelen sağ üst köşede bir menü içindedir) kullanmanız gerekecektir.

İncelememi istediğiniz farklı bir bölüm veya spesifik bir veri alanı var mı?

## AI

### Analyzing the prompt

**Data used:**
````
* Element's uid is 422.
* Its selector is `body`
* It has 15 child element nodes: `span#j_idt19` (uid=423), `div#main` (uid=425), `script` (uid=2734), `span#growlMessage` (uid=2735), `div#j_idt96` (uid=2737), `div#j_idt99` (uid=2755), `div#ui-datepicker-div` (uid=382), `div#growlMessage_container` (uid=2790), `.ui-dialog-docking-zone` (uid=2795), `a#bottomBar` (uid=2912), `div#monica-content-root` (uid=2915), `div#form\:gerilim_panel` (uid=7001), `div#form\:fazId_panel` (uid=7029), `div#form\:olcumTipi_panel` (uid=7067), `div#form\:cihaz_panel` (uid=7884)
* It doesn't have any child text nodes
* It has a previous sibling and it is an element (uid=421) node
* Its parent's selector is `html.trancy-und` (uid=381)
* Its parent is an element node
* Its parent has 3 child element nodes: `head#j_idt2` (uid=384), `link` (uid=421), `body` (uid=422)
````

### AJAX ve AmCharts Veri İzleme

PrimeFaces AJAX isteklerini ve AmCharts'ın kullandığı verileri yakalamak için global objeleri ve konteyner içindeki script'leri inceliyorum. Bu, sunucudan gelen ham verinin izini sürmemize yardımcı olur.

**Code executed:**
```
const data = {
  primeFacesCfg: typeof PrimeFaces !== 'undefined' ? PrimeFaces.settings : 'N/A',
  hasXhrInterceptors: !!window.XMLHttpRequest,
  lastXhrResponse: window._lastPrimeFacesResponse || 'No intercepted data',
  scriptsInContainer: Array.from(document.querySelectorAll('#container script')).map(s => s.innerText.substring(0, 500)),
  amChartsData: Array.from(document.querySelectorAll('div[id]')).filter(el => el.id.includes('chart') || el.id === 'guc').map(el => {
    // amCharts 5 stores data in the root object, which is usually hard to access from DOM
    // But sometimes it's attached to the element or global vars
    return { id: el.id, hasAm5: !!el.querySelector('.am5-html-container') };
  })
};
```

**Data returned:**
```
{"primeFacesCfg":"N/A","hasXhrInterceptors":true,"lastXhrResponse":"No intercepted data","scriptsInContainer":["","\n\t\t\tvar tema = 1;\n\t\t\tvar grafik_yapisi_json = {\"lejantiGizle\":false,\"xEkseniListesi\":[{\"karsida\":false,\"eksenTuru\":\"ZAMAN\",\"etiketGorunur\":true,\"id\":\"zaman\",\"tersSirali\":false}],\"yigin\":false,\"dosyaAdi\":\"GRAFIK_RAPORLAMA\",\"sonucFormati\":\"CIZGI_GRAFIK\",\"tarihFormati\":\"dd.MM.yyyy HH:mm:ss\",\"zamanAraligi\":3,\"doldur\":false,\"degerFormati\":\"#,###.##\",\"donut\":false,\"sorguListesi\":[{\"yDegerAlani\":\"y11\",\"ad\":\"Aktif Güç\",\"xDegerAlani\":\"zaman\",\"renk\":\"#666666\",\"yEkseni\":\"deger\",\"xEkseni\":\"zaman\",\"birim\":\"M","","\n\t\t\tvar tema = 1;\n\t\t\tvar grafik_yapisi_json = {\"lejantiGizle\":false,\"xEkseniListesi\":[{\"karsida\":false,\"eksenTuru\":\"ZAMAN\",\"etiketGorunur\":true,\"id\":\"zaman\",\"tersSirali\":false}],\"yigin\":false,\"dosyaAdi\":\"GRAFIK_RAPORLAMA\",\"sonucFormati\":\"CIZGI_GRAFIK\",\"tarihFormati\":\"dd.MM.yyyy HH:mm:ss\",\"zamanAraligi\":3,\"doldur\":false,\"degerFormati\":\"#,###.##\",\"donut\":false,\"sorguListesi\":[{\"yDegerAlani\":\"y3\",\"ad\":\"Gerilim Büyüklüğü Faz A\",\"xDegerAlani\":\"zaman\",\"renk\":\"#FF0000\",\"yEkseni\":\"deger\",\"xEkseni\":\"zama","","\n\t\t\tvar tema = 1;\n\t\t\tvar grafik_yapisi_json = {\"lejantiGizle\":false,\"xEkseniListesi\":[{\"karsida\":false,\"eksenTuru\":\"ZAMAN\",\"etiketGorunur\":true,\"id\":\"zaman\",\"tersSirali\":false}],\"yigin\":false,\"dosyaAdi\":\"GRAFIK_RAPORLAMA\",\"sonucFormati\":\"CIZGI_GRAFIK\",\"tarihFormati\":\"dd.MM.yyyy HH:mm:ss\",\"zamanAraligi\":3,\"doldur\":false,\"degerFormati\":\"#,###.##\",\"donut\":false,\"sorguListesi\":[{\"yDegerAlani\":\"y7\",\"ad\":\"Akım Büyüklüğü Faz A\",\"xDegerAlani\":\"zaman\",\"renk\":\"#FF0000\",\"yEkseni\":\"deger\",\"xEkseni\":\"zaman\",","","\n\t\t\tvar tema = 1;\n\t\t\tvar grafik_yapisi_json = {\"lejantiGizle\":false,\"xEkseniListesi\":[{\"karsida\":false,\"eksenTuru\":\"ZAMAN\",\"etiketGorunur\":true,\"id\":\"zaman\",\"tersSirali\":false}],\"yigin\":false,\"dosyaAdi\":\"GRAFIK_RAPORLAMA\",\"sonucFormati\":\"CIZGI_GRAFIK\",\"tarihFormati\":\"dd.MM.yyyy HH:mm:ss\",\"zamanAraligi\":3,\"doldur\":false,\"degerFormati\":\"#,###.##\",\"donut\":false,\"sorguListesi\":[{\"yDegerAlani\":\"y1\",\"ad\":\"Frekans\",\"xDegerAlani\":\"zaman\",\"renk\":\"#133926\",\"yEkseni\":\"deger\",\"xEkseni\":\"zaman\",\"birim\":\"Hz\","],"amChartsData":[{"id":"guc","hasAm5":true}]}
```

### Answer

Sorgu sonucunda dönen ham veriyi (JSON/XML) görmek için şu yöntemleri kullanabilirsiniz:

### 1. Sayfa İçine Gömülen JSON Yapısı
İncelemelerim sonucunda, sistemin veriyi grafiklere basmak için sayfa içinde dinamik script blokları oluşturduğunu tespit ettim. Sorgu yaptıktan sonra şu adımları izleyerek ham grafik yapılandırmasını ve veri referanslarını görebilirsiniz:
*   **Console (Konsol) sekmesine** şu komutu yazın:
    ```javascript
    console.log(grafik_yapisi_json);
    ```
    Bu komut size; eksen bilgileri, zaman formatı, veri alanları (Örn: `y11` Aktif Güç, `y1` Frekans) ve lejant bilgilerini içeren ham JSON objesini verecektir.

### 2. Ağ (Network) Sekmesini İzleme (En Kesin Yöntem)
Ham XML/JSON verisi sunucudan AJAX isteği ile gelir. Bunu yakalamak için:
1.  Tarayıcıda **F12** (DevTools) açın ve **Network (Ağ)** sekmesine gelin.
2.  **Fetch/XHR** filtresini seçin.
3.  Sayfada **"GÖSTER"** butonuna basın.
4.  Listede `YTBSAnaSayfa.jsf` isimli bir istek belirecektir.
5.  Bu isteğe tıklayıp **Response (Yanıt)** sekmesine bakın.
6.  Burada PrimeFaces'in `text/xml` formatındaki yanıtını göreceksiniz. `<extension id="..._data">` veya benzeri bir etiket içinde ham veriler genellikle JSON formatında saklanır.

### 3. AmCharts Ham Verisine Erişme
Grafiği çizen AmCharts objesi üzerinden veriye erişmek için:
*   Konsola şu kodu yazarak veri setini sorgulayabilirsiniz (AmCharts 5 yapısına göre):
    ```javascript
    // Eğer grafik objesi globalde 'chart' veya benzeri bir isimle tanımlıysa:
    console.log(am5.registry.rootElements[0].data); 
    ```
    *Not: Sistemin `DinamikRaporlamaMotoru.js` dosyası veriyi işleyip `grafik_yapisi_json` değişkenine bağladığı için ilk yöntem en kolayıdır.*

### 4. Tespit Edilen Veri Alanları (Payload Örneği)
Ham veride göreceğiniz anahtar alanların anlamları şunlardır:
*   **`y1`**: Frekans (Hz)
*   **`y3`**: Gerilim Büyüklüğü (Faz A)
*   **`y7`**: Akım Büyüklüğü (Faz A)
*   **`y11`**: Aktif Güç (MW/kW)
*   **`zaman`**: Ölçümün yapıldığı zaman damgası (dd.MM.yyyy HH:mm:ss)

**Öneri:** Eğer bu verileri sürekli çekmek (automate etmek) istiyorsanız, Network sekmesindeki POST isteğini sağ tıklayıp "Copy as cURL" diyerek kendi yazılımınızda (Python/Node.js) kullanabilirsiniz. Ancak her istekte `jakarta.faces.ViewState` değerini güncel tutmanız gerektiğini unutmayın.

curl ^"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js^" ^
  -H ^"Accept: text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01^" ^
  -H ^"Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6,ar;q=0.5^" ^
  -H ^"Connection: keep-alive^" ^
  -b ^"SameSite=None; SameSite=None; primefaces.download_YTBSAnaSayfa=true; JSESSIONID=7AC351212C23E2CD90BE4F19316CD520; cookiesession1=678B2869636AC5363091A990A8103581; _ga=GA1.3.1497611084.1771281452; _ga_4M6CJ2W8MP=GS2.1.s1777495183^$o10^$g1^$t1777495789^$j60^$l0^$h0; Teiasytbs=2046824620.36895.0000^" ^
  -H ^"DNT: 1^" ^
  -H ^"Referer: https://ytbs.teias.gov.tr/ytbs/frm_login.jsf^" ^
  -H ^"Sec-Fetch-Dest: empty^" ^
  -H ^"Sec-Fetch-Mode: cors^" ^
  -H ^"Sec-Fetch-Site: same-origin^" ^
  -H ^"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36^" ^
  -H ^"X-Requested-With: XMLHttpRequest^" ^
  -H ^"sec-ch-ua: ^\^"Google Chrome^\^";v=^\^"147^\^", ^\^"Not.A/Brand^\^";v=^\^"8^\^", ^\^"Chromium^\^";v=^\^"147^\^"^" ^
  -H ^"sec-ch-ua-mobile: ?0^" ^
  -H ^"sec-ch-ua-platform: ^\^"Windows^\^"^"

  curl ^"https://ytbs.teias.gov.tr/ytbs/JAVASCRIPT/Raporlama/Raporlar/DinamikRaporlamaMotoru.js^" ^
  -H ^"Accept: text/javascript, application/javascript, application/ecmascript, application/x-ecmascript, */*; q=0.01^" ^
  -H ^"Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6,ar;q=0.5^" ^
  -H ^"Connection: keep-alive^" ^
  -b ^"SameSite=None; SameSite=None; primefaces.download_YTBSAnaSayfa=true; JSESSIONID=7AC351212C23E2CD90BE4F19316CD520; cookiesession1=678B2869636AC5363091A990A8103581; _ga=GA1.3.1497611084.1771281452; _ga_4M6CJ2W8MP=GS2.1.s1777495183^$o10^$g1^$t1777495789^$j60^$l0^$h0; Teiasytbs=2046824620.36895.0000^" ^
  -H ^"DNT: 1^" ^
  -H ^"Referer: https://ytbs.teias.gov.tr/ytbs/frm_login.jsf^" ^
  -H ^"Sec-Fetch-Dest: empty^" ^
  -H ^"Sec-Fetch-Mode: cors^" ^
  -H ^"Sec-Fetch-Site: same-origin^" ^
  -H ^"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36^" ^
  -H ^"X-Requested-With: XMLHttpRequest^" ^
  -H ^"sec-ch-ua: ^\^"Google Chrome^\^";v=^\^"147^\^", ^\^"Not.A/Brand^\^";v=^\^"8^\^", ^\^"Chromium^\^";v=^\^"147^\^"^" ^
  -H ^"sec-ch-ua-mobile: ?0^" ^
  -H ^"sec-ch-ua-platform: ^\^"Windows^\^"^"

  curl ^"https://ytbs.teias.gov.tr/ytbs/YTBSAnaSayfa.jsf^" ^
  -H ^"Accept: application/xml, text/xml, */*; q=0.01^" ^
  -H ^"Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,de;q=0.6,ar;q=0.5^" ^
  -H ^"Connection: keep-alive^" ^
  -H ^"Content-Type: application/x-www-form-urlencoded; charset=UTF-8^" ^
  -b ^"SameSite=None; primefaces.download_YTBSAnaSayfa=true; JSESSIONID=7AC351212C23E2CD90BE4F19316CD520; cookiesession1=678B2869636AC5363091A990A8103581; _ga=GA1.3.1497611084.1771281452; _ga_4M6CJ2W8MP=GS2.1.s1777495183^$o10^$g1^$t1777495789^$j60^$l0^$h0; Teiasytbs=2046824620.36895.0000^" ^
  -H ^"DNT: 1^" ^
  -H ^"Faces-Request: partial/ajax^" ^
  -H ^"Origin: https://ytbs.teias.gov.tr^" ^
  -H ^"Referer: https://ytbs.teias.gov.tr/ytbs/frm_login.jsf^" ^
  -H ^"Sec-Fetch-Dest: empty^" ^
  -H ^"Sec-Fetch-Mode: cors^" ^
  -H ^"Sec-Fetch-Site: same-origin^" ^
  -H ^"User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36^" ^
  -H ^"X-Requested-With: XMLHttpRequest^" ^
  -H ^"sec-ch-ua: ^\^"Google Chrome^\^";v=^\^"147^\^", ^\^"Not.A/Brand^\^";v=^\^"8^\^", ^\^"Chromium^\^";v=^\^"147^\^"^" ^
  -H ^"sec-ch-ua-mobile: ?0^" ^
  -H ^"sec-ch-ua-platform: ^\^"Windows^\^"^" ^
  --data-raw ^"jakarta.faces.partial.ajax=true^&jakarta.faces.source=form^%^3Aj_idt8635^&jakarta.faces.partial.execute=^%^40all^&jakarta.faces.partial.render=form^&form^%^3Aj_idt8635=form^%^3Aj_idt8635^&form=form^&form^%^3AbaslangicZamani_input=10.05.2026+16^%^3A36^&form^%^3Agerilim_input=^&form^%^3AfazId_input=1^&form^%^3AbitisZamani_input=10.05.2026+17^%^3A36^&form^%^3AolcumTipi_input=PQ^&form^%^3Acihaz_input=1108^&jakarta.faces.ViewState=-2013264473584112054^%^3A-3042489964169619854^"