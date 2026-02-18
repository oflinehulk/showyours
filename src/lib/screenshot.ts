import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export async function captureAndDownload(element: HTMLElement, filename: string) {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0e1a',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Screenshot downloaded!');
  } catch (err) {
    toast.error('Failed to capture screenshot');
  }
}

export async function captureAndShare(element: HTMLElement, filename: string) {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0e1a',
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error('Failed to capture screenshot');
        return;
      }
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
      } else {
        // Fallback to download
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
        toast.success('Screenshot downloaded!');
      }
    }, 'image/png');
  } catch (err) {
    toast.error('Failed to capture screenshot');
  }
}
