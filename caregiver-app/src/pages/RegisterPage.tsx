import React from "react";
import { Link } from "react-router-dom";
import { Mail, ShieldCheck, Users } from "lucide-react";

export function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-10 flex items-center justify-center">
      <section className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] px-8 py-10 text-center text-white sm:px-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
            <Users className="h-8 w-8 text-[#f2c96f]" aria-hidden="true" />
          </div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#f2c96f]">Elite Care access</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Join your team</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/85">
            Your employer needs to invite you before you can create an Elite Care account.
          </p>
        </div>

        <div className="px-7 py-8 text-center sm:px-12">
          <div className="rounded-2xl border border-[#e7eee9] bg-[#f7faf8] p-5">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0b3726] shadow-sm">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="font-bold text-[#0b3726]">Stay tuned for an invitation</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              We’ll email or text you a secure link as soon as your employer adds you. Open that link to set up your profile.
            </p>
          </div>

          <Link to="/login" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#0b3726] px-5 font-bold text-white transition hover:bg-[#164b37]">
            Have an account? Log in
          </Link>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="h-4 w-4 text-[#c08530]" aria-hidden="true" />
            <span>Secure access managed by your employer</span>
          </div>
        </div>
      </section>
    </main>
  );
}
