/**
 * Financial prototype helpers using integer centavos/cents.
 * Production multi-currency ledger must use a currency-specific minor-unit policy
 * and server-side decimal for quantities, splits, precision FX and percentage returns.
 */
export type Currency = 'BRL' | 'USD';
export type Money = { minor: bigint; currency: Currency };

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('Currency mismatch');
  return { minor: a.minor - b.minor, currency: a.currency };
}

/** Converts integer cents with quoted BRL-per-USD rate stored as micro BRL / USD.
 * Half-up rounding for nonnegative amounts. Production needs declared rounding rules.
 */
export function usdToBrl(usdCents: bigint, brlPerUsdMicro: bigint): bigint {
  if (usdCents < 0n || brlPerUsdMicro <= 0n) throw new Error('Invalid amount/rate');
  return (usdCents * brlPerUsdMicro + 500_000n) / 1_000_000n;
}

export function allocationBasisPoints(assetMinor: bigint, totalMinor: bigint): bigint {
  if (assetMinor < 0n || totalMinor <= 0n || assetMinor > totalMinor) throw new Error('Invalid allocation');
  return (assetMinor * 10_000n + totalMinor / 2n) / totalMinor;
}
