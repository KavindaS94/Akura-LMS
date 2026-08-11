import { loadSettingsPage } from "@/lib/settings/actions";
import { SettingsForm } from "@/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { settings } = await loadSettingsPage(slug);

  return (
    <section>
      <h2
        className="text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display), serif" }}
      >
        Settings
      </h2>
      <p className="mt-2 text-muted">
        Controls are generated from <code>setting_definitions</code>. Add a row there
        to get a new field — no UI code change required.
      </p>
      <SettingsForm slug={slug} settings={settings} />
    </section>
  );
}
