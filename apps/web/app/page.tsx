import { redirect } from "next/navigation";

// Root route — redirect to the default locale dashboard.
// The next-intl middleware handles locale detection on real requests;
// this fallback ensures direct visits to "/" are never stranded.
export default function RootPage() {
  redirect("/fr/dashboard");
}
