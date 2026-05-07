export type QuizJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'Quiz';
  name: string;
  about: { '@type': 'Thing'; name: string };
  url: string;
};

export function buildQuizJsonLd(input: {
  title: string;
  subreddit: string;
  url: string;
}): QuizJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: input.title,
    about: { '@type': 'Thing', name: `r/${input.subreddit}` },
    url: input.url,
  };
}
