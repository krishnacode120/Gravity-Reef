import React, { useState, useMemo, useEffect } from 'react';
import { Lock, LayoutDashboard, RotateCcw, Crown, X, ArrowDownToLine, RefreshCcw, Palette, BookOpen, History, Undo2, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Player, CellState, GameMode, Difficulty, BoardLayout } from '../types';
import { playClickSound, playCaptureSound, startBackgroundHum, playWinSound, setMute, getMute } from '../lib/audio';

const BOARD_SIZE = 8;

const THEMES = {
  OBSIDIAN: {
    bg: 'bg-[#0B0F17]',
    sidebar: 'bg-slate-900/80 border-slate-800',
    boardOuter: 'bg-slate-900/60 border-slate-800',
    boardInner: 'bg-black/40',
    p1: '#00f0ff',
    p2: '#ff007b',
    p1Hover: 'hover:border-cyan-500/50',
    p2Hover: 'hover:border-pink-500/50',
    p1Focus: 'border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]',
    p2Focus: 'border-pink-500/50 shadow-[0_0_15px_rgba(255,0,123,0.3)]',
    cellBg: 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/80',
    cellEmpty: 'bg-slate-800/20',
    cellOccupied: 'bg-slate-800/50 shadow-inner',
    corner: 'bg-slate-900/20',
  },
  HIGH_CONTRAST: {
    bg: 'bg-black',
    sidebar: 'bg-black border-white/30',
    boardOuter: 'bg-black border-white/50',
    boardInner: 'bg-black border border-white/20',
    p1: '#FFFF00',
    p2: '#FFFFFF',
    p1Hover: 'hover:border-yellow-400/80',
    p2Hover: 'hover:border-white/80',
    p1Focus: 'border-yellow-400 shadow-[0_0_15px_rgba(255,255,0,0.5)]',
    p2Focus: 'border-white shadow-[0_0_15px_rgba(255,255,255,0.5)]',
    cellBg: 'bg-gray-900 border-gray-700 hover:bg-gray-800',
    cellEmpty: 'bg-black',
    cellOccupied: 'bg-gray-800 border border-gray-600',
    corner: 'bg-black',
  }
};

function isCorner(r: number, c: number) {
  return (r === 0 || r === BOARD_SIZE - 1) && (c === 0 || c === BOARD_SIZE - 1);
}

function isValidSpawn(r: number, c: number, board: CellState[][]) {
  if (isCorner(r, c)) return false;
  if (board[r][c] !== 'EMPTY') return false;
  return r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1;
}

function getFallDest(r: number, c: number, board: CellState[][]): [number, number] {
  let dr = 0,
    dc = 0;
  if (r === 0) dr = 1;
  else if (r === BOARD_SIZE - 1) dr = -1;
  else if (c === 0) dc = 1;
  else if (c === BOARD_SIZE - 1) dc = -1;

  if (dr === 0 && dc === 0) return [r, c]; // safety fallback

  let currR = r,
    currC = c;
  while (true) {
    const nextR = currR + dr;
    const nextC = currC + dc;

    if (nextR < 0 || nextR >= BOARD_SIZE || nextC < 0 || nextC >= BOARD_SIZE) break;
    if (board[nextR][nextC] !== 'EMPTY') break;

    currR = nextR;
    currC = nextC;
  }
  return [currR, currC];
}

function getCapturedCells(board: CellState[][], r: number, c: number, player: Player): [number, number][] {
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  const opposite = player === 'P1' ? 'P2' : 'P1';
  const cellsToFlip: [number, number][] = [];

  for (const [dr, dc] of directions) {
    const flipList: [number, number][] = [];
    let currR = r + dr;
    let currC = c + dc;

    while (currR >= 0 && currR < BOARD_SIZE && currC >= 0 && currC < BOARD_SIZE) {
      const cell = board[currR][currC];
      if (cell === opposite) {
        flipList.push([currR, currC]);
      } else if (cell === 'ANCHOR' || cell === player) {
        if (flipList.length > 0) {
          cellsToFlip.push(...flipList);
        }
        break;
      } else {
        break;
      }
      currR += dr;
      currC += dc;
    }
  }
  return cellsToFlip;
}

