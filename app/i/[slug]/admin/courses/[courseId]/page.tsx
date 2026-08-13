import Link from "next/link";
import { loadCourseEditorPage } from "@/capabilities/courses/lib/actions";
import {
  AddModuleForm,
  AddResourceForm,
  ModuleDripForm,
  PublishCourseButton,
} from "@/components/course-editor";
import { ResourceUpload } from "@/components/resource-upload";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminCourseEditorPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  const { course, modules } = await loadCourseEditorPage(slug, courseId);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href={`/i/${slug}/admin/courses`} className="text-sm text-accent hover:underline">
            ← Courses
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2
              className="text-2xl font-semibold tracking-tight text-ink"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {course.title}
            </h2>
            <Badge tone={course.status === "published" ? "success" : "neutral"}>
              {course.status}
            </Badge>
          </div>
        </div>
        <PublishCourseButton slug={slug} courseId={course.id} status={course.status} />
      </div>

      <Card title="Add a module" description="Modules group resources for students.">
        <AddModuleForm slug={slug} courseId={course.id} />
      </Card>

      {modules.length === 0 ? (
        <p className="text-sm text-muted">No modules yet. Add your first above.</p>
      ) : (
        <div className="space-y-6">
          {modules.map(({ module: mod, resources }) => (
            <Card
              key={mod.id}
              title={mod.title}
              action={
                <Badge tone={mod.dripEnabled ? "accent" : "neutral"}>
                  {mod.dripEnabled ? "Drip release" : "Instant"}
                </Badge>
              }
            >
              <ModuleDripForm
                slug={slug}
                moduleId={mod.id}
                dripEnabled={mod.dripEnabled}
                availableAt={mod.availableAt}
              />
              <ul className="mt-3 space-y-1.5 text-sm">
                {resources.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface/60 px-3 py-2">
                    <span className="text-muted">
                      <Badge tone="neutral" className="mr-2">{r.type}</Badge>
                      {r.title}
                    </span>
                    {r.type === "file" ? (
                      <a
                        className="font-medium text-accent hover:underline"
                        href={`/api/resources/${r.id}/download?slug=${encodeURIComponent(slug)}`}
                      >
                        Download
                      </a>
                    ) : null}
                  </li>
                ))}
                {resources.length === 0 ? (
                  <li className="text-sm text-muted">No resources in this module.</li>
                ) : null}
              </ul>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <AddResourceForm slug={slug} moduleId={mod.id} />
                <ResourceUpload slug={slug} moduleId={mod.id} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}