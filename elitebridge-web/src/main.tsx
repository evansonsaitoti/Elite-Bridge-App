import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Command,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import "./styles.css";

type Portal = "employer" | "caregiver";
type Message = { id: number; role: "me" | "them"; body: string; time: string };

const shifts = [
  { client: "Mrs. A.", care: "Companionship + meal prep", city: "Lowell, MA", time: "6:30 PM", status: "Urgent", risk: 80 },
  { client: "Troy", care: "Respite care", city: "Lowell, MA", time: "Tomorrow 8:00 AM", status: "Covered", risk: 18 },
  { client: "M. Santos", care: "Personal care", city: "Dracut, MA", time: "Fri 7:00 AM", status: "Open", risk: 54 },
];

const caregivers = [
  { name: "Review Caregiver", fit: 94, tags: "HHA · CPR · Evenings", status: "Available" },
  { name: "Sarah K.", fit: 88, tags: "PCA · Meal prep", status: "On shift" },
  { name: "Lucy M.", fit: 82, tags: "Companionship", status: "Available" },
];

function App() {
  const [portal, setPortal] = useState<Portal>("employer");
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "them", body: "Caregiver channel is ready for shift updates, ETA checks and clock questions.", time: "Now" },
    { id: 2, role: "me", body: "Send a clock reminder to tonight's caregiver.", time: "Now" },
  ]);
  const [draft, setDraft] = useState("");

  const portalCopy = useMemo(() => {
    if (portal === "employer") {
      return {
        eyebrow: "EMPLOYER COMMAND CENTER",
        title: "Run care operations from one live cockpit.",
        subtitle: "Coverage risk, caregiver matching, chat, shifts and payroll-ready activity in one web workspace.",
      };
    }
    return {
      eyebrow: "CAREGIVER WORKSPACE",
      title: "Find work, clock visits and message your agency.",
      subtitle: "A simple web version for caregivers to review shifts, update availability and stay connected.",
    };
  }, [portal]);

  const send = (body = draft) => {
    const clean = body.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "me", body: clean, time: "Now" },
      { id: Date.now() + 1, role: "them", body: portal === "employer" ? "Message queued for caregiver delivery." : "Agency received your update.", time: "Now" },
    ]);
    setDraft("");
  };

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand-mark">EB</div>
        <div>
          <p className="brand-kicker">ELITE BRIDGE</p>
          <h1>{portal === "employer" ? "Employer" : "Caregiver"}</h1>
        </div>

        <div className="switcher" aria-label="Portal selector">
          <button className={portal === "employer" ? "active" : ""} onClick={() => setPortal("employer")}>Employer</button>
          <button className={portal === "caregiver" ? "active" : ""} onClick={() => setPortal("caregiver")}>Caregiver</button>
        </div>

        <nav className="nav">
          {[
            ["Overview", Command],
            ["Schedule", CalendarDays],
            ["Coverage", ShieldCheck],
            ["Chat", MessageSquare],
            ["Profile", UserRound],
          ].map(([label, Icon]) => (
            <button key={String(label)} className={label === "Overview" ? "selected" : ""}>
              <Icon size={18} />
              {String(label)}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{portalCopy.eyebrow}</p>
            <h2>{portalCopy.title}</h2>
            <p>{portalCopy.subtitle}</p>
          </div>
          <div className="top-actions">
            <button className="icon-button"><Search size={18} /></button>
            <button className="icon-button"><Bell size={18} /><span className="dot" /></button>
            <button className="primary"><Plus size={16} /> {portal === "employer" ? "Post shift" : "Set availability"}</button>
          </div>
        </header>

        <section className="metrics">
          {(portal === "employer"
            ? [
                ["Open shifts", "7", Briefcase],
                ["At risk", "2", Activity],
                ["Applications", "14", Users],
                ["Messages", String(messages.length), MessageSquare],
              ]
            : [
                ["Available shifts", "11", Briefcase],
                ["Match score", "92", Sparkles],
                ["Upcoming", "3", CalendarDays],
                ["Unread", "2", MessageSquare],
              ]).map(([label, value, Icon]) => (
            <article className="metric" key={String(label)}>
              <div><Icon size={20} /></div>
              <p>{String(label)}</p>
              <strong>{String(value)}</strong>
            </article>
          ))}
        </section>

        <section className="grid">
          <div className="panel large">
            <div className="panel-head">
              <div>
                <p className="eyebrow">CARE RADAR</p>
                <h3>{portal === "employer" ? "Coverage priority" : "Best shift matches"}</h3>
              </div>
              <button className="text-button">View all</button>
            </div>

            <div className="shift-list">
              {shifts.map((shift) => (
                <article className="shift-row" key={shift.client}>
                  <div className={`risk ${shift.risk >= 75 ? "critical" : shift.risk <= 25 ? "stable" : ""}`}>
                    <strong>{shift.risk}</strong>
                    <span>{shift.status}</span>
                  </div>
                  <div className="shift-copy">
                    <h4>{shift.care} · {shift.client}</h4>
                    <p>{shift.time} · {shift.city}</p>
                  </div>
                  <button>{portal === "employer" ? "Cover" : "Apply"}</button>
                </article>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">{portal === "employer" ? "TALENT" : "PROFILE"}</p>
                <h3>{portal === "employer" ? "Best caregivers" : "Care Match"}</h3>
              </div>
            </div>
            {portal === "employer" ? caregivers.map((person) => (
              <div className="person" key={person.name}>
                <div className="avatar">{person.name.slice(0, 2)}</div>
                <div>
                  <strong>{person.name}</strong>
                  <p>{person.tags}</p>
                </div>
                <span>{person.fit}</span>
              </div>
            )) : (
              <div className="profile-card">
                <div className="avatar large-avatar">EB</div>
                <h4>Caregiver Review Account</h4>
                <p>Evenings · Weekends · 15 miles</p>
                <button>Update preferences</button>
              </div>
            )}
          </div>

          <div className="panel chat-panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">SECURE CHAT</p>
                <h3>{portal === "employer" ? "Agency channel" : "Agency support"}</h3>
              </div>
            </div>
            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className={`bubble ${message.role === "me" ? "mine" : ""}`}>
                  <p>{message.body}</p>
                  <span>{message.time}</span>
                </div>
              ))}
            </div>
            <div className="quick">
              {["ETA?", "Clock issue", "Client update"].map((item) => (
                <button key={item} onClick={() => send(item)}>{item}</button>
              ))}
            </div>
            <div className="composer">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message..." onKeyDown={(event) => event.key === "Enter" && send()} />
              <button onClick={() => send()}><Send size={16} /></button>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">TIME CLOCK</p>
                <h3>{portal === "employer" ? "Live activity" : "Visit clock"}</h3>
              </div>
            </div>
            <div className="timeline">
              <div><Clock3 size={18} /><span>6:30 PM</span><p>Upcoming visit in Lowell</p></div>
              <div><CheckCircle2 size={18} /><span>Approved</span><p>Timesheet ready for payroll</p></div>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
