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

export default async function TeacherCourseEditorPage({
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
          <Link
            href={`/i/${slug}/teacher/course-editor`}
            className="text-sm text-accent"
          >
            ← Course editor
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

      <AddModuleForm slug={slug} courseId={course.id} />

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
