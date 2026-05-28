import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import { PATHS } from '@/lib/paths';

export const dynamic = 'force-dynamic';

type Paycheck = { date: string; grossPay: number; netPay: number; employer: string; notes: string };
type SavingsGoal = { name: string; target: number; current: number };
type FinancesData = {
  paychecks: Paycheck[];
  monthlyBudget: Record<string, number>;
  savingsGoal?: SavingsGoal;
  accounts: unknown[];
};

const DEFAULT_DATA: FinancesData = {
  paychecks: [],
  monthlyBudget: {},
  accounts: [],
};

function nextBiweeklyDate(lastDate: string): string {
  const d = new Date(lastDate + 'T00:00:00');
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function readData(): FinancesData {
  try {
    return JSON.parse(fs.readFileSync(PATHS.financesJson, 'utf-8')) as FinancesData;
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function writeData(data: FinancesData): void {
  fs.writeFileSync(PATHS.financesJson, JSON.stringify(data, null, 2), 'utf-8');
}

function buildResponse(raw: FinancesData) {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthNet = raw.paychecks
    .filter((p) => p.date.startsWith(ym))
    .reduce((sum, p) => sum + (p.netPay ?? 0), 0);

  const sorted = [...raw.paychecks].sort((a, b) => b.date.localeCompare(a.date));
  const lastPaycheck = sorted[0] ?? null;
  const nextPayDate = lastPaycheck ? nextBiweeklyDate(lastPaycheck.date) : null;

  const totalBudget = Object.values(raw.monthlyBudget).reduce((s, v) => s + v, 0);
  const budgetUsedPct = currentMonthNet > 0 && totalBudget > 0
    ? Math.min(100, Math.round((totalBudget / currentMonthNet) * 100))
    : 0;

  return {
    paychecks: sorted.slice(0, 6),
    monthlyBudget: raw.monthlyBudget,
    savingsGoal: raw.savingsGoal ?? null,
    currentMonthNet,
    nextPayDate,
    totalBudget,
    budgetUsedPct,
  };
}

export async function GET() {
  return NextResponse.json(buildResponse(readData()));
}

export async function PATCH(req: NextRequest) {
  let patch: Partial<FinancesData> & {
    addPaycheck?: Paycheck;
    removePaycheckDate?: string;
    savingsCurrent?: number;
  };
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const data = readData();

  if (patch.monthlyBudget) {
    data.monthlyBudget = { ...data.monthlyBudget, ...patch.monthlyBudget };
    // Remove zero-value keys to keep file clean
    Object.keys(data.monthlyBudget).forEach((k) => {
      if (!data.monthlyBudget[k] || data.monthlyBudget[k] < 0) delete data.monthlyBudget[k];
    });
  }

  if (patch.savingsGoal) {
    data.savingsGoal = { ...(data.savingsGoal ?? { name: 'Goal', target: 0, current: 0 }), ...patch.savingsGoal };
  }

  if (typeof patch.savingsCurrent === 'number' && data.savingsGoal) {
    data.savingsGoal.current = Math.max(0, patch.savingsCurrent);
  }

  if (patch.addPaycheck && patch.addPaycheck.date) {
    const existingIdx = data.paychecks.findIndex((p) => p.date === patch.addPaycheck!.date);
    if (existingIdx >= 0) {
      data.paychecks[existingIdx] = { ...data.paychecks[existingIdx], ...patch.addPaycheck };
    } else {
      data.paychecks.push(patch.addPaycheck);
    }
  }

  if (patch.removePaycheckDate) {
    data.paychecks = data.paychecks.filter((p) => p.date !== patch.removePaycheckDate);
  }

  writeData(data);
  return NextResponse.json(buildResponse(data));
}
