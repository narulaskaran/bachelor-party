import { TripNotFound } from "@/components/trip-not-found";

// Without this file, notFound() serves Next's unbranded error fallback
// (`html id="__next_error__"`, "404: This page could not be found.").
export default function NotFound() {
  return <TripNotFound />;
}
