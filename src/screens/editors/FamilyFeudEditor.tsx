import React, { useState } from 'react';
import { Game, FamilyFeudGame, FamilyFeudRound, FamilyFeudAnswer } from '@/types';
import { generateFamilyFeudRound } from '@services/geminiService';
import Spinner from '@components/Spinner';
import { SparklesIcon, PlusIcon, TrashIcon } from '@components/icons/IconDefs';

interface FamilyFeudEditorProps {
    game: FamilyFeudGame;
    setGame: (game: Partial<Game>) => void;
}

const FamilyFeudEditor: React.FC<FamilyFeudEditorProps> = ({ game, setGame }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [error, setError] = useState('');

    const handleGenerate = async () => {
        if (!aiTopic.trim()) return setError('Please enter a topic.');
        setIsGenerating(true);
        setError('');
        try {
            const newRound = await generateFamilyFeudRound(aiTopic);
            setGame({ ...game, rounds: [...game.rounds, { ...newRound, id: crypto.randomUUID() }] });
            setAiTopic('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const addManualRound = () => {
        const newRound: FamilyFeudRound = {
            id: crypto.randomUUID(),
            question: '',
            answers: [{ text: '', points: 0 }],
        };
        setGame({ ...game, rounds: [...game.rounds, newRound] });
    };

    const removeRound = (roundId: string) => {
        setGame({ ...game, rounds: game.rounds.filter(r => r.id !== roundId) });
    };
    
    const handleRoundChange = (roundId: string, value: string) => {
        const updatedRounds = game.rounds.map(r => r.id === roundId ? { ...r, question: value } : r);
        setGame({ ...game, rounds: updatedRounds });
    };
    
    const handleAnswerChange = (roundId: string, answerIndex: number, field: keyof FamilyFeudAnswer, value: any) => {
        const updatedRounds = game.rounds.map(r => {
            if (r.id === roundId) {
                const newAnswers = [...r.answers];
                newAnswers[answerIndex] = { ...newAnswers[answerIndex], [field]: value };
                return { ...r, answers: newAnswers };
            }
            return r;
        });
        setGame({ ...game, rounds: updatedRounds });
    };

    const addAnswer = (roundId: string) => {
         const updatedRounds = game.rounds.map(r => {
            if (r.id === roundId) {
                return { ...r, answers: [...r.answers, { text: '', points: 0 }] };
            }
            return r;
        });
        setGame({ ...game, rounds: updatedRounds });
    };

    const removeAnswer = (roundId: string, answerIndex: number) => {
        const updatedRounds = game.rounds.map(r => {
            if (r.id === roundId) {
                const newAnswers = r.answers.filter((_, i) => i !== answerIndex);
                return { ...r, answers: newAnswers };
            }
            return r;
        });
        setGame({ ...game, rounds: updatedRounds });
    };

    return (
        <div className="space-y-6">
            <div className="bg-base-200 p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <input 
                        aria-label="AI Topic for Family Feud Round" 
                        type="text" 
                        placeholder="Survey Topic (e.g., 'Things you find in a car')" 
                        value={aiTopic} 
                        onChange={(e) => setAiTopic(e.target.value)} 
                        className="bg-base-300 p-3 rounded-lg w-full md:col-span-2"
                    />
                    <button 
                        onClick={handleGenerate} 
                        disabled={isGenerating} 
                        aria-label="Generate Family Feud round with AI"
                        className="bg-brand-primary text-black font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <><Spinner /> Generating...</> : <><SparklesIcon /> Generate Round</>}
                    </button>
                </div>
                {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>

             <div className="bg-base-200 p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Rounds ({game.rounds.length})</h2>
                    <button 
                        onClick={addManualRound} 
                        aria-label="Add a new round"
                        className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5"/> Add Round
                    </button>
                </div>
                <div className="space-y-4">
                    {game.rounds.map((round, index) => (
                        <div key={round.id} className="bg-base-300 p-4 rounded-lg">
                           <div className="flex justify-between items-start gap-4 mb-3">
                               <textarea 
                                   aria-label={`Survey Question ${index + 1}`} 
                                   value={round.question} 
                                   onChange={e => handleRoundChange(round.id, e.target.value)} 
                                   placeholder={`Survey Question ${index + 1}`} 
                                   className="bg-base-100 p-2 rounded-lg w-full text-lg font-semibold" 
                                   rows={2}
                                />
                               <button 
                                   onClick={() => removeRound(round.id)} 
                                   aria-label={`Delete round ${index + 1}`}
                                   className="p-2 rounded-full hover:bg-base-100"
                                >
                                    <TrashIcon className="w-5 h-5 text-red-500"/>
                               </button>
                           </div>
                           <h3 className="text-lg font-semibold mb-2 text-text-secondary">Answers</h3>
                           <div className="space-y-2">
                            {round.answers.map((ans, ansIndex) => (
                                <div key={ansIndex} className="flex items-center gap-2">
                                    <input 
                                        aria-label={`Answer ${ansIndex + 1} for round ${index + 1}`} 
                                        type="text" 
                                        value={ans.text} 
                                        onChange={e => handleAnswerChange(round.id, ansIndex, 'text', e.target.value)} 
                                        placeholder={`Answer ${ansIndex + 1}`} 
                                        className="bg-base-100 p-2 rounded-lg w-full"
                                    />
                                    <input 
                                        aria-label={`Points for answer ${ansIndex + 1} for round ${index + 1}`} 
                                        type="number" 
                                        value={ans.points} 
                                        onChange={e => handleAnswerChange(round.id, ansIndex, 'points', parseInt(e.target.value))} 
                                        className="bg-base-100 p-2 rounded-lg w-24" 
                                        placeholder="Pts"
                                    />
                                    <button 
                                        onClick={() => removeAnswer(round.id, ansIndex)} 
                                        aria-label={`Delete answer ${ansIndex + 1} from round ${index + 1}`}
                                        className="p-2 rounded-full hover:bg-base-100"
                                    >
                                        <TrashIcon className="w-4 h-4 text-red-500"/>
                                    </button>
                                </div>
                            ))}
                           </div>
                           <button 
                               onClick={() => addAnswer(round.id)} 
                               aria-label={`Add new answer to round ${index + 1}`}
                               className="mt-3 text-sm flex items-center gap-1 text-brand-primary hover:underline"
                            >
                                <PlusIcon className="w-4 h-4" /> Add Answer
                           </button>
                        </div>
                    ))}
                </div>
             </div>
        </div>
    );
};

export default FamilyFeudEditor;
