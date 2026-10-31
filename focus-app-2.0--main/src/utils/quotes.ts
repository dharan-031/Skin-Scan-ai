/**
 * Daily Wisdom quotes service and fallback repository
 */

export interface Quote {
  id: string;
  quote: string;
  author: string;
  theme?: string;
}

export const CURATED_FOCUS_QUOTES: Quote[] = [
  {
    id: '1',
    quote: 'The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.',
    author: 'Cal Newport',
    theme: 'Deep Work',
  },
  {
    id: '2',
    quote: 'Concentrate every minute like a Roman—on doing what’s in front of you with precise and genuine seriousness, tenderly, willingly, with justice.',
    author: 'Marcus Aurelius',
    theme: 'Presence',
  },
  {
    id: '3',
    quote: 'The best moments in our lives are not the passive, receptive, relaxing times... The best moments usually occur if a person’s body or mind is stretched to its limits in a voluntary effort to accomplish something difficult and worthwhile.',
    author: 'Mihaly Csikszentmihalyi',
    theme: 'Flow',
  },
  {
    id: '4',
    quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    author: 'James Clear',
    theme: 'Systems',
  },
  {
    id: '5',
    quote: 'It is not that we have a short time to live, but that we waste a lot of it.',
    author: 'Seneca',
    theme: 'Time',
  },
  {
    id: '6',
    quote: 'The successful warrior is the average man, with laser-like focus.',
    author: 'Bruce Lee',
    theme: 'Focus',
  },
  {
    id: '7',
    quote: 'Deciding what not to do is as important as deciding what to do.',
    author: 'Steve Jobs',
    theme: 'Priority',
  },
  {
    id: '8',
    quote: 'Simplicity boils down to two steps: Identify the essential. Eliminate the rest.',
    author: 'Leo Babauta',
    theme: 'Simplicity',
  },
  {
    id: '9',
    quote: 'Lack of direction, not lack of time, is the problem. We all have twenty-four hour days.',
    author: 'Zig Ziglar',
    theme: 'Direction',
  },
  {
    id: '10',
    quote: 'Action produces information. You cannot steer a parked car.',
    author: 'James Clear',
    theme: 'Action',
  },
  {
    id: '11',
    quote: 'Focus is a muscle. The more you protect it from fragmentation, the stronger it grows.',
    author: 'Greg McKeown',
    theme: 'Essentialism',
  },
];

export function getRandomFallbackQuote(excludeId?: string): Quote {
  const filtered = CURATED_FOCUS_QUOTES.filter((q) => q.id !== excludeId);
  const pool = filtered.length > 0 ? filtered : CURATED_FOCUS_QUOTES;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

export function formatQuoteForSharing(q: Quote): string {
  return `"${q.quote}" — ${q.author}`;
}

export async function fetchMotivationalQuote(excludeId?: string): Promise<Quote> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    // Attempt fetching from public quotes API
    const response = await fetch('https://dummyjson.com/quotes/random', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return getRandomFallbackQuote(excludeId);
    }

    const data = await response.json();
    if (data && typeof data.quote === 'string' && typeof data.author === 'string') {
      return {
        id: `api-${data.id || Date.now()}`,
        quote: data.quote,
        author: data.author,
        theme: 'Wisdom',
      };
    }
    return getRandomFallbackQuote(excludeId);
  } catch {
    clearTimeout(timeoutId);
    return getRandomFallbackQuote(excludeId);
  }
}
