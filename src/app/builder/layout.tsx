import { BuilderGuard } from "@/components/newsletter/BuilderGuard";

export default function BuilderLayout({ children }: { children: React.ReactNode }) {
  return <BuilderGuard>{children}</BuilderGuard>;
}
