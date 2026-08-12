import type {GroupWithProducts} from "../utils/layout";
import {chunkBy4, distribute} from "../utils/layout";
import {MenuSectionLeft} from "./MenuSectionLeft";
import {MenuSectionMid} from "@/features/menu/frontend/components/MenuSectionMid";
import {MenuSectionRight} from "@/features/menu/frontend/components/MenuSectionRight";
import {FooterDivider} from "./Footer-divider";
import type {FeaturedProductDTO} from "@/features/featured-products/frontend/types";

interface MenuGridProps {
    sections: GroupWithProducts[];
    featured: (FeaturedProductDTO | null)[];
}

export function MenuGrid({sections, featured}: MenuGridProps) {
    const rows = chunkBy4(sections);

    return (
        <>
            {rows.map((row, rowIdx) => {
                const {col1, col2, col3} = distribute(row);
                return (
                    <section
                        key={rowIdx}
                        className="min-h-dvh relative w-full z-50 flex flex-col p-3 md:p-10 snap-start"
                    >
                        <div className="grid z-10 mb-30 grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-10 sm:mt-15 xl:mt-20 min-h-[80vh]">
                            <div className="flex flex-col h-full">
                                {col1.map((group) => (
                                    <MenuSectionLeft key={group.name} group={group}/>
                                ))}
                            </div>
                            <div className="flex flex-col h-full">
                                {col2.map((group) => (
                                    <MenuSectionMid key={group.name} group={group} featured={featured}/>
                                ))}
                            </div>
                            <div className="flex flex-col h-full">
                                {col3.map((group) => (
                                    <MenuSectionRight key={group.name} group={group}/>
                                ))}
                            </div>
                        </div>
                            <FooterDivider />
                    </section>
                );
            })}
        </>
    );
}
