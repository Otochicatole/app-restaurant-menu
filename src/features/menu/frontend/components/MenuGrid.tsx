import type {GroupWithProducts} from "../utils/layout";
import {chunkBy4, distribute} from "../utils/layout";
import {MenuSectionLeft} from "./MenuSectionLeft";
import {MenuSectionMid} from "@/features/menu/frontend/components/MenuSectionMid";
import {MenuSectionRight} from "@/features/menu/frontend/components/MenuSectionRight";

interface MenuGridProps {
    sections: GroupWithProducts[];
}

export function MenuGrid({sections}: MenuGridProps) {
    const rows = chunkBy4(sections);

    return (
        <>
            {rows.map((row, rowIdx) => {
                const {col1, col2, col3} = distribute(row);
                return (
                    <section
                        key={rowIdx}
                        className="min-h-dvh w-full border-b border-primary/10 flex flex-col p-3 md:p-10 snap-start "
                    >
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start mt-10 sm:mt-15 xl:mt-20 min-h-[80vh]">
                            <div className="flex flex-col h-full">
                                {col1.map((group) => (
                                    <MenuSectionLeft key={group.name} group={group}/>
                                ))}
                            </div>
                            <div className="flex flex-col h-full">
                                {col2.map((group) => (
                                    <MenuSectionMid key={group.name} group={group}/>
                                ))}
                            </div>
                            <div className="flex flex-col h-full">
                                {col3.map((group) => (
                                    <MenuSectionRight key={group.name} group={group}/>
                                ))}
                            </div>
                        </div>
                    </section>
                );
            })}
        </>
    );
}
