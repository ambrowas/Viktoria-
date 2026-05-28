import React, { useState, useEffect } from 'react';
import { Game, SmartAzzGame, SmartAzzCategory } from '@/types';
import { PlusIcon, TrashIcon, PencilIcon, PrinterIcon } from '@components/icons/IconDefs';
import { Copy, ClipboardPaste, Wand2, Loader2, GripVertical, ArrowDownAZ, Eye } from 'lucide-react';
import { generateSmartAzzAnswers } from '@/services/geminiService';
import SmartAzzController from '../host/controllers/SmartAzzController';
import { useSync } from '@/context/SyncContext';

interface SmartAzzEditorProps {
  game: SmartAzzGame;
  setGame: React.Dispatch<React.SetStateAction<Partial<Game> | null>>;
}

const PreviewModal: React.FC<{ game: SmartAzzGame; onClose: () => void; }> = ({ game, onClose }) => {
  const { isRemoteMode, sessionData, updateSession } = useSync();
  
  // Local state to simulate sessionData if we are NOT in remote mode (offline preview)
  const [localSessionData, setLocalSessionData] = useState<any>({
    currentGameId: game.id,
    currentStep: 'playing',
    teamScores: { '1': 0, '2': 0 },
    teams: [
      { id: '1', name: 'Team A', color: '#22c55e', players: [] },
      { id: '2', name: 'Team B', color: '#3b82f6', players: [] }
    ],
    smartAzzState: {
      activeCategoryId: null,
      usedCategories: [],
      scores: [0, 0],
      victories: [0, 0],
      activeTeam: 0,
      globalTime: 0,
      shotClock: game.turnTimer ?? 10,
      isRunning: false,
      guessedAnswers: [],
      roundEnded: false,
      winnerScreen: null,
      showCredits: false,
      isDraw: false,
      guessedBy: {},
      earlyEndWinnerIndex: null,
    }
  });

  const handleLocalUpdateSession = (updates: any) => {
    setLocalSessionData((prev: any) => {
      const next = { ...prev, ...updates };
      if (updates.smartAzzState) {
        next.smartAzzState = {
          ...prev.smartAzzState,
          ...updates.smartAzzState
        };
      }
      return next;
    });
  };

  // Broadcast game preview payload to the TV screen if isRemoteMode is active
  useEffect(() => {
    if (isRemoteMode) {
      updateSession({
        currentGameId: game.id,
        currentStep: 'playing',
        fullGameData: game,
        teams: [
          { id: '1', name: 'Team A', color: '#22c55e', players: [] },
          { id: '2', name: 'Team B', color: '#3b82f6', players: [] }
        ],
        teamScores: { '1': 0, '2': 0 },
        smartAzzState: {
          activeCategoryId: null,
          usedCategories: [],
          scores: [0, 0],
          victories: [0, 0],
          activeTeam: 0,
          globalTime: 0,
          shotClock: game.turnTimer ?? 10,
          isRunning: false,
          guessedAnswers: [],
          roundEnded: false,
          winnerScreen: null,
          showCredits: false,
          isDraw: false,
          guessedBy: {},
          earlyEndWinnerIndex: null,
        }
      });

      return () => {
        updateSession({
          currentGameId: null,
          fullGameData: null,
          currentStep: 'waiting',
          smartAzzState: null
        });
      };
    }
  }, [isRemoteMode, game.id]);

  const currentSessionData = isRemoteMode ? sessionData : localSessionData;
  const currentUpdateSession = isRemoteMode ? updateSession : handleLocalUpdateSession;

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center text-white select-none">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-lg text-yellow-500">Face Off Preview</span>
          {isRemoteMode ? (
            <span className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-full animate-pulse">
              Casting Active
            </span>
          ) : (
            <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full">
              Local Mode (Offline)
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-xl transition-all active:scale-95 text-sm"
        >
          Exit Preview
        </button>
      </div>
      <div className="flex-grow overflow-auto bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto h-full p-4">
          <SmartAzzController
            game={game}
            sessionData={currentSessionData}
            updateSession={currentUpdateSession}
          />
        </div>
      </div>
    </div>
  );
};

const SmartAzzEditor: React.FC<SmartAzzEditorProps> = ({ game, setGame }) => {
  const [editingAnswers, setEditingAnswers] = useState<string | null>(null);
  const [answersList, setAnswersList] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [draggedCatIndex, setDraggedCatIndex] = useState<number | null>(null);
  const [draggedAnsIndex, setDraggedAnsIndex] = useState<number | null>(null);

  const handlePrint = () => {
    const validCats = (game.categories || []).filter(
      cat => cat.name.trim() || (cat.validAnswers && cat.validAnswers.length > 0)
    );
    if (validCats.length === 0) {
      alert("No category content to print. Add some category names or answers first.");
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to print the game board.");
      return;
    }

    let html = `
      <html>
      <head>
        <title>Face Off - ${game.name || 'Untitled'}</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #000; background: #fff; }
          h1 { text-align: center; margin-bottom: 5px; font-size: 24px; color: #111; }
          .meta { text-align: center; margin-bottom: 30px; font-size: 0.95em; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 15px; }
          .category-box { border: 1.5px solid #222; padding: 20px; margin-bottom: 20px; border-radius: 8px; page-break-inside: avoid; background-color: #fff; }
          .category-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
          .category-title { font-weight: bold; font-size: 1.4em; color: #111; }
          .category-points { font-weight: bold; font-size: 1.2em; color: #0056b3; }
          .category-hint { font-style: italic; margin-bottom: 15px; font-size: 1.05em; color: #444; background: #f5f5f5; padding: 8px 12px; border-left: 3px solid #666; }
          .answers-section { margin-top: 10px; }
          .answers-label { font-weight: bold; font-size: 1.1em; margin-bottom: 8px; color: #222; }
          .answers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; margin-left: 5px; }
          .answer-item { font-size: 1.05em; padding: 4px 0; display: flex; align-items: center; }
          .answer-checkbox { width: 14px; height: 14px; border: 1px solid #555; margin-right: 8px; display: inline-block; flex-shrink: 0; border-radius: 2px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .category-box { border-color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: right; margin-bottom: 20px;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background-color: #0056b3; color: white; border: none; border-radius: 5px; font-weight: bold;">Print Document</button>
        </div>
        <h1>Face Off Game Sheet</h1>
        <div class="meta">
          <strong>Game Name:</strong> ${game.name || 'Untitled'} | 
          <strong>Turn Shot Clock:</strong> ${game.turnTimer ?? 10}s
        </div>
    `;

    validCats.forEach((cat, idx) => {
      html += `<div class="category-box">`;
      html += `
        <div class="category-header">
          <div class="category-title">${idx + 1}. ${cat.name || 'Unnamed Category'}</div>
          <div class="category-points">$${cat.pointValue || 100}</div>
        </div>
      `;
      if (cat.explanation && cat.explanation.trim()) {
        html += `<div class="category-hint"><strong>Hint/Prompt:</strong> ${cat.explanation}</div>`;
      }
      
      const answers = cat.validAnswers || [];
      html += `
        <div class="answers-section">
          <div class="answers-label">Answers (${answers.length}):</div>
          <div class="answers-grid">
      `;
      
      if (answers.length === 0) {
        html += `<div style="font-style: italic; color: #777;">No valid answers entered.</div>`;
      } else {
        answers.forEach(ans => {
          html += `
            <div class="answer-item">
              <span class="answer-checkbox"></span>
              <span>${ans}</span>
            </div>
          `;
        });
      }
      
      html += `
          </div>
        </div>
      </div>
      `;
    });

    html += `
      <script>
        setTimeout(() => {
          window.print();
        }, 500);
      </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const addCategory = () => {
    const newCategory: SmartAzzCategory = {
      id: crypto.randomUUID(),
      name: '',
      pointValue: 100,
      validAnswers: []
    };
    setGame(prev => {
      const g = prev as SmartAzzGame;
      return { ...g, categories: [...(g.categories || []), newCategory] };
    });
  };

  const updateCategory = (id: string, updates: Partial<SmartAzzCategory>) => {
    setGame(prev => {
      const g = prev as SmartAzzGame;
      return {
        ...g,
        categories: g.categories.map(c => (c.id === id ? { ...c, ...updates } : c)),
      };
    });
  };

  const removeCategory = (id: string) => {
    setGame(prev => {
      const g = prev as SmartAzzGame;
      return {
        ...g,
        categories: g.categories.filter(c => c.id !== id),
      };
    });
  };

  const handleDropCategory = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === dropIndex) return;

    setGame(prev => {
      const g = prev as SmartAzzGame;
      const newCats = [...(g.categories || [])];
      const [moved] = newCats.splice(draggedCatIndex, 1);
      newCats.splice(dropIndex, 0, moved);
      return { ...g, categories: newCats };
    });
    setDraggedCatIndex(null);
  };

  const handleDropAnswer = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedAnsIndex === null || draggedAnsIndex === dropIndex) return;

    const newList = [...answersList];
    const [moved] = newList.splice(draggedAnsIndex, 1);
    newList.splice(dropIndex, 0, moved);
    setAnswersList(newList);
    setDraggedAnsIndex(null);
  };

  const openAnswersModal = (cat: SmartAzzCategory) => {
    setEditingAnswers(cat.id);
    setAnswersList([...(cat.validAnswers || [])]);
  };

  const saveAnswers = () => {
    if (!editingAnswers) return;
    const cleanList = answersList.map(a => a.trim()).filter(Boolean);
    updateCategory(editingAnswers, { validAnswers: cleanList });
    setEditingAnswers(null);
  };

  const handlePasteCategoryName = async (catId: string) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) updateCategory(catId, { name: text.trim() });
    } catch (e) {
      console.error('Failed to paste', e);
    }
  };

  const handlePasteAnswers = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const newLines = text.split('\n').map(l => l.trim()).filter(Boolean);
        setAnswersList(prev => [...prev, ...newLines].sort((a, b) => a.localeCompare(b)));
      }
    } catch (e) {
      console.error('Failed to paste', e);
    }
  };

  const handleCopyAnswers = () => {
    const text = answersList.filter(Boolean).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleSortAnswers = () => {
    setAnswersList(prev => [...prev].sort((a, b) => a.localeCompare(b)));
  };

  const handleGenerateAI = async () => {
    if (!editingAnswers) return;
    const activeCat = game.categories.find(c => c.id === editingAnswers);
    if (!activeCat || !activeCat.name) {
      alert("Please enter a category name first before generating answers.");
      return;
    }
    
    setIsGenerating(true);
    const { data, error } = await generateSmartAzzAnswers(activeCat.name, 15);
    setIsGenerating(false);

    if (error || !data) {
      alert("Failed to generate answers with AI.");
      return;
    }

    setAnswersList(prev => [...prev, ...data].sort((a, b) => a.localeCompare(b)));
  };

  const activeCategoryName = game.categories?.find(c => c.id === editingAnswers)?.name || "Unknown";

  return (
    <div className="bg-base-200 p-6 rounded-lg shadow-lg space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Face Off Categories</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            aria-label="Open preview"
            title="Open preview"
            className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Eye className="w-5 h-5" />
            Preview
          </button>
          <button
            onClick={handlePrint}
            aria-label="Export for printing"
            title="Export for printing"
            className="flex items-center gap-2 bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <PrinterIcon className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={addCategory}
            disabled={(game.categories?.length || 0) >= 8}
            className="flex items-center gap-2 bg-brand-secondary text-black font-bold py-2 px-4 rounded-lg hover:bg-brand-primary disabled:opacity-50"
          >
            <PlusIcon className="w-5 h-5" />
            Add Category
          </button>
        </div>
      </div>

      <div className="flex gap-6 bg-base-300 p-4 rounded-lg border border-slate-700">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Turn Shot Clock (s)</label>
          <input
            type="number"
            value={game.turnTimer ?? 10}
            onChange={(e) => setGame(prev => ({ ...prev, turnTimer: parseInt(e.target.value) || 10 }))}
            className="bg-base-200 border border-slate-600 rounded p-2 outline-none focus:border-brand-primary text-white font-bold w-32"
          />
        </div>
      </div>
      <p className="text-text-secondary text-sm mb-4">
        Add up to 8 categories, set point values per correct answer, and paste possible solutions. You can drag and drop rows to reorder them.
      </p>

      <div className="grid grid-cols-1 gap-4">
        {(game.categories || []).map((cat, index) => (
          <div 
            key={cat.id} 
            draggable
            onDragStart={(e) => {
              setDraggedCatIndex(index);
              e.dataTransfer.setData('text/plain', index.toString());
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropCategory(e, index)}
            className={`bg-base-300 p-4 rounded-lg relative flex flex-col gap-3 border transition-colors ${draggedCatIndex === index ? 'opacity-50 border-brand-primary' : 'border-slate-700'}`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white transition-colors" title="Drag to reorder">
                <GripVertical size={24} />
              </div>
              <span className="text-xl font-bold text-slate-500 w-6">{index + 1}.</span>
              
              <div className="flex-1 flex items-center bg-base-200 rounded-lg border border-slate-600 focus-within:border-brand-primary overflow-hidden">
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                  placeholder="e.g. Countries in Africa"
                  className="flex-1 bg-transparent p-3 outline-none font-bold"
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(cat.name)}
                  className="p-3 text-slate-500 hover:text-white transition-colors" title="Copy Title"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => handlePasteCategoryName(cat.id)}
                  className="p-3 text-slate-500 hover:text-white transition-colors border-l border-slate-700" title="Paste Title"
                >
                  <ClipboardPaste size={16} />
                </button>
              </div>

              <div className="flex items-center bg-base-200 border border-slate-600 rounded-lg overflow-hidden">
                <span className="px-3 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="100"
                  min="100"
                  max="1000"
                  value={cat.pointValue || 100}
                  onChange={(e) => {
                    let val = parseInt(e.target.value) || 100;
                    if (val > 1000) val = 1000;
                    if (val < 100) val = 100;
                    updateCategory(cat.id, { pointValue: val });
                  }}
                  className="w-24 bg-transparent p-3 outline-none text-white font-bold"
                  placeholder="Pts"
                />
              </div>
              <button
                onClick={() => openAnswersModal(cat)}
                className="flex items-center gap-2 px-4 py-3 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-600/50 font-bold"
              >
                <PencilIcon className="w-4 h-4" />
                {(cat.validAnswers || []).length} Answers
              </button>
              <button
                onClick={() => removeCategory(cat.id)}
                className="p-3 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                title="Remove Category"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Explanation Row */}
            <div className="flex items-center w-full pl-10 pr-2">
              <div className="flex-1 flex items-center bg-base-200/50 rounded-lg border border-slate-600/50 focus-within:border-brand-secondary overflow-hidden">
                <input
                  type="text"
                  value={cat.explanation || ''}
                  onChange={(e) => updateCategory(cat.id, { explanation: e.target.value })}
                  placeholder="Optional hint, prompt or subtitle..."
                  className="flex-1 bg-transparent p-2 text-sm outline-none text-slate-300"
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(cat.explanation || '')}
                  className="p-2 text-slate-500 hover:text-white transition-colors" title="Copy Explanation"
                >
                  <Copy size={14} />
                </button>
                <button 
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) updateCategory(cat.id, { explanation: text.trim() });
                    } catch (e) {
                      console.error('Failed to paste explanation', e);
                    }
                  }}
                  className="p-2 text-slate-500 hover:text-white transition-colors border-l border-slate-700/50" title="Paste Explanation"
                >
                  <ClipboardPaste size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!game.categories || game.categories.length === 0) && (
          <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
            No categories added yet. Add some to get started!
          </div>
        )}
      </div>

      {editingAnswers && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-base-200 p-6 rounded-xl w-full max-w-4xl flex flex-col h-[85vh] border border-slate-700 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-3xl font-bold text-white mb-1">Valid Answers</h3>
                <p className="text-yellow-400 font-bold text-lg">{activeCategoryName}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-purple-600/20 text-purple-400 border border-purple-500 hover:bg-purple-600 hover:text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                  Suggest with AI
                </button>
                <button
                  onClick={handleSortAnswers}
                  className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <ArrowDownAZ className="w-5 h-5" />
                  Sort A-Z
                </button>
                <button
                  onClick={handlePasteAnswers}
                  className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <ClipboardPaste className="w-5 h-5" />
                  Paste List
                </button>
                <button
                  onClick={handleCopyAnswers}
                  className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded-lg font-bold transition-all"
                >
                  <Copy className="w-5 h-5" />
                  Copy List
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 mb-6 space-y-2">
              {answersList.map((ans, idx) => (
                <div 
                  key={idx} 
                  draggable
                  onDragStart={(e) => {
                    setDraggedAnsIndex(idx);
                    e.dataTransfer.setData('text/plain', idx.toString());
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropAnswer(e, idx)}
                  className={`flex items-center gap-3 bg-base-300 p-2 rounded-lg border transition-colors ${draggedAnsIndex === idx ? 'opacity-50 border-brand-primary' : 'border-slate-700'}`}
                >
                  <div className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white px-2" title="Drag to reorder">
                    <GripVertical size={20} />
                  </div>
                  <span className="text-slate-500 font-bold w-6 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    value={ans}
                    onChange={(e) => {
                      const newList = [...answersList];
                      newList[idx] = e.target.value;
                      setAnswersList(newList);
                    }}
                    className="flex-1 bg-transparent p-2 outline-none text-white font-bold"
                    placeholder="Enter answer here..."
                  />
                  <button
                    onClick={() => setAnswersList(answersList.filter((_, i) => i !== idx))}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAnswersList([...answersList, ""])}
                className="w-full flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-700 text-slate-300 p-4 rounded-lg font-bold border border-dashed border-slate-600 transition-colors mt-4"
              >
                <PlusIcon className="w-5 h-5" />
                Add Empty Row
              </button>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
              <button
                onClick={() => setEditingAnswers(null)}
                className="px-8 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 font-bold text-lg"
              >
                Cancel
              </button>
              <button
                onClick={saveAnswers}
                className="px-8 py-3 bg-brand-primary text-black rounded-lg hover:bg-brand-secondary font-black text-lg shadow-[0_0_15px_rgba(252,211,77,0.3)]"
              >
                Save Answers
              </button>
            </div>
          </div>
        </div>
      )}
      {showPreview && <PreviewModal game={game} onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default SmartAzzEditor;
