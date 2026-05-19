import { buildDampedOscillation, type TrainingPoint } from '../utils/simulationModels.ts';

export type TrainingCaseId = 'turkiye-entsoe-2011' | 'wecc-1996' | 'ce-2017' | 'florida-2019';

export interface TrainingCaseMetric {
  label: string;
  value: string;
  severity: 'info' | 'watch' | 'critical';
}

export interface TrainingCase {
  id: TrainingCaseId;
  shortLabel: string;
  title: string;
  mode: string;
  frequencyHz: number;
  dampingRatioPercent: number;
  eventDate: string;
  description: string;
  diagnosis: string;
  intervention: string;
  operatorLesson: string;
  metrics: TrainingCaseMetric[];
  assetNames: string[];
  color: string;
}

export interface TrainingCaseSimulation {
  caseId: TrainingCaseId;
  timeSeconds: number[];
  frequencySeries: TrainingPoint[];
  dampingSeries: TrainingPoint[];
  activePowerSeries: TrainingPoint[];
  reactivePowerSeries: TrainingPoint[];
  voltageSeries: TrainingPoint[];
  modeShape: {
    nodes: Array<{ pmu: string; amplitude: number; phaseDegrees: number; x: number; y: number }>;
    defBars: Array<{ pmu: string; value: number; role: 'source' | 'absorber' }>;
  };
  operatorSummary: string;
}

