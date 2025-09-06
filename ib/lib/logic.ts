export type Inputs = {
  kwhUsage: number;
  gjUsage: number;
  curKwh: number;
  curGj: number;
  elecAdmin: number;
  gasAdmin: number;
  promoKwh: number;
  regKwh: number;
  promoGj: number;
  regGj: number;
  ourElecAdmin: number;
  ourGasAdmin: number;
  gst: number;
};

export type Results = {
  currentTotal: number;
  projectedTotal: number;
  savings12m: number;
  savingsPerMonth: number;
  decision: "competitive" | "switch";
};

export function computeSavings(i: Inputs): Results {
  const {
    kwhUsage = 0, gjUsage = 0, curKwh = 0, curGj = 0,
    elecAdmin = 0, gasAdmin = 0,
    promoKwh = 0, regKwh = 0, promoGj = 0, regGj = 0,
    ourElecAdmin = 0, ourGasAdmin = 0, gst = 0.05,
  } = i;

  const currentBeforeGst = ((kwhUsage * curKwh) + (gjUsage * curGj) + elecAdmin + gasAdmin) * 12;
  const currentTotal = currentBeforeGst * (1 + gst);

  const promo3m = ((kwhUsage * promoKwh) + (gjUsage * promoGj) + ourElecAdmin + ourGasAdmin) * 3;
  const reg9m   = ((kwhUsage * regKwh)   + (gjUsage * regGj)   + ourElecAdmin + ourGasAdmin) * 9;
  const projectedTotal = (promo3m + reg9m) * (1 + gst);

  const savings12m = Math.max(currentTotal - projectedTotal, 0);
  const savingsPerMonth = savings12m / 12;
  const decision = savingsPerMonth < 5 ? "competitive" : "switch";

  return { currentTotal, projectedTotal, savings12m, savingsPerMonth, decision };
}
