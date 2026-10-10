import { notFound } from 'next/navigation';
import { readProfiles } from '@/lib/profiles';
import { matchIdInSlug } from '@/lib/slug';

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profiles = await readProfiles();
  const id = matchIdInSlug(
    slug,
    profiles.map((p) => p.id)
  );
  const profile = profiles.find((p) => p.id === id);
  if (!profile) notFound();

  return (
    <div className="px-20 py-12">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight text-foreground">Profile</h1>

      <div className="max-w-md">
        <label
          htmlFor="jobTitle"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Job title
        </label>
        <input
          id="jobTitle"
          type="text"
          defaultValue={profile.jobTitle}
          readOnly
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </div>
  );
}
