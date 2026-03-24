export type TransactionChannel = "api" | "qr";
export type TransactionType = "deposit" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface GCashAccount {
  fullName: string;
  gcashNumber: string;
  updatedAt: string;
}

export interface GCashTransaction {
  id: string;
  reference: string;
  type: TransactionType;
  channel: TransactionChannel;
  status: TransactionStatus;
  amount: number;
  gcashNumber: string;
  createdAt: string;
  qrPayload?: string;
  qrImageUrl?: string;
}

const ACCOUNT_STORAGE_KEY = "betokph.gcash.account";
const HISTORY_STORAGE_KEY = "betokph.gcash.history";
const BALANCE_STORAGE_KEY = "betokph.player.balance";

const hasWindow = () => typeof window !== "undefined";

const safeRead = <T,>(key: string): T | null => {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const safeWrite = (key: string, value: unknown): void => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const sanitizeNumber = (value: string): string => value.replace(/\D/g, "");

export const isValidGcashNumber = (value: string): boolean => {
  const digits = sanitizeNumber(value);
  return /^09\d{9}$/.test(digits) || /^639\d{9}$/.test(digits);
};

const normalizeGcashNumber = (value: string): string => {
  const digits = sanitizeNumber(value);

  if (/^639\d{9}$/.test(digits)) {
    return `0${digits.slice(2)}`;
  }

  return digits;
};

const createReference = () => `GC${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

const appendHistory = (transaction: GCashTransaction): void => {
  const current = getStoredTransactions();
  safeWrite(HISTORY_STORAGE_KEY, [transaction, ...current]);
};

export const getStoredGcashAccount = (): GCashAccount | null => safeRead<GCashAccount>(ACCOUNT_STORAGE_KEY);

export const saveGcashAccount = (fullName: string, gcashNumber: string): GCashAccount => {
  const normalized = normalizeGcashNumber(gcashNumber);

  if (!fullName.trim()) {
    throw new Error("Full name is required.");
  }

  if (!isValidGcashNumber(normalized)) {
    throw new Error("Please enter a valid GCash number.");
  }

  const account: GCashAccount = {
    fullName: fullName.trim(),
    gcashNumber: normalized,
    updatedAt: new Date().toISOString(),
  };

  safeWrite(ACCOUNT_STORAGE_KEY, account);
  return account;
};

export const getStoredTransactions = (): GCashTransaction[] => safeRead<GCashTransaction[]>(HISTORY_STORAGE_KEY) ?? [];

export const getStoredBalance = (): number => {
  const value = safeRead<number>(BALANCE_STORAGE_KEY);
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const setStoredBalance = (amount: number): number => {
  const next = Number(amount.toFixed(2));
  safeWrite(BALANCE_STORAGE_KEY, next);
  return next;
};

export const adjustStoredBalance = (delta: number): number => {
  const current = getStoredBalance();
  const next = Number((current + delta).toFixed(2));

  if (next < 0) {
    throw new Error("Insufficient balance.");
  }

  return setStoredBalance(next);
};

const createTransaction = (
  type: TransactionType,
  channel: TransactionChannel,
  amount: number,
  gcashNumber: string,
  status: TransactionStatus
): GCashTransaction => {
  const reference = createReference();
  const transaction: GCashTransaction = {
    id: crypto.randomUUID(),
    reference,
    type,
    channel,
    status,
    amount: Number(amount.toFixed(2)),
    gcashNumber,
    createdAt: new Date().toISOString(),
  };

  if (channel === "qr") {
    const payload = `GCASH|${type.toUpperCase()}|${reference}|${transaction.amount.toFixed(2)}|${gcashNumber}`;
    transaction.qrPayload = payload;
    transaction.qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
  }

  return transaction;
};

const requireRegisteredAccount = (): GCashAccount => {
  const account = getStoredGcashAccount();
  if (!account) {
    throw new Error("Please register your GCash account first.");
  }
  return account;
};

const updateTransaction = (reference: string, status: TransactionStatus): GCashTransaction | null => {
  const history = getStoredTransactions();
  const next = history.map((item) => (item.reference === reference ? { ...item, status } : item));
  const updated = next.find((item) => item.reference === reference) ?? null;
  safeWrite(HISTORY_STORAGE_KEY, next);
  return updated;
};

export const createDeposit = (amount: number, channel: TransactionChannel): GCashTransaction => {
  const account = requireRegisteredAccount();

  if (!(amount > 0)) {
    throw new Error("Deposit amount must be greater than 0.");
  }

  const status: TransactionStatus = channel === "api" ? "completed" : "pending";
  const transaction = createTransaction("deposit", channel, amount, account.gcashNumber, status);
  appendHistory(transaction);

  if (status === "completed") {
    setStoredBalance(getStoredBalance() + transaction.amount);
  }

  return transaction;
};

export const confirmQrDeposit = (reference: string): GCashTransaction => {
  const history = getStoredTransactions();
  const target = history.find((item) => item.reference === reference);

  if (!target) {
    throw new Error("Transaction not found.");
  }

  if (target.type !== "deposit") {
    throw new Error("Only deposit transactions can be confirmed.");
  }

  if (target.status === "completed") {
    return target;
  }

  const updated = updateTransaction(reference, "completed");

  if (!updated) {
    throw new Error("Unable to update transaction.");
  }

  setStoredBalance(getStoredBalance() + updated.amount);
  return updated;
};

export const createDisbursement = (amount: number): GCashTransaction => {
  const account = requireRegisteredAccount();

  if (!(amount > 0)) {
    throw new Error("Withdrawal amount must be greater than 0.");
  }

  const currentBalance = getStoredBalance();
  if (amount > currentBalance) {
    throw new Error("Insufficient balance for disbursement.");
  }

  const transaction = createTransaction("withdrawal", "api", amount, account.gcashNumber, "completed");
  appendHistory(transaction);
  setStoredBalance(currentBalance - transaction.amount);
  return transaction;
};