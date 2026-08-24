import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim Your Beta Access | Valtriox",
  description: "Apply for invite-only beta access to Valtriox, a brand operations portal built in Pakistan.",
  robots: { index: false, follow: false },
};

export default function BetaClaimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
