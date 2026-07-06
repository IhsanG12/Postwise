import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import ResultsClient from './ResultsClient';

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { jobId } = await params;
  const sp = await searchParams;

  const platform: 'instagram' | 'tiktok' =
    sp.platform === 'tiktok' ? 'tiktok' : 'instagram';
  const format: 'slideshow' | 'video' =
    sp.format === 'video' ? 'video' : 'slideshow';

  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <ResultsClient jobId={jobId} platform={platform} format={format} />
        </PageWrapper>
      </main>
    </>
  );
}
