import React, { useState } from 'react';
import { AiIcon } from './Icons';

type Band = {
  id: string;
  label: string;
  gain: number;
  q?: number;
  freq: number;
  type: BiquadFilterType;
};

interface EqualizerControlProps {
  bands: Band[];
  onBandChange: (index: number, property: 'gain' | 'q' | 'freq', value: number) => void;
  postGain: number;
  onPostGainChange: (value: number) => void;
  onReset: () => void;
  presets: string[];
  currentPreset: string;
  onPresetChange: (name: string) => void;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  onGenerateWithAi: () => void;
  isAiLoading: boolean;
  aiError: string;
}

const EqualizerControl: React.FC<EqualizerControlProps> = ({ 
    bands, 
    onBandChange, 
    postGain, 
    onPostGainChange, 
    onReset, 
    presets, 
    currentPreset, 
    onPresetChange,
    aiPrompt,
    onAiPromptChange,
    onGenerateWithAi,
    isAiLoading,
    aiError
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const getGainFillStyle = (gain: number): React.CSSProperties => {
    const percentage = (Math.abs(gain) / 40) * 50;
    if (gain > 0) {
      return { bottom: '50%', height: `${percentage}%`, backgroundColor: '#facc15' }; // yellow-400
    }
    if (gain < 0) {
      return { top: '50%', height: `${percentage}%`, backgroundColor: '#f87171' }; // red-400
    }
    return { height: '0%' };
  };
  
  const getQFillStyle = (q: number): React.CSSProperties => {
      const percentage = ((q - 0.1) / (20 - 0.1)) * 100;
      return {
          background: `linear-gradient(to top, #ef4444 ${percentage}%, transparent ${percentage}%)` // red-500
      };
  };

  const getFreqRange = (bandId: string): { min: number, max: number } => {
    switch (bandId) {
        case 'bass': return { min: 100, max: 600 };
        case 'mid': return { min: 600, max: 2500 };
        case 'upperMid': return { min: 2500, max: 8000 };
        default: return { min: 20, max: 20000 };
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 text-white bg-gray-900/50 p-6 rounded-lg">
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-4">
          <label htmlFor="eq-preset" className="text-xl font-medium">Presets</label>
          <select
              id="eq-preset"
              value={currentPreset}
              onChange={(e) => onPresetChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-md p-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-lg"
          >
              {currentPreset === 'custom' && <option value="custom" disabled>Custom</option>}
              {presets.map(p => <option key={p} value={p}>{p.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</option>)}
          </select>
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 text-base font-semibold bg-red-600 hover:bg-red-500 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          Reset
        </button>
      </div>

      <div className="w-full max-w-2xl my-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50">
        <h3 className="text-xl font-semibold text-center mb-3 flex items-center justify-center gap-2"><AiIcon className="w-6 h-6 text-yellow-400" /> AI-Powered EQ</h3>
        <div className="flex gap-2">
            <input
                type="text"
                value={aiPrompt}
                onChange={(e) => onAiPromptChange(e.target.value)}
                placeholder='e.g., "crisp podcast vocal" or "deep bass for EDM"'
                className="flex-grow bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={isAiLoading}
                onKeyDown={(e) => { if (e.key === 'Enter' && !isAiLoading && aiPrompt.trim()) onGenerateWithAi(); }}
            />
            <button
                onClick={onGenerateWithAi}
                className="p-3 bg-yellow-400 text-gray-900 rounded-md hover:bg-yellow-300 transition-colors flex items-center justify-center w-28 disabled:bg-gray-500 disabled:cursor-not-allowed"
                disabled={isAiLoading || !aiPrompt.trim()}
            >
                {isAiLoading ? (
                    <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    'Generate'
                )}
            </button>
        </div>
        {aiError && <p className="text-red-400 text-sm mt-2 text-center">{aiError}</p>}
      </div>

      <div className="flex items-start justify-center gap-8 pt-4">
        {bands.map((band, index) => {
            const isPeaking = band.type === 'peaking' && band.q !== undefined;
            const freqRange = getFreqRange(band.id);
            return (
          <div 
            key={band.id} 
            className={`flex flex-col items-center space-y-2 p-4 rounded-lg transition-all duration-200 ${activeIndex === index ? 'bg-gray-800' : 'bg-transparent'}`}
            onFocusCapture={() => setActiveIndex(index)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setActiveIndex(null);
              }
            }}
          >
            <label htmlFor={`${band.id}-gain`} className="text-xl font-semibold pt-2 h-10">{band.label}</label>
            
            {isPeaking ? (
                <div className="flex flex-col items-center space-y-2 py-2 h-28 justify-center">
                    <label htmlFor={`${band.id}-freq-input`} className="text-base font-mono">{band.freq.toFixed(0)} Hz</label>
                    <input type="range" id={`${band.id}-freq`} min={freqRange.min} max={freqRange.max} step={1} value={band.freq} onChange={(e) => onBandChange(index, 'freq', parseInt(e.target.value, 10))} className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-400" />
                    <input type="number" id={`${band.id}-freq-input`} value={band.freq.toFixed(0)} min={freqRange.min} max={freqRange.max} onChange={(e) => { const val = parseInt(e.target.value, 10); if (!isNaN(val)) { onBandChange(index, 'freq', Math.max(freqRange.min, Math.min(freqRange.max, val))); } }} className="w-24 bg-gray-800 text-center rounded-md text-sm p-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                </div>
            ) : <div className="h-28" />}
            
            <span className="font-mono text-2xl h-10 w-20 text-center">{band.gain}dB</span>
            
            <div className="flex flex-col items-center space-y-3 group">
                <button 
                    onClick={() => onBandChange(index, 'gain', Math.min(40, band.gain + 1))}
                    className="w-10 h-10 flex items-center justify-center text-2xl bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-colors"
                    aria-label={`Increase ${band.label} gain`}
                >+</button>
                
                <div className="relative w-6 h-72">
                    <div className="absolute inset-0 bg-gray-700 rounded-full" />
                    <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-500" />
                    <div className="absolute left-0 right-0" style={getGainFillStyle(band.gain)} />
                    <input type="range" id={`${band.id}-gain`} min={-40} max={40} step={1} value={band.gain} onChange={(e) => onBandChange(index, 'gain', parseFloat(e.target.value))} className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-yellow-400 group-hover:[&::-webkit-slider-thumb]:ring-4 group-hover:[&::-webkit-slider-thumb]:ring-yellow-300/50 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-yellow-400" 
// FIX: Cast non-standard 'bt-lr' value to 'any' to satisfy TypeScript's CSS property type for writingMode.
style={{ writingMode: 'bt-lr' as any }} aria-label={`${band.label} gain`} />
                </div>

                <button 
                    onClick={() => onBandChange(index, 'gain', Math.max(-40, band.gain - 1))}
                    className="w-10 h-10 flex items-center justify-center text-2xl bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-colors"
                    aria-label={`Decrease ${band.label} gain`}
                >-</button>
            </div>
            
            {isPeaking ? (
              <div className="flex flex-col items-center space-y-2 pt-4 group h-[16rem]">
                 <button 
                    onClick={() => onBandChange(index, 'q', Math.min(20, Math.round((band.q + 0.1) * 10) / 10))}
                    className="w-8 h-8 flex items-center justify-center text-lg bg-red-500 rounded-full hover:bg-red-400 transition-colors"
                    aria-label={`Increase ${band.label} Q factor`}
                 >+</button>
                 <input
                  type="range"
                  id={`${band.id}-q`}
                  min={0.1}
                  max={20}
                  step={0.1}
                  value={band.q}
                  onChange={(e) => onBandChange(index, 'q', parseFloat(e.target.value))}
                  className="w-4 h-32 appearance-none cursor-pointer bg-gray-700 rounded-lg focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white group-hover:[&::-webkit-slider-thumb]:ring-2 group-hover:[&::-webkit-slider-thumb]:ring-red-400/50 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
                  
// FIX: Cast non-standard 'bt-lr' value to 'any' to satisfy TypeScript's CSS property type for writingMode.
style={{ writingMode: 'bt-lr' as any, ...getQFillStyle(band.q) }}
                  aria-label={`${band.label} Q factor`}
                />
                <button 
                    onClick={() => onBandChange(index, 'q', Math.max(0.1, Math.round((band.q - 0.1) * 10) / 10))}
                    className="w-8 h-8 flex items-center justify-center text-lg bg-red-500 rounded-full hover:bg-red-400 transition-colors"
                    aria-label={`Decrease ${band.label} Q factor`}
                 >-</button>
                 <div className="flex items-center space-x-1 pt-2 h-10">
                    <label htmlFor={`${band.id}-q-input`} className="text-base">Q:</label>
                    <input
                        type="number"
                        id={`${band.id}-q-input`}
                        value={band.q.toFixed(1)}
                        min={0.1}
                        max={20}
                        step={0.1}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                                onBandChange(index, 'q', Math.max(0.1, Math.min(20, val)));
                            }
                        }}
                        className="w-20 bg-gray-800 text-center rounded-md text-base p-1 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={`${band.label} Q factor value`}
                    />
                </div>
              </div>
            ) : (
                <div className="h-[16rem]"></div>
            )}
          </div>
        )})}
      </div>
      <div className="w-full max-w-2xl mt-8 pt-8 border-t border-gray-700/50">
        <div className="flex flex-col items-center space-y-2 text-white w-full">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-medium">Output Level</span>
          </div>
          <div className="flex items-center space-x-4 w-full">
            <button onClick={() => onPostGainChange(Math.max(0, postGain - 0.1))} className="p-3 bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-colors text-xl" aria-label="Decrease output level">-</button>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={postGain}
              onChange={(e) => onPostGainChange(parseFloat(e.target.value))}
              className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-red-500"
              aria-label="Equalizer output level"
            />
            <button onClick={() => onPostGainChange(Math.min(2, postGain + 0.1))} className="p-3 bg-yellow-400 text-gray-900 font-bold rounded-full hover:bg-yellow-300 transition-colors text-xl" aria-label="Increase output level">+</button>
          </div>
          <span className="text-2xl font-mono mt-2 p-2 bg-gray-800 rounded-md w-32 text-center">{postGain.toFixed(2)}x</span>
        </div>
      </div>
    </div>
  );
};

export default EqualizerControl;