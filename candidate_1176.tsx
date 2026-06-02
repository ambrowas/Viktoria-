Created At: 2026-05-30T18:58:29Z
Completed At: 2026-05-30T18:58:29Z
File Path: `file:///Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/games/JeopardyGame.tsx`
Total Lines: 2079
Total Bytes: 91655
Showing lines 1950 to 2079
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
1950:                           {activeClue.note && (
1951:                             <p className="text-sm text-blue-200">{activeClue.note}</p>
1952:                           )}
1953:                         </div>
1954:                       )}
1955:                     </>
1956:                   );
1957:                 }
1958:               })()}
1959:           </div>
1960: 
1961:           <footer className="relative flex flex-col gap-3 pt-4 shrink-0">
1962:             {showAnswer ? (
1963:               <div className="flex justify-end items-center w-full">
1964:                 <button
1965:                   onClick={clearQuestionState}
1966:                   className={`px-8 py-4 rounded-xl text-white font-extrabold text-xl border border-black shadow-lg transition-transform active:scale-95 duration-200 ${wasAnsweredCorrectly
1967:                     ? "bg-emerald-600 hover:bg-emerald-500"
1968:                     : "bg-red-600 hover:bg-red-500"
1969:                     }`}
1970:                 >
1971:                   Next
1972:                 </button>
1973:               </div>
1974:             ) : (
1975:               <div className="flex flex-wrap justify-end items-center gap-3">
1976:                 <div className="flex flex-col mr-auto gap-2">
1977:                   {active.question.type === "MULTIPLE_CHOICE" ? (
1978:                     <span className="text-sm text-slate-400">
1979:                       Hotkeys: A, B, C, D
1980:                     </span>
1981:                   ) : (
1982:                     
<truncated 3162 bytes>
:                       label: "Consultar al Público",
2040:                       desc: "El público te ayuda a elegir la respuesta.",
2041:                     },
2042:                   ].filter(({ type }) => {
2043:                     const available = game.availableClues ?? ["CALL_FRIEND", "ASK_HOST", "ASK_OTHER_TEAM"];
2044:                     return available.includes(type);
2045:                   }).map(({ type, label, desc }) => {
2046:                     const used = clueUsage[currentTeamIndex]?.usedTypes.includes(type);
2047:                     const disabled = used || (clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0;
2048:                     return (
2049:                       <button
2050:                         key={type}
2051:                         onClick={() => useClue(type)}
2052:                         disabled={disabled}
2053:                         className={`text-left bg-slate-700 rounded-lg p-3 border border-black ${disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-slate-650"
2054:                           }`}
2055:                       >
2056:                         <div className="font-semibold text-white">{label}</div>
2057:                         <p className="text-xs text-slate-200">{desc}</p>
2058:                         {used && <span className="text-[11px] text-red-200">Usado</span>}
2059:                       </button>
2060:                     );
2061:                   })}
2062:                 </div>
2063:               </div>
2064:             )}
2065:           </footer>
2066:         </div>
2067:       </div>
2068:     )}
2069:     {feedback && (
2070:       <GameplayErrorBoundary>
2071:         <FeedbackOverlay type={feedback} />
2072:       </GameplayErrorBoundary>
2073:     )}
2074:   </div>
2075: );
2076: };
2077: 
2078: export default JeopardyGameScreen;
2079: 
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
