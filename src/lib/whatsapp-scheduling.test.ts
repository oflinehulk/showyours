import { sanitizePhoneNumber, buildSchedulingWhatsAppUrl, buildConfirmationWhatsAppUrl } from './whatsapp-scheduling';

describe('sanitizePhoneNumber', () => {
  it('removes non-digit characters', () => {
    expect(sanitizePhoneNumber('+91 12345 67890')).toBe('911234567890');
    expect(sanitizePhoneNumber('(123) 456-7890')).toBe('1234567890');
    expect(sanitizePhoneNumber('123abc456')).toBe('123456');
  });

  it('returns empty string for non-numeric input', () => {
    expect(sanitizePhoneNumber('abc')).toBe('');
  });

  it('handles already clean number', () => {
    expect(sanitizePhoneNumber('911234567890')).toBe('911234567890');
  });
});

describe('buildSchedulingWhatsAppUrl', () => {
  it('builds valid WhatsApp URL with encoded message', () => {
    const url = buildSchedulingWhatsAppUrl(
      '+91 12345',
      'Team Alpha',
      'MLBB Cup 2024',
      'https://example.com/schedule/abc123'
    );

    expect(url.startsWith('https://wa.me/9112345?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Team Alpha'));
    expect(url).toContain(encodeURIComponent('MLBB Cup 2024'));
    expect(url).toContain(encodeURIComponent('https://example.com/schedule/abc123'));
  });

  it('sanitizes phone number in URL', () => {
    const url = buildSchedulingWhatsAppUrl('+91 98765', 'Team', 'Cup', 'link');
    expect(url.startsWith('https://wa.me/9198765')).toBe(true);
  });
});

describe('buildConfirmationWhatsAppUrl', () => {
  it('builds valid WhatsApp URL with match details', () => {
    const url = buildConfirmationWhatsAppUrl(
      '+91 12345',
      'Team Alpha',
      'Team Beta',
      '2024-06-15T14:30:00Z',
      'MLBB Cup 2024'
    );

    expect(url.startsWith('https://wa.me/9112345?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Team Alpha'));
    expect(url).toContain(encodeURIComponent('Team Beta'));
    expect(url).toContain(encodeURIComponent('MLBB Cup 2024'));
  });
});
