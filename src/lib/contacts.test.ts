import { parseContacts, getContactValue, hasContactType } from './contacts';

describe('parseContacts', () => {
  it('returns empty array for falsy input', () => {
    expect(parseContacts(null)).toEqual([]);
    expect(parseContacts(undefined)).toEqual([]);
    expect(parseContacts('')).toEqual([]);
    expect(parseContacts(0)).toEqual([]);
  });

  it('parses valid JSON string', () => {
    const json = JSON.stringify([{ type: 'whatsapp', value: '+91123' }]);
    expect(parseContacts(json)).toEqual([{ type: 'whatsapp', value: '+91123' }]);
  });

  it('parses valid array', () => {
    const arr = [{ type: 'discord', value: 'user#1234' }];
    expect(parseContacts(arr)).toEqual([{ type: 'discord', value: 'user#1234' }]);
  });

  it('returns empty array for non-array JSON string', () => {
    expect(parseContacts('"hello"')).toEqual([]);
    expect(parseContacts('42')).toEqual([]);
    expect(parseContacts('{"key":"val"}')).toEqual([]);
  });

  it('returns empty array for invalid JSON string', () => {
    expect(parseContacts('not json')).toEqual([]);
    expect(parseContacts('{broken')).toEqual([]);
  });

  it('returns empty array for non-object/non-string input', () => {
    expect(parseContacts(42)).toEqual([]);
    expect(parseContacts(true)).toEqual([]);
  });

  it('filters out entries missing type or value', () => {
    const input = [
      { type: 'whatsapp', value: '+91123' },
      { type: 'discord' },           // missing value
      { value: 'test' },             // missing type
      { type: 123, value: 'test' },  // type is not string
      null,
      'string',
    ];
    expect(parseContacts(input)).toEqual([{ type: 'whatsapp', value: '+91123' }]);
  });

  it('handles multiple valid contacts', () => {
    const input = [
      { type: 'whatsapp', value: '+91123' },
      { type: 'discord', value: 'user#1234' },
      { type: 'instagram', value: '@user' },
    ];
    expect(parseContacts(input)).toHaveLength(3);
  });
});

describe('getContactValue', () => {
  const contacts = [
    { type: 'whatsapp', value: '+91123' },
    { type: 'discord', value: 'user#1234' },
  ];

  it('returns value for matching type', () => {
    expect(getContactValue(contacts, 'whatsapp')).toBe('+91123');
    expect(getContactValue(contacts, 'discord')).toBe('user#1234');
  });

  it('returns undefined for non-matching type', () => {
    expect(getContactValue(contacts, 'instagram')).toBeUndefined();
  });

  it('returns undefined for null contacts', () => {
    expect(getContactValue(null, 'whatsapp')).toBeUndefined();
  });
});

describe('hasContactType', () => {
  const contacts = [
    { type: 'whatsapp', value: '+91123' },
    { type: 'discord', value: '' },
    { type: 'instagram', value: '   ' },
  ];

  it('returns true for type with non-empty value', () => {
    expect(hasContactType(contacts, 'whatsapp')).toBe(true);
  });

  it('returns false for type with empty value', () => {
    expect(hasContactType(contacts, 'discord')).toBe(false);
  });

  it('returns false for type with whitespace-only value', () => {
    expect(hasContactType(contacts, 'instagram')).toBe(false);
  });

  it('returns false for missing type', () => {
    expect(hasContactType(contacts, 'game-id')).toBe(false);
  });

  it('returns false for null contacts', () => {
    expect(hasContactType(null, 'whatsapp')).toBe(false);
  });
});
