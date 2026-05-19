export type TrainingGlossarySectionId =
  | 'glossary'
  | 'context'
  | 'modes'
  | 'pqvf'
  | 'damping'
  | 'detection'
  | 'sas'
  | 'cases'
  | 'decision';

export interface TrainingGlossaryTerm {
  key: string;
  label: string;
  shortDefinition: string;
  definition: string;
  sections: TrainingGlossarySectionId[];
  aliases?: string[];
}

export interface TrainingGlossarySection {
  title: string;
  description: string;
  terms: TrainingGlossaryTerm[];
}

export const GLOSSARY_SECTIONS: TrainingGlossarySection[] = [
  {
    title: 'Genel sistem kısaltmaları',
    description: 'Salınım ekranında kullanılan izleme, haberleşme ve kontrol mimarisi terimleri.',
    terms: [
      {
        key: 'pmu',
        label: 'PMU',
        shortDefinition: 'GPS/GNSS zaman damgalı fazör ölçüm birimi.',
        definition: 'PMU, gerilim ve akım fazörlerini ortak zaman referansıyla ölçen cihazdır. Salınım analizinde farklı merkezlerden gelen P, Q, V ve f sinyallerinin aynı zaman ekseninde karşılaştırılmasını sağlar.',
        sections: ['context', 'detection', 'cases', 'decision'],
      },
      {
        key: 'pdc',
        label: 'PDC',
        shortDefinition: 'PMU verilerini zaman etiketlerine göre toplayan fazör veri toplayıcı.',
        definition: 'PDC, çok sayıda PMU akışını toplayıp zaman sırasına koyar. Merkezi WAM/SCADA ekranında aynı olay penceresindeki farklı fider ve baraların birlikte okunabilmesi için veri hizalaması sağlar.',
        sections: ['context', 'detection'],
      },
      {
        key: 'wam',
        label: 'WAM / WAMS',
        shortDefinition: 'Geniş alan izleme altyapısı.',
        definition: 'WAM veya WAMS, farklı trafo merkezlerinden gelen zaman senkronize ölçümleri merkezi izleme ekranında birleştirir. Operatöre mod frekansı, mode shape ve damping gibi geniş alan kararlılık bulguları sunar.',
        sections: ['context', 'cases', 'decision'],
      },
      {
        key: 'wampac',
        label: 'WAMPAC',
        shortDefinition: 'Geniş alan izleme, koruma ve kontrol yaklaşımı.',
        definition: 'WAMPAC, izleme ekranını koruma ve kontrol fonksiyonlarıyla aynı işletme zincirinde düşünür. Kontrol odası yazılımı çoğunlukla karar destek üretirken lokal SAS cihazları fiziksel müdahale tarafında konumlanır.',
        sections: ['context', 'sas', 'decision'],
      },
      {
        key: 'scada',
        label: 'SCADA',
        shortDefinition: 'Kontrol odası izleme ve kumanda sistemi.',
        definition: 'SCADA, saha ölçümlerini ve işletme komutlarını kontrol odasına taşıyan ana operasyon sistemidir. Salınım eğitimi içinde SCADA, PMU tabanlı WAM çıktılarının operatör ekranındaki bağlamını temsil eder.',
        sections: ['context', 'sas', 'decision'],
      },
      {
        key: 'sas',
        label: 'SAS',
        shortDefinition: 'Salınım Algılayıcı Sistemler.',
        definition: 'SAS, baralara yerel olarak kurulan ve salınım genliği ile fazını lokal ölçümden çıkararak FACTS cihazlarına eğitimde gösterilen kapasitif veya endüktif pulse mantığını açıklayan sistem ailesidir.',
        sections: ['glossary', 'sas', 'cases'],
      },
      {
        key: 'sas-c',
        label: 'SAS-C',
        shortDefinition: 'FACTS cihazlarıyla yerel çalışan SAS-C eğitim simülasyonu.',
        definition: 'SAS-C, bu eğitim sayfasında altı bara üzerindeki SVC ve STATCOM cihazlarının 0.12-0.16 Hz bölgeler arası salınıma verdiği lokal pulse tepkisini anlatan native simülasyon modelidir.',
        sections: ['sas'],
      },
      {
        key: 'basts',
        label: 'BASTS',
        shortDefinition: 'Bölgeler Arası Salınım Tanımlayıcı Sistem.',
        definition: 'BASTS, özellikle 0.12-0.16 Hz bandındaki çok yavaş bölgeler arası salınımları lokal frekans ölçümünden algılayıp STATCOM veya SVC gibi cihazlara hızlı müdahale sinyali üretme mantığını anlatır.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'fbmswa',
        label: 'FBMSWA',
        shortDefinition: 'FFT Tabanlı Değiştirilmiş Kayan Pencere Algoritması.',
        definition: 'FBMSWA, kısa pencereyle genliği hızlı yakalayan, uzun pencereyle faz/yön bilgisini kararlı hale getiren çift pencereli FFT yaklaşımıdır. Lokal SAS eğitiminde eşik ve pulse kararının çekirdeğidir.',
        sections: ['detection', 'sas'],
      },
    ],
  },
  {
    title: 'Ölçümler ve birimler',
    description: 'P-Q-V-f grafikleri ve rapor tablolarında görülen temel elektriksel büyüklükler.',
    terms: [
      {
        key: 'pqvf',
        label: 'P-Q-V-f',
        shortDefinition: 'Aktif güç, reaktif güç, gerilim ve frekansın birlikte okunması.',
        definition: 'P-Q-V-f yaklaşımı, bir salınım olayının yalnız frekansta değil aktif güç, reaktif güç ve gerilimde de nasıl göründüğünü aynı zaman penceresinde karşılaştırır. Tutarlı faz ve frekans davranışı bulgu güvenini artırır.',
        sections: ['pqvf', 'decision'],
      },
      {
        key: 'p',
        label: 'P / Aktif Güç',
        shortDefinition: 'MW cinsinden iş yapan güç bileşeni.',
        definition: 'Aktif güç, jeneratör ve yükler arasındaki gerçek enerji aktarımını gösterir. Bölgeler arası salınımlarda hat akışlarında ve fider aktif güçlerinde periyodik MW dalgalanması olarak görülebilir.',
        sections: ['pqvf', 'cases'],
      },
      {
        key: 'q',
        label: 'Q / Reaktif Güç',
        shortDefinition: 'MVAr cinsinden gerilim destek bileşeni.',
        definition: 'Reaktif güç, gerilim profili ve FACTS müdahalesiyle yakından ilişkilidir. SAS simülasyonunda kapasitif veya endüktif pulse, Q yönünün salınım fazına göre değiştirilmesiyle anlatılır.',
        sections: ['pqvf', 'sas', 'cases'],
      },
      {
        key: 'v',
        label: 'V / Gerilim',
        shortDefinition: 'kV veya p.u. cinsinden bara gerilimi.',
        definition: 'Gerilim, salınımın bara seviyesindeki görünür etkisini taşır. Lokal SAS cihazları bağlı oldukları baranın geriliminden frekans ve faz bilgisini çıkararak müdahale kararını şekillendirir.',
        sections: ['pqvf', 'sas', 'cases'],
      },
      {
        key: 'f',
        label: 'f / Frekans',
        shortDefinition: 'Hz cinsinden şebeke frekansı veya salınım frekansı.',
        definition: 'Frekans, hem 50 Hz işletme büyüklüğünü hem de bu büyüklük üzerindeki düşük frekanslı salınım bileşenini ifade edebilir. Eğitim grafiklerinde mod frekansı Hz, genlik ise mHz sapma olarak okunur.',
        sections: ['pqvf', 'detection', 'sas'],
      },
      {
        key: 'mhz',
        label: 'mHz',
        shortDefinition: 'Hertz’in binde biri.',
        definition: 'mHz, lokal SAS eşiklerinde kullanılan küçük frekans sapması birimidir. Örneğin 10 mHz eşik, 50 Hz temel frekans çevresindeki 0.010 Hz büyüklüğünde salınım genliğini ifade eder.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'mw',
        label: 'MW',
        shortDefinition: 'Megawatt, aktif güç birimi.',
        definition: 'MW, aktif güç salınımının işletme etkisini gösterir. Forced oscillation vakalarında yerel bir arıza uzak bölgelerde büyük MW dalgalanmaları üretebilir.',
        sections: ['pqvf', 'sas', 'cases'],
      },
      {
        key: 'mvar',
        label: 'MVAr',
        shortDefinition: 'Megavolt-amper reaktif, reaktif güç birimi.',
        definition: 'MVAr, STATCOM veya SVC müdahalesinde üretilen ya da tüketilen reaktif güç miktarını gösterir. Kapasitif pulse pozitif, endüktif pulse negatif yönlü eğitim komutu olarak gösterilir.',
        sections: ['pqvf', 'sas', 'cases'],
      },
      {
        key: 'pu',
        label: 'p.u.',
        shortDefinition: 'Per-unit, normalize edilmiş büyüklük.',
        definition: 'p.u. farklı gerilim seviyelerindeki değerleri ortak ölçeğe getirir. Eğitim grafiklerinde gerilim veya genlik değişimini karşılaştırmayı kolaylaştırmak için kullanılır.',
        sections: ['pqvf', 'modes', 'sas'],
      },
      {
        key: 'amplitude',
        label: 'Genlik',
        shortDefinition: 'Salınımın tepe büyüklüğü.',
        definition: 'Genlik, salınımın ne kadar güçlü hissedildiğini gösterir. Lokal SAS mantığında kısa pencere genliği hızlı ölçer ve genlik eşik üstüne çıktığında pulse karar yolu açılır.',
        sections: ['modes', 'sas', 'detection'],
      },
      {
        key: 'phase',
        label: 'Faz',
        shortDefinition: 'Salınım bileşeninin çevrim içindeki konumu.',
        definition: 'Faz, iki PMU’nun aynı anda mı yoksa karşı yönlü mü hareket ettiğini gösterir. SAS için faz, kapasitif veya endüktif pulse yönünün belirlenmesinde kritik bilgidir.',
        sections: ['modes', 'sas', 'cases'],
      },
    ],
  },
  {
    title: 'Analiz terimleri',
    description: 'Kayan pencere, spektrum, mode shape ve damping yorumunda kullanılan kavramlar.',
    terms: [
      {
        key: 'fft',
        label: 'FFT',
        shortDefinition: 'Hızlı Fourier dönüşümü.',
        definition: 'FFT, zaman alanındaki salınım sinyalini frekans alanına çevirerek baskın mod frekanslarını görünür hale getirir. Eğitimde PMU penceresindeki en yüksek spektrum tepesi mod adayı olarak okunur.',
        sections: ['detection', 'sas'],
      },
      {
        key: 'dft',
        label: 'DFT',
        shortDefinition: 'Ayrık Fourier dönüşümü.',
        definition: 'DFT, seçilen frekans noktalarında sinyal genliğini hesaplayan temel spektrum yöntemidir. Eğitim helperları test edilebilir ve deterministik kalması için basit DFT tahmini kullanır.',
        sections: ['detection', 'pqvf'],
      },
      {
        key: 'sliding-window',
        label: 'Kayan pencere',
        shortDefinition: 'Akan veriden sabit uzunlukta analiz kesiti alma yöntemi.',
        definition: 'Kayan pencere, PMU akışını zaman içinde ilerleyen kısa analiz parçalarına böler. Pencere uzunluğu çözünürlüğü, adım değeri ise bulgunun ne kadar sık güncellendiğini belirler.',
        sections: ['detection', 'sas'],
      },
      {
        key: 'short-window',
        label: 'Kısa pencere',
        shortDefinition: 'SAS-C içinde hızlı genlik tespiti için kullanılan 20 saniyelik pencere.',
        definition: 'Kısa pencere, lokal SAS-C mantığında salınım genliğinin tetik eşiğini aşıp aşmadığını hızlı belirler. Eğitim simülasyonunda 20 saniyelik FFT genlik penceresi olarak gösterilir.',
        sections: ['sas', 'detection'],
      },
      {
        key: 'long-window',
        label: 'Uzun pencere',
        shortDefinition: 'SAS-C içinde faz ve yön doğrulaması için kullanılan 100 saniyelik pencere.',
        definition: 'Uzun pencere, kapasitif veya endüktif pulse yönünün güvenilir belirlenmesi için faz bilgisini kararlı hale getirir. Eğitim simülasyonunda 100 saniyelik doğrulama penceresi olarak gösterilir.',
        sections: ['sas', 'detection'],
      },
      {
        key: 'fifo',
        label: 'FIFO',
        shortDefinition: 'İlk giren ilk çıkar veri kuyruğu.',
        definition: 'FIFO pencere, yeni örnek geldikçe en eski örneği çıkarıp analiz penceresini güncel tutar. Lokal SAS anlatımında kısa ve uzun pencere FIFO mantığıyla işletilir.',
        sections: ['sas', 'detection'],
      },
      {
        key: 'washout',
        label: 'Wash-out filtre',
        shortDefinition: 'Düşük frekanslı yavaş bileşenleri bastıran yüksek geçiren filtre.',
        definition: 'Wash-out filtre, 50 Hz temel etrafındaki yavaş ofset ve DC benzeri bileşenlerin salınım genliği hesabını bozmasını önler. Lokal SAS eğitiminde FFT öncesi temizleme adımıdır.',
        sections: ['sas', 'detection'],
      },
      {
        key: 'prony',
        label: 'Prony',
        shortDefinition: 'Sinyali sönümlü sinüs bileşenlerine ayıran modal analiz yöntemi.',
        definition: 'Prony yöntemi, frekans, sönümleme ve genlik gibi modal parametreleri tahmin etmek için kullanılır. Kontrol odası WAM yazılımlarında olay sonrası modal raporlamaya yardımcı olur.',
        sections: ['detection', 'decision'],
      },
      {
        key: 'dmd',
        label: 'DMD',
        shortDefinition: 'Dinamik Mod Ayrıştırması.',
        definition: 'DMD, çoklu zaman serilerinden baskın dinamik modları çıkarmaya yarayan veri tabanlı analiz yöntemidir. PMU kümelerindeki ortak salınım desenlerini mode shape ile birlikte yorumlamaya uygundur.',
        sections: ['detection', 'cases'],
      },
      {
        key: 'mode-shape',
        label: 'Mode shape',
        shortDefinition: 'PMU noktalarının aynı moddaki genlik ve faz deseni.',
        definition: 'Mode shape, farklı merkezlerin aynı salınım moduna hangi genlik ve fazla katıldığını gösterir. Karşı fazlı iki PMU grubu bölgeler arası salınım karakterini güçlendirir.',
        sections: ['modes', 'cases', 'decision'],
      },
      {
        key: 'def',
        label: 'DEF',
        shortDefinition: 'Dağılan Enerji Akışı kaynak bulma yaklaşımı.',
        definition: 'DEF benzeri göstergeler, salınım enerjisinin hangi bölgede üretildiğini ve nerede soğurulduğunu kavramsal olarak ayırır. Forced oscillation vakalarında kaynak lokalizasyonu için eğitim göstergesi olarak kullanılır.',
        sections: ['cases', 'decision'],
      },
      {
        key: 'damping-ratio',
        label: 'Damping Ratio / DR',
        shortDefinition: 'Salınım zarfının sönme oranı.',
        definition: 'Damping ratio, salınım genliğinin zamanla azalıp azalmadığını gösterir. Düşük DR izleme gerektirir; negatif DR büyüyen ve kararsızlaşan salınım riski anlamına gelir.',
        sections: ['damping', 'cases', 'decision'],
      },
    ],
  },
  {
    title: 'Mod ve kontrol kavramları',
    description: 'Salınım sınıfları, kontrol kaynaklı olaylar ve müdahale kavramları.',
    terms: [
      {
        key: 'interarea',
        label: 'Interarea / Bölgeler arası',
        shortDefinition: 'Geniş iki şebeke alanının karşı fazlı düşük frekanslı salınımı.',
        definition: 'Interarea mod, genellikle 0.1-0.8 Hz bandında görülür ve iki büyük üretim/tüketim bölgesinin zayıf bağlantı üzerinden birbirine karşı hareket etmesiyle yorumlanır.',
        sections: ['modes', 'pqvf', 'cases'],
      },
      {
        key: 'local',
        label: 'Local / Yerel',
        shortDefinition: 'Bir santral veya bölgenin sisteme karşı salınımı.',
        definition: 'Yerel mod çoğunlukla 0.8-2 Hz bandında görülür. Etkisi daha sınırlı coğrafyada belirgindir ve santral kontrol ayarları veya yakın şebeke koşullarıyla ilişkili olabilir.',
        sections: ['modes', 'pqvf'],
      },
      {
        key: 'forced',
        label: 'Forced / Zorlanmış',
        shortDefinition: 'Sisteme dış kaynak tarafından sürekli dayatılan salınım.',
        definition: 'Zorlanmış salınım doğal mod değildir; arızalı ekipman, kontrol döngüsü veya periyodik bozucu kaynakla sisteme enerji enjekte edilir. Doğal modla çakışırsa rezonans etkisi büyür.',
        sections: ['modes', 'pqvf', 'cases'],
      },
      {
        key: 'torsional',
        label: 'Torsional / SSO',
        shortDefinition: 'Şaft veya seri kompanzasyon etkileşimli daha yüksek frekanslı salınım.',
        definition: 'Torsional veya SSO olayları elektromekanik düşük frekans eğitiminden daha yüksek bantlarda özel ölçüm ve koruma gerektirir. Bu sayfada yalnız kavramsal mod ayrımı için gösterilir.',
        sections: ['modes', 'pqvf'],
      },
      {
        key: 'ibr',
        label: 'IBR',
        shortDefinition: 'Evirici tabanlı kaynak.',
        definition: 'IBR, güneş/rüzgar veya batarya gibi güç elektroniği üzerinden bağlanan kaynakları ifade eder. PLL ve kontrol döngüsü etkileşimleri bazı salınım desenlerinin kaynağı olabilir.',
        sections: ['modes', 'pqvf'],
      },
      {
        key: 'pll',
        label: 'PLL',
        shortDefinition: 'Faz kilitleme döngüsü.',
        definition: 'PLL, eviricinin şebeke fazını takip etmesini sağlar. Zayıf şebekede PLL dinamiği ve kontrol döngüleri IBR kaynaklı salınım davranışını etkileyebilir.',
        sections: ['modes', 'decision'],
      },
      {
        key: 'resonance',
        label: 'Rezonans',
        shortDefinition: 'Zorlayıcı frekansın doğal moda yakınlaşıp genliği büyütmesi.',
        definition: 'Rezonans, dış kaynaklı bir salınımın sistemin doğal mod frekansına yakın olmasıyla enerji birikiminin artmasıdır. Florida vakasında yerel forced kaynak uzak bölgelerde büyük güç salınımı üretmiştir.',
        sections: ['modes', 'cases'],
      },
      {
        key: 'facts',
        label: 'FACTS',
        shortDefinition: 'Güç elektroniği tabanlı esnek AC iletim sistemi cihazları.',
        definition: 'FACTS cihazları gerilim, reaktif güç ve güç akışını hızlı değiştirebilir. SAS eğitiminde STATCOM ve SVC, salınım fazına göre kapasitif veya endüktif pulse üreten müdahale cihazlarıdır.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'statcom',
        label: 'STATCOM',
        shortDefinition: 'Statik senkron kompanzatör.',
        definition: 'STATCOM, hızlı reaktif güç üreten veya tüketen FACTS cihazıdır. Sincan örneğinde salınım fazına uygun +50 MVAr ve -30 MVAr aralığında müdahale kavramını anlatmak için kullanılır.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'svc',
        label: 'SVC',
        shortDefinition: 'Statik VAR kompanzatörü.',
        definition: 'SVC, reaktif güç ve gerilim kontrolünde kullanılan FACTS cihazıdır. Lokal SAS cihazları fiberoptik veya donanımsal arayüzle bu tür cihazlara hızlı tetikleme sinyali verebilir.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'agc',
        label: 'AGC',
        shortDefinition: 'Otomatik Üretim Kontrolü.',
        definition: 'AGC, üretim set değerlerini sistem frekansı ve bölgesel denge için otomatik ayarlayan kontroldür. Kıta Avrupası vakasında salınım AGC davranışını etkileyen işletme sonucu olarak anlatılır.',
        sections: ['cases', 'decision'],
      },
      {
        key: 'wadc',
        label: 'WADC',
        shortDefinition: 'Geniş alan sönümleme kontrolörü.',
        definition: 'WADC, farklı noktalardan gelen ölçümleri kullanarak salınım sönümlemesini iyileştiren kontrolör yaklaşımıdır. Düşük ataletli sistemlerde senkron kondansatör veya FACTS modülasyonu için eğitim senaryosunda kullanılır.',
        sections: ['cases', 'decision'],
      },
      {
        key: 'capacitive',
        label: 'Kapasitif kip',
        shortDefinition: 'Reaktif güç üreterek gerilim ve yük davranışını değiştiren müdahale yönü.',
        definition: 'Kapasitif kip, eğitim simülasyonunda frekans fazına göre pozitif MVAr pulse olarak gösterilir. Amaç, salınımın enerji alışverişine ters yönde tepki vererek genliği azaltmaktır.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'inductive',
        label: 'Endüktif kip',
        shortDefinition: 'Reaktif güç tüketerek gerilim ve yük davranışını değiştiren müdahale yönü.',
        definition: 'Endüktif kip, eğitim simülasyonunda negatif MVAr pulse olarak gösterilir. Kapasitif kip ile birlikte salınım fazına bağlı iki yönlü yerel müdahale mantığını açıklar.',
        sections: ['sas', 'cases'],
      },
      {
        key: 'hysteresis',
        label: 'Histerezis',
        shortDefinition: 'Tetikleme ve kapanma eşiklerinin farklı tutulması.',
        definition: 'Histerezis, genlik eşik çevresinde gidip gelirken yalancı aç-kapa kararlarını azaltır. SAS eğitiminde tetik eşiği ile kapanma eşiği ayrı kontrol edilir.',
        sections: ['sas', 'decision'],
      },
      {
        key: 'threshold',
        label: 'Eşik',
        shortDefinition: 'Karar üretmek için aşılması gereken sınır.',
        definition: 'Eşik, genlik veya güven göstergesinin hangi noktadan sonra izleme, alarm ya da pulse kararına taşınacağını belirler. Lokal SAS örneğinde 10 mHz genlik eşiği kullanılır.',
        sections: ['sas', 'decision'],
      },
    ],
  },
];

export function buildGlossaryLookup(sections: TrainingGlossarySection[] = GLOSSARY_SECTIONS): Map<string, TrainingGlossaryTerm> {
  const lookup = new Map<string, TrainingGlossaryTerm>();
  for (const section of sections) {
    for (const term of section.terms) {
      lookup.set(term.key, term);
      lookup.set(term.label.toLocaleLowerCase('tr-TR'), term);
      for (const alias of term.aliases ?? []) {
        lookup.set(alias.toLocaleLowerCase('tr-TR'), term);
      }
    }
  }
  return lookup;
}

export const GLOSSARY_LOOKUP = buildGlossaryLookup();
