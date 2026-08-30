import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ReadingGoals, GenreMilestone } from '../types';
import { haptic } from '../services/haptics';

interface ReadingGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: ReadingGoals;
  onSave: (newGoals: ReadingGoals) => void;
}

export const ReadingGoalsModal: React.FC<ReadingGoalsModalProps> = ({
  isOpen,
  onClose,
  goals,
  onSave
}) => {
  const [annualPageCount, setAnnualPageCount] = useState(goals.annualPageCount?.toString() || '');
  const [annualBookCount, setAnnualBookCount] = useState(goals.annualBookCount?.toString() || '');
  const [genreMilestones, setGenreMilestones] = useState<GenreMilestone[]>(goals.genreMilestones || []);

  const [newGenre, setNewGenre] = useState('');
  const [newGenreTarget, setNewGenreTarget] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      annualPageCount: parseInt(annualPageCount) || undefined,
      annualBookCount: parseInt(annualBookCount) || undefined,
      genreMilestones
    });
    onClose();
  };

  const handleAddGenre = () => {
    if (newGenre && newGenreTarget) {
      setGenreMilestones([...genreMilestones, { genre: newGenre, targetCount: parseInt(newGenreTarget) || 1 }]);
      setNewGenre('');
      setNewGenreTarget('');
    }
  };

  const handleRemoveGenre = (index: number) => {
    const updated = [...genreMilestones];
    updated.splice(index, 1);
    setGenreMilestones(updated);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-[#1C1916] rounded-2xl p-6 w-full max-w-md border border-[#3A332A] shadow-2xl flex flex-col max-h-[85vh]"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="font-serif-literata text-[24px] text-[#F4EFE6] font-bold">Reading Goals</h2>
              <p className="font-mono-ibm text-[11px] text-[#A79C8C] mt-1 uppercase tracking-wider">Set your reading milestones</p>
            </div>
            <button
              onClick={onClose}
              className="text-[#A79C8C] hover:text-[#F4EFE6] transition-colors p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="overflow-y-auto pr-2 space-y-6 flex-1 custom-scrollbar">
            {/* Overall Annual Goals */}
            <div className="space-y-4">
              <h3 className="font-sans-inter text-[14px] font-semibold text-[#F4EFE6]">Annual Targets</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-mono-ibm text-[#A79C8C] uppercase tracking-wider mb-1.5">
                    Books per year
                  </label>
                  <input
                    type="number"
                    value={annualBookCount}
                    onChange={(e) => setAnnualBookCount(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full bg-[#12100E] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[#F4EFE6] text-[14px] focus:outline-none focus:border-[#C9963F] transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-[11px] font-mono-ibm text-[#A79C8C] uppercase tracking-wider mb-1.5">
                    Pages per year
                  </label>
                  <input
                    type="number"
                    value={annualPageCount}
                    onChange={(e) => setAnnualPageCount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full bg-[#12100E] border border-[#3A332A] rounded-xl px-4 py-2.5 text-[#F4EFE6] text-[14px] focus:outline-none focus:border-[#C9963F] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Genre Milestones */}
            <div className="space-y-4 pt-4 border-t border-[#3A332A]">
              <h3 className="font-sans-inter text-[14px] font-semibold text-[#F4EFE6]">Genre Milestones</h3>
              
              {genreMilestones.length > 0 ? (
                <div className="space-y-2">
                  {genreMilestones.map((gm, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#12100E] border border-[#3A332A] p-2.5 rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-[#F4EFE6] text-[13px] font-sans-inter">{gm.genre}</span>
                        <span className="text-[#A79C8C] text-[11px] font-mono-ibm">Target: {gm.targetCount} books</span>
                      </div>
                      <button
                        onClick={() => handleRemoveGenre(idx)}
                        className="text-[#E57373] hover:text-[#ef9a9a] transition-colors p-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-[#A79C8C] font-mono-ibm italic">No genre milestones set.</p>
              )}

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[10px] font-mono-ibm text-[#A79C8C] uppercase tracking-wider mb-1">Genre</label>
                  <input
                    type="text"
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    placeholder="e.g. Sci-Fi"
                    className="w-full bg-[#12100E] border border-[#3A332A] rounded-lg px-3 py-2 text-[#F4EFE6] text-[13px] focus:outline-none focus:border-[#C9963F]"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-[10px] font-mono-ibm text-[#A79C8C] uppercase tracking-wider mb-1">Books</label>
                  <input
                    type="number"
                    value={newGenreTarget}
                    onChange={(e) => setNewGenreTarget(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full bg-[#12100E] border border-[#3A332A] rounded-lg px-3 py-2 text-[#F4EFE6] text-[13px] focus:outline-none focus:border-[#C9963F]"
                  />
                </div>
                <button
                  onClick={() => {
                    haptic.selectionClick();
                    handleAddGenre();
                  }}
                  disabled={!newGenre || !newGenreTarget}
                  className="bg-[#262119] hover:bg-[#322B22] border border-[#3A332A] text-[#C9963F] rounded-lg px-3 py-2 disabled:opacity-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#3A332A] flex justify-end">
            <button
              onClick={() => {
                haptic.selectionClick();
                handleSave();
              }}
              className="px-6 py-2.5 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] font-mono-ibm text-[12px] font-bold rounded-xl tracking-wider transition-all"
            >
              SAVE GOALS
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
