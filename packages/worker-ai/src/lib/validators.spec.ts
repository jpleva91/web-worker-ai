import { countSentences, hasTwoSentences, isBoundedString } from './validators';

describe('validators', () => {
  it('counts sentence-like segments', () => {
    expect(countSentences('One. Two!')).toBe(2);
    expect(hasTwoSentences('One. Two!')).toBe(true);
    expect(hasTwoSentences('One only.')).toBe(false);
  });

  it('validates bounded strings', () => {
    const validate = isBoundedString(2, 5);
    expect(validate('ok')).toBe(true);
    expect(validate('')).toBe(false);
    expect(validate('too long')).toBe(false);
  });
});
