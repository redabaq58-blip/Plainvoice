export function isAuthBypassed() {
  // Local development only. Production must never honor this public flag.
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
  );
}
