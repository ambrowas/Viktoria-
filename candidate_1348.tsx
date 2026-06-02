Created At: 2026-05-30T19:02:58Z
Completed At: 2026-05-30T19:02:58Z
File Path: `file:///Users/elebi/Documents/Aplicaciones/Viktoria-/src/screens/games/JeopardyGame.tsx`
Total Lines: 793
Total Bytes: 30550
Showing lines 690 to 793
The following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.
690:                               )}
691:                             </div>
692:                           </div>
693:                         )}
694:                     </div>
695:                   )}
696:                 </>
697:               )}
698:             </div>
699: 
700:             <footer className="relative flex flex-col gap-3 pt-4 shrink-0">
701:               <div className="flex flex-wrap justify-end items-center gap-3">
702:                 <div className="flex flex-col mr-auto gap-2">
703:                   <span className="text-sm text-slate-400">
704:                     Hotkeys: R = Correct, W = Wrong
705:                   </span>
706:                   <div className="flex items-center gap-2">
707:                     <span className="text-sm text-slate-200">
708:                       {teamLabel(currentTeamIndex)} clues left:{" "}
709:                       {clueUsage[currentTeamIndex]?.remaining ?? 0}
710:                     </span>
711:                     <button
712:                       onClick={() => setShowClueMenu((v) => !v)}
713:                       disabled={(clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0}
714:                       className="px-3 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
715:                     >
716:                       Use clue
717:                     </button>
718:                   </div>
719:                 </div>
720:                 {!showAnswer && (
721:                   <button
722:            
<truncated 1713 bytes>
                       label: "Ask the host for a cue",
756:                         desc: "Reveal a quick hint from the host.",
757:                       },
758:                       {
759:                         type: "ASK_OTHER_TEAM" as ClueType,
760:                         label: "Ask the other team & split points",
761:                         desc: "The other team answers; points are shared if correct.",
762:                       },
763:                     ].map(({ type, label, desc }) => {
764:                       const used = clueUsage[currentTeamIndex]?.usedTypes.includes(type);
765:                       const disabled = used || (clueUsage[currentTeamIndex]?.remaining ?? 0) <= 0;
766:                       return (
767:                         <button
768:                           key={type}
769:                           onClick={() => useClue(type)}
770:                           disabled={disabled}
771:                           className={`text-left bg-slate-700 rounded-lg p-3 border ${disabled ? "border-slate-600 opacity-50 cursor-not-allowed" : "border-blue-500 hover:bg-slate-600"
772:                             }`}
773:                         >
774:                           <div className="font-semibold text-white">{label}</div>
775:                           <p className="text-xs text-slate-200">{desc}</p>
776:                           {used && <span className="text-[11px] text-red-200">Used</span>}
777:                         </button>
778:                       );
779:                     })}
780:                   </div>
781:                 </div>
782:               )}
783:             </footer>
784:           </div>
785:         </div>
786:       )}
787:       {feedback && <FeedbackOverlay type={feedback} />}
788:     </div>
789:   );
790: };
791: 
792: export default JeopardyGameScreen;
793: 
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
