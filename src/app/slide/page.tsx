"use client";

import Layout from "@/layout/layout";
import { adjustStoredBalance, getStoredBalance } from "@/util/gcash";
import { Button, Input, Progress } from "@heroui/react";
import { useMemo, useRef, useState } from "react";

const formatPeso = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const SlidePage = () => {
  const [balance, setBalance] = useState<number>(getStoredBalance());
  const [betAmount, setBetAmount] = useState<string>("100");
  const [target, setTarget] = useState<string>("2");
  const [current, setCurrent] = useState<number>(1);
  const [resultPoint, setResultPoint] = useState<number>(1);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("Set your bet and target, then start a round.");

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const bet = useMemo(() => Number(betAmount), [betAmount]);
  const targetValue = useMemo(() => Math.max(1.1, Number(target)), [target]);

  const refreshBalance = () => setBalance(getStoredBalance());

  const startRound = () => {
    if (!(bet > 0)) {
      setStatus("Enter a valid bet amount.");
      return;
    }

    if (!(targetValue >= 1.1)) {
      setStatus("Target must be at least 1.1x.");
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

    refreshBalance();
    setRunning(true);
    setCurrent(1);

    const point = Number((1.02 + Math.random() * 10).toFixed(2));
    setResultPoint(point);
    setStatus("Sliding...");

    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = Number((prev * 1.03).toFixed(2));

        if (next >= point) {
          if (timerRef.current) clearInterval(timerRef.current);
          setRunning(false);

          if (targetValue <= point) {
            const payout = Number((bet * targetValue).toFixed(2));
            adjustStoredBalance(payout);
            setStatus(`Win! Target ${targetValue.toFixed(2)}x hit before ${point.toFixed(2)}x. Payout ${formatPeso(payout)}.`);
          } else {
            setStatus(`Lost. Round stopped at ${point.toFixed(2)}x before your target.`);
          }

          refreshBalance();
          return point;
        }

        return next;
      });
    }, 120);
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-white space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/50 p-5">
          <h1 className="text-3xl">BETOKPH Slide</h1>
          <p className="text-white/70 mt-2">Pick a target multiplier. Win if round result reaches your target before stopping.</p>
          <div className="mt-4 text-sm">Balance: <span className="text-success-400">{formatPeso(balance)}</span></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4">
            <Input label="Bet Amount (PHP)" type="number" min={1} value={betAmount} onValueChange={setBetAmount} />
            <Input label="Target Multiplier" type="number" min={1.1} step={0.1} value={target} onValueChange={setTarget} />
            <Button color="primary" onPress={startRound} isDisabled={running}>Play Round</Button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 p-5 lg:col-span-2 min-h-[220px] flex flex-col justify-center gap-4">
            <div className="text-5xl text-center font-bold text-warning-300">{current.toFixed(2)}x</div>
            <Progress value={Math.min(100, (current / Math.max(resultPoint, targetValue)) * 100)} aria-label="Round progress" />
            <div className="text-center text-sm text-white/60">Last round stop point: {resultPoint.toFixed(2)}x</div>
          </div>
        </div>

        <p className="text-sm text-warning-200">{status}</p>
      </div>
    </Layout>
  );
};

export default SlidePage;