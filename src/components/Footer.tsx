import { getSettingsMap, parseSocialLinks } from "@/lib/settings";

export async function Footer() {
  const settings = await getSettingsMap();
  const socialLinks = parseSocialLinks(settings.footer_social_links);

  return (
    <footer id="contact" className="bg-slate-950 px-5 py-10 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 border-t border-white/10 pt-8 md:flex-row md:items-center">
        <div>
          <p className="text-lg font-black text-white">{settings.site_name ?? "football-tournament"}</p>
          <p className="mt-2 text-sm text-slate-400">Professional mobile esports tournaments.</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
            {settings.support_email ? <a href={`mailto:${settings.support_email}`} className="transition hover:text-cyan-300">{settings.support_email}</a> : null}
            {settings.whatsapp_contact_link ? <a href={settings.whatsapp_contact_link} className="transition hover:text-cyan-300">WhatsApp</a> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300 hover:text-cyan-200"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}