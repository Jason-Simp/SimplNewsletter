import Image from "next/image";

import { buildTwoColumnRenderModel, type TwoColumnStoryRow } from "@/lib/newsletter-render-model";
import type { Channel, NewsletterDocument, NewsletterSection } from "@/types/newsletter";

type Props = {
  document: NewsletterDocument;
  channel: Channel;
  onChannelChange: (channel: Channel) => void;
  chrome?: "editor" | "public";
};

type HeroContent = {
  eyebrow: string;
  headline: string;
  body: string;
  stats: { label: string; value: string }[];
  heroImage: string;
};
type CalendarContent = { items: { date: string; detail: string }[] };

const channels: Channel[] = ["web", "pdf"];

function getSection<T>(sections: NewsletterSection[], type: NewsletterSection["type"]) {
  return sections.find((section) => section.type === type && section.enabled) as NewsletterSection<T> | undefined;
}

export function NewsletterPreview({
  document,
  channel,
  onChannelChange,
  chrome = "editor"
}: Props) {
  const showEditorChrome = chrome === "editor";
  const hero = getSection<HeroContent>(document.sections, "hero");
  const calendar = getSection<CalendarContent>(document.sections, "calendar_snapshot");
  const previewData = buildTwoColumnRenderModel(document);

  return (
    <section className="rounded-editorial border border-slate-200 bg-white p-4 shadow-editorial lg:p-6">
      {showEditorChrome ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-secondary">Preview</p>
            <h2 className="font-display text-3xl text-brand-navy">{channel.toUpperCase()} preview</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-brand-muted">
              This version now follows the strict two-column template you provided: full-width header, alternating
              image and article rows, a full-width calendar near the bottom, and a simple two-column footer.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {channels.map((nextChannel) => (
              <button
                key={nextChannel}
                className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.12em] ${
                  channel === nextChannel ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-700"
                }`}
                onClick={() => onChannelChange(nextChannel)}
                type="button"
              >
                {nextChannel}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={`mx-auto max-w-[900px] overflow-hidden rounded-[28px] border border-slate-200 ${
          channel === "pdf"
            ? "bg-white shadow-none"
            : "bg-[#f4f4f2] shadow-[0_12px_30px_rgba(0,0,0,0.12)]"
        }`}
      >
        <header
          className="relative min-h-[190px] px-6 py-6 lg:px-8"
          style={{
            backgroundImage: previewData.header.backgroundImage
              ? `linear-gradient(rgba(15,39,69,0.08), rgba(15,39,69,0.08)), url(${previewData.header.backgroundImage})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="max-w-[74%] bg-white/95 px-5 py-4 shadow-[0_2px_0_rgba(0,0,0,0.08)] max-md:max-w-full">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-20 items-center justify-center overflow-hidden rounded-md bg-white">
                <Image
                  alt={`${document.organization.name} logo`}
                  className="h-9 w-auto object-contain"
                  height={36}
                  src={document.organization.logoUrl}
                  width={96}
                />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: document.organization.colors.secondary }}>
                {previewData.header.kicker}
              </div>
            </div>
            <h1 className="mt-3 font-display text-[28px] leading-[1.15] text-brand-text">
              {previewData.header.title}
            </h1>
            <p className="mt-2 text-[13px] leading-[1.45] text-slate-700">{previewData.header.body}</p>
            {hero?.content.stats?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {hero.content.stats.slice(0, 3).map((stat) => (
                  <div
                    key={`${stat.label}-${stat.value}`}
                    className="rounded-full px-3 py-2 text-[11px] font-semibold"
                    style={{
                      backgroundColor: "rgba(15,45,77,0.08)",
                      color: document.organization.colors.primary
                    }}
                  >
                    {stat.value}
                    {stat.label ? ` • ${stat.label}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <section>
          {previewData.rows.map((row, index) => (
            <TemplateRow key={row.id} row={row} reverse={index % 2 === 1} />
          ))}
        </section>

        {calendar?.content.items.length ? (
          <section className="bg-[#fafafa] px-7 py-7">
            <div
              className="mb-5 text-[14px] font-bold uppercase tracking-[0.22em]"
              style={{ color: document.organization.colors.secondary }}
            >
              {previewData.calendar.title}
            </div>
            <div className="grid gap-3">
              {previewData.calendar.items.map((item) => (
                <div
                  key={`${item.label}-${item.text}`}
                  className="grid grid-cols-[90px_minmax(0,1fr)] items-center gap-4 rounded-[16px] bg-[#eef1f5] p-3"
                >
                  <div className="rounded-[14px] bg-white px-3 py-3 text-center text-sm font-bold leading-[1.2] text-brand-text">
                    {item.label}
                  </div>
                  <div className="text-sm text-[#566275]">{item.text}</div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="grid gap-6 bg-[#0f2d4d] px-8 py-8 text-white md:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <h3 className="text-lg font-semibold">{previewData.footer.schoolName}</h3>
            {previewData.footer.address ? <p className="mt-3 leading-[1.4]">{previewData.footer.address}</p> : null}
            {previewData.footer.phone ? <p className="leading-[1.4]">{previewData.footer.phone}</p> : null}
            {previewData.footer.email ? <p className="leading-[1.4]">{previewData.footer.email}</p> : null}
          </div>
          <div className="self-center rounded-[20px] bg-white/10 px-5 py-5">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
              {previewData.footer.ctaTitle}
            </div>
            <p className="m-0 leading-[1.45] text-white/90">{previewData.footer.ctaBody}</p>
          </div>
        </footer>
      </div>
    </section>
  );
}

function TemplateRow({ row, reverse }: { row: TwoColumnStoryRow; reverse: boolean }) {
  return (
    <div className="grid min-h-[300px] md:grid-cols-2">
      <div className={reverse ? "order-2" : ""}>
        {reverse ? (
          <ArticleCell row={row} />
        ) : (
          <ImageCell imageUrl={row.imageUrl} alt={row.imageAlt} />
        )}
      </div>
      <div className={reverse ? "order-1" : ""}>
        {reverse ? (
          <ImageCell imageUrl={row.imageUrl} alt={row.imageAlt} />
        ) : (
          <ArticleCell row={row} />
        )}
      </div>
    </div>
  );
}

function ImageCell({ imageUrl, alt }: { imageUrl?: string; alt: string }) {
  return (
    <div className="flex items-center justify-center bg-[#f4f4f2] p-9">
      {imageUrl ? (
        <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-[#d9d9d9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={alt} className="h-full w-full object-contain" src={imageUrl} />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center border border-dashed border-slate-300 bg-[#e6e6e6] text-sm font-medium uppercase tracking-[0.18em] text-slate-500">
          Image placeholder
        </div>
      )}
    </div>
  );
}

function ArticleCell({ row }: { row: TwoColumnStoryRow }) {
  return (
    <div className="flex items-center justify-center bg-[#f4f4f2] p-9">
      <article className="w-full rounded-[16px] bg-white px-5 py-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
        {row.kicker ? (
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-brand-secondary">
            {row.kicker}
          </div>
        ) : null}
        <h2 className="m-0 font-display text-[28px] leading-[1.15] text-brand-text">{row.title}</h2>
        <p className="mt-3 text-[13px] leading-[1.6] text-[#404040]">{row.body}</p>
        {row.buttonText ? (
          <a
            className="mt-4 inline-block rounded-full bg-[#224a7d] px-4 py-2 text-xs font-bold text-white no-underline"
            href={row.buttonUrl || "#"}
          >
            {row.buttonText}
          </a>
        ) : null}
      </article>
    </div>
  );
}
