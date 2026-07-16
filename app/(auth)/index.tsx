import { Redirect } from 'expo-router';

// The (auth) group has no natural owner for the bare "/" path — login,
// forgot-password, and access-denied are all real screens with their own
// segment, none of them "/". Without this file, expo-router web resolves
// "/" by rendering login.tsx (correct) but, having no route that actually
// matches "/", rewrites the address bar to a different sibling screen's
// path instead of "/login" — a cosmetic but confusing desync between what's
// shown and what the URL bar says. An explicit index gives "/" a real
// owner and removes the ambiguity.
export default function AuthIndexRedirect() {
  return <Redirect href="/(auth)/login" />;
}
