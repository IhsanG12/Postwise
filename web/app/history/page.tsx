import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import HistoryClient from './HistoryClient';

export default function HistoryPage() {
  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <HistoryClient />
        </PageWrapper>
      </main>
    </>
  );
}
