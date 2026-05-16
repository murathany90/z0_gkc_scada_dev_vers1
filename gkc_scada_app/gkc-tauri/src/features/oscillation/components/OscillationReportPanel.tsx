import type { OscillationAnalysisResult, PmuFider } from '../types/oscillationTypes.ts';
import { buildSummaryText } from '../utils/reportBuilder.ts';

export function OscillationReportPanel({
  result,
  reportMarkdown,
  pmuDevices,
}: {
  result: OscillationAnalysisResult | null;
  reportMarkdown: string;
  pmuDevices: PmuFider[];
}) {
  const report = reportMarkdown || buildSummaryText(result, pmuDevices);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn" disabled={!result} onClick={() => window.print()} style={{ fontSize: 11 }}>Yazdır / PDF</button>
      </div>
      <pre style={{
        whiteSpace: 'pre-wrap',
        margin: 0,
        padding: 14,
        border: '1px solid var(--border-color)',
        borderRadius: 6,
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        fontSize: 12,
        lineHeight: 1.55,
      }}>
        {report}
      </pre>
    </div>
  );
}
