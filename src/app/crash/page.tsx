"use client";

import Layout from "@/layout/layout";
import { adjustStoredBalance, getStoredBalance } from "@/util/gcash";
import { Button, Input } from "@heroui/react";
import { useEffect, useMemo, useRef, useState } from "react";

type CrashPhase = "idle" | "countdown" | "running" | "ended";

const formatPeso = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const CrashPage = () => {
  const [balance, setBalance] = useState<number>(0);
  const [betAmount, setBetAmount] = useState<string>("100");
  const [autoCashout, setAutoCashout] = useState<string>("2");
  const [phase, setPhase] = useState<CrashPhase>("idle");
  const [countdown, setCountdown] = useState<number>(3);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [crashPoint, setCrashPoint] = useState<number>(1);
  const [hasActiveBet, setHasActiveBet] = useState(false);
  const [status, setStatus] = useState<string>("Set your bet and start a round.");

  const multiplierTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeBetRef = useRef(false);

  const parsedBet = useMemo(() => Number(betAmount), [betAmount]);
  const parsedAutoCashout = useMemo(() => Number(autoCashout), [autoCashout]);

  const refreshBalance = () => setBalance(getStoredBalance());

  useEffect(() => {
    refreshBalance();
    return () => {
      if (multiplierTimerRef.current) clearInterval(multiplierTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  const stopTimers = () => {
    if (multiplierTimerRef.current) {
      clearInterval(multiplierTimerRef.current);
      multiplierTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const endRound = (message: string) => {
    stopTimers();
    setPhase("ended");
    setHasActiveBet(false);
    activeBetRef.current = false;
    setStatus(message);
    refreshBalance();
  };

  const cashout = () => {
    if (!activeBetRef.current || phase !== "running") {
      return;
    }

    const payout = Number((parsedBet * multiplier).toFixed(2));
    adjustStoredBalance(payout);
    endRound(`Cashed out at ${multiplier.toFixed(2)}x. Payout ${formatPeso(payout)}.`);
  };

  const startRound = () => {
    if (!(parsedBet > 0)) {
      setStatus("Enter a valid bet amount.");
      return;
    }

    if (parsedBet > balance) {
      setStatus("Insufficient balance. Deposit via GCash Cashier first.");
      return;
    }

    try {
      adjustStoredBalance(-parsedBet);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to place bet.");
      return;
    }

    const point = Number((1.05 + Math.random() * 8.5).toFixed(2));
    setCrashPoint(point);
    setMultiplier(1);
    setCountdown(3);
    setHasActiveBet(true);
    activeBetRef.current = true;
    setPhase("countdown");
    setStatus("Round starting...");
    refreshBalance();

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }

          setPhase("running");
          setStatus("Crash is running. Cash out before it crashes!");

          multiplierTimerRef.current = setInterval(() => {
            setMultiplier((prevMultiplier) => {
              const next = Number((prevMultiplier * 1.018).toFixed(2));

              if (activeBetRef.current && parsedAutoCashout > 1 && next >= parsedAutoCashout) {
                setTimeout(() => cashout(), 0);
              }

              if (next >= point) {
                endRound(`Crashed at ${point.toFixed(2)}x. Better luck next round.`);
                return point;
              }

              return next;
            });
          }, 120);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-white space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/50 p-5">
          <h1 className="text-3xl">BETOKPH Crash</h1>
          <p className="text-white/70 mt-2">Multiplier rises until random crash. Cash out before crash to win.</p>
          <div className="mt-4 text-sm">Balance: <span className="text-success-400">{formatPeso(balance)}</span></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4 lg:col-span-1">
            <Input label="Bet Amount (PHP)" type="number" min={1} value={betAmount} onValueChange={setBetAmount} />
            <Input label="Auto Cashout Multiplier" type="number" min={1.1} step={0.1} value={autoCashout} onValueChange={setAutoCashout} />
            <div className="flex gap-3">
              <Button color="primary" onPress={startRound} isDisabled={phase === "countdown" || phase === "running"}>
                Start Round
              </Button>
              <Button color="success" onPress={cashout} isDisabled={phase !== "running" || !hasActiveBet}>
                Cash Out
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 p-5 lg:col-span-2 flex flex-col items-center justify-center min-h-[280px]">
            <div className="text-white/70">Current Multiplier</div>
            <div className="text-6xl font-bold mt-2 text-success-400">{multiplier.toFixed(2)}x</div>
            {phase === "countdown" ? <div className="mt-4 text-warning-300">Starts in {countdown}s</div> : null}
            {(phase === "running" || phase === "ended") ? (
              <div className="mt-2 text-white/70 text-sm">Hidden crash point generated for fairness each round.</div>
            ) : null}
            {phase === "ended" ? (
              <div className="mt-3 text-white/60 text-sm">Last crash point: {crashPoint.toFixed(2)}x</div>
            ) : null}
          </div>
        </div>

        <p className="text-sm text-warning-200">{status}</p>
      </div>
    </Layout>
  );
};

export default CrashPage;