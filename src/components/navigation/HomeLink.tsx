import Link from "next/link";

type HomeLinkProps = {
  className?: string;
  label?: string;
};

export function HomeLink({ className, label = "Home" }: HomeLinkProps) {
  return (
    <Link
      className={
        className ??
        "inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-white"
      }
      href="/"
    >
      {label}
    </Link>
  );
}
