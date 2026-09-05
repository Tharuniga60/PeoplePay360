import { Parser } from 'expr-eval';
import type { SalaryRule } from '@/db/schema';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface EvaluationContext {
  // Contract data
  contract: {
    wage: number;
  };
  // Time metrics
  worked_days: number;
  planned_days: number;
  worked_hours: number;
  planned_hours: number;
  overtime_hours: number;
  loss_of_pay_days: number;
  // Category accumulators (updated after each rule)
  categories: {
    BASIC: number;
    ALW: number;
    GROSS: number;
    DED: number;
    NET: number;
    OTHER: number;
  };
}

export interface CalculationTrace {
  ruleCode: string;
  ruleName: string;
  sequence: number;
  category: string;
  formula: string;
  conditionExpression: string;
  conditionResult: boolean;
  resolvedVariables: Record<string, number | object>;
  computedAmount: number;
  skipped: boolean;
  skipReason?: string;
}

export interface EvaluatedLine {
  salaryRuleId: string;
  sequence: number;
  code: string;
  name: string;
  category: string;
  amount: number;
  calculationTrace: CalculationTrace;
}

// ─────────────────────────────────────────────
// SANDBOXED EXPR-EVAL PARSER
// Strictly NO eval() or new Function()
// ─────────────────────────────────────────────

const parser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    in: false,
    assignment: false,
  },
});

function flattenContext(ctx: EvaluationContext): Record<string, number> {
  return {
    // Contract
    'contract.wage': ctx.contract.wage,
    // Time
    worked_days: ctx.worked_days,
    planned_days: ctx.planned_days,
    worked_hours: ctx.worked_hours,
    planned_hours: ctx.planned_hours,
    overtime_hours: ctx.overtime_hours,
    loss_of_pay_days: ctx.loss_of_pay_days,
    // Category totals (camelCase and dot-notation aliases)
    'categories.BASIC': ctx.categories.BASIC,
    'categories.ALW': ctx.categories.ALW,
    'categories.GROSS': ctx.categories.GROSS,
    'categories.DED': ctx.categories.DED,
    'categories.NET': ctx.categories.NET,
    'categories.OTHER': ctx.categories.OTHER,
    // Flat aliases for convenience in formulas
    BASIC: ctx.categories.BASIC,
    ALW: ctx.categories.ALW,
    GROSS: ctx.categories.GROSS,
    DED: ctx.categories.DED,
  };
}

function safeEvaluate(expression: string, variables: Record<string, number>): number {
  try {
    const expr = parser.parse(expression);
    const result = expr.evaluate(variables);
    if (typeof result !== 'number' || !isFinite(result)) return 0;
    return Math.round(result * 100) / 100; // 2dp rounding
  } catch {
    return 0;
  }
}

function safeEvaluateBoolean(expression: string, variables: Record<string, number>): boolean {
  if (!expression || expression.trim() === 'true') return true;
  try {
    const expr = parser.parse(expression);
    const result = expr.evaluate(variables);
    return Boolean(result);
  } catch {
    return true; // default to run the rule if condition is broken
  }
}

// ─────────────────────────────────────────────
// RULE EVALUATOR
// Processes rules in strictly ascending sequence order
// ─────────────────────────────────────────────

export function evaluateRules(
  rules: SalaryRule[],
  context: EvaluationContext
): EvaluatedLine[] {
  // Sort ascending by sequence — this is critical for cumulative categories
  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);

  const lines: EvaluatedLine[] = [];
  const mutableCtx = structuredClone(context);

  for (const rule of sortedRules) {
    if (!rule.isActive) continue;

    const flatVars = flattenContext(mutableCtx);

    // Evaluate condition
    const conditionResult = safeEvaluateBoolean(
      rule.conditionExpression ?? 'true',
      flatVars
    );

    if (!conditionResult) {
      lines.push({
        salaryRuleId: rule.id,
        sequence: rule.sequence,
        code: rule.code,
        name: rule.name,
        category: rule.category,
        amount: 0,
        calculationTrace: {
          ruleCode: rule.code,
          ruleName: rule.name,
          sequence: rule.sequence,
          category: rule.category,
          formula: rule.formulaExpression,
          conditionExpression: rule.conditionExpression ?? 'true',
          conditionResult: false,
          resolvedVariables: flatVars,
          computedAmount: 0,
          skipped: true,
          skipReason: 'Condition evaluated to false',
        },
      });
      continue;
    }

    // Evaluate formula
    const amount = safeEvaluate(rule.formulaExpression, flatVars);

    // Accumulate into category totals BEFORE the next rule
    switch (rule.category) {
      case 'BASIC':
        mutableCtx.categories.BASIC += amount;
        break;
      case 'ALW':
        mutableCtx.categories.ALW += amount;
        break;
      case 'GROSS':
        // GROSS is typically a roll-up, set not add
        mutableCtx.categories.GROSS = amount;
        break;
      case 'DED':
        mutableCtx.categories.DED += amount;
        break;
      case 'NET':
        // NET is typically final, set not add
        mutableCtx.categories.NET = amount;
        break;
      case 'OTHER':
        mutableCtx.categories.OTHER += amount;
        break;
    }

    const trace: CalculationTrace = {
      ruleCode: rule.code,
      ruleName: rule.name,
      sequence: rule.sequence,
      category: rule.category,
      formula: rule.formulaExpression,
      conditionExpression: rule.conditionExpression ?? 'true',
      conditionResult: true,
      resolvedVariables: flatVars,
      computedAmount: amount,
      skipped: false,
    };

    lines.push({
      salaryRuleId: rule.id,
      sequence: rule.sequence,
      code: rule.code,
      name: rule.name,
      category: rule.category,
      amount,
      calculationTrace: trace,
    });
  }

  return lines;
}

// ─────────────────────────────────────────────
// CATEGORY TOTALS from evaluated lines
// ─────────────────────────────────────────────

export function computeCategoryTotals(lines: EvaluatedLine[]) {
  const totals = { BASIC: 0, ALW: 0, GROSS: 0, DED: 0, NET: 0 };

  for (const line of lines) {
    if (line.calculationTrace.skipped) continue;
    switch (line.category) {
      case 'BASIC': totals.BASIC += line.amount; break;
      case 'ALW': totals.ALW += line.amount; break;
      case 'GROSS': totals.GROSS = line.amount; break;
      case 'DED': totals.DED += line.amount; break;
      case 'NET': totals.NET = line.amount; break;
    }
  }

  return totals;
}
