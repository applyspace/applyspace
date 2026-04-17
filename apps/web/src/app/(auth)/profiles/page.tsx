import Link from 'next/link';
import { readProfiles } from '@/lib/profiles';
import { entrySlug } from '@/lib/slug';

export default async function ProfilesPage() {
  const profiles = await readProfiles();

  return (
    <div className="px-20 py-12">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Profiles</h1>
      {profiles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No profiles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {profiles.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profiles/${entrySlug([p.jobTitle], p.id)}`}
                className="block rounded-md border border-border px-4 py-3 text-sm hover:bg-accent"
              >
                {p.jobTitle}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
