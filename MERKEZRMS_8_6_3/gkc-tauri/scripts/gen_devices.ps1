$csvPath = "c:\yazilim_projeler\zgkctest\ytbs_gkc\MGKP_CIHAZ_LISTESI.csv"
$outPath = "c:\yazilim_projeler\zgkctest\MERKEZRMS_8_6_3\gkc-tauri\src\data\deviceList.ts"

$csv = Get-Content $csvPath -Encoding UTF8
$lines = $csv | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("// GKC Cihaz Listesi - MGKP_CIHAZ_LISTESI.csv den uretildi")
[void]$sb.AppendLine("export interface GkcDevice { id: string; tmAdi: string; fiderAdi: string; il: string; bolge: string; gerilim: number; olcumModu: string; aktif: boolean; }")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("export const DEVICE_LIST: GkcDevice[] = [")

foreach ($line in $lines) {
    $parts = $line.Split(";")
    if ($parts.Length -ge 10) {
        $id = $parts[0].Trim()
        $tm = $parts[1].Trim() -replace "'", ""
        $fider = $parts[2].Trim() -replace "'", ""
        $il = $parts[3].Trim()
        $bolge = $parts[4].Trim()
        $ger = $parts[5].Trim()
        $mod = $parts[6].Trim()
        $aktif = if ($parts[9].Trim() -eq "true") { "true" } else { "false" }
        [void]$sb.AppendLine("  { id: '$id', tmAdi: '$tm', fiderAdi: '$fider', il: '$il', bolge: '$bolge', gerilim: $ger, olcumModu: '$mod', aktif: $aktif },")
    }
}

[void]$sb.AppendLine("];")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("export const ACTIVE_DEVICES = DEVICE_LIST.filter(d => d.aktif);")
[void]$sb.AppendLine("export const DEVICE_MAP = new Map(DEVICE_LIST.map(d => [d.id, d]));")

New-Item -Path (Split-Path $outPath) -ItemType Directory -Force | Out-Null
$sb.ToString() | Out-File -FilePath $outPath -Encoding UTF8 -Force
Write-Host "Created deviceList.ts with $($lines.Count) devices"
