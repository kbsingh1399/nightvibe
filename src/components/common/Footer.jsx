import React from 'react';
import { ShieldCheck, Zap, Lock, Award, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#07080c] py-12 mt-20 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍸</span>
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                NIGHT<span className="gradient-text-purple">VIBE</span>
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[12px]">
              India’s first decentralized nightclub pass & competitive PR bidding ecosystem. Transparent pricing, verified perks, and seamless in-app door verification.
            </p>
            <div className="flex items-center gap-3 pt-2 text-slate-300">
              <span className="flex items-center gap-1 text-[11px] bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit TOTP Dynamic QR
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              Party Metros
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li className="hover:text-purple-400 cursor-pointer transition">Mumbai (Lower Parel, Bandra, Juhu)</li>
              <li className="hover:text-purple-400 cursor-pointer transition">North Goa (Vagator, Anjuna, Morjim)</li>
              <li className="hover:text-purple-400 cursor-pointer transition">Bengaluru (Indiranagar, Koramangala)</li>
              <li className="hover:text-purple-400 cursor-pointer transition">Delhi-NCR (Hauz Khas, Cyberhub)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              FinTech & Compliance
            </h4>
            <ul className="space-y-2 text-[12px]">
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero Custody Split (Razorpay Route)</span>
              </li>
              <li>GST SAC 999633 / SAC 998599 Dual Invoicing</li>
              <li>Section 194H 2% TDS Automated Withholding</li>
              <li>Escrow Payout Contingent on Door Scan</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-slate-200 uppercase tracking-wider text-[11px] mb-3">
              Platform Assurance
            </h4>
            <p className="text-slate-400 text-[12px] leading-relaxed mb-3">
              100% money-back guarantee from Club Reserve in the event of wrongful bouncer turnaway or venue cancellation.
            </p>
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-300">
              <span className="font-semibold">Excise Note:</span> Entry restricted to legal drinking age (21+ / 25+ per state laws). Please party responsibly.
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© 2026 NightVibe India Technologies Pvt. Ltd. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="w-3 h-3 text-pink-500 fill-pink-500" /> for the Indian Nightlife Community
          </p>
        </div>
      </div>
    </footer>
  );
};
