import { classify } from './classification.service';

describe('classify', () => {
  describe('SCA', () => {
    it('classifica P1 para score >= 700', () => {
      expect(classify('SCA', 850, 'qualquer')).toBe('P1');
    });

    it('classifica P2 para score entre 400 e 699', () => {
      expect(classify('SCA', 650, 'qualquer')).toBe('P2');
    });

    it('classifica P3 para score entre 300 e 399', () => {
      expect(classify('SCA', 350, 'qualquer')).toBe('P3');
    });

    it('classifica P4 para score entre 200 e 299', () => {
      expect(classify('SCA', 250, 'qualquer')).toBe('P4');
    });

    it('classifica P5 para score entre 0 e 199', () => {
      expect(classify('SCA', 50, 'qualquer')).toBe('P5');
    });

    it('nunca promove por categoria, mesmo com categoria prioritária', () => {
      expect(classify('SCA', 650, 'SQL Injection')).toBe('P2');
    });
  });

  describe('SAST - exemplos do case', () => {
    it.each([
      [850, 'SQL Injection', 'P1'],
      [650, 'SQL Injection', 'P1'], // P2 promovido -> P1
      [650, 'Weak Encryption', 'P2'], // não promove
      [350, 'Command Injection', 'P2'], // P3 promovido -> P2
      [350, 'Cross-Site Scripting', 'P3'], // não promove
      [250, 'Path Traversal', 'P3'], // P4 promovido -> P3
      [180, 'Hardcoded Secret', 'P4'], // P5 promovido -> P4
      [180, 'Information Disclosure', 'P5'], // não promove
    ])('score=%i categoria=%s -> %s', (score, category, expected) => {
      expect(classify('SAST', score, category)).toBe(expected);
    });

    it('P1 nunca ultrapassa P1 mesmo com categoria prioritária', () => {
      expect(classify('SAST', 950, 'Remote Code Execution')).toBe('P1');
    });
  });
});