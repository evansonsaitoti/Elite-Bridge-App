import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle, Filter, MapPin, MessageSquare, Search, ShieldCheck, Star } from "lucide-react";

type Caregiver = {
  id: number;
  name: string;
  role: string;
  city: string;
  rate: number;
  rating: number;
  availability: string;
  skills: string[];
  verified: boolean;
};

const caregivers: Caregiver[] = [
  { id: 1, name: "Felistus M.", role: "Personal Care Aide", city: "Lowell", rate: 45, rating: 4.9, availability: "Evenings", skills: ["Personal care", "Meal prep", "Mobility support"], verified: true },
  { id: 2, name: "Lucy W.", role: "Companion Caregiver", city: "Dracut", rate: 40, rating: 4.8, availability: "Fridays", skills: ["Companionship", "Errands", "Light housekeeping"], verified: true },
  { id: 3, name: "Serah K.", role: "Respite Support", city: "Chelmsford", rate: 42, rating: 4.7, availability: "Weekends", skills: ["Respite", "Family support", "Autism-aware routines"], verified: false },
  { id: 4, name: "Mary N.", role: "Homemaker Support", city: "Tewksbury", rate: 38, rating: 4.9, availability: "Mornings", skills: ["Homemaker", "Laundry", "Meal prep"], verified: true },
];

export function CaregiverSearchPage() {
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("All skills");

  const skills = ["All skills", "Personal care", "Companionship", "Respite", "Meal prep", "Homemaker", "Autism-aware routines"];

  const filteredCaregivers = useMemo(() => {
    const search = query.toLowerCase().trim();
    return caregivers.filter((caregiver) => {
      const matchesQuery = !search || [caregiver.name, caregiver.role, caregiver.city, caregiver.availability, ...caregiver.skills]
        .some((value) => value.toLowerCase().includes(search));
      const matchesSkill = skill === "All skills" || caregiver.skills.includes(skill);
      return matchesQuery && matchesSkill;
    });
  }, [query, skill]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0b3726] text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#c08530]">Elite Bridge</p>
            <h1 className="text-xl font-bold">Find Caregivers</h1>
          </div>
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-white p-5 shadow-sm md:p-8">
          <div className="grid gap-6 md:grid-cols-[1.15fr_0.85fr] md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#0b3726]/10 px-3 py-1 text-sm font-semibold text-[#0b3726]"><Search className="h-4 w-4" /> Caregiver marketplace</div>
              <h2 className="text-3xl font-bold text-[#0b3726] md:text-5xl">Compare caregivers before you confirm coverage.</h2>
              <p className="mt-3 max-w-2xl text-gray-600">Search by city, service type, availability, rate, skills, and verification readiness.</p>
            </div>
            <div className="grid gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search caregivers" className="w-full rounded-2xl border border-gray-200 py-4 pl-12 pr-4 outline-none focus:border-[#c08530] focus:ring-2 focus:ring-[#c08530]/20" />
              </div>
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <select value={skill} onChange={(event) => setSkill(event.target.value)} className="w-full appearance-none rounded-2xl border border-gray-200 py-4 pl-12 pr-4 outline-none focus:border-[#c08530] focus:ring-2 focus:ring-[#c08530]/20">
                  {skills.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {filteredCaregivers.map((caregiver) => (
              <article key={caregiver.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#0b3726] text-lg font-black text-white">{caregiver.name.split(" ").map((part) => part[0]).join("")}</div>
                      <div>
                        <h3 className="text-xl font-bold text-[#0b3726]">{caregiver.name}</h3>
                        <p className="text-sm font-semibold text-gray-600">{caregiver.role}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[#0b3726]" /> {caregiver.city}, MA</span>
                      <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-[#c08530]" /> {caregiver.rating}</span>
                      <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#0b3726]" /> {caregiver.availability}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {caregiver.skills.map((item) => <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700">{item}</span>)}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-2xl font-bold text-[#0b3726]">${caregiver.rate}/hr</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                      {caregiver.verified ? <CheckCircle className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
                      {caregiver.verified ? "Verified" : "Needs review"}
                    </p>
                    <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b3726] px-4 py-3 text-sm font-semibold text-white hover:bg-[#08291d] sm:w-auto">
                      <MessageSquare className="h-4 w-4" /> Message
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