export const TRAINING_CASES: TrainingCase[] = [
  {
    id: 'turkiye-entsoe-2011',
    shortLabel: 'Türkiye-ENTSO-E',
    title: 'Türkiye - ENTSO-E 0.15 Hz Bölgeler Arası Salınımı',
    mode: 'Bölgeler arası',
    frequencyHz: 0.15,
    dampingRatioPercent: 2.6,
    eventDate: '23 Nisan 2011',
    description: 'Türkiye Elektrik İletim Sisteminin ENTSO-E şebekesine senkron bağlanması sonrasında öngörülen 0.14-0.16 Hz bandında yaklaşık 5 dakika süren belirgin bir bölgeler arası salınım olayı görülmüştür.',
    diagnosis: 'BASTS üzerinden ölçülen frekans dalgalanması 10 mHz eşiğini aşmış, Sincan 154 kV Bank-B barasında fazdan faza yaklaşık 2 kV ve %1.5 tepe-tepe gerilim dalgalanması aktif güce de yansımıştır.',
    intervention: 'Sincan Trafo Merkezi T-STATCOM cihazı, salınım fazına göre +50 MVAr kapasitif ve -30 MVAr endüktif aralığında reaktif güç üreterek/tüketerek salınımın sönümlenmesini desteklemiştir.',
    operatorLesson: '0.15 Hz civarındaki yavaş modlar PSS kör noktasına düşebileceği için lokal SAS ve merkezi WAM bulguları birlikte okunmalıdır.',
    metrics: [
      { label: 'Olay tarihi', value: '23 Nisan 2011', severity: 'info' },
      { label: 'Baskın frekans', value: '0.14-0.16 Hz', severity: 'watch' },
      { label: 'Frekans genliği', value: '> 10 mHz eşik', severity: 'critical' },
      { label: 'Gerilim etkisi', value: 'Sincan 154 kV Bank-B, 2 kV faz-faz', severity: 'watch' },
      { label: 'FACTS çıktısı', value: '+50 / -30 MVAr T-STATCOM', severity: 'info' },
    ],
    assetNames: ['Resim1.jpg', 'Resim2.jpg', 'Resim3.jpg'],
    color: '#2563eb',
  },
  {
    id: 'wecc-1996',
    shortLabel: 'WECC 1996',
    title: 'WECC Zayıf Sönümleme ve Sistem Çökmesi',
    mode: 'Zayıf sönümlü bölgeler arası',
    frequencyHz: 0.27,
    dampingRatioPercent: 1.2,
    eventDate: '10 Ağustos 1996',
    description: 'Ağır yüklenme ve kısıtlı iletim koşullarında zayıf sönümlenmiş doğal salınım modunun büyümesi, Kuzey Amerika batı şebekesinde milyonlarca kullanıcıyı etkileyen büyük kesintiye yol açmıştır.',
    diagnosis: 'Olay öncesinde Oregon-Kaliforniya güç transferlerinde 0.270 Hz, 0.264 Hz ve 0.252 Hz salınımlar izlenmiş; damping oranı %7 seviyesinden %3.46 ve ardından %1.2 gibi kritik değerlere gerilemiştir.',
    intervention: 'Vaka, DR %3 altına indiğinde izleme seviyesinin kritik uyarıya dönmesi ve dış müdahale gecikirse salınımın negatif sönümleme karakterine yaklaşabileceğini göstermek için kullanılır.',
    operatorLesson: 'Damping trendi tek bir anlık değerden daha önemlidir; düşen DR trendi geniş alan transferlerinin rahatlatılması gerektiğini erken gösterebilir.',
    metrics: [
      { label: 'Olay tarihi', value: '10 Ağustos 1996', severity: 'info' },
      { label: 'Frekanslar', value: '0.270 / 0.264 / 0.252 Hz', severity: 'watch' },
      { label: 'DR trendi', value: '%7 -> %3.46 -> %1.2', severity: 'critical' },
      { label: 'İşletme koşulu', value: 'Ağır yük ve kısıtlı iletim', severity: 'critical' },
      { label: 'Sonuç', value: 'Geniş çaplı blackout', severity: 'critical' },
    ],
    assetNames: ['Resim4.jpg', 'Resim5.jpg'],
    color: '#dc2626',
  },
  {
    id: 'ce-2017',
    shortLabel: 'CE 2017',
    title: 'Kıta Avrupası Düşük Yük / Düşük Atalet Salınımı',
    mode: 'Doğu-Batı bölgeler arası',
    frequencyHz: 0.293,
    dampingRatioPercent: 3.2,
    eventDate: '3 Aralık 2017',
    description: 'Sabah erken saatlerdeki olağandışı düşük yük koşullarında peş peşe iki jeneratörün devreden çıkması, 10 dakikadan uzun süren kesintisiz bir salınımı tetiklemiştir.',
    diagnosis: 'WAMS ölçümleri İsviçre ve Yunanistan arasındaki gerilim faz açısı farklarında 0.29 Hz civarında Doğu-Batı karakterli bölgeler arası salınım kipini göstermiştir.',
    intervention: 'Eğitim senaryosunda düşük ataletli ve zayıf sönümlü sistemlerde WADC ve senkron kondansatör modülasyonunun salınımı nasıl bastırabileceği gösterilir.',
    operatorLesson: 'Düşük yük/düşük atalet saatlerinde küçük jeneratör açmaları bile uzun süreli modal salınım üretebilir; faz açısı farkları erken gösterge olarak izlenmelidir.',
    metrics: [
      { label: 'Olay tarihi', value: '3 Aralık 2017', severity: 'info' },
      { label: 'Süre', value: '> 10 dakika', severity: 'watch' },
      { label: 'Baskın frekans', value: '0.293 Hz', severity: 'watch' },
      { label: 'Mode shape', value: 'İsviçre - Yunanistan Doğu-Batı modu', severity: 'info' },
      { label: 'Kontrol etkisi', value: 'AGC bloke olacak kadar belirgin', severity: 'watch' },
    ],
    assetNames: ['Resim6.jpg', 'Resim7.jpg', 'Resim8.jpg'],
    color: '#f59e0b',
  },
  {
    id: 'florida-2019',
    shortLabel: 'Florida 2019',
    title: 'Florida Zorlanmış Salınım ve Rezonans Etkisi',
    mode: 'Zorlanmış salınım',
    frequencyHz: 0.37,
    dampingRatioPercent: 0.4,
    eventDate: 'Ocak 2019',
    description: 'ABD Doğu Enterkonneksiyonu içinde Florida’daki bir termik santralin kontrol sistemindeki gevşek bağlantı, doğal şebeke dinamiği olmayan periyodik bir bozucu sinyal üretmiştir.',
    diagnosis: 'Zorlanmış salınım frekansı doğal bölgeler arası modla örtüşünce rezonans tetiklenmiş ve yerel kaynaklı arıza çok uzak bölgelerde dahi büyük aktif güç dalgalanmaları oluşturmuştur.',
    intervention: 'Vaka, forced oscillation ile doğal modun ayrılması ve DEF gibi kaynak bulma algoritmalarının test edilmesi için kullanılır.',
    operatorLesson: 'Sabit frekanslı, sönmeyen ve kaynak odaklı salınımlar doğal mod gibi yorumlanmamalı; rezonans riski ve kaynak lokasyonu birlikte değerlendirilmelidir.',
    metrics: [
      { label: 'Olay tarihi', value: 'Ocak 2019', severity: 'info' },
      { label: 'Kaynak', value: 'Florida termik santral kontrol sistemi', severity: 'critical' },
      { label: 'Mekanizma', value: 'Forced oscillation + rezonans', severity: 'critical' },
      { label: 'Uzak etki', value: '50 MW aktif güç dalgalanması', severity: 'watch' },
      { label: 'Teşhis yöntemi', value: 'DEF kaynak lokalizasyonu', severity: 'info' },
    ],
    assetNames: ['Resim9.jpg', 'Resim10.jpg', 'Resim11.jpg'],
    color: '#7c3aed',
  },
];

