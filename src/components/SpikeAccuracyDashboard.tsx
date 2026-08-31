import React, { useMemo, useState } from 'react';
import { SPIKE_DATASET } from '../data/spikeDataset';
import { SpikeSample } from '../types';
import { haptic } from '../services/haptics';
import { runBenchmark, measureSample } from '../services/matchBenchmark';
import { useT } from '../i18n/I18nProvider';

interface SpikeAccuracyDashboardProps {
  onClose: () => void;
  onTestSampleInScanner?: (sample: SpikeSample) => void;
}

export const SpikeAccuracyDashboard: React.FC<SpikeAccuracyDashboardProps> = ({
  onClose,
  onTestSampleInScanner,
}) => {
  const t = useT();
  const [selectedSample, setSelectedSample] = useState<SpikeSample>(SPIKE_DATASET[0]);
  const [activeTab, setActiveTab] = useState<'matrix' | 'markdown' | 'checklist'>('matrix');

  // Measured live against the samples' ground truth, rather than read from
  // hard-coded numbers that never ran anything.
  const benchmark = useMemo(() => runBenchmark(SPIKE_DATASET), []);
  const selectedMeasurement = useMemo(() => measureSample(selectedSample), [selectedSample]);

  const totalBooks = benchmark.totals.expectedCount;
  const catalogCoverage = benchmark.totals.coverage;
  const avgMatchAccuracy = benchmark.totals.matchAccuracy;
  const ambiguityRate = benchmark.totals.ambiguityRate;

  // Top-1 accuracy on the books the catalog actually contains is the number
  // that says whether the matcher works; coverage says how far it can reach.
  const isGatePassed = avgMatchAccuracy >= 0.9 && ambiguityRate <= 0.2;

  const categories = (['good_light', 'warm_angle', 'thin_spines', 'turkish_classics'] as const).map((key) => ({
    key,
    ...t.spike.categories[key],
    samples: SPIKE_DATASET.filter((s) => s.category === key),
  }));

  return (
    <div className="fixed inset-0 z-50 bg-[#12100E] text-[#F4EFE6] flex flex-col overflow-hidden">
      {/* Top Header */}
      <header className="p-4 sm:px-6 bg-[#181512] border-b border-[#3A332A] flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#C9963F]/20 hairline-border flex items-center justify-center text-[#C9963F]">
            <span className="material-symbols-outlined text-[20px]">analytics</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-literata text-[20px] text-[#F4EFE6] font-bold">
                {t.spike.title}
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#6E8F6A]/20 text-[#C8ECC1] border border-[#6E8F6A]/40 font-mono-ibm text-[10px] font-bold">
                {isGatePassed ? t.spike.gatePassed : t.spike.gateFailed}
              </span>
            </div>
            <p className="font-sans-inter text-[12px] text-[#A79C8C]">
              {t.spike.subtitle}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            haptic.lightImpact();
            onClose();
          }}
          className="text-[#A79C8C] hover:text-[#F4EFE6] p-2 rounded-full hairline-border hover:bg-[#262119] transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </header>

      {/* The bundled benchmark set is synthetic sample data, not a measurement of
          the live recognition pipeline. Say so plainly instead of implying otherwise. */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#3A2412] border-b border-[#C9963F]/40 flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-[#F5BD62] shrink-0">science</span>
        <p className="font-sans-inter text-[12px] text-[#F5BD62] leading-relaxed">
          <strong className="font-semibold">{t.spike.measuredLocallyLead}</strong> {t.spike.measuredLocallyBody}
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-[#151311] border-b border-[#3A332A] px-6 flex gap-6 text-[13px] font-mono-ibm">
        <button
          onClick={() => {
            haptic.selectionClick();
            setActiveTab('matrix');
          }}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'matrix'
              ? 'border-[#C9963F] text-[#C9963F] font-semibold'
              : 'border-transparent text-[#A79C8C] hover:text-[#F4EFE6]'
          }`}
        >
          {t.spike.tabMetrics}
        </button>
        <button
          onClick={() => {
            haptic.selectionClick();
            setActiveTab('markdown');
          }}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'markdown'
              ? 'border-[#C9963F] text-[#C9963F] font-semibold'
              : 'border-transparent text-[#A79C8C] hover:text-[#F4EFE6]'
          }`}
        >
          /spike/report.md
        </button>
        <button
          onClick={() => {
            haptic.selectionClick();
            setActiveTab('checklist');
          }}
          className={`py-3 border-b-2 transition-colors ${
            activeTab === 'checklist'
              ? 'border-[#C9963F] text-[#C9963F] font-semibold'
              : 'border-transparent text-[#A79C8C] hover:text-[#F4EFE6]'
          }`}
        >
          {t.spike.tabChecklist}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 max-w-[1200px] mx-auto w-full space-y-6">
        {/* KPI Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="bg-[#1C1916] rounded-xl p-4 hairline-border">
            <div className="font-mono-ibm text-[11px] text-[#A79C8C] uppercase tracking-wider mb-1">
              {t.spike.totalSamples}
            </div>
            <div className="font-serif-literata text-[28px] text-[#F4EFE6] font-bold">
              20 / {totalBooks}
            </div>
            <div className="font-sans-inter text-[11px] text-[#9C8F7E] mt-1">
              {t.spike.buckets}
            </div>
          </div>

          <div className="bg-[#1C1916] rounded-xl p-4 hairline-border border-[#6E8F6A]/30">
            <div className="font-mono-ibm text-[11px] text-[#C8ECC1] uppercase tracking-wider mb-1 flex justify-between">
              <span>{t.spike.catalogCoverage}</span>
              <span>{t.spike.entries(benchmark.catalogSize)}</span>
            </div>
            <div className="font-serif-literata text-[28px] text-[#C8ECC1] font-bold">
              {(catalogCoverage * 100).toFixed(1)}%
            </div>
            <div className="font-sans-inter text-[11px] text-[#6E8F6A] mt-1">
              {t.spike.coverageDetail(benchmark.totals.coveredCount, totalBooks)}
            </div>
          </div>

          <div className="bg-[#1C1916] rounded-xl p-4 hairline-border border-[#6E8F6A]/30">
            <div className="font-mono-ibm text-[11px] text-[#C8ECC1] uppercase tracking-wider mb-1 flex justify-between">
              <span>{t.spike.top1Accuracy}</span>
              <span>{t.spike.gateAbove90}</span>
            </div>
            <div className="font-serif-literata text-[28px] text-[#C8ECC1] font-bold">
              {(avgMatchAccuracy * 100).toFixed(1)}%
            </div>
            <div className="font-sans-inter text-[11px] text-[#6E8F6A] mt-1">
              {t.spike.vsGate(((avgMatchAccuracy - 0.9) * 100).toFixed(1))}
            </div>
          </div>

          <div className="bg-[#1C1916] rounded-xl p-4 hairline-border border-[#6E8F6A]/30">
            <div className="font-mono-ibm text-[11px] text-[#C8ECC1] uppercase tracking-wider mb-1 flex justify-between">
              <span>{t.spike.ambiguousMatches}</span>
              <span>{t.spike.gateBelow20}</span>
            </div>
            <div className="font-serif-literata text-[28px] text-[#C8ECC1] font-bold">
              {(ambiguityRate * 100).toFixed(1)}%
            </div>
            <div className="font-sans-inter text-[11px] text-[#6E8F6A] mt-1">
              {t.spike.runnerUp}
            </div>
          </div>
        </div>

        {activeTab === 'matrix' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Category breakdown & sample grid */}
            <div className="lg:col-span-7 space-y-6">
              {categories.map((cat) => {
                const catRecall =
                  cat.samples.reduce((a, s) => a + measureSample(s).coverage, 0) /
                  cat.samples.length;
                const catText =
                  cat.samples.reduce((a, s) => a + measureSample(s).matchAccuracy, 0) /
                  cat.samples.length;
                const catE2E =
                  cat.samples.reduce((a, s) => a + measureSample(s).ambiguityRate, 0) /
                  cat.samples.length;

                return (
                  <div key={cat.key} className="bg-[#1C1916] rounded-xl p-4 sm:p-5 hairline-border">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 border-b border-[#3A332A] pb-2.5">
                      <div>
                        <h3 className="font-serif-literata text-[17px] text-[#F4EFE6] font-semibold">
                          {cat.name}
                        </h3>
                        <p className="font-sans-inter text-[12px] text-[#A79C8C]">{cat.target}</p>
                      </div>

                      <div className="flex gap-2 font-mono-ibm text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-[#100E0C] hairline-border text-[#C8ECC1]">
                          {t.spike.rec((catRecall * 100).toFixed(0))}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#100E0C] hairline-border text-[#F5BD62]">
                          {t.spike.txt((catText * 100).toFixed(0))}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#100E0C] hairline-border text-[#C9963F]">
                          {t.spike.e2e((catE2E * 100).toFixed(0))}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {cat.samples.map((sample) => {
                        const isSelected = selectedSample.id === sample.id;
                        return (
                          <div
                            key={sample.id}
                            onClick={() => {
                              haptic.selectionClick();
                              setSelectedSample(sample);
                            }}
                            className={`p-2 rounded-lg bg-[#12100E] hairline-border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-[#C9963F] ring-1 ring-[#C9963F]'
                                : 'hover:border-[#4F4537]'
                            }`}
                          >
                            <div className="w-full h-20 rounded overflow-hidden mb-1.5 bg-black">
                              <img
                                src={sample.imageUrl}
                                alt={sample.name}
                                className="w-full h-full object-cover grayscale-[20%]"
                              />
                            </div>
                            <p className="font-mono-ibm text-[11px] text-[#F4EFE6] truncate font-medium">
                              {sample.name.split('—')[1] || sample.name}
                            </p>
                            <p className="font-sans-inter text-[10px] text-[#A79C8C]">
                              {t.spike.sampleMeta(sample.bookCount, sample.angle)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 5 cols: Sample detail inspector */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#1C1916] rounded-xl p-5 hairline-border sticky top-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-mono-ibm text-[10px] text-[#C9963F] uppercase tracking-wider">
                      {t.spike.inspector}
                    </span>
                    <h3 className="font-serif-literata text-[20px] text-[#F4EFE6] font-semibold">
                      {selectedSample.name}
                    </h3>
                  </div>
                  <span className="font-mono-ibm text-[11px] text-[#A79C8C] px-2 py-0.5 rounded bg-[#100E0C] hairline-border">
                    {t.spike.vols(selectedSample.bookCount)}
                  </span>
                </div>

                <div className="w-full h-44 rounded-xl overflow-hidden mb-4 hairline-border bg-black relative">
                  <img
                    src={selectedSample.imageUrl}
                    alt={selectedSample.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[10px] font-mono-ibm text-[#F4EFE6]">
                    {selectedSample.lighting}
                  </div>
                </div>

                {/* Sample Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-4 font-mono-ibm text-center">
                  <div className="bg-[#12100E] p-2 rounded hairline-border">
                    <span className="text-[9px] text-[#A79C8C] block">{t.spike.coverageShort}</span>
                    <span className="text-[14px] text-[#C8ECC1] font-bold">
                      {(selectedMeasurement.coverage * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-[#12100E] p-2 rounded hairline-border">
                    <span className="text-[9px] text-[#A79C8C] block">{t.spike.matchShort}</span>
                    <span className="text-[14px] text-[#F5BD62] font-bold">
                      {(selectedMeasurement.matchAccuracy * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="bg-[#12100E] p-2 rounded hairline-border">
                    <span className="text-[9px] text-[#A79C8C] block">{t.spike.ambigShort}</span>
                    <span className="text-[14px] text-[#C9963F] font-bold">
                      {(selectedMeasurement.ambiguityRate * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Ground Truth Titles */}
                <div className="space-y-2 mb-4">
                  <span className="font-mono-ibm text-[10px] text-[#A79C8C] uppercase tracking-wider block">
                    {t.spike.groundTruth(selectedSample.groundTruth.length)}
                  </span>
                  <div className="max-h-52 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                    {selectedSample.groundTruth.map((gt, i) => (
                      <div
                        key={i}
                        className="p-2 bg-[#12100E] rounded hairline-border text-[12px] flex items-center justify-between"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-serif-literata text-[#F4EFE6] truncate">{gt.title}</p>
                          <p className="font-sans-inter text-[11px] text-[#A79C8C] truncate">
                            {gt.author} ({gt.year}) • {gt.publisher}
                          </p>
                        </div>
                        <div
                          className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                          style={{ backgroundColor: gt.color }}
                          title={t.spike.spineColor}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {onTestSampleInScanner && (
                  <button
                    onClick={() => {
                      haptic.mediumImpact();
                      onTestSampleInScanner(selectedSample);
                      onClose();
                    }}
                    className="w-full py-2.5 bg-[#C9963F] hover:bg-[#b58332] text-[#12100E] rounded-lg font-mono-ibm text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                    <span>{t.spike.testInScanner}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'markdown' && (
          <div className="bg-[#1C1916] rounded-xl p-6 hairline-border font-mono-ibm text-[13px] text-[#D4CDA8] whitespace-pre-wrap leading-relaxed">
            {t.spike.report({
              totalBooks,
              coverage: (catalogCoverage * 100).toFixed(1),
              coveredCount: benchmark.totals.coveredCount,
              matchAccuracy: (avgMatchAccuracy * 100).toFixed(1),
              matchPassed: avgMatchAccuracy >= 0.9,
              ambiguity: (ambiguityRate * 100).toFixed(1),
              ambiguityPassed: ambiguityRate <= 0.2,
              gatePassed: isGatePassed,
              durationMs: benchmark.totals.durationMs.toFixed(0),
              catalogSize: benchmark.catalogSize,
            })}
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className="bg-[#1C1916] rounded-xl p-6 hairline-border space-y-4 font-sans-inter">
            <h3 className="font-serif-literata text-[20px] text-[#F4EFE6] font-semibold">
              {t.spike.checklistTitle}
            </h3>

            <div className="space-y-3">
              {t.spike.checklist.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-[#12100E] rounded-lg hairline-border"
                >
                  <span className="material-symbols-outlined text-[#6E8F6A] text-[20px]">
                    check_circle
                  </span>
                  <span className="text-[14px] text-[#F4EFE6]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
