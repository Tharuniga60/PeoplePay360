import { Parser } from 'expr-eval';

const STANDARD_VARIABLES = new Set([
  'wage',
  'contract_wage',
  'contract.wage',
  'worked_days',
  'planned_days',
  'worked_hours',
  'planned_hours',
  'overtime_hours',
  'loss_of_pay_days',
  'BASIC',
  'ALW',
  'GROSS',
  'DED',
  'NET',
  'OTHER',
  'categories.BASIC',
  'categories.ALW',
  'categories.GROSS',
  'categories.DED',
  'categories.NET',
  'categories.OTHER',
]);

const parser = new Parser({
  operators: {
    logical: true,
    comparison: true,
    in: false,
    assignment: false,
  },
});

export function normalizeFormula(expression: string): string {
  if (!expression) return '0';
  let expr = expression.trim();
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s*(?:of)?\s*([a-zA-Z0-9_.]+)/gi, '($1 / 100) * ($2)');
  expr = expr.replace(/rule\.([a-zA-Z0-9_]+)/g, '$1');
  return expr;
}

export interface FormulaValidationResult {
  valid: boolean;
  error?: string;
  variables: string[];
  testEvaluation?: number;
}

/**
 * Validate a formula expression for syntax correctness, circular references, and unknown variables.
 */
export function validateFormulaExpression(
  expression: string,
  ruleCode?: string,
  priorRuleCodes: string[] = []
): FormulaValidationResult {
  if (!expression || !expression.trim()) {
    return { valid: false, error: 'Formula expression cannot be empty', variables: [] };
  }

  const normalized = normalizeFormula(expression);

  let parsedExpr;
  try {
    parsedExpr = parser.parse(normalized);
  } catch (err: any) {
    return {
      valid: false,
      error: `Syntax error: ${err.message}`,
      variables: [],
    };
  }

  const vars = parsedExpr.variables();

  // 1. Circular reference check
  if (ruleCode && vars.includes(ruleCode)) {
    return {
      valid: false,
      error: `Circular reference: Rule '${ruleCode}' cannot reference its own code in its calculation formula`,
      variables: vars,
    };
  }

  // 2. Allowed variables check
  const allowedSet = new Set<string>();
  STANDARD_VARIABLES.forEach((v) => allowedSet.add(v));
  priorRuleCodes.forEach((c) => allowedSet.add(c));
  const unknownVars: string[] = [];

  for (const v of vars) {
    if (!allowedSet.has(v)) {
      // Check if it's a known Math function like min, max, round, abs
      const isMathFunc = ['min', 'max', 'round', 'ceil', 'floor', 'abs'].includes(v);
      if (!isMathFunc) {
        unknownVars.push(v);
      }
    }
  }

  // 3. Test execution against safe mock sandbox
  const mockScope: Record<string, number> = {
    wage: 50000,
    contract_wage: 50000,
    worked_days: 22,
    planned_days: 22,
    worked_hours: 176,
    planned_hours: 176,
    overtime_hours: 0,
    loss_of_pay_days: 0,
    BASIC: 25000,
    ALW: 10000,
    GROSS: 35000,
    DED: 3000,
    NET: 32000,
    OTHER: 0,
  };
  for (const code of priorRuleCodes) {
    mockScope[code] = 1000;
  }
  for (const unk of unknownVars) {
    mockScope[unk] = 100;
  }

  let testResult = 0;
  try {
    testResult = parsedExpr.evaluate(mockScope);
    if (isNaN(testResult) || !isFinite(testResult)) {
      return {
        valid: false,
        error: 'Evaluation resulted in NaN or Infinity (e.g. division by zero)',
        variables: vars,
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      error: `Evaluation error during test: ${err.message}`,
      variables: vars,
    };
  }

  return {
    valid: true,
    variables: vars,
    testEvaluation: Math.round(testResult * 100) / 100,
  };
}
