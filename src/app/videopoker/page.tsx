"use client";

import Layout from "@/layout/layout";
import { adjustStoredBalance, getStoredBalance } from "@/util/gcash";
import { Button, Input } from "@heroui/react";
import { useMemo, useState } from "react";

type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
type Rank = "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
type Card = { suit: Suit; rank: Rank };

const SUITS: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
const RANKS: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

const PAYOUTS: Record<string, number> = {
  royal_flush: 800,
  straight_flush: 60,
  four_kind: 22,
  full_house: 9,
  flush: 6,
  straight: 4,
  three_kind: 3,
  two_pair: 2,
  jacks_pair: 1,
};

const formatPeso = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const createDeck = (): Card[] => shuffle(SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank }))));

const getRankValue = (rank: Rank): number => RANKS.indexOf(rank) + 2;

const evaluateHand = (cards: Card[]): { rankName: string; multiplier: number } => {
  const ranks = cards.map((card) => card.rank);
  const suits = cards.map((card) => card.suit);

  const counts = ranks.reduce<Record<string, number>>((acc, rank) => {
    acc[rank] = (acc[rank] ?? 0) + 1;
    return acc;
  }, {});

  const values = Object.values(counts).sort((a, b) => b - a);
  const isFlush = suits.every((suit) => suit === suits[0]);

  const sortedValues = [...new Set(ranks.map(getRankValue))].sort((a, b) => a - b);
  const isWheel = JSON.stringify(sortedValues) === JSON.stringify([2, 3, 4, 5, 14]);
  const isStraight =
    sortedValues.length === 5 &&
    (isWheel || sortedValues.every((value, index) => index === 0 || value - sortedValues[index - 1] === 1));

  const hasRoyal = ["10", "J", "Q", "K", "A"].every((rank) => ranks.includes(rank as Rank));

  if (isFlush && hasRoyal) return { rankName: "Royal Flush", multiplier: PAYOUTS.royal_flush };
  if (isFlush && isStraight) return { rankName: "Straight Flush", multiplier: PAYOUTS.straight_flush };
  if (values[0] === 4) return { rankName: "4 of a Kind", multiplier: PAYOUTS.four_kind };
  if (values[0] === 3 && values[1] === 2) return { rankName: "Full House", multiplier: PAYOUTS.full_house };
  if (isFlush) return { rankName: "Flush", multiplier: PAYOUTS.flush };
  if (isStraight) return { rankName: "Straight", multiplier: PAYOUTS.straight };
  if (values[0] === 3) return { rankName: "3 of a Kind", multiplier: PAYOUTS.three_kind };
  if (values[0] === 2 && values[1] === 2) return { rankName: "2 Pair", multiplier: PAYOUTS.two_pair };

  const pairRank = Object.entries(counts).find(([, count]) => count === 2)?.[0] as Rank | undefined;
  if (pairRank && ["J", "Q", "K", "A"].includes(pairRank)) {
    return { rankName: "Pair of Jacks+", multiplier: PAYOUTS.jacks_pair };
  }

  return { rankName: "No Win", multiplier: 0 };
};

const CardView = ({ card, held, onClick }: { card: Card; held: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`aspect-[2/3] rounded-lg border p-2 text-left bg-white ${held ? "ring-2 ring-primary-500" : ""}`}
  >
    <div className={`text-xs ${card.suit === "Hearts" || card.suit === "Diamonds" ? "text-danger-500" : "text-black"}`}>{card.rank}</div>
    <div className={`text-xl mt-4 ${card.suit === "Hearts" || card.suit === "Diamonds" ? "text-danger-500" : "text-black"}`}>
      {card.suit === "Hearts" && "♥"}
      {card.suit === "Diamonds" && "♦"}
      {card.suit === "Clubs" && "♣"}
      {card.suit === "Spades" && "♠"}
    </div>
    {held ? <div className="mt-4 text-[10px] text-primary-600">HELD</div> : null}
  </button>
);

const VideoPokerPage = () => {
  const [balance, setBalance] = useState<number>(getStoredBalance());
  const [betAmount, setBetAmount] = useState<string>("100");
  const [deck, setDeck] = useState<Card[]>([]);
  const [hand, setHand] = useState<Card[]>([]);
  const [held, setHeld] = useState<number[]>([]);
  const [drawPhase, setDrawPhase] = useState(false);
  const [status, setStatus] = useState("Place your bet and deal cards.");

  const bet = useMemo(() => Number(betAmount), [betAmount]);

  const refreshBalance = () => setBalance(getStoredBalance());

  const toggleHold = (index: number) => {
    if (!drawPhase) return;
    setHeld((prev) => (prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index]));
  };

  const deal = () => {
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

    const nextDeck = createDeck();
    const nextHand = nextDeck.slice(0, 5);
    setDeck(nextDeck.slice(5));
    setHand(nextHand);
    setHeld([]);
    setDrawPhase(true);
    setStatus("Select cards to hold, then draw.");
    refreshBalance();
  };

  const draw = () => {
    if (!drawPhase || hand.length !== 5) {
      return;
    }

    const nextDeck = [...deck];
    const nextHand = hand.map((card, index) => {
      if (held.includes(index)) return card;
      const replacement = nextDeck.shift();
      return replacement ?? card;
    });

    setHand(nextHand);
    setDeck(nextDeck);
    setDrawPhase(false);

    const result = evaluateHand(nextHand);
    if (result.multiplier > 0) {
      const payout = Number((bet * result.multiplier).toFixed(2));
      adjustStoredBalance(payout);
      setStatus(`${result.rankName}! Payout ${formatPeso(payout)}.`);
    } else {
      setStatus("No winning hand this round.");
    }

    refreshBalance();
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-white space-y-6">
        <div className="rounded-xl border border-white/10 bg-black/50 p-5">
          <h1 className="text-3xl">BETOKPH Video Poker</h1>
          <p className="text-white/70 mt-2">Deal, hold cards, draw once, and win based on poker ranking.</p>
          <div className="mt-4 text-sm">Balance: <span className="text-success-400">{formatPeso(balance)}</span></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4 lg:col-span-1">
            <Input label="Bet Amount (PHP)" type="number" min={1} value={betAmount} onValueChange={setBetAmount} />
            <Button color="primary" onPress={deal} isDisabled={drawPhase}>Deal</Button>
            <Button color="success" onPress={draw} isDisabled={!drawPhase}>Draw</Button>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/50 p-5 lg:col-span-3">
            {hand.length === 5 ? (
              <div className="grid grid-cols-5 gap-3">
                {hand.map((card, index) => (
                  <CardView key={`${card.rank}-${card.suit}-${index}`} card={card} held={held.includes(index)} onClick={() => toggleHold(index)} />
                ))}
              </div>
            ) : (
              <div className="min-h-[180px] flex items-center justify-center text-white/60">No cards dealt yet.</div>
            )}
          </div>
        </div>

        <p className="text-sm text-warning-200">{status}</p>
      </div>
    </Layout>
  );
};

export default VideoPokerPage;