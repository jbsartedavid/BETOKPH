"use client";

import Layout from "@/layout/layout";
import { adjustStoredBalance, getStoredBalance } from "@/util/gcash";
import { Button, Input } from "@heroui/react";
import { useMemo, useState } from "react";

type Cell = {
  isBomb: boolean;
  revealed: boolean;
};

const formatPeso = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const createBoard = (mineCount: number): Cell[] => {
  const board = Array.from({ length: 25 }, () => ({ isBomb: false, revealed: false }));
  const indexes = [...Array(25).keys()].sort(() => Math.random() - 0.5).slice(0, mineCount);
  indexes.forEach((index) => {
    board[index].isBomb = true;
  });
  return board;
};

const MinePage = () => {
  const [balance, setBalance] = useState<number>(getStoredBalance());
  const [betAmount, setBetAmount] = useState<string>("100");
  const [mineCount, setMineCount] = useState<string>("3");
  const [board, setBoard] = useState<Cell[]>(Array.from({ length: 25 }, () => ({ isBomb: false, revealed: false })));
  const [active, setActive] = useState(false);
  const [picks, setPicks] = useState(0);
  const [status, setStatus] = useState("Set bet and start a new board.");

  const bet = useMemo(() => Number(betAmount), [betAmount]);
  const mines = useMemo(() => Math.min(24, Math.max(1, Number(mineCount))), [mineCount]);
  const currentMultiplier = useMemo(() => Number((1 + picks * (0.08 + mines * 0.02)).toFixed(2)), [picks, mines]);

  const refreshBalance = () => setBalance(getStoredBalance());

  const startGame = () => {
    if (!(bet > 0)) {
      setStatus("Enter a valid bet amount.");
      return;
    }

    if (bet > balance) {
      setStatus("Insufficient balance. Deposit via GCash Cashier first.");
      return;
    }

    try {
      adjustStoredBalance(-bet);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to place bet.");
      return;
    }

    setBoard(createBoard(mines));
    setPicks(0);
    setActive(true);
    setStatus("Game started. Reveal tiles and avoid bombs.");
    refreshBalance();
  };

  const revealAllAndStop = (nextBoard: Cell[], message: string) => {
    setBoard(nextBoard.map((cell) => ({ ...cell, revealed: true })));
    setActive(false);
    setStatus(message);
    refreshBalance();
  };

  const revealTile = (index: number) => {
    if (!active || board[index].revealed) {
      return;
    }

    const nextBoard = [...board];
    nextBoard[index] = { ...nextBoard[index], revealed: true };
    setBoard(nextBoard);

    if (nextBoard[index].isBomb) {
      revealAllAndStop(nextBoard, "Boom! You hit a bomb.");
      return;
    }

    const nextPicks = picks + 1;
    setPicks(nextPicks);

    if (nextPicks >= 25 - mines) {
      const payout = Number((bet * (1 + nextPicks * (0.08 + mines * 0.02))).toFixed(2));
      adjustStoredBalance(payout);
      revealAllAndStop(nextBoard, `Perfect clear! Payout ${formatPeso(payout)}.`);
    }
  };

  const cashout = () => {
    if (!active || picks === 0) {
      setStatus("Reveal at least one safe tile before cashing out.");
      return;
    }

    const payout = Number((bet * currentMultiplier).toFixed(2));
    adjustStoredBalance(payout);
    revealAllAndStop(board, `Cashed out at ${currentMultiplier.toFixed(2)}x. Payout ${formatPeso(payout)}.`);
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-white space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/50 p-5">
          <h1 className="text-3xl">BETOKPH Mine</h1>
          <p className="text-white/70 mt-2">Reveal gems, avoid bombs, and cash out anytime.</p>
          <div className="mt-4 text-sm">Balance: <span className="text-success-400">{formatPeso(balance)}</span></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4">
            <Input label="Bet Amount (PHP)" type="number" min={1} value={betAmount} onValueChange={setBetAmount} />
            <Input label="Mines (1-24)" type="number" min={1} max={24} value={mineCount} onValueChange={setMineCount} />
            <div className="text-sm text-white/70">Multiplier: {currentMultiplier.toFixed(2)}x</div>
            <div className="flex gap-3">
              <Button color="primary" onPress={startGame} isDisabled={active}>Start</Button>
              <Button color="success" onPress={cashout} isDisabled={!active || picks === 0}>Cash Out</Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 p-4 lg:col-span-2">
            <div className="grid grid-cols-5 gap-2">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => revealTile(index)}
                  className={`h-16 rounded-md border text-xl ${cell.revealed
                    ? cell.isBomb
                      ? "bg-danger-500/40 border-danger-300"
                      : "bg-success-500/30 border-success-300"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                >
                  {cell.revealed ? (cell.isBomb ? "💣" : "💎") : ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-sm text-warning-200">{status}</p>
      </div>
    </Layout>
  );
};

export default MinePage;