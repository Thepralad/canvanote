/* Minimal inline icon set — keeps the app dependency-free. 1.6px strokes,
   currentColor, 18px default, matching the quiet Notion-ish chrome. */
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const CursorIcon = (p) => (
  <svg {...base} {...p}><path d="M5 3l6 16 2-6 6-2z" /></svg>
);
export const HandIcon = (p) => (
  <svg {...base} {...p}><path d="M9 11V5.5a1.5 1.5 0 013 0V11m0-1V4.5a1.5 1.5 0 013 0V11m0-.5V6.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-1.5a5 5 0 01-3.6-1.5L6 16.2c-.9-1-.5-2.3.7-2.6l1.3-.3V6.5a1.5 1.5 0 013 0" /></svg>
);
export const TextIcon = (p) => (
  <svg {...base} {...p}><path d="M5 6V5h14v1M12 5v14M9 19h6" /></svg>
);
export const SquareIcon = (p) => (
  <svg {...base} {...p}><rect x="4" y="5" width="16" height="14" rx="2" /></svg>
);
export const CircleIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /></svg>
);
export const LineIcon = (p) => (
  <svg {...base} {...p}><path d="M5 19L19 5" /></svg>
);
export const ArrowIcon = (p) => (
  <svg {...base} {...p}><path d="M5 19L19 5M19 5h-6M19 5v6" /></svg>
);
export const ImageIcon = (p) => (
  <svg {...base} {...p}><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.4" /><path d="M5 17l4-4 3 3 3-3 4 4" /></svg>
);
export const UndoIcon = (p) => (
  <svg {...base} {...p}><path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" /></svg>
);
export const RedoIcon = (p) => (
  <svg {...base} {...p}><path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" /></svg>
);
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-3.5-3.5" /></svg>
);
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M5 7h14M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
);
export const DotsIcon = (p) => (
  <svg {...base} {...p}><circle cx="6" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18" cy="12" r="1.2" /></svg>
);
export const LayersUpIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l8 4-8 4-8-4 8-4zM4 13l8 4 8-4" /></svg>
);
export const LayersDownIcon = (p) => (
  <svg {...base} {...p}><path d="M12 21l8-4-8-4-8 4 8 4zM4 11l8-4 8 4" /></svg>
);
export const ChevronLeftIcon = (p) => (
  <svg {...base} {...p}><path d="M15 6l-6 6 6 6" /></svg>
);
export const ChevronRightIcon = (p) => (
  <svg {...base} {...p}><path d="M9 6l6 6-6 6" /></svg>
);
export const BoldIcon = (p) => (
  <svg {...base} {...p}><path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" /></svg>
);
export const SidebarIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></svg>
);
