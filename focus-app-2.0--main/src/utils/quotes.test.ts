import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getRandomFallbackQuote,
  formatQuoteForSharing,
  CURATED_FOCUS_QUOTES,
} from './quotes.ts';
import type { Quote } from './quotes.ts';

test('getRandomFallbackQuote returns a valid quote with non-empty fields', () => {
  const quote = getRandomFallbackQuote();
  assert.ok(quote.id.length > 0);
  assert.ok(quote.quote.length > 0);
  assert.ok(quote.author.length > 0);
  assert.ok(CURATED_FOCUS_QUOTES.some((q) => q.id === quote.id));
});

test('getRandomFallbackQuote respects excludeId when possible', () => {
  const first = CURATED_FOCUS_QUOTES[0];
  const next = getRandomFallbackQuote(first.id);
  assert.notEqual(next.id, first.id);
});

test('formatQuoteForSharing formats properly with quotes and attribution', () => {
  const sample: Quote = {
    id: 'test',
    quote: 'Focus on what matters.',
    author: 'Anonymous',
    theme: 'Focus',
  };
  const formatted = formatQuoteForSharing(sample);
  assert.equal(formatted, '"Focus on what matters." — Anonymous');
});
