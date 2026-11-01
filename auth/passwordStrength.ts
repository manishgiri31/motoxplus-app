// Client-side strength check for the reset-password screen. The server only
// requires 8+ characters (docs/api.md §12); this is a UX gate on top of that so
// "12345678" or "aaaaaaaa" can't be chosen by accident. It never loosens the
// zod schema in ./validation, which still runs on submit.

export type PasswordStrengthLevel = 0 | 1 | 2 | 3;

export interface PasswordStrength {
  /** 0 empty, 1 weak, 2 fair, 3 strong: how many meter segments to fill. */
  level: PasswordStrengthLevel;
  label: '' | 'Too short' | 'Weak' | 'Fair' | 'Strong';
  /** Strong enough to submit: Fair or better. */
  ok: boolean;
}

const CLASSES = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/];

export function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { level: 0, label: '', ok: false };
  if (password.length < 8) return { level: 1, label: 'Too short', ok: false };

  const classes = CLASSES.filter((re) => re.test(password)).length;
  if (classes < 2) return { level: 1, label: 'Weak', ok: false };

  const strong = (password.length >= 12 && classes >= 3) || (password.length >= 10 && classes === 4);
  return strong ? { level: 3, label: 'Strong', ok: true } : { level: 2, label: 'Fair', ok: true };
}
