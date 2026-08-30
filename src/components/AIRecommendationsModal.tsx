import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';
import { postJson } from '../services/apiClient';

export interface AIRecommendation {
  title: string;
  author: string;
  year?: number;
  category?: string;
  reason?: string;
}

interface AIRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: Book[];
  onAddBook?: (recommendation: AIRecommendation) => void;
}

export const AIRecommendationsModal: React.FC<AIRecommendationsModalProps> = ({
  isOpen,
  onClose,
  books,
  onAddBook,
}) => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [addedTitles, setAddedTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const payload = await postJson<{ recommendations?: unknown }>('/api/gemini/recommend', { books });
      const list = payload?.recommendations;
      if (!Array.isArray(list)) {
        throw new Error('The recommendation service returned an unexpected payload.');
      }
      setRecommendations(list as AIRecommendation[]);
      setAddedTitles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [books]);

  useEffect(() => {
    if (isOpen && recommendations.length === 0 && books.length > 0 && !isLoading && !error) {
      void generateRecommendations();
    }
  }, [isOpen, recommendations.length, books.length, isLoading, error, generateRecommendations]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif-literata text-[20px] text-[#F4EFE6] font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9963F]">auto_awesome</span>
                Discover Next
              </h2>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2C251D] text-[#A79C8C] hover:text-[#FF6B6B] transition-colors">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] pr-2 custom-scrollbar">
              {books.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <span className="material-symbols-outlined text-[48px] text-[#3A332A]">library_books</span>
                  <p className="text-[#A79C8C] font-sans-inter text-[14px]">Your library is empty. Add some books first so Gemini can learn your tastes.</p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="w-12 h-12 border-4 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin" />
                  <p className="text-[#C9963F] font-mono-ibm text-[12px] uppercase tracking-widest font-bold">Analyzing Your Taste...</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 px-6 text-center">
                  <span className="material-symbols-outlined text-[48px] text-[#FF6B6B]">error</span>
                  <p className="text-[#FF6B6B] font-mono-ibm text-[12px] leading-relaxed break-words max-w-sm">{error}</p>
                  <button
                    onClick={() => {
                      setError(null);
                      void generateRecommendations();
                    }}
                    className="px-4 py-2 bg-[#2C251D] text-[#C9963F] rounded-lg hover:bg-[#3A332A] transition-colors text-[13px] font-bold"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-[#12100E] border border-[#3A332A] rounded-xl p-4 flex gap-4 items-start group hover:border-[#C9963F] transition-colors"
                    >
                      <div className="w-12 h-16 bg-[#2C251D] rounded flex-shrink-0 flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-[#A79C8C]/50 text-[24px]">book</span>
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <h4 className="font-serif-literata text-[15px] font-bold text-[#F4EFE6] leading-tight">{rec.title}</h4>
                        <p className="font-mono-ibm text-[11px] text-[#A79C8C]">
                          {rec.author}
                          {rec.year ? ` • ${rec.year}` : ''}
                        </p>
                        {rec.reason && (
                          <p className="font-sans-inter text-[13px] text-[#D4CDA8] mt-2 italic">"{rec.reason}"</p>
                        )}
                        {onAddBook && (
                          <button
                            onClick={() => {
                              onAddBook(rec);
                              setAddedTitles((prev) => [...prev, rec.title]);
                            }}
                            disabled={addedTitles.includes(rec.title)}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#262119] hover:bg-[#3A332A] text-[#C9963F] rounded-lg font-mono-ibm text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {addedTitles.includes(rec.title) ? 'check' : 'library_add'}
                            </span>
                            {addedTitles.includes(rec.title) ? 'Added' : 'Add to library'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-[#3A332A] flex justify-center">
              <button
                onClick={() => {
                  setError(null);
                  void generateRecommendations();
                }}
                disabled={isLoading || books.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#C9963F]/10 text-[#C9963F] rounded-lg hover:bg-[#C9963F]/20 transition-colors text-[13px] font-mono-ibm font-bold uppercase tracking-wider disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
                Refresh Suggestions
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
