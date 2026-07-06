import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import BillingClient from './BillingClient';

export default function BillingPage() {
  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <BillingClient />
        </PageWrapper>
      </main>
    </>
  );
}
