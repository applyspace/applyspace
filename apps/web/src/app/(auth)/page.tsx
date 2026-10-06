import { MailReceive01Icon, SentIcon } from '@hugeicons/core-free-icons';
import { CvCard } from '@/components/home/CvCard';
import { HomeEmptyState } from '@/components/home/HomeEmptyState';
import { NextInterviewCard } from '@/components/home/NextInterviewCard';
import { StatCard } from '@/components/home/StatCard';
import { readHomeSummary } from '@/lib/home';

// Home: each block below is independent, so sections can be reordered freely.
export default async function HomePage() {
  const summary = await readHomeSummary();
  const isNew = summary.applicationsSent === 0;

  return (
    <div className="mx-auto flex w-full max-w-[60rem] flex-col gap-6 px-6 py-12 text-stone-950 sm:px-10">
      <header>
        <h1
          className="font-[family-name:var(--font-display)] text-[3rem] font-semibold leading-[1.02] tracking-[-0.04em]"
          style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 64' }}
        >
          {summary.firstName ? `Hi, ${summary.firstName}` : 'Hi there'}
        </h1>
        <p className="mt-4 text-sm text-stone-700">Here is where your job search stands today.</p>
      </header>

      {isNew && <HomeEmptyState />}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={SentIcon} label="Applications sent" value={summary.applicationsSent} />
        <StatCard
          icon={MailReceive01Icon}
          label="Answers received"
          value={summary.answersReceived}
          hint="Applications that got a reply or an interview"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NextInterviewCard interview={summary.nextInterview} />
        <CvCard
          firstName={summary.firstName}
          lastName={summary.lastName}
          hasCv={summary.hasCv}
        />
      </div>
    </div>
  );
}
