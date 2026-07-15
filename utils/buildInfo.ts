// Bumped by hand whenever we need to prove a specific JS bundle is the one
// actually running on a device (Metro/Expo Go cache debugging) — see the
// login "hasResponse: false" investigation. Not meant to stay in the app
// long-term.
export const BUILD_DATE = '2026-07-15';
export const BUILD_ID = '80fdf637-27ec-4cef-9001-eab031cf5d66';

export function logBuildInfo() {
  // eslint-disable-next-line no-console
  console.log('MOTOXPLUS BUILD', BUILD_DATE, BUILD_ID, Date.now());
}
