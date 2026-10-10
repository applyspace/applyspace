import Image from 'next/image';
import { PortableText, type PortableTextBlock, type PortableTextComponents } from '@portabletext/react';
import { sanityImageUrl } from '@/lib/sanity';

const components: PortableTextComponents = {
  block: {
    h2: ({ children }) => <h2 className="font-display mt-12 mb-3 text-2xl text-stone-950 sm:text-3xl">{children}</h2>,
    h3: ({ children }) => <h3 className="mt-8 mb-2 text-xl font-semibold tracking-tight text-stone-950">{children}</h3>,
    normal: ({ children }) => <p className="my-4 text-pretty text-stone-700">{children}</p>,
    blockquote: ({ children }) => <blockquote className="my-6 rounded-2xl bg-brand-50 px-6 py-4 text-stone-800">{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6 text-stone-700">{children}</ul>,
    number: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-6 text-stone-700">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => {
      const href = (value as { href?: string })?.href ?? '#';
      const external = /^https?:\/\//.test(href);
      return (
        <a href={href} className="font-medium underline underline-offset-4" {...(external ? { rel: 'noopener noreferrer' } : {})}>
          {children}
        </a>
      );
    },
  },
  types: {
    image: ({ value }) => {
      const url = sanityImageUrl(value, 1400);
      if (!url) return null;
      return (
        <figure className="my-8">
          <Image src={url} alt={(value as { alt?: string }).alt ?? ''} width={1400} height={800} sizes="(min-width: 768px) 720px, 100vw" className="h-auto w-full rounded-3xl border border-stone-200" />
        </figure>
      );
    },
  },
};

export function PortableTextBody({ value }: { value: PortableTextBlock[] }) {
  return <PortableText value={value} components={components} />;
}