export function getTrainingCase(caseId: TrainingCaseId): TrainingCase {
  return TRAINING_CASES.find(item => item.id === caseId) ?? TRAINING_CASES[0];
}

const caseNodes = (caseId: TrainingCaseId) => {
  const phaseShift = caseId === 'florida-2019' ? 40 : caseId === 'ce-2017' ? 20 : 0;
  return [
    { pmu: 'PMU-1', amplitude: 0.92, phaseDegrees: 8 + phaseShift, x: 0.12, y: 0.32 },
    { pmu: 'PMU-2', amplitude: 0.78, phaseDegrees: 24 + phaseShift, x: 0.28, y: 0.22 },
    { pmu: 'PMU-3', amplitude: 0.46, phaseDegrees: 62 + phaseShift, x: 0.48, y: 0.36 },
    { pmu: 'PMU-4', amplitude: caseId === 'florida-2019' ? 0.96 : 0.42, phaseDegrees: 198, x: 0.62, y: 0.64 },
    { pmu: 'PMU-5', amplitude: caseId === 'florida-2019' ? 0.7 : 0.86, phaseDegrees: 212, x: 0.78, y: 0.72 },
    { pmu: 'PMU-6', amplitude: caseId === 'florida-2019' ? 0.5 : 0.94, phaseDegrees: 184, x: 0.9, y: 0.56 },
  ];
};

export function buildCaseSimulation(caseId: TrainingCaseId): TrainingCaseSimulation {
  const trainingCase = getTrainingCase(caseId);
  const durationSeconds = caseId === 'turkiye-entsoe-2011' ? 300 : caseId === 'ce-2017' ? 600 : 180;
  const samplingRateHz = 2;
  const sampleCount = Math.round(durationSeconds * samplingRateHz);
  const dampingShape = buildDampedOscillation({
    frequencyHz: trainingCase.frequencyHz,
    dampingRatioPercent: trainingCase.id === 'wecc-1996' ? -0.4 : trainingCase.dampingRatioPercent,
    durationSeconds,
    samplingRateHz,
    amplitude: 1,
  });
  const timeSeconds: number[] = [];
  const frequencySeries: TrainingPoint[] = [];
  const dampingSeries: TrainingPoint[] = [];
  const activePowerSeries: TrainingPoint[] = [];
  const reactivePowerSeries: TrainingPoint[] = [];
  const voltageSeries: TrainingPoint[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / samplingRateHz;
    const progress = t / durationSeconds;
    const envelope = Math.max(0.15, dampingShape.envelope[index] ?? 0.15);
    const angle = 2 * Math.PI * trainingCase.frequencyHz * t;
    const growth = trainingCase.id === 'wecc-1996' ? 0.55 + progress * 1.4 : 1 - progress * 0.45;
    const forcedBoost = trainingCase.id === 'florida-2019' ? 1.15 + 0.08 * Math.sin(2 * Math.PI * 0.03 * t) : 1;
    const shape = envelope * growth * forcedBoost;
    timeSeconds.push(t);
    frequencySeries.push({ timeSeconds: t, value: 50 + 0.018 * shape * Math.sin(angle) });
    dampingSeries.push({ timeSeconds: t, value: trainingCase.dampingRatioPercent - (trainingCase.id === 'wecc-1996' ? progress * 5.8 : progress * 0.8) });
    activePowerSeries.push({ timeSeconds: t, value: 400 + 70 * shape * Math.sin(angle + Math.PI / 8) });
    reactivePowerSeries.push({ timeSeconds: t, value: 30 + 35 * shape * Math.sin(angle + Math.PI / 2) });
    voltageSeries.push({ timeSeconds: t, value: 1 + 0.018 * shape * Math.sin(angle + Math.PI) });
  }
  const nodes = caseNodes(caseId);
  const defBars = nodes.map((node, index) => ({
    pmu: node.pmu,
    value: Number(((caseId === 'florida-2019' ? 0.22 * index - 0.4 : index < 3 ? -0.45 + index * 0.16 : 0.2 + index * 0.12)).toFixed(3)),
    role: index < 3 && caseId !== 'florida-2019' ? 'absorber' as const : 'source' as const,
  }));
  return {
    caseId,
    timeSeconds,
    frequencySeries,
    dampingSeries,
    activePowerSeries,
    reactivePowerSeries,
    voltageSeries,
    modeShape: { nodes, defBars },
    operatorSummary: `${trainingCase.shortLabel} vakasında ${trainingCase.frequencyHz.toFixed(3)} Hz civarındaki ${trainingCase.mode.toLocaleLowerCase('tr-TR')} davranışı, metrik tablosu ve mode shape simülasyonu birlikte okunmalıdır.`,
  };
}
