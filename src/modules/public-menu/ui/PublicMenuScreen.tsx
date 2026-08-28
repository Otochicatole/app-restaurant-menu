import Image from "next/image";
import { Image as ImageIcon, Play } from "lucide-react";
import type { PublicMenuHighlight, PublicMenuSection, PublicMenuView } from "../contracts";
import { PublicMenuInteractions } from "./PublicMenuInteractions";

const HIGHLIGHT_COLORS = ["text-beige bg-primary", "bg-beige", "text-white bg-terracota"];

export function PublicMenuScreen({ menu }: { menu: PublicMenuView }) {
  const visibleSections = menu.sections.filter((section) => section.items.length > 0);
  const visibleHighlights = menu.highlights.filter(
    (highlight): highlight is PublicMenuHighlight => highlight !== null,
  );
  const searchItems = visibleSections.flatMap((section) =>
    section.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      groupName: section.name,
    })),
  );

  return (
    <>
      <main className="flex min-h-screen flex-col py-8">
        <MenuHeader title={menu.header.title} description={menu.header.description} />
        {visibleSections.length === 0 && visibleHighlights.length === 0 ? (
          <p className="py-16 text-center text-zinc-500">El menú todavía no tiene productos.</p>
        ) : (
          <MenuGrid sections={visibleSections} highlights={visibleHighlights} />
        )}
      </main>
      <PublicMenuInteractions items={searchItems} />
      <footer className="flex h-60 w-full items-center justify-center gap-3">
        <div className="w-full max-w-12.5 border border-primary/30 sm:max-w-full" />
        <div className="flex w-full items-center justify-center text-center">
          <p>Ingredientes reales. Opciones ricas y consistentes. Elegí lo que te hace bien.</p>
        </div>
        <div className="w-full max-w-12.5 border border-primary/30 sm:max-w-full" />
      </footer>
    </>
  );
}

function MenuHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="absolute top-0 flex w-full items-center justify-between">
      <section className="flex w-full items-center justify-center gap-1">
        <h2 className="hidden text-center font-serif text-[20px] font-bold text-primary/90 lg:block lg:text-[40px] xl:text-[60px]">Healthy</h2>
        <div className="flex opacity-90">
          <Image className="mt-1" src="/svgs/leaf-1.svg" alt="" width={40} height={40} />
          <Image className="-ml-1.5" src="/svgs/leaf-2.svg" alt="" width={40} height={40} />
        </div>
      </section>
      <section className="relative flex w-full flex-col">
        <Image className="absolute -left-14 top-3 -z-1 hidden scale-x-[-1] lg:block" src="/svgs/leaves-branch.svg" alt="" width={140} height={140} />
        <Image className="absolute -right-14 top-3 -z-1 hidden lg:block" src="/svgs/leaves-branch.svg" alt="" width={140} height={140} />
        <h1 className="text-center text-[40px] font-bold text-desert sm:text-[60px] xl:text-[90px]" style={{ fontFamily: "var(--font-menu-title)" }}>{title}</h1>
        <div className="-mt-6 hidden w-full items-center justify-center xl:flex">
          <div className="mx-5 mt-2 w-10 border border-desert" />
          <div className="mt-2 w-fit border-x-2 px-3 text-center font-mono text-md text-desert" style={{ fontFamily: "var(--font-menu-subtitle)" }}>{description}</div>
          <div className="mx-5 mt-2 w-10 border border-desert" />
        </div>
      </section>
      <section className="flex w-full items-center justify-center gap-6">
        <h2 className="hidden text-center font-serif text-[20px] font-bold text-primary/90 lg:block lg:text-[40px] xl:text-[60px]">Classic</h2>
        <Image className="rotate-12" src="/svgs/croissant.svg" alt="" width={90} height={90} />
      </section>
    </header>
  );
}

