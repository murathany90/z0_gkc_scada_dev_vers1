import { zipSync } from 'fflate';

const csv = (rows: string[][]): Uint8Array => new TextEncoder().encode(rows.map(row => row.join(',')).join('\n'));

const iso = (timestampMs: number): string => new Date(timestampMs).toISOString();

/** Small, versioned archive used by the offline benchmark regression test. */
export const createBenchmarkFixtureArchive = (): Uint8Array => {
  const startMs = Date.UTC(2026, 7, 7, 8, 33, 0);
  const pmuRows = [['timestamp', 'freq_hz', 'v1_mag', 'v1_ang', 'v2_mag', 'v2_ang', 'v3_mag', 'v3_ang', 'i1_mag', 'i1_ang', 'i2_mag', 'i2_ang', 'i3_mag', 'i3_ang', 'data_valid']];
  for (let index = 0; index < 1_000; index += 1) {
    const seconds = index / 50;
    pmuRows.push([iso(startMs + index * 20), (50 + 0.009 * Math.sin(2 * Math.PI * 0.1318359375 * seconds)).toFixed(9), '400000', '0', '400000', '-120', '400000', '120', '300', '-10', '300', '-130', '300', '110', 'true']);
  }
  const algoRows = [['timestamp', 'freq_hz', 'f_tgt_hz', 'thr_start_hz', 'magnitude_hz', 'ctrl_value', 'ctrl_state', 'damping_ratio', 'damping_type', 'time_health', 'data_valid']];
  for (let index = 0; index < 100; index += 1) {
    const seconds = index / 5;
    const active = (seconds >= 4 && seconds <= 6) || (seconds >= 12 && seconds <= 14);
    algoRows.push([iso(startMs + index * 200), (50 + 0.009 * Math.sin(2 * Math.PI * 0.1318359375 * seconds)).toFixed(9), '0.14', '0.009', active ? '0.011' : '0.004', active ? '-1' : '0', active ? 'ACTIVE' : 'IDLE', active ? '-0.018' : '0.006', active ? 'NEGATIVE' : 'POOR', 'OK', 'true']);
  }
  const centreRows = [['ts', 'ts_unix_ms', 'freq', 'p_inst_w', 'q_inst_var', 'device_id', 'role', 'time_quality', 'data_quality']];
  for (let index = 0; index < 100; index += 1) {
    const timestampMs = startMs + index * 200;
    centreRows.push([iso(timestampMs), String(timestampMs), (100 + 0.009 * Math.sin(2 * Math.PI * 0.1318359375 * index / 5)).toFixed(9), '100000000', '20000000', 'fixture-centre', 'centre', 'OK', 'OK']);
  }
  return zipSync({
    'fixture_algo.csv': csv(algoRows),
    'fixture_pmu.csv': csv(pmuRows),
    'fixture_merkez_analysis.csv': csv(centreRows),
    'fixture_merkez_measurement.csv': csv(centreRows),
  });
};
