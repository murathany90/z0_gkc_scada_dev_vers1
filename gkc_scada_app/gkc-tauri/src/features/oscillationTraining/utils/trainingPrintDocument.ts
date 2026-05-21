import { TRAINING_CASES } from '../data/trainingCases.ts';
import { buildSasInterareaSimulation } from './simulationModels.ts';

export type TrainingPrintPageKind =
  | 'cover'
  | 'glossary'
  | 'context'
  | 'modes'
  | 'pqvf'
  | 'damping'
  | 'detection'
  | 'sas'
  | 'cases'
  | 'application';

export interface TrainingPrintTocEntry {
  id: string;
  headingNumber: string;
  title: string;
  children: TrainingPrintTocEntry[];
}

export interface TrainingPrintPageSummary {
  id: string;
  kind: TrainingPrintPageKind;
  headingNumber: string;
  title: string;
  chartCount: number;
  figureCount: number;
}

export interface TrainingPrintDocumentModel {
  title: string;
  subtitle: string;
  toc: TrainingPrintTocEntry[];
  pages: TrainingPrintPageSummary[];
  summaryBullets: string[];
}

const mainToc = (): TrainingPrintTocEntry[] => [
  { id: 'glossary', headingNumber: '1', title: 'Terimler Sözlüğü', children: [] },
  { id: 'context', headingNumber: '2', title: 'Uygulama Bağlamı', children: [] },
  { id: 'modes', headingNumber: '3', title: 'Salınım Modları', children: [] },
  { id: 'pqvf', headingNumber: '4', title: 'P-Q-V-f Simülasyonu', children: [] },
  { id: 'damping', headingNumber: '5', title: 'Sönümleme ve Enerji', children: [] },
  { id: 'detection', headingNumber: '6', title: 'PMU Algılama', children: [] },
  {
    id: 'sas',
    headingNumber: '7',
    title: 'SAS Çalışması',
    children: buildSasInterareaSimulation({
      amplitudeMhz: 16,
      modeFrequencyHz: 0.15,
      triggerThresholdMhz: 10,
      dampingPercent: 4,
    }).tabs.map((tab, index) => ({
      id: `sas-${tab.id}`,
      headingNumber: `7.${index + 1}`,
      title: tab.label.replace(/^\d+\.\s*/, ''),
      children: [],
    })),
  },
  {
    id: 'cases',
    headingNumber: '8',
    title: 'Vaka ve Teşhis',
    children: TRAINING_CASES.map((trainingCase, index) => ({
      id: `case-${trainingCase.id}`,
      headingNumber: `8.${index + 1}`,
      title: trainingCase.shortLabel,
      children: [],
    })),
  },
  { id: 'application', headingNumber: '9', title: 'Salınım Algılama Uygulaması', children: [] },
];

export function buildTrainingPrintDocumentModel(): TrainingPrintDocumentModel {
  const sasSimulation = buildSasInterareaSimulation({
    amplitudeMhz: 16,
    modeFrequencyHz: 0.15,
    triggerThresholdMhz: 10,
    dampingPercent: 4,
  });
  const toc = mainToc();
  return {
    title: 'Salınım Eğitimi ve Simülasyon Eğitim Dokümanı',
    subtitle: 'PMU modal analiz, P-Q-V-f okuma, lokal SAS-C çalışma mantığı ve vaka teşhisi için operatör eğitim çıktısı.',
    toc,
    summaryBullets: [
      'Doküman, ekrandaki tüm ana sekmeleri ve SAS alt sekmelerini numaralı eğitim başlıklarıyla yazdırır.',
      'Grafikler PDF çıktıda okunur kalması için landscape sayfalarda 2x2 veya tekil düzenle gösterilir.',
      'SAS Çalışması bölümü, altı bara ve toplam sistem sekmesi için dörder grafik içerir.',
      'Vaka ve Teşhis bölümü, dört eğitim vakasının grafiklerini, metriklerini ve görsellerini rapora dahil eder.',
    ],
    pages: [
      { id: 'cover', kind: 'cover', headingNumber: 'Kapak', title: 'Kapak ve İçindekiler', chartCount: 0, figureCount: 0 },
      { id: 'glossary', kind: 'glossary', headingNumber: '1', title: 'Terimler Sözlüğü', chartCount: 0, figureCount: 0 },
      { id: 'context', kind: 'context', headingNumber: '2', title: 'Uygulama Bağlamı', chartCount: 0, figureCount: 2 },
      { id: 'modes', kind: 'modes', headingNumber: '3', title: 'Salınım Modları', chartCount: 2, figureCount: 2 },
      { id: 'pqvf', kind: 'pqvf', headingNumber: '4', title: 'P-Q-V-f Simülasyonu', chartCount: 5, figureCount: 2 },
      { id: 'damping', kind: 'damping', headingNumber: '5', title: 'Sönümleme ve Enerji', chartCount: 2, figureCount: 2 },
      { id: 'detection', kind: 'detection', headingNumber: '6', title: 'PMU Algılama', chartCount: 3, figureCount: 2 },
      { id: 'sas', kind: 'sas', headingNumber: '7', title: 'SAS Çalışması', chartCount: sasSimulation.tabs.length * 4, figureCount: 4 },
      { id: 'cases', kind: 'cases', headingNumber: '8', title: 'Vaka ve Teşhis', chartCount: TRAINING_CASES.length * 5, figureCount: TRAINING_CASES.reduce((total, trainingCase) => total + trainingCase.assetNames.length, 0) },
      { id: 'application', kind: 'application', headingNumber: '9', title: 'Salınım Algılama Uygulaması', chartCount: 0, figureCount: 3 },
    ],
  };
}
