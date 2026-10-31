import React, { useState, useEffect } from 'react';
import {
  Quote as QuoteIcon,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Feather,
} from 'lucide-react';
import {
  Quote,
  fetchMotivationalQuote,
  formatQuoteForSharing,
  getRandomFallbackQuote,
} from '../utils/quotes';

export const DailyWisdom: React.FC = () => {
  const [quote, setQuote] = useState<Quote>(() => getRandomFallbackQuote());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Fetch a quote from the API on initial mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchMotivationalQuote()
      .then((data) => {
        if (isMounted) {
          setQuote(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const newQuote = await fetchMotivationalQuote(quote.id);
      setQuote(newQuote);
    } catch {
      setQuote(getRandomFallbackQuote(quote.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatQuoteForSharing(quote));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="daily-wisdom-card"
      className="glass-panel p-6 relative overflow-hidden transition-all duration-300 flex flex-col justify-between h-full rounded-[24px]"
    >
      {/* Decorative subtle iOS glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-[#ff9f0a]/10 via-[#0a84ff]/8 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#ff9f0a]/15 border border-[#ff9f0a]/30 flex items-center justify-center text-[#ff9f0a]">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Daily Wisdom
              </h2>
              {quote.theme && (
                <span className="text-xs text-[#0a84ff] font-medium">
                  · {quote.theme}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8e8e93]">
              Mindful philosophy & science on deep focus and mastery.
            </p>
          </div>
        </div>

        {/* Action buttons with iOS touch styling */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            aria-label="Copy wisdom quote to clipboard"
            className="p-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[#8e8e93] hover:text-white border border-white/10 transition-all active:scale-95"
            title="Copy quote"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#30d158]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            aria-label="Fetch another wisdom quote"
            className="p-2 rounded-xl bg-[#1c1c1e] hover:bg-[#2c2c2e] text-[#8e8e93] hover:text-white border border-white/10 transition-all disabled:opacity-50 active:scale-95"
            title="Get another quote"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#ff9f0a]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quote Body */}
      <div className="my-2 relative z-10 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <QuoteIcon className="w-5 h-5 text-[#ff9f0a] opacity-50 shrink-0 mt-0.5" />
          <blockquote
            className={`text-sm sm:text-base font-medium text-white/95 leading-relaxed italic transition-opacity duration-300 ${
              isLoading ? 'opacity-40' : 'opacity-100'
            }`}
          >
            "{quote.quote}"
          </blockquote>
        </div>

        {/* Attribution */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1 text-xs">
          <span className="font-semibold text-[#ff9f0a] flex items-center gap-1.5">
            <Feather className="w-3.5 h-3.5 text-[#ff9f0a]/80" />
            {quote.author}
          </span>
          <span className="text-[11px] text-[#8e8e93] font-medium">
            Focus Discipline
          </span>
        </div>
      </div>
    </div>
  );
};
