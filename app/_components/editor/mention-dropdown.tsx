import { forwardRef, useEffect, useRef } from "react";

import { type MentionEntity } from "./editor-utils";

interface MentionDropdownProps {
  activeIndex: number;
  items: MentionEntity[];
  onHover: (index: number) => void;
  onSelect: (item: MentionEntity) => void;
}

function getTypeClasses(type: MentionEntity["type"]) {
  if (type === "TASK") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
}

function getGroupedItems(items: MentionEntity[]) {
  const tasks = items.filter((item) => item.type === "TASK");
  const documents = items.filter((item) => item.type === "DOCUMENT");

  return [
    { label: "Tasks", items: tasks },
    { label: "Documents", items: documents },
  ].filter((group) => group.items.length > 0);
}

const MentionDropdown = forwardRef<HTMLDivElement, MentionDropdownProps>(
  function MentionDropdown({ activeIndex, items, onHover, onSelect }, ref) {
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const groupedItems = getGroupedItems(items);

    useEffect(() => {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }, [activeIndex]);

    return (
      <div
        ref={ref}
        onMouseDown={(event) => event.preventDefault()}
        className="absolute left-6 top-24 z-50 w-[22rem] overflow-hidden rounded-[0.9rem] border border-[#dde3ef] bg-[#fbfcff]/98 shadow-[0_20px_50px_rgba(52,64,95,0.12)] backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-[#eef1f6] px-4 py-3">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[#9aa1b2]">
              Mentions
            </p>
            <p className="mt-1 text-sm font-medium text-[#303646]">
              Pick with arrows and press enter
            </p>
          </div>
          <div className="rounded-full bg-[#f4f6fa] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#7c8394]">
            {items.length}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {items.length ? (
            groupedItems.map((group) => (
              <div key={group.label} className="pb-1 last:pb-0">
                <p className="px-3 pb-2 pt-1 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#98a0b1]">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const index = items.findIndex(
                    (candidate) =>
                      candidate.id === item.id && candidate.type === item.type,
                  );
                  const isActive = index === activeIndex;

                  return (
                    <button
                      key={`${item.type}-${item.id}`}
                      ref={(node) => {
                        itemRefs.current[index] = node;
                      }}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                        isActive
                          ? "bg-[#eef4ff] text-[#20304f] ring-1 ring-[#c8d8fb]"
                          : "bg-transparent text-[#252a37] hover:bg-[#f5f7fb]"
                      }`}
                      onClick={() => onSelect(item)}
                      onMouseEnter={() => onHover(index)}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.label}</p>
                        <p
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] ${
                            isActive
                              ? item.type === "TASK"
                                ? "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"
                              : getTypeClasses(item.type)
                          }`}
                        >
                          {item.type}
                        </p>
                      </div>
                      <span
                        className={`ml-4 text-xs font-medium ${
                          isActive ? "text-[#6f81a8]" : "text-[#9aa1b2]"
                        }`}
                      >
                        Enter
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-[#f6f7fb] px-4 py-6 text-sm text-[#6d7484]">
              No matching entities found.
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default MentionDropdown;
