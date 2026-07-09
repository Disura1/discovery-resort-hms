import {
  Mail,
  Phone,
  MapPin,
  Globe,
  Camera,
} from "lucide-react";

import { Logo } from "./Logo";
import { TideLine } from "./TideLine";

export function GuestFooter() {
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="text-ocean-200"><TideLine className="w-full h-3" /></div>
      <div className="max-w-4xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-3">
        <div>
          <Logo variant="mark" />
          <p className="text-sm text-ink-400 mt-3 leading-relaxed">
            A quiet stretch of coastline, kept simple.
          </p>
        </div>
        <div className="text-sm space-y-2 text-ink-600">
          <p className="font-medium text-ink-800 mb-1">Contact</p>
          <p className="flex items-center gap-2"><MapPin size={14} /> 42 Marine Drive, Colombo</p>
          <p className="flex items-center gap-2"><Phone size={14} /> +94 11 234 5678</p>
          <p className="flex items-center gap-2"><Mail size={14} /> stay@discoveryresort.com</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-ink-800 mb-2">Follow along</p>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="rounded-full border border-ink-200 p-2 text-ink-600 hover:text-ocean-600 hover:border-ocean-400 transition-colors">
              <Camera size={16} />
            </a>
            <a href="#" aria-label="Facebook" className="rounded-full border border-ink-200 p-2 text-ink-600 hover:text-ocean-600 hover:border-ocean-400 transition-colors">
              <Globe size={16} />
            </a>
          </div>
        </div>
      </div>
      <p className="text-center text-xs text-ink-400 pb-6">&copy; {new Date().getFullYear()} Discovery Resort. All rights reserved.</p>
    </footer>
  );
}