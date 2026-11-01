// Shows enough of an email / mobile number for the dealer to recognise it,
// without printing the whole thing on a screen that may be photographed.
//   ma•••@gmail.com
//   +91 ••••••3210
export function maskContact(value: string, isMobile: boolean): string {
  const v = value.trim();
  if (isMobile) return `+91 ${'•'.repeat(Math.max(v.length - 4, 0))}${v.slice(-4)}`;

  const at = v.lastIndexOf('@');
  if (at < 1) return v;
  const local = v.slice(0, at);
  const visible = local.slice(0, local.length > 2 ? 2 : 1);
  return `${visible}•••${v.slice(at)}`;
}
