import Link from "next/link";
import { getSettingsMap, parseSocialLinks } from "@/lib/settings";

const footerLinks = [
  { label: "About Us", href: "/#about" },
  { label: "Contact", href: "/#contact" },
  { label: "Terms & Conditions", href: "/#terms" },
  { label: "Privacy Policy", href: "/#privacy" },
  { label: "Tournament Rules", href: "/tournaments" },
  { label: "Support", href: "/#support" },
];

export async function Footer() {
  const settings = await getSettingsMap();
  const socialLinks = parseSocialLinks(settings.footer_social_links);

  return (
    <footer id="contact" className="bg-slate-950 px-5 py-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 border-t border-white/10 pt-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <p className="text-lg font-black text-white">AfriKick</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">Africa Plays Here. Football tournaments for players, clubs, schools, communities, football competitors, referees, and organizers.</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-400">
            {settings.support_email ? <a href={`mailto:${settings.support_email}`} className="transition hover:text-cyan-300">{settings.support_email}</a> : null}
            {settings.whatsapp_contact_link ? <a href={settings.whatsapp_contact_link} className="transition hover:text-cyan-300">WhatsApp</a> : null}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Platform</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {footerLinks.map((link) => (
                <Link key={link.label} href={link.href} className="text-sm font-bold text-slate-300 transition hover:text-cyan-200">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Social</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {socialLinks.length === 0 ? <span className="text-sm text-slate-500">Social links coming soon.</span> : socialLinks.map((link) => (
                <a key={link.label} href={link.href} className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300 hover:text-cyan-200">
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
