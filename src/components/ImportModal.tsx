import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book } from '../types';
import { parseLibraryCsv, rowsToBooks, type ImportResult } from '../services/libraryImport';
import { lookupByIsbn } from '../services/bookLookup';
import { haptic } from '../services/haptics';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingBooks: Book[];
  targetShelfId: string;
  onImport: (books: Book[]) => void;
}

type Stage = 'pick' | 'preview' | 'enriching';

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  existingBooks,
  targetShelfId,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>('pick');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fetchCovers, setFetchCovers] = useState(true);
  const [enrichProgress, setEnrichProgress] = useState({ done: 0, total: 0 });

  const reset = () => {
    setStage('pick');
    setResult(null);
    setFileName('');
    setError(null);
    setEnrichProgress({ done: 0, total: 0 });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseLibraryCsv(text);
      if (parsed.rows.length === 0) {
        setError(parsed.skipped[0]?.reason ?? 'No importable rows were found in that file.');
        return;
      }
      setResult(parsed);
      setStage('preview');
      haptic.selectionClick();
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown));
    }
  };

  const handleImport = async () => {
    if (!result) return;
    const { books, duplicates } = rowsToBooks(result.rows, existingBooks, targetShelfId);

    if (books.length === 0) {
      setError(`Every row is already in your library (${duplicates} duplicate${duplicates === 1 ? '' : 's'}).`);
      return;
    }

    if (!fetchCovers) {
      onImport(books);
      haptic.success();
      handleClose();
      return;
    }

    // Enrich sequentially: Open Library is a free service, so do not hammer it.
    const withIsbn = books.filter((book) => book.isbn);
    setStage('enriching');
    setEnrichProgress({ done: 0, total: withIsbn.length });

    for (let i = 0; i < withIsbn.length; i++) {
      const book = withIsbn[i];
      try {
        const found = await lookupByIsbn(book.isbn);
        book.coverUrl = found.coverUrl || book.coverUrl;
        book.publisher = book.publisher || found.publisher;
        book.pageCount = book.pageCount || found.pageCount;
        book.publishYear = book.publishYear || found.publishYear;
      } catch {
        // A missing catalog entry is expected for some ISBNs; keep the CSV data.
      }
      setEnrichProgress({ done: i + 1, total: withIsbn.length });
    }

    onImport(books);
    haptic.success();
    handleClose();
  };

  const previewRows = result?.rows.slice(0, 8) ?? [];

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
            className="bg-[#1C1916] border border-[#3A332A] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]"
          >
            <div className="flex justify-between items-center p-5 border-b border-[#3A332A]">
              <div>
                <h2 className="font-serif-literata text-[20px] text-[#F4EFE6] font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C9963F]">upload_file</span>
                  Import library
                </h2>
                <p className="font-mono-ibm text-[10px] text-[#8C8273] uppercase tracking-widest mt-0.5">
                  Bookshelf or Goodreads CSV export
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2C251D] text-[#A79C8C] hover:text-[#C9963F] transition-colors"
                aria-label="Close import"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="bg-[#2A1A1A] border border-[#A9503F]/50 rounded-xl px-4 py-3 text-[13px] text-[#FF6B6B]">
                  {error}
                </div>
              )}

              {stage === 'pick' && (
                <div className="space-y-4">
                  <p className="font-sans-inter text-[14px] text-[#A79C8C] leading-relaxed">
                    Pick a CSV file. A Goodreads export works as is — download it from{' '}
                    <span className="text-[#D4CDA8]">Goodreads → My Books → Import and export</span>. The columns for
                    title, author, ISBN, shelf, rating and review are read automatically.
                  </p>

                  <input type="file" accept=".csv,text/csv" ref={fileInputRef} className="hidden" onChange={handleFile} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-8 border-2 border-dashed border-[#3A332A] hover:border-[#C9963F] rounded-xl flex flex-col items-center gap-2 text-[#A79C8C] hover:text-[#C9963F] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[32px]">description</span>
                    <span className="font-mono-ibm text-[12px] uppercase tracking-wider">Choose CSV file</span>
                  </button>
                </div>
              )}

              {stage === 'preview' && result && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3 text-[12px] font-mono-ibm">
                    <span className="px-2.5 py-1 rounded bg-[#262119] text-[#85E07D]">
                      {result.rows.length} rows read
                    </span>
                    <span className="px-2.5 py-1 rounded bg-[#262119] text-[#A79C8C]">
                      format: {result.detectedFormat}
                    </span>
                    {result.skipped.length > 0 && (
                      <span className="px-2.5 py-1 rounded bg-[#3A2412] text-[#F5BD62]">
                        {result.skipped.length} skipped
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded bg-[#262119] text-[#8C8273] truncate max-w-[220px]">
                      {fileName}
                    </span>
                  </div>

                  <div className="border border-[#3A332A] rounded-xl overflow-hidden">
                    <table className="w-full text-left text-[12px]">
                      <thead className="bg-[#12100E] text-[#8C8273] font-mono-ibm uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Author</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="font-sans-inter text-[#D4CDA8]">
                        {previewRows.map((row, index) => (
                          <tr key={index} className="border-t border-[#3A332A]/60">
                            <td className="px-3 py-2 truncate max-w-[260px]">{row.title}</td>
                            <td className="px-3 py-2 truncate max-w-[160px] text-[#A79C8C]">{row.author}</td>
                            <td className="px-3 py-2 text-[#A79C8C]">{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.rows.length > previewRows.length && (
                      <p className="px-3 py-2 bg-[#12100E] text-[11px] font-mono-ibm text-[#8C8273] border-t border-[#3A332A]/60">
                        + {result.rows.length - previewRows.length} more
                      </p>
                    )}
                  </div>

                  {result.skipped.length > 0 && (
                    <details className="bg-[#12100E] border border-[#3A332A] rounded-xl px-4 py-3">
                      <summary className="cursor-pointer font-mono-ibm text-[11px] text-[#F5BD62] uppercase tracking-wider">
                        {result.skipped.length} rows skipped
                      </summary>
                      <ul className="mt-2 space-y-1 text-[11px] font-mono-ibm text-[#8C8273] max-h-32 overflow-y-auto">
                        {result.skipped.map((entry, index) => (
                          <li key={index}>
                            line {entry.line}: {entry.reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <label className="flex items-center gap-2 text-[13px] text-[#D4CDA8]">
                    <input
                      type="checkbox"
                      checked={fetchCovers}
                      onChange={(event) => setFetchCovers(event.target.checked)}
                      className="accent-[#C9963F]"
                    />
                    Fetch covers and missing metadata from Open Library (slower, one request per ISBN)
                  </label>
                </div>
              )}

              {stage === 'enriching' && (
                <div className="py-10 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin" />
                  <p className="font-mono-ibm text-[12px] text-[#C9963F] uppercase tracking-widest">
                    Fetching covers {enrichProgress.done}/{enrichProgress.total}
                  </p>
                  <div className="w-full max-w-xs h-1.5 bg-[#262119] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#C9963F] transition-all"
                      style={{
                        width: `${enrichProgress.total ? (enrichProgress.done / enrichProgress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {stage === 'preview' && (
              <div className="p-5 border-t border-[#3A332A] flex justify-end gap-2">
                <button onClick={reset} className="px-4 py-2 text-[#A79C8C] hover:text-[#F4EFE6] text-[13px]">
                  Choose another file
                </button>
                <button
                  onClick={() => void handleImport()}
                  className="px-5 py-2.5 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-xl font-mono-ibm text-[11px] font-bold uppercase tracking-wider"
                >
                  Import {result?.rows.length} books
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
