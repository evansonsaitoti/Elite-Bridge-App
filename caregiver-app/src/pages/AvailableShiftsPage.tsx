import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Briefcase, Clock, DollarSign, Loader, MapPin, Search, ShieldCheck } from "lucide-react";
import { apiClient } from "../services/api";

type Shift = {
  id: number;
  title: string;
  serviceType: string;
  startTime?: string;
  endTime?: string;
  hourlyRate?: number;
  urgency?: string;
  responsibilities?: string;
  location?: { city?: string; state?: string; address?: string };
};

const sampleShifts: Shift[] = [
  { id: 1, title: "Evening companion care", serviceType: "Companion Care", startTime: new Date().toISOString(), hourlyRate: 45, urgency: "urgent", responsibilities: "Conversation, meal reminder, light household support.", location: { city: "Lowell", state: "MA" } },
  { id: 2, title: "Morning personal care aide", serviceType: "Personal Care", startTime: new Date(Date.now() + 86400000).toISOString(), hourlyRate: 50, urgency: "standard", responsibilities: "Daily routine support and mobility assistance.", location: { city: "Dracut", state: "MA" } },
  { id: 3, title: "Weekend respite coverage", serviceType: "Respite Care", startTime: new Date(Date.now() + 172800000).toISOString(), hourlyRate: 42, urgency: "standard", responsibilities: "Family respite and structured support.", location: { city: "Chelmsford", state: "MA" } },
];

function formatDate(value?: string) {
  if (!value) return "Flexible date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Flexible date";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function AvailableShiftsPage() {
  const [shifts, setShifts] = useState<Shift[]>(sampleShifts);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("Showing sample shifts until caregiver shift feed is connected.");

  useEffect(() => {
    const loadShifts = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.getAvailableShifts();
        const apiShifts = response.shifts || response.bookings || [];
        if (apiShifts.length > 0) {
          setShifts(apiShifts);
          setNotice("");
        }
      } catch {
        setNotice("Showing sample shifts until caregiver shift feed is connected.");
      } finally {
        setIsLoading(false);
      }
    };

    loadShifts();
  }, []);

  const filteredShifts = useMemo(() => {
    const search = query.toLowerCase().trim();
    if (!search) return shifts;
    return shifts.filter((shift) =>
      [shift.title, shift.serviceType, shift.location?.city, shift.location?.state, shift.responsibilities]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [query, shifts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0b3726] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c08530]">Elite Bridge</p>
            <h1 className="text-xl font-bold">Available Shifts</h1>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#0b3726]/10 px-3 py-1 text-sm font-semibold text-[#0b3726]"><Briefcase className="h-4 w-4" /> Care marketplace</div>
              <h2 className="text-3xl font-bold text-[#0b3726] md:text-5xl">Find care shifts that fit your schedule.</h2>
              <p className="mt-3 max-w-2xl text-gray-600">Browse nearby non-medical care work by service type, location, rate, and urgency.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by city, service, or notes" className="w-full rounded-2xl border border-gray-200 py-4 pl-12 pr-4 outline-none focus:border-[#c08530] focus:ring-2 focus:ring-[#c08530]/20" />
            </div>
          </div>

          {notice && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{notice}</div>}

          <div className="mt-6 grid gap-4">
            {isLoading && <div className="flex items-center gap-2 text-gray-600"><Loader className="h-4 w-4 animate-spin" /> Loading shifts...</div>}
            {filteredShifts.map((shift) => (
              <article key={shift.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-[#c08530]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#8a5b1e]">{shift.urgency || "standard"}</span>
                    <h3 className="mt-3 text-xl font-bold text-[#0b3726]">{shift.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-gray-600">{shift.serviceType}</p>
                    <p className="mt-3 max-w-2xl text-gray-600">{shift.responsibilities || "Care details will be shared by the employer."}</p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0b3726]" /> {shift.location?.city || "Nearby"}, {shift.location?.state || "MA"}</span>
                      <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-[#0b3726]" /> {formatDate(shift.startTime)}</span>
                      <span className="inline-flex items-center gap-2 font-bold text-[#0b3726]"><DollarSign className="h-4 w-4" /> {shift.hourlyRate ? `$${shift.hourlyRate}/hr` : "Rate shown after review"}</span>
                    </div>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b3726] px-5 py-3 font-semibold text-white hover:bg-[#08291d]">
                    <ShieldCheck className="h-4 w-4" /> Apply
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
