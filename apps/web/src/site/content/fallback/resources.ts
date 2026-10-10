import type { Resource } from '../types';
import { h2, ol, p, ul } from '../portable';

/** Seed guides so the article template renders without Sanity. To be reviewed by the founder before launch. */
export const resources: Resource[] = [
  {
    slug: 'track-job-applications',
    title: 'How to track your job applications without losing track',
    excerpt: 'A simple system: four statuses, one follow-up rhythm and a weekly review that takes ten minutes.',
    category: 'Tracking',
    publishedAt: '2026-10-10',
    author: 'The applyspace team',
    readingMinutes: 4,
    body: [
      p('Most people start a job search with a spreadsheet and abandon it by week three. The problem is rarely the tool. It is that the system asks for too much, so it falls behind, and an out-of-date list is worse than none.'),
      h2('Keep the statuses few'),
      p('Every application sits in exactly one state. Four are enough for almost every search:'),
      ...ul([
        'Waiting: you applied and have no answer yet.',
        'Interviewing: at least one conversation is in progress.',
        'Accepted: you received an offer.',
        'Closed: rejected, withdrawn, or no answer after a long time.',
      ]),
      p('More states feel precise but they multiply decisions. If you hesitate between two statuses, you have too many.'),
      h2('Record the same few facts every time'),
      ...ul([
        'Company and job title.',
        'The date you applied.',
        'Where you found the offer, so you can see which source works.',
        'A link to the offer, because listings disappear.',
        'The next step and its date, if there is one.',
      ]),
      h2('Pick a follow-up rhythm'),
      p('Decide once how long you wait before following up, for example ten working days, and apply it to every application. A fixed rule removes the guilt of wondering whether it is too early or too late.'),
      h2('Review once a week'),
      p('Set ten minutes on the same day each week. Update statuses, send the follow-ups that are due, and close what is clearly over. Closing is useful: it keeps the active list short enough to look at.'),
      h2('Make it visible'),
      p('A board with one column per status shows what needs attention at a glance. A table helps when you want to sort and compare. Use whichever view fits the moment, on the same data.'),
    ],
  },
  {
    slug: 'job-interview-checklist',
    title: 'A simple checklist to prepare a job interview',
    excerpt: 'What to read, what to prepare and what to ask, in the days before the interview and on the day itself.',
    category: 'Interviews',
    publishedAt: '2026-10-10',
    author: 'The applyspace team',
    readingMinutes: 4,
    body: [
      p('Good preparation is mostly small, repeatable steps. This checklist works for a first call as well as a final round.'),
      h2('A few days before'),
      ...ol([
        'Reread the job offer and highlight the three things the team seems to need most.',
        'Look at the company: what it sells, who its customers are, and what changed recently.',
        'Look up the people you will meet and note how their roles relate to yours.',
        'Choose three stories from your experience that match those needs. For each, write the situation, what you did and the result.',
        'Prepare a one-minute answer to "tell me about yourself" that ends on why this role.',
      ]),
      h2('Questions to ask'),
      p('Prepare at least three. Good questions show you are thinking about the work:'),
      ...ul([
        'What does success look like in the first three months?',
        'How does the team make decisions and share feedback?',
        'What is the hardest part of this role right now?',
      ]),
      h2('The day before'),
      ...ul([
        'Check the time, the place or the video link, and who you are meeting.',
        'Test your camera and sound if the interview is remote.',
        'Have your resume and the offer within reach.',
      ]),
      h2('After the interview'),
      p('Write down what was asked and how it went while it is fresh. Send a short thank-you message the same day or the next one. Record the next step and its date next to the application so nothing slips.'),
    ],
  },
];
