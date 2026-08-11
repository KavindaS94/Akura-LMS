import Link from "next/link";
import { loadCourseEditorPage } from "@/capabilities/courses/lib/actions";
import {
  AddModuleForm,
  AddResourceForm,
  ModuleDripForm,
  PublishCourseButton,
} from "@/components/course-editor";
import { ResourceUpload } from "@/components/resource-upload";

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
          <Link href={`/i/${slug}/admin/courses`} className="text-sm text-accent">
            ← Courses
          </Link>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {course.title}
          </h2>
          <p className="mt-1 text-sm text-muted">Status: {course.status}</p>
        </div>
        <PublishCourseButton slug={slug} courseId={course.id} status={course.status} />
      </div>

      <div>
        <h3 className="text-lg font-semibold">Modules</h3>
        <AddModuleForm slug={slug} courseId={course.id} />
      </div>

      <div className="space-y-6">
        {modules.map(({ module: mod, resources }) => (
          <article key={mod.id} className="border border-ink/10 bg-white p-4">
            <h4 className="font-medium">{mod.title}</h4>
            <ModuleDripForm
              slug={slug}
              moduleId={mod.id}
              dripEnabled={mod.dripEnabled}
              availableAt={mod.availableAt}
            />
            <ul className="mt-3 space-y-1 text-sm">
              {resources.map((r) => (
                <li key={r.id} className="text-muted">
                  {r.type}: {r.title}
                  {r.type === "file" ? (
                    <>
                      {" · "}
                      <a
                        className="text-accent"
                        href={`/api/resources/${r.id}/download?slug=${encodeURIComponent(slug)}`}
                      >
                        Download
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
            <AddResourceForm slug={slug} moduleId={mod.id} />
            <ResourceUpload slug={slug} moduleId={mod.id} />
          </article>
        ))}
      </div>
    </section>
  );
}
