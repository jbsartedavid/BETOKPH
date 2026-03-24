"use client";

import {
  GCashAccount,
  GCashTransaction,
  TransactionChannel,
  confirmQrDeposit,
  createDeposit,
  createDisbursement,
  getStoredBalance,
  getStoredGcashAccount,
  getStoredTransactions,
  saveGcashAccount,
} from "@/util/gcash";
import Layout from "@/layout/layout";
import { Button, Input } from "@heroui/react";
import { useMemo, useState } from "react";

const formatPeso = (value: number): string =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(value);

const CashierPage = () => {
  const [account, setAccount] = useState<GCashAccount | null>(getStoredGcashAccount());
  const [history, setHistory] = useState<GCashTransaction[]>(getStoredTransactions());
  const [balance, setBalance] = useState<number>(getStoredBalance());

  const [fullName, setFullName] = useState(account?.fullName ?? "");
  const [gcashNumber, setGcashNumber] = useState(account?.gcashNumber ?? "");

  const [depositAmount, setDepositAmount] = useState("100");
  const [depositChannel, setDepositChannel] = useState<TransactionChannel>("api");
  const [withdrawAmount, setWithdrawAmount] = useState("100");
  const [activeQr, setActiveQr] = useState<GCashTransaction | null>(null);
  const [feedback, setFeedback] = useState<string>("");

  const pendingQrCount = useMemo(
    () => history.filter((item) => item.type === "deposit" && item.channel === "qr" && item.status === "pending").length,
    [history]
  );

  const refreshLedger = () => {
    setHistory(getStoredTransactions());
    setBalance(getStoredBalance());
    setAccount(getStoredGcashAccount());
  };

  const handleRegister = () => {
    try {
      const next = saveGcashAccount(fullName, gcashNumber);
      setAccount(next);
      setFeedback("GCash account saved successfully.");
      refreshLedger();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save account.");
    }
  };

  const handleDeposit = () => {
    try {
      const amount = Number(depositAmount);
      const transaction = createDeposit(amount, depositChannel);

      if (transaction.channel === "qr") {
        setActiveQr(transaction);
        setFeedback("QR generated. Scan and confirm payment.");
      } else {
        setActiveQr(null);
        setFeedback(`Deposit successful. Ref ${transaction.reference}`);
      }

      refreshLedger();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Deposit failed.");
    }
  };

  const handleConfirmQr = () => {
    if (!activeQr) {
      return;
    }

    try {
      const confirmed = confirmQrDeposit(activeQr.reference);
      setActiveQr(confirmed);
      setFeedback(`QR deposit confirmed. Ref ${confirmed.reference}`);
      refreshLedger();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to confirm QR deposit.");
    }
  };

  const handleWithdraw = () => {
    try {
      const amount = Number(withdrawAmount);
      const transaction = createDisbursement(amount);
      setFeedback(`Disbursement successful. Ref ${transaction.reference}`);
      refreshLedger();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Disbursement failed.");
    }
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl p-6 md:p-8 text-white space-y-6">
        <div className="bg-black/50 border border-white/10 rounded-xl p-5">
          <h1 className="text-3xl">GCash Cashier</h1>
          <p className="text-white/70 mt-2">Register your number, deposit via API or QR, and request GCash disbursement.</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="px-3 py-1 rounded bg-success-500/20 border border-success-500/40">Balance: {formatPeso(balance)}</span>
            <span className="px-3 py-1 rounded bg-primary-500/20 border border-primary-500/40">
              Account: {account ? account.gcashNumber : "Not Registered"}
            </span>
            <span className="px-3 py-1 rounded bg-warning-500/20 border border-warning-500/40">Pending QR: {pendingQrCount}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
            <h2 className="text-xl">1) Register GCash Number</h2>
            <Input label="Full Name" value={fullName} onValueChange={setFullName} placeholder="Juan Dela Cruz" />
            <Input
              label="GCash Number"
              value={gcashNumber}
              onValueChange={setGcashNumber}
              placeholder="09XXXXXXXXX"
              maxLength={13}
            />
            <Button color="primary" onPress={handleRegister}>Save Account</Button>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
            <h2 className="text-xl">2) Deposit (GCash API / QR)</h2>
            <Input label="Deposit Amount (PHP)" type="number" value={depositAmount} onValueChange={setDepositAmount} min={1} />

            <div className="flex gap-3">
              <Button color={depositChannel === "api" ? "primary" : "default"} onPress={() => setDepositChannel("api")}>
                GCash API
              </Button>
              <Button color={depositChannel === "qr" ? "primary" : "default"} onPress={() => setDepositChannel("qr")}>
                GCash QR
              </Button>
            </div>

            <Button color="success" onPress={handleDeposit}>Create Deposit</Button>

            {activeQr?.channel === "qr" && activeQr.qrImageUrl ? (
              <div className="border border-white/10 rounded-lg p-3 bg-black/40 space-y-2">
                <p className="text-sm text-white/70">Reference: {activeQr.reference}</p>
                <img src={activeQr.qrImageUrl} alt="GCash QR" className="w-44 h-44 rounded bg-white p-2" />
                <Button color="warning" onPress={handleConfirmQr}>Confirm QR Payment</Button>
              </div>
            ) : null}
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-4">
            <h2 className="text-xl">3) Disbursement (GCash Payout)</h2>
            <Input label="Withdrawal Amount (PHP)" type="number" value={withdrawAmount} onValueChange={setWithdrawAmount} min={1} />
            <Button color="danger" onPress={handleWithdraw}>Request Disbursement</Button>
          </div>

          <div className="bg-black/50 border border-white/10 rounded-xl p-5 space-y-3 max-h-[380px] overflow-auto">
            <h2 className="text-xl">4) Transaction History</h2>
            {history.length === 0 ? <p className="text-white/60">No transactions yet.</p> : null}
            {history.map((item) => (
              <div key={item.id} className="border border-white/10 rounded-lg p-3 text-sm space-y-1">
                <p>
                  {item.type === "deposit" ? "Deposit" : "Withdrawal"} • {item.channel.toUpperCase()} • {formatPeso(item.amount)}
                </p>
                <p className="text-white/70">Ref: {item.reference}</p>
                <p className="text-white/70">Status: {item.status}</p>
                <p className="text-white/60">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>

        {feedback ? <p className="text-sm text-warning-300">{feedback}</p> : null}
      </div>
    </Layout>
  );
};

export default CashierPage;