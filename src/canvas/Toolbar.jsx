import {
  CursorIcon, HandIcon, TextIcon, SquareIcon, CircleIcon,
  LineIcon, ArrowIcon, ImageIcon,
} from "../components/Icons.jsx";

const TOOLS = [
  { id: "select", label: "Select", hint: "V", Icon: CursorIcon },
  { id: "hand", label: "Pan", hint: "H / Space", Icon: HandIcon },
  { id: "text", label: "Text", hint: "T", Icon: TextIcon },
  { id: "rectangle", label: "Rectangle", hint: "R", Icon: SquareIcon },
  { id: "circle", label: "Circle", hint: "O", Icon: CircleIcon },
  { id: "line", label: "Line", hint: "L", Icon: LineIcon },
  { id: "arrow", label: "Arrow", hint: "A", Icon: ArrowIcon },
];

export default function Toolbar({ tool, setTool, onPickImage }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Canvas tools">
      {TOOLS.map(({ id, label, hint, Icon }) => (
        <button
          key={id}
          className={`tool-btn ${tool === id ? "is-active" : ""}`}
          title={`${label}  ·  ${hint}`}
          aria-pressed={tool === id}
          onClick={() => setTool(id)}
        >
          <Icon />
        </button>
      ))}
      <span className="toolbar-sep" />
      <button className="tool-btn" title="Add image" onClick={onPickImage}>
        <ImageIcon />
      </button>
    </div>
  );
}
