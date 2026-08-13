import { loadSettingsPage } from "@/lib/settings/actions";
import { SettingsForm } from "@/components/settings-form";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { settings } = await loadSettingsPage(slug);

  return (
    <section className="space-y-8">
      <PageHeader
        title="Settings"
        subtitle={
          <>
            Controls are generated from{" "}
            <code className="text-ink/70">setting_definitions</code>. Add a row there to
            get a new field — no UI code change required.
          </>
        }
      />
      <Card title="Workspace settings">
        <SettingsForm slug={slug} settings={settings} />
      </Card>
    </section>
  );
}
