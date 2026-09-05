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

function normalizeFormula(expression: string): string {
  if (!expression) return '0';
  let expr = expression.trim();
  // Handle "X% of Y" -> "(X / 100) * (Y)"
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*([a-zA-Z0-9_.]+)/gi, '($1 / 100) * ($2)');
  // Handle "rule.CODE" -> "CODE"
  expr = expr.replace(/rule\.([a-zA-Z0-9_]+)/g, '$1');
  return expr;
}

function flattenContext(ctx: EvaluationContext, computedRuleCodes: Record<string, number> = {}): Record<string, number> {
  const vars: Record<string, number> = {
    // Contract
    'contract.wage': ctx.contract.wage,
    'contract_wage': ctx.contract.wage,
    wage: ctx.contract.wage,
    // Time
    worked_days: ctx.worked_days,
    planned_days: ctx.planned_days,
    worked_hours: ctx.worked_hours,
    planned_hours: ctx.planned_hours,
    overtime_hours: ctx.overtime_hours,
    loss_of_pay_days: ctx.loss_of_pay_days,
    // Category totals
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
    NET: ctx.categories.NET,
  };

  for (const [code, val] of Object.entries(computedRuleCodes)) {
    vars[code] = val;
    vars[`rule.${code}`] = val;
  }

  return vars;
}

function safeEvaluate(expression: string, variables: Record<string, number>): number {
  try {
    const normalized = normalizeFormula(expression);
    const expr = parser.parse(normalized);
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
    const normalized = normalizeFormula(expression);
    const expr = parser.parse(normalized);
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
  const computedRuleCodes: Record<string, number> = {};

  for (const rule of sortedRules) {
    if (!rule.isActive) continue;

    const flatVars = flattenContext(mutableCtx, computedRuleCodes);

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
    computedRuleCodes[rule.code] = amount;

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
