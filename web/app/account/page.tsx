import Nav from '@/components/layout/Nav';
import PageWrapper from '@/components/layout/PageWrapper';
import AccountClient from './AccountClient';

export default function AccountPage() {
  return (
    <>
      <Nav />
      <main>
        <PageWrapper>
          <AccountClient />
        </PageWrapper>
      </main>
    </>
  );
}
