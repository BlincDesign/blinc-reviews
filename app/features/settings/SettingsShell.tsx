import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

type IconType = NonNullable<HTMLElementTagNameMap["s-icon"]["type"]>;

// The Settings frame: Judge.me-style grouped sidebar on the left, the section on
// the right. Used by the /app/settings layout and by app.settings_.* pages
// (import, email templates) that need their own page actions. Every settings
// URL starts with /app/settings so the admin nav keeps "Settings" selected.

const GROUPS: {
  heading: string;
  items: { label: string; href: string; icon: IconType }[];
}[] = [
  {
    heading: "Review collection",
    items: [
      { label: "Import reviews", href: "/app/settings/import", icon: "import" },
      {
        label: "Request scheduling",
        href: "/app/settings/scheduling",
        icon: "clock",
      },
      { label: "Email templates", href: "/app/settings/email", icon: "email" },
      {
        label: "Publishing and moderation",
        href: "/app/settings/publishing",
        icon: "thumbs-up",
      },
    ],
  },
  {
    heading: "Integrations",
    items: [
      {
        label: "Integrations",
        href: "/app/settings/integrations",
        icon: "apps",
      },
    ],
  },
  {
    heading: "General",
    items: [
      { label: "Plan", href: "/app/settings/plan", icon: "credit-card" },
      {
        label: "Admin notifications",
        href: "/app/settings/notifications",
        icon: "notification",
      },
    ],
  },
];

const CSS = `
.bs-layout { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; align-items: start; }
.bs-nav { position: sticky; top: 16px; background: #fff; border-radius: 12px; padding: 8px; box-shadow: 0 1px 0 rgba(26,26,26,.07), 0 0 0 1px rgba(26,26,26,.08); }
.bs-group + .bs-group { border-top: 1px solid #ebebeb; margin-top: 6px; padding-top: 6px; }
.bs-heading { margin: 8px 8px 4px; font-size: 12px; font-weight: 650; letter-spacing: .02em; text-transform: uppercase; color: #303030; }
.bs-link { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 8px; color: #303030; text-decoration: none; font-size: 13px; }
.bs-link:hover { background: #f1f1f1; }
.bs-link[aria-current="page"] { background: #ebebeb; font-weight: 600; }
@media (max-width: 760px) {
  .bs-layout { grid-template-columns: 1fr; }
  .bs-nav { position: static; display: flex; gap: 4px; overflow-x: auto; padding: 6px; }
  .bs-group, .bs-group + .bs-group { display: contents; border: 0; margin: 0; padding: 0; }
  .bs-heading { display: none; }
  .bs-link { white-space: nowrap; }
}`;

export function SettingsShell({
  heading = "Settings",
  actions,
  children,
}: {
  heading?: string;
  /** Page actions (s-button with slot="primary-action" / "secondary-actions"). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <s-page heading={heading} inlineSize="large">
      {actions}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bs-layout">
        <nav className="bs-nav" aria-label="Settings">
          {GROUPS.map((group) => (
            <div className="bs-group" key={group.heading}>
              <p className="bs-heading">{group.heading}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="bs-link"
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  <s-icon type={item.icon} />
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </s-page>
  );
}
