import JSZip from 'jszip';

interface TeamLogoEntry {
  name: string;
  logoUrl: string | null;
}

type LogoFormat = 'original' | 'obs';

interface DownloadResult {
  downloaded: number;
  skipped: number;
  failed: number;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function fetchImageAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
  return response.blob();
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(blob);
  });
}

async function convertToPng(blob: Blob): Promise<Blob> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert to PNG'));
    }, 'image/png');
  });
}

async function convertToStandardizedPng(blob: Blob, size: number): Promise<Blob> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Transparent background (default canvas state)
  ctx.clearRect(0, 0, size, size);

  // Scale image to fit within the canvas while maintaining aspect ratio, centered
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (size - w) / 2;
  const y = (size - h) / 2;

  ctx.drawImage(img, x, y, w, h);
  URL.revokeObjectURL(img.src);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert to standardized PNG'));
    }, 'image/png');
  });
}

export async function downloadTeamLogosZip(
  teams: TeamLogoEntry[],
  tournamentName: string,
  format: LogoFormat,
  onProgress?: (current: number, total: number) => void,
): Promise<DownloadResult> {
  const teamsWithLogos = teams.filter((t) => t.logoUrl);
  const skipped = teams.length - teamsWithLogos.length;

  if (teamsWithLogos.length === 0) {
    throw new Error('No teams have logos to download');
  }

  const zip = new JSZip();
  let downloaded = 0;
  let failed = 0;

  for (let i = 0; i < teamsWithLogos.length; i++) {
    const team = teamsWithLogos[i];
    onProgress?.(i + 1, teamsWithLogos.length);

    try {
      const blob = await fetchImageAsBlob(team.logoUrl!);
      const pngBlob =
        format === 'obs'
          ? await convertToStandardizedPng(blob, 512)
          : await convertToPng(blob);

      const fileName = `${sanitizeFileName(team.name)}.png`;
      zip.file(fileName, pngBlob);
      downloaded++;
    } catch {
      failed++;
    }
  }

  if (downloaded === 0) {
    throw new Error('All logo downloads failed');
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const safeTournamentName = sanitizeFileName(tournamentName);
  const suffix = format === 'obs' ? '_OBS' : '';
  const zipFileName = `${safeTournamentName}_Logos${suffix}.zip`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  link.download = zipFileName;
  link.click();
  URL.revokeObjectURL(link.href);

  return { downloaded, skipped, failed };
}
