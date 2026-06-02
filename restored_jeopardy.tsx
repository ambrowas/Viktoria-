Created At: 2026-05-30T18:58:29Z
Completed At: 2026-05-30T18:58:29Z
File Path: `file:///Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/games/JeopardyGame.tsx`
Total Lines: 2079
Total Bytes: 91655
Showing lines 1950 to 2079
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
                          {activeClue.note && (
                            <p className="text-sm text-blue-200">{activeClue.note}</p>
                          )}
                        </div>
                      )}
                    </>
                  );
                }
              })()}
          </div>

          <footer className="relative flex flex-col gap-3 pt-4 shrink-0">
            {showAnswer ? (
              <div className="flex justify-end items-center w-full">
                <button
                  onClick={clearQuestionState}
                  className={`px-8 py-4 rounded-xl text-white font-extrabold text-xl border border-black shadow-lg transition-transform active:scale-95 duration-200 ${wasAnsweredCorrectly
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-red-600 hover:bg-red-500"
                    }`}
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end items-center gap-3">
                <div className="flex flex-col mr-auto gap-2">
                  {active.question.type === "MULTIPLE_CHOICE" ? (
                    <span className="text-sm text-slate-400">
                      Hotkeys: A, B, C, D
                    </span>
                  ) : (
                    
<truncated 3162 bytes>
:                       label: "Consultar al Público",
                      desc: "El público te ayuda a elegir la respuesta.",
                    },
                  ].filter(({ type }) => {
                    const available = game.availableClues ?? ["CALL_FRIEND", "ASK_HOST", "ASK_OTHER_TEAM"];
                    return available.includes(type);
                  }).map(({ type, label, desc }) => {
                    const used = clueUsage[currentTeamIndex]?.usedTypes.includes(type);
                    const disabled = used || (clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0;
                    return (
                      <button
                        key={type}
                        onClick={() => useClue(type)}
                        disabled={disabled}
                        className={`text-left bg-slate-700 rounded-lg p-3 border border-black ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-650"
                          }`}
                      >
                        <div className="font-semibold text-white">{label}</div>
                        <p className="text-xs text-slate-200">{desc}</p>
                        {used && <span className="text-[11px] text-red-200">Usado</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </footer>
        </div>
      </div>
    )}
    {feedback && (
      <GameplayErrorBoundary>
        <FeedbackOverlay type={feedback} />
      </GameplayErrorBoundary>
    )}
  </div>
);
};

export default JeopardyGameScreen;

The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.