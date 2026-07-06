import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import GenerationClient from './GenerationClient';

export default async function GenerationPage({
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
  const withFace = sp.withFace === 'true';

  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <GenerationClient
            jobId={jobId}
            platform={platform}
            format={format}
            withFace={withFace}
          />
        </PageWrapper>
      </main>
    </>
  );
}