const createInitialBoard = (layout: BoardLayout = 'CLASSIC'): CellState[][] => {
  const board: CellState[][] = Array(BOARD_SIZE)
    .fill(null)
    .map(() => Array(BOARD_SIZE).fill('EMPTY'));

  if (layout === 'CLASSIC') {
    board[3][3] = 'ANCHOR';
    board[3][4] = 'ANCHOR';
    board[4][3] = 'ANCHOR';
    board[4][4] = 'ANCHOR';
  } else if (layout === 'CORNERS') {
    board[2][2] = 'ANCHOR';
    board[2][5] = 'ANCHOR';
    board[5][2] = 'ANCHOR';
    board[5][5] = 'ANCHOR';
  } else if (layout === 'DIAMOND') {
    board[2][3] = 'ANCHOR';
    board[2][4] = 'ANCHOR';
    board[3][2] = 'ANCHOR';
    board[3][5] = 'ANCHOR';
    board[4][2] = 'ANCHOR';
    board[4][5] = 'ANCHOR';
    board[5][3] = 'ANCHOR';
    board[5][4] = 'ANCHOR';
  } else if (layout === 'CROSS') {
    board[3][3] = 'ANCHOR';
    board[3][4] = 'ANCHOR';
    board[4][3] = 'ANCHOR';
    board[4][4] = 'ANCHOR';
    board[1][3] = 'ANCHOR';
    board[1][4] = 'ANCHOR';
    board[6][3] = 'ANCHOR';
    board[6][4] = 'ANCHOR';
    board[3][1] = 'ANCHOR';
    board[4][1] = 'ANCHOR';
    board[3][6] = 'ANCHOR';
    board[4][6] = 'ANCHOR';
  } else if (layout === 'RING') {
    for (let r = 2; r <= 5; r++) {
      for (let c = 2; c <= 5; c++) {
        if (r === 2 || r === 5 || c === 2 || c === 5) {
          board[r][c] = 'ANCHOR';
        }
      }
    }
  } else if (layout === 'SCATTERED') {
    board[1][1] = 'ANCHOR';
    board[1][6] = 'ANCHOR';
    board[6][1] = 'ANCHOR';
    board[6][6] = 'ANCHOR';
    board[3][3] = 'ANCHOR';
    board[4][4] = 'ANCHOR';
    board[3][4] = 'ANCHOR';
    board[4][3] = 'ANCHOR';
  }
  
  return board;
};

function ParticleBurst({ color, key }: { color: string; key?: string | number }) {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 40 + Math.random() * 40; // 40-80px
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size: 3 + Math.random() * 4,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      ))}
    </div>
  );
}

function ConfettiBurst({ winnerColor }: { winnerColor: string }) {
  const particles = useMemo(() => {
    return Array.from({ length: 80 }).map((_, i) => {
      const angle = (i / 80) * Math.PI * 2 + (Math.random() * 0.2);
      const dist = 50 + Math.random() * 300;
      return {
        tx: `${Math.cos(angle) * dist}px`,
        ty: `${Math.sin(angle) * dist}px`,
        tscale: 0.5 + Math.random() * 1.5,
        rot: `${Math.random() * 720 - 360}deg`,
        size: 6 + Math.random() * 8,
        shape: Math.random() > 0.5 ? '50%' : '2px', // circles or rectangles
        color: Math.random() > 0.6 ? '#ffffff' : winnerColor,
        delay: `${Math.random() * 0.4}s`,
      };
    });
  }, [winnerColor]);

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[100] overflow-hidden">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute animate-confetti opacity-0"
          style={{
            width: p.shape === '2px' ? p.size * 1.5 : p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
            boxShadow: `0 0 12px ${p.color}`,
            ['--tx' as string]: p.tx,
            ['--ty' as string]: p.ty,
            ['--tscale' as string]: p.tscale,
            ['--rot' as string]: p.rot,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

function simulateMove(board: CellState[][], r: number, c: number, player: Player): { newBoard: CellState[][], captures: number } {
  const newBoard = board.map((row) => [...row]);
  const [destR, destC] = getFallDest(r, c, newBoard);

  newBoard[destR][destC] = player;

  const cellsToFlip = getCapturedCells(newBoard, destR, destC, player);

  for (const [fr, fc] of cellsToFlip) {
    newBoard[fr][fc] = player;
  }
  
  return { newBoard, captures: cellsToFlip.length };
}

function DemoBoard() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 5);
    }, 1500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-[240px] mx-auto bg-slate-900/80 p-3 rounded-2xl my-4 shadow-2xl border border-slate-700/50">
      <div className="grid grid-cols-5 gap-1 bg-black/40 p-1 rounded-xl">
        {Array(5)
          .fill(null)
          .map((_, r) =>
            Array(5)
              .fill(null)
              .map((_, c) => {
                let cell: CellState = 'EMPTY';
                if (r === 2 && c === 4) cell = 'ANCHOR';
                else if (r === 2 && c === 3) {
                  cell = step >= 3 ? 'P1' : 'P2';
                } else if (step >= 1 && r === 2) {
                  if (step >= 2 && c === 2) cell = 'P1';
                  else if (step === 1 && c === 0) cell = 'P1';
                }

                let fgClass = '';
                if (cell === 'ANCHOR') fgClass = 'bg-slate-400 border-slate-300 shadow-[inset_0_0_8px_rgba(255,255,255,0.5)]';
                else if (cell === 'P1') fgClass = 'bg-[#00f0ff] border-[#00f0ff] shadow-[0_0_10px_rgba(0,240,255,0.8)]';
                else if (cell === 'P2') fgClass = 'bg-[#ff007b] border-[#ff007b] shadow-[0_0_10px_rgba(255,0,123,0.8)]';

                return (
                  <div key={`${r}-${c}`} className={`w-8 h-8 sm:w-10 sm:h-10 rounded relative flex items-center justify-center ${cell === 'EMPTY' ? 'bg-slate-800/20' : 'bg-slate-800/50 shadow-inner'} ${((r === 0 || r === 4) && (c === 0 || c === 4)) ? 'bg-slate-900/20' : ''}`}>
                    <div className={`w-full h-full rounded flex items-center justify-center transition-all duration-300 ${cell !== 'EMPTY' && cell !== 'ANCHOR' ? 'border' : ''} ${fgClass} ${step === 3 && cell === 'P1' && r === 2 && c === 3 ? 'scale-110 animate-[pulse_0.4s_ease-in-out_infinite]' : ''}`} />
                  </div>
                );
              })
          )}
      </div>
      <div className="text-center mt-4 text-xs text-cyan-400 font-bold uppercase tracking-widest h-4">
        {step === 0 && 'Setup: Pink and Anchor'}
        {step === 1 && '1. Cyan Spawns at Edge'}
        {step === 2 && '2. Cyan Falls Inward'}
        {step === 3 && '3. Pink is Flanked!'}
        {step === 4 && '3. Pink is Flanked!'}
      </div>
    </div>
  );
}

