export function isAuthBypassed() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true"
  );
}
