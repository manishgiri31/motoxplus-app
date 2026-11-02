// Port of motoxplus-web src/lib/auth/password-policy.ts (evaluatePassword) so
// the signup checklist promises exactly what the server enforces: 8+
// characters with an upper-case letter, a lower-case letter and a number, and
// at most 72 bytes (bcrypt ignores everything past that).

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export interface PasswordRule {
  id: 'length' | 'upper' | 'lower' | 'digit';
  label: string;
  met: boolean;
}

export interface PasswordEvaluation {
  rules: PasswordRule[];
  /** Every hard rule met (length, upper, lower, digit). */
  meetsRules: boolean;
  /** 0 = nothing typed, 1 = weak, 2 = fair, 3 = good, 4 = strong. */
  score: 0 | 1 | 2 | 3 | 4;
  label: '' | 'Weak' | 'Fair' | 'Good' | 'Strong';
}

// The handful of passwords that satisfy the rules and are still the first
// things any guesser tries.
const COMMON_PASSWORDS = new Set([
  'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  'qwerty123', 'qwerty1234', 'qwertyuiop1', '1qaz2wsx', 'abcd1234', 'abc12345', 'abcd@1234',
  'welcome1', 'welcome123', 'admin123', 'admin@123', 'admin1234', 'letmein123', 'iloveyou1',
  'india123', 'india@123', 'india1234', 'dealer123', 'dealer@123', '12345678', '123456789', '1234567890',
]);

function isGuessable(password: string): boolean {
  const lower = password.toLowerCase();
  return COMMON_PASSWORDS.has(lower) || lower.includes('motoxplus');
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

export function evaluatePassword(password: string): PasswordEvaluation {
  const rules: PasswordRule[] = [
    { id: 'length', label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'digit', label: 'One number', met: /\d/.test(password) },
  ];
  const meetsRules = rules.every((r) => r.met);

  let score: PasswordEvaluation['score'] = 0;
  if (password.length > 0) {
    const metCount = rules.filter((r) => r.met).length;
    if (!meetsRules) score = metCount >= 3 ? 2 : 1;
    else if (password.length >= 12 && /[^A-Za-z0-9]/.test(password)) score = 4;
    else if (password.length >= 12 || /[^A-Za-z0-9]/.test(password)) score = 3;
    else score = 2;
    if (isGuessable(password)) score = 1;
  }
  return { rules, meetsRules, score, label: LABELS[score] };
}

/** UTF-8 byte length, the unit the 72-byte cap is measured in. */
export function passwordByteLength(password: string): number {
  let bytes = 0;
  for (const ch of password) {
    const cp = ch.codePointAt(0) ?? 0;
    bytes += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return bytes;
}
