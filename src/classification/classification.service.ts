import { Classification } from '@prisma/client';

const PRIORITY_CATEGORIES = new Set([
  'SQL Injection',
  'Command Injection',
  'Remote Code Execution',
  'SSRF',
  'Authentication Bypass',
  'Deserialization',
  'Hardcoded Secret',
  'Hardcoded Password',
  'Path Traversal',
]);

function scoreToClassification(score: number): Classification {
  if (score >= 700) return 'P1';
  if (score >= 400) return 'P2';
  if (score >= 300) return 'P3';
  if (score >= 200) return 'P4';
  return 'P5';
}

function promote(category: Classification): Classification {
  const order: Classification[] = ['P5', 'P4', 'P3', 'P2', 'P1'];

  if (category === 'P1') return category; // para P1 não sobe nível

  return order[order.indexOf(category) + 1];
}

export function classify(
  type: string,
  score: number,
  category: string,
): Classification {
  // classificação inicial pelo score
  const initialScore = scoreToClassification(score);

  if (type === 'SCA') return initialScore;

  // SAST - conferir se pertence à alguma categoria prioritária
  return PRIORITY_CATEGORIES.has(category)
    ? promote(initialScore)
    : initialScore;
}