export default function GravityReef() {
  const [board, setBoard] = useState<CellState[][]>(() => createInitialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Player>('P1');
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  const [bursts, setBursts] = useState<{ id: string; r: number; c: number; color: string }[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('PvAI');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [boardLayout, setBoardLayout] = useState<BoardLayout>('CLASSIC');
  const [boardShake, setBoardShake] = useState(false);
  const [theme, setTheme] = useState<'OBSIDIAN' | 'HIGH_CONTRAST'>('OBSIDIAN');
  const [moveHistory, setMoveHistory] = useState<{player: Player, fromR: number, fromC: number, destR: number, destC: number, captures: number, boardSnapshot: CellState[][]}[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [muted, setMuted] = useState(getMute());

  const t = THEMES[theme];
  const P1_COLOR = t.p1;
  const P2_COLOR = t.p2;

  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('gravityReefTutorialSeen') !== 'true';
  });

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('gravityReefTutorialSeen', 'true');
  };

  const toggleMute = () => {
    const nextMute = !muted;
    setMute(nextMute);
    setMuted(nextMute);
  };

  const isGameOver = useMemo(() => {
    let hasValid = false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (isValidSpawn(r, c, board)) {
          hasValid = true;
          break;
        }
      }
      if (hasValid) break;
    }
    return !hasValid;
  }, [board]);

  const { p1Score, p2Score } = useMemo(() => {
    let p1 = 0,
      p2 = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 'P1') p1++;
        if (board[r][c] === 'P2') p2++;
      }
    }
    return { p1Score: p1, p2Score: p2 };
  }, [board]);

  const winner = useMemo(() => {
    if (!isGameOver) return null;
    if (p1Score > p2Score) return 'P1';
    if (p2Score > p1Score) return 'P2';
    return 'DRAW';
  }, [isGameOver, p1Score, p2Score]);

  useEffect(() => {
    if (winner && winner !== 'DRAW') {
      playWinSound();
    }
  }, [winner]);

  const handleCellClick = (r: number, c: number, isUserClick = true) => {
    if (winner) return;
    if (isUserClick && gameMode === 'PvAI' && currentPlayer === 'P2') return;
    if (!isValidSpawn(r, c, board)) return;

    const newBoard = board.map((row) => [...row]);
    const [destR, destC] = getFallDest(r, c, newBoard);

    newBoard[destR][destC] = currentPlayer;
    playClickSound();

    const cellsToFlipForHistory = getCapturedCells(newBoard, destR, destC, currentPlayer);
    moveHistory.push({
      player: currentPlayer,
      fromR: r, fromC: c,
      destR: destR, destC: destC,
      captures: cellsToFlipForHistory.length,
      boardSnapshot: board.map(row => [...row])
    });
    setMoveHistory([...moveHistory]);

    const opposite = currentPlayer === 'P1' ? 'P2' : 'P1';
    const cellsToFlip = getCapturedCells(newBoard, destR, destC, currentPlayer);

    if (cellsToFlip.length > 0) {
      setTimeout(() => {
        playCaptureSound();
        setBoardShake(true);
        setTimeout(() => setBoardShake(false), 300);
        const activeColor = currentPlayer === 'P1' ? P1_COLOR : P2_COLOR;
        const newBursts = [
          ...cellsToFlip.map(([fr, fc]) => ({
            id: `${Date.now()}-${Math.random()}`,
            r: fr,
            c: fc,
            color: activeColor,
          })),
          {
            id: `${Date.now()}-${Math.random()}`,
            r: destR,
            c: destC,
            color: activeColor,
          }
        ];
        
        setBursts((prev) => [...prev, ...newBursts]);
        
        setTimeout(() => {
          setBursts((prev) => prev.filter(b => !newBursts.find(nb => nb.id === b.id)));
        }, 1000);
      }, 150);
    }

    for (const [fr, fc] of cellsToFlip) {
      newBoard[fr][fc] = currentPlayer;
    }

    setBoard(newBoard);
    setCurrentPlayer(opposite);
  };

  const handleRestart = () => {
    setBoard(createInitialBoard(boardLayout));
    setCurrentPlayer('P1');
    setMoveHistory([]);
  };

  const handleUndo = () => {
    if (moveHistory.length === 0 || gameMode !== 'PvP') return;
    const lastMove = moveHistory[moveHistory.length - 1];
    setBoard(lastMove.boardSnapshot);
    setCurrentPlayer(lastMove.player);
    setMoveHistory(moveHistory.slice(0, -1));
  };

  useEffect(() => {
    handleRestart();
  }, [boardLayout]);

  const destCell = useMemo(() => {
    if (!hoveredCell || winner) return null;
    if (gameMode === 'PvAI' && currentPlayer === 'P2') return null;
    const [hr, hc] = hoveredCell;
    if (!isValidSpawn(hr, hc, board)) return null;
    return getFallDest(hr, hc, board);
  }, [hoveredCell, board, winner]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (winner) return;
      if (gameMode === 'PvAI' && currentPlayer === 'P2') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'Enter' || e.key === ' ') {
        if (hoveredCell && isValidSpawn(hoveredCell[0], hoveredCell[1], board)) {
          handleCellClick(hoveredCell[0], hoveredCell[1]);
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        let nextR = 0;
        let nextC = 3;

        if (hoveredCell) {
          const [r, c] = hoveredCell;
          nextR = r;
          nextC = c;

          if (e.key === 'ArrowUp') {
            if (c === 0 || c === BOARD_SIZE - 1) {
              if (r === 1) {
                nextR = 0; nextC = c === 0 ? 1 : BOARD_SIZE - 2;
              } else {
                nextR = r - 1;
              }
            } else {
              nextR = 0;
            }
          } else if (e.key === 'ArrowDown') {
            if (c === 0 || c === BOARD_SIZE - 1) {
              if (r === BOARD_SIZE - 2) {
                nextR = BOARD_SIZE - 1; nextC = c === 0 ? 1 : BOARD_SIZE - 2;
              } else {
                nextR = r + 1;
              }
            } else {
              nextR = BOARD_SIZE - 1;
            }
          } else if (e.key === 'ArrowLeft') {
            if (r === 0 || r === BOARD_SIZE - 1) {
              if (c === 1) {
                nextC = 0; nextR = r === 0 ? 1 : BOARD_SIZE - 2;
              } else {
                nextC = c - 1;
              }
            } else {
              nextC = 0;
            }
          } else if (e.key === 'ArrowRight') {
            if (r === 0 || r === BOARD_SIZE - 1) {
              if (c === BOARD_SIZE - 2) {
                nextC = BOARD_SIZE - 1; nextR = r === 0 ? 1 : BOARD_SIZE - 2;
              } else {
                nextC = c + 1;
              }
            } else {
              nextC = BOARD_SIZE - 1;
            }
          }
        }

        nextR = Math.max(0, Math.min(BOARD_SIZE - 1, nextR));
        nextC = Math.max(0, Math.min(BOARD_SIZE - 1, nextC));
        
        setHoveredCell([nextR, nextC]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hoveredCell, board, currentPlayer, winner]);

  useEffect(() => {
    if (gameMode === 'PvAI' && currentPlayer === 'P2' && !winner) {
      const timer = setTimeout(() => {
        const moves: { r: number, c: number, captures: number, eval: number }[] = [];
        for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
            if (isValidSpawn(r, c, board)) {
              let evalScore = 0;
              let caps = 0;
              
              if (difficulty === 'EASY') {
                evalScore = Math.random();
              } else {
                const { newBoard, captures } = simulateMove(board, r, c, 'P2');
                caps = captures;
                evalScore = captures + Math.random() * 0.1; // Add slight randomness for medium

                if (difficulty === 'HARD') {
                  let maxOpp = 0;
                  for (let or = 0; or < BOARD_SIZE; or++) {
                    for (let oc = 0; oc < BOARD_SIZE; oc++) {
                      if (isValidSpawn(or, oc, newBoard)) {
                        const { captures: oppCaps } = simulateMove(newBoard, or, oc, 'P1');
                        if (oppCaps > maxOpp) maxOpp = oppCaps;
                      }
                    }
                  }
                  evalScore = captures - maxOpp + Math.random() * 0.05;
                }
              }
              moves.push({ r, c, captures: caps, eval: evalScore });
            }
          }
        }
        
        if (moves.length > 0) {
          moves.sort((a, b) => b.eval - a.eval);
          const bestMove = moves[0];
          handleCellClick(bestMove.r, bestMove.c, false);
        }
      }, 750); // slight delay to feel like the AI is "thinking"
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, difficulty, board, winner]);

  useEffect(() => {
    const handleInteraction = () => {
      startBackgroundHum();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  return (
    <div className={`flex flex-col md:flex-row ${t.bg} text-white min-h-screen font-sans selection:bg-slate-700 transition-colors duration-500`}>
      {/* Sidebar / Navbar */}
      <aside className={`w-full md:w-72 ${t.sidebar} border-b md:border-b-0 md:border-r p-6 flex flex-col md:min-h-screen z-10 shadow-2xl transition-colors duration-500`}>
        <div className="flex items-center justify-between md:justify-start gap-4 mb-6 md:mb-12">
          <div className="flex items-center gap-3">
            <LayoutDashboard className={`w-8 h-8 ${theme === 'OBSIDIAN' ? 'text-cyan-400' : 'text-white'}`} />
            <h1 className="text-xl md:text-2xl font-bold tracking-widest uppercase">
              Gravity
              <br className="hidden md:block" />
              Reef
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTutorial(true)}
              className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-lg border border-slate-700"
              aria-label="View tutorial"
            >
              <BookOpen className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheme(tm => tm === 'OBSIDIAN' ? 'HIGH_CONTRAST' : 'OBSIDIAN')}
              className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-lg border border-slate-700"
              aria-label="Toggle theme"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button
              onClick={toggleMute}
              className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-lg border border-slate-700"
              aria-label={muted ? "Unmute audio" : "Mute audio"}
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={handleRestart}
              className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-lg border border-slate-700"
              aria-label="Restart game"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            {gameMode === 'PvP' && moveHistory.length > 0 && (
              <button
                onClick={handleUndo}
                className="md:hidden p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-lg border border-slate-700"
                aria-label="Undo last move"
              >
                <Undo2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 md:gap-10">
          <div className="space-y-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest hidden md:block">
              Match Status
            </h2>
            {winner ? (
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-600 shadow-lg animate-pulse flex items-center justify-center">
                {winner === 'DRAW' ? (
                  <span className="text-slate-200 font-bold tracking-widest text-lg">
                    DRAW
                  </span>
                ) : (
                  <div className="flex items-center gap-3">
                    <Crown
                      className="w-6 h-6"
                      style={{ color: winner === 'P1' ? P1_COLOR : P2_COLOR }}
                    />
                    <span
                      className="font-bold tracking-widest text-lg"
                      style={{ color: winner === 'P1' ? P1_COLOR : P2_COLOR }}
                    >
                      {winner} WINS
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="p-5 rounded-2xl border transition-colors duration-500 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] animate-glow-pulse"
                style={{
                  borderColor: currentPlayer === 'P1' ? P1_COLOR : P2_COLOR,
                  backgroundColor:
                    currentPlayer === 'P1' ? `${P1_COLOR}10` : `${P2_COLOR}10`,
                }}
              >
                <p className="text-sm tracking-wide text-slate-400 mb-2 uppercase">
                  Active Turn
                </p>
                <p
                  className="text-2xl font-black uppercase tracking-widest"
                  style={{
                    color: currentPlayer === 'P1' ? P1_COLOR : P2_COLOR,
                    textShadow: `0 0 20px ${currentPlayer === 'P1' ? P1_COLOR : P2_COLOR}80`,
                  }}
                >
                  Player {currentPlayer === 'P1' ? '1' : '2'}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4 flex-1">
             <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest hidden md:block">
              Territory Control
            </h2>
            <div className="flex md:flex-col gap-3">
              <div className="flex-1 flex justify-between items-center bg-[#070A0F] p-4 rounded-xl border border-slate-800 shadow-inner">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: P1_COLOR, boxShadow: `0 0 12px ${P1_COLOR}` }}
                  />
                  <span className="text-slate-400 font-medium tracking-wide">P1</span>
                </div>
                <span className="text-2xl font-mono font-bold text-white">
                  {p1Score}
                </span>
              </div>

              <div className="flex-1 flex justify-between items-center bg-[#070A0F] p-4 rounded-xl border border-slate-800 shadow-inner">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shadow-lg"
                    style={{ backgroundColor: P2_COLOR, boxShadow: `0 0 12px ${P2_COLOR}` }}
                  />
                  <span className="text-slate-400 font-medium tracking-wide">P2</span>
                </div>
                <span className="text-2xl font-mono font-bold text-white">
                  {p2Score}
                </span>
              </div>
            </div>

            {/* Territory Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex mt-2">
              <div
                className="h-full animate-score-bar rounded-l-full"
                style={{
                  width: `${p1Score + p2Score > 0 ? (p1Score / (p1Score + p2Score)) * 100 : 50}%`,
                  backgroundColor: P1_COLOR,
                  boxShadow: `0 0 8px ${P1_COLOR}60`,
                }}
              />
              <div
                className="h-full animate-score-bar rounded-r-full"
                style={{
                  width: `${p1Score + p2Score > 0 ? (p2Score / (p1Score + p2Score)) * 100 : 50}%`,
                  backgroundColor: P2_COLOR,
                  boxShadow: `0 0 8px ${P2_COLOR}60`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-8">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">
              Board Layout
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-1 bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-700/50">
              {(['CLASSIC', 'CORNERS', 'DIAMOND', 'CROSS', 'RING', 'SCATTERED'] as BoardLayout[]).map((layout) => (
                <button
                  key={layout}
                  onClick={() => setBoardLayout(layout)}
                  className={`text-[10px] sm:text-xs font-medium py-2 px-1 rounded-lg transition-colors ${
                    boardLayout === layout ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">
              Opponent
            </label>
            <div className="flex bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-700/50">
              <button
                onClick={() => setGameMode('PvP')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                  gameMode === 'PvP' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Human
              </button>
              <button
                onClick={() => setGameMode('PvAI')}
                className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
                  gameMode === 'PvAI' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                AI
              </button>
            </div>
          </div>

          {gameMode === 'PvAI' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest block">
                Difficulty
              </label>
              <div className="flex bg-slate-800 p-1 rounded-xl shadow-inner border border-slate-700/50">
                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${
                      difficulty === level ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleRestart}
          className="hidden md:flex w-full items-center justify-center gap-3 py-4 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors rounded-xl font-semibold border border-slate-700 tracking-wide uppercase text-sm mt-8"
        >
          <RotateCcw className="w-4 h-4" />
          Reinitialize
        </button>
        {gameMode === 'PvP' && moveHistory.length > 0 && (
          <button
            onClick={handleUndo}
            className="hidden md:flex w-full items-center justify-center gap-3 py-3 px-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold tracking-wide uppercase text-xs mt-2 border border-slate-800 hover:border-slate-700"
          >
            <Undo2 className="w-4 h-4" />
            Undo Last Move
          </button>
        )}
        {moveHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(s => !s)}
            className="hidden md:flex w-full items-center justify-center gap-3 py-3 px-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold tracking-wide uppercase text-xs mt-2"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Hide' : 'Show'} Move Log ({moveHistory.length})
          </button>
        )}
        <button
          onClick={() => setShowTutorial(true)}
          className="hidden md:flex w-full items-center justify-center gap-3 py-3 px-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold tracking-wide uppercase text-xs mt-2"
        >
          View Tutorial
        </button>
        <button
          onClick={() => setTheme(tm => tm === 'OBSIDIAN' ? 'HIGH_CONTRAST' : 'OBSIDIAN')}
          className="hidden md:flex w-full items-center justify-center gap-3 py-3 px-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold tracking-wide uppercase text-xs mt-2"
        >
          <Palette className="w-4 h-4" />
          {theme === 'OBSIDIAN' ? 'High Contrast Mode' : 'Obsidian Mode'}
        </button>
        <button
          onClick={toggleMute}
          className="hidden md:flex w-full items-center justify-center gap-3 py-3 px-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors rounded-xl font-bold tracking-wide uppercase text-xs mt-2"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          {muted ? 'Unmute Sounds' : 'Mute Sounds'}
        </button>
      </aside>

      {/* Main Board Area */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 md:p-8 overflow-hidden">
        <div className={`relative p-1 sm:p-2 md:p-4 ${t.boardOuter} rounded-2xl shadow-2xl backdrop-blur-sm overflow-hidden transition-colors duration-500 w-[min(100vw-16px,65vh)] sm:w-[min(100vw-32px,70vh)] md:w-[min(80vw,80vh)] lg:w-[min(800px,80vh)] aspect-square flex flex-col justify-center`}>
          {winner && <ConfettiBurst winnerColor={winner === 'P1' ? P1_COLOR : winner === 'P2' ? P2_COLOR : '#ffffff'} />}
          {winner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none"
            >
              <motion.div
                initial={{ scale: 0.8, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 200, delay: 0.2 }}
                className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6"
              >
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-slate-800 border border-slate-700">
                    <Crown className="w-12 h-12" style={{ color: winner === 'DRAW' ? '#ffffff' : winner === 'P1' ? P1_COLOR : P2_COLOR }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-widest uppercase text-white">
                    {winner === 'DRAW' ? 'DRAW MATCH' : `${winner === 'P1' ? 'Player 1' : 'Player 2'} Wins!`}
                  </h2>
                  <p className="text-slate-400 text-xs tracking-widest uppercase font-semibold">
                    Territory saturation complete
                  </p>
                </div>

                {/* Score breakdown comparison cards */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner flex flex-col justify-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P1_COLOR }} />
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">Player 1</span>
                    </div>
                    <span className="text-3xl font-black font-mono text-white">{p1Score}</span>
                  </div>

                  <div className="flex-1 bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-inner flex flex-col justify-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: P2_COLOR }} />
                      <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-sans">Player 2</span>
                    </div>
                    <span className="text-3xl font-black font-mono text-white">{p2Score}</span>
                  </div>
                </div>

                <button
                  onClick={handleRestart}
                  className="w-full py-4 px-6 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-600 hover:border-slate-500 shadow-lg transition-colors uppercase tracking-widest text-sm"
                >
                  Play Again
                </button>
              </motion.div>
            </motion.div>
          )}
          <motion.div 
            className={`grid grid-cols-8 gap-0.5 sm:gap-1 lg:gap-1.5 p-1 ${t.boardInner} rounded-xl transition-colors duration-500 w-full h-full`}
            animate={boardShake ? { x: [-3, 3, -3, 3, 0], y: [-3, 3, -2, 2, 0] } : { x: 0, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {board.map((row, r) =>
              row.map((cell, c) => {
                const corner = isCorner(r, c);
                const validSpawn = isValidSpawn(r, c, board);
                const isHovered = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
                const activeHoverClass = currentPlayer === 'P1' ? t.p1Hover : t.p2Hover;
                const activeFocusClass = currentPlayer === 'P1' ? t.p1Focus : t.p2Focus;

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    onMouseEnter={() => setHoveredCell([r, c])}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`
                      relative flex items-center justify-center
                      w-full h-full
                      rounded-sm sm:rounded-md lg:rounded-lg transition-all duration-300
                      ${corner ? t.corner : ''}
                      ${
                        !corner && cell === 'EMPTY' && validSpawn
                          ? `${t.cellBg} cursor-pointer box-border ${
                              isHovered
                                ? `animate-pulse border-2 ${activeFocusClass}`
                                : `border hover:animate-pulse ${activeHoverClass}`
                            }`
                          : ''
                      }
                      ${
                        !corner && cell === 'EMPTY' && !validSpawn
                          ? t.cellEmpty
                          : ''
                      }
                      ${cell !== 'EMPTY' ? t.cellOccupied : ''}
                    `}
                  >
                    <AnimatePresence mode="popLayout">
                      {bursts.filter(b => b.r === r && b.c === c).map(b => (
                        <ParticleBurst key={b.id} color={b.color} />
                      ))}
                      {cell === 'EMPTY' && destCell && destCell[0] === r && destCell[1] === c && (
                        <motion.div
                          key="ghost"
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 0.9, opacity: 0.4 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="absolute inset-0 sm:m-0.5 lg:m-1 rounded flex items-center justify-center overflow-hidden"
                          style={{
                                  backgroundColor: currentPlayer === 'P1' ? P1_COLOR : P2_COLOR,
                                  boxShadow: `0 0 15px ${
                                    currentPlayer === 'P1' ? P1_COLOR : P2_COLOR
                                  }60, inset 0 0 10px rgba(0,0,0,0.5)`,
                                }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent mix-blend-overlay" />
                        </motion.div>
                      )}
                      {cell !== 'EMPTY' && (
                        <motion.div
                          key={`${cell}`}
                          initial={{ scale: 0.5, rotateY: 180, opacity: 0 }}
                          animate={{ scale: cell === 'ANCHOR' ? 1.05 : 0.9, rotateY: 0, opacity: 1 }}
                          exit={{ scale: 0.5, rotateY: -180, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                          className="absolute inset-0 sm:m-0.5 lg:m-1 rounded flex items-center justify-center overflow-hidden"
                          style={
                            cell === 'P1' || cell === 'P2'
                              ? {
                                  backgroundColor: cell === 'P1' ? P1_COLOR : P2_COLOR,
                                  boxShadow: `0 0 15px ${
                                    cell === 'P1' ? P1_COLOR : P2_COLOR
                                  }60, inset 0 0 10px rgba(0,0,0,0.5)`,
                                }
                              : {
                                  background: 'linear-gradient(135deg, #a1a1aa, #52525b)',
                                  boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8), 0 5px 15px rgba(0,0,0,0.5)',
                                  border: '1px solid #d4d4d8',
                                }
                          }
                        >
                          {cell === 'ANCHOR' && (
                            <Lock className="w-4 h-4 sm:w-6 sm:h-6 text-slate-900 drop-shadow-md" />
                          )}
                          {(cell === 'P1' || cell === 'P2') && (
                             <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent mix-blend-overlay" />
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </motion.div>
        </div>
      </main>

      {/* Move History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-72 bg-slate-900/95 backdrop-blur-md border-l border-slate-700 z-40 flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <History className="w-4 h-4" />
                Move Log
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-slate-500 hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {moveHistory.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-8">No moves yet</p>
              ) : (
                moveHistory.map((move, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/30 animate-slide-in text-xs"
                    style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                  >
                    <span className="text-slate-600 font-mono w-5 text-right">{i + 1}.</span>
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: move.player === 'P1' ? P1_COLOR : P2_COLOR,
                        boxShadow: `0 0 6px ${move.player === 'P1' ? P1_COLOR : P2_COLOR}80`,
                      }}
                    />
                    <span className="text-slate-400">
                      ({move.fromR},{move.fromC}) → ({move.destR},{move.destC})
                    </span>
                    {move.captures > 0 && (
                      <span
                        className="ml-auto font-bold"
                        style={{ color: move.player === 'P1' ? P1_COLOR : P2_COLOR }}
                      >
                        +{move.captures}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Overlay */}
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0F17]/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: 20, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 20, scale: 0.95 }}
              className="bg-slate-900 border border-slate-700 p-6 md:p-8 max-w-lg w-full max-h-[95vh] flex flex-col rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
            >
              <button
                onClick={dismissTutorial}
                className="absolute right-4 top-4 text-slate-500 hover:text-slate-200 transition-colors bg-slate-800 hover:bg-slate-700 p-2 rounded-full"
                aria-label="Close tutorial"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">
                Tutorial (Action Cam!) 🎬
              </h2>
              
              <div className="space-y-6 text-slate-300 text-sm max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <p className="italic text-slate-400 border-l-2 border-slate-600 pl-3">
                  "Hey everyone! Welcome back to Gravity Reef. You can always access this guide by clicking 'VIEW TUTORIAL' in the menu. Let's dive right into the mechanics."
                </p>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-900/40 flex items-center justify-center text-cyan-400 border border-cyan-800">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-cyan-400 font-semibold uppercase tracking-wider mb-2">Scene 1: The Drop</h3>
                    <p className="leading-relaxed">
                      Notice the glowing outer ring? You can <strong>only spawn pieces there</strong>. 
                      When you place a piece, gravity pulls it inwards! It slides straight until it hits another piece or an anchor block.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-pink-900/40 flex items-center justify-center text-pink-500 border border-pink-800">
                    <RefreshCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-pink-500 font-semibold uppercase tracking-wider mb-2">Scene 2: Demonstration</h3>
                    <p className="leading-relaxed mb-2">
                      <em>*Camera zooms onto the board*</em>
                    </p>
                    <p className="leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 mt-4 text-center">
                      Imagine an opponent's pink piece sits near a silver anchor. 
                      If you spawn a cyan piece at the edge, gravity pulls it in. 
                      Because your piece and the anchor wedge the pink piece between them along a line, <strong>*BAM*!</strong> The pink piece flips to cyan!
                    </p>
                    <DemoBoard />
                    <p className="leading-relaxed mt-4 text-xs text-slate-400">
                      The logic is Othello-style: capture by flanking opponent pieces in any of the 8 directions between your newly placed piece and either another of your pieces OR an anchor block.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-slate-400 font-semibold uppercase tracking-wider mb-2">Scene 3: The Climax</h3>
                    <p className="leading-relaxed">
                      The game ends when the outer rim is successfully saturated and no more pieces can be dropped. The player controlling the most territory wins. 
                      Good luck out there!
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={dismissTutorial}
                className="mt-10 w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-colors uppercase tracking-widest border border-slate-600 hover:border-slate-500 shadow-lg"
              >
                Initiate Sequence
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
