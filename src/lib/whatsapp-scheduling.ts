/**
 * WhatsApp URL builders for match scheduling workflow
 */

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function buildSchedulingWhatsAppUrl(
  phone: string,
  squadName: string,
  tournamentName: string,
  schedulingLink: string
): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const message = [
    `Hi! Please submit your team's availability for *${tournamentName}*.`,
    ``,
    `Team: *${squadName}*`,
    ``,
    `Tap the link below and select all time slots your squad can play:`,
    schedulingLink,
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildConfirmationWhatsAppUrl(
  phone: string,
  squadName: string,
  opponentName: string,
  scheduledTime: string,
  tournamentName: string
): string {
  const cleanPhone = sanitizePhoneNumber(phone);
  const date = new Date(scheduledTime);
  const formattedDate = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const message = [
    `Hi! Your match has been scheduled for *${tournamentName}*:`,
    ``,
    `*${squadName}* vs *${opponentName}*`,
    `Date: *${formattedDate}*`,
    `Time: *${formattedTime}*`,
    ``,
    `Good luck! 🎮`,
  ].join('\n');

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function getSchedulingLink(token: string): string {
  return `${window.location.origin}/schedule/${token}`;
}