function MenuGrid({ sections, highlights }: { sections: PublicMenuSection[]; highlights: PublicMenuHighlight[] }) {
  const rows: PublicMenuSection[][] = [];
  for (let index = 0; index < sections.length; index += 4) rows.push(sections.slice(index, index + 4));

  return (
    <>
      {rows.map((row, rowIndex) => (
        <section key={row.map((section) => section.id).join(":")} className="relative z-50 flex min-h-dvh w-full snap-start flex-col p-3 md:p-10">
          <div className="z-10 mb-30 mt-10 grid min-h-[80vh] grid-cols-1 items-start gap-6 sm:mt-15 xl:mt-20 xl:grid-cols-3">
            <div className="flex h-full flex-col">{row.slice(0, 2).map((section) => <MenuSection key={section.id} section={section} />)}</div>
            <div className="flex h-full flex-col">
              {row[2] && <MenuSection section={row[2]} variant="center" />}
              {rowIndex === 0 && highlights.length > 0 && <HighlightsPanel highlights={highlights} />}
            </div>
            <div className="flex h-full flex-col">{row[3] && <MenuSection section={row[3]} />}</div>
          </div>
          <div className="h-px w-full bg-primary/20" />
        </section>
      ))}
      {rows.length === 0 && highlights.length > 0 && <HighlightsPanel highlights={highlights} />}
    </>
  );
}

function MenuSection({ section, variant = "side" }: { section: PublicMenuSection; variant?: "side" | "center" }) {
  return (
    <section className={variant === "center" ? "mt-10 h-full rounded-3xl border-x border-primary/10 px-3 py-6 pb-20" : "-mb-6 h-full pb-20"}>
      <header className="flex w-full flex-col rounded-b-lg rounded-t-2xl bg-primary px-6 p-3 text-white" style={{ fontFamily: "var(--font-menu-group)" }}>
        <h2 className="text-3xl font-bold tracking-widest">{section.name}</h2>
        {section.description && <p className="text-sm opacity-70">({section.description})</p>}
      </header>
      <ul className="-mt-3 flex h-full flex-col border-x border-primary/50 px-3 py-6">
        {section.items.map((item) => <MenuProductRow key={item.id} item={item} />)}
      </ul>
    </section>
  );
}

function MenuProductRow({ item }: { item: PublicMenuSection["items"][number] }) {
  const media = item.mediaUrl && item.mediaType;
  const content = (
    <>
      <p className="h-fit font-bold">${item.price.toFixed(2)}</p>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span>
          <span className="block text-md">{item.name}</span>
          {item.description && <span className="mt-1 block text-xs">({item.description})</span>}
        </span>
        {media && <span className="ml-auto shrink-0 opacity-70" aria-hidden="true">{item.mediaType === "video" ? <Play size={15} /> : <ImageIcon size={15} />}</span>}
      </span>
    </>
  );
  const classes = "flex w-full scroll-mt-8 items-center gap-6 border-b border-primary/20 px-4 py-2 text-left text-primary transition-colors duration-500";
  return (
    <li id={`product-${item.id}`} data-menu-product={item.id} style={{ fontFamily: "var(--font-menu-product)" }}>
      {media ? (
        <button type="button" className={`${classes} cursor-pointer`} data-menu-media data-media-name={item.name} data-media-url={item.mediaUrl!} data-media-type={item.mediaType!}>{content}</button>
      ) : <div className={classes}>{content}</div>}
    </li>
  );
}

function HighlightsPanel({ highlights }: { highlights: PublicMenuHighlight[] }) {
  return (
    <aside className="flex w-full border-primary/50 pr-6 lg:border-r" aria-label="Productos destacados">
      <div className="flex w-full flex-col gap-2 rounded-b-3xl rounded-r-3xl border border-primary/50 p-4">
        {highlights.map((highlight, index) => (
          <article key={highlight.product.id} className={`w-full rounded-xl border border-black/10 px-10 py-4 shadow-2xl sm:py-6 ${HIGHLIGHT_COLORS[index % HIGHLIGHT_COLORS.length]}`} style={{ fontFamily: "var(--font-menu-featured)" }}>
            <h2 className={`font-bold ${index === 0 ? "text-2xl sm:text-4xl" : "text-xl sm:text-3xl"}`}>{highlight.product.name}</h2>
            <p className="text-sm font-semibold sm:text-md">${highlight.product.price.toFixed(2)}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}
