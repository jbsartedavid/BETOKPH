import Link from 'next/link';

type Props = { searchParams: Promise<{ order?: string }> };

export default async function DepositResultPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.order ?? '';

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Top In (GCash)</h1>
      {orderId ? (
        <>
          <p>Your GCash top-in request has been created.</p>
          <p><strong>Order #</strong> {orderId}</p>
          <p style={{ marginTop: '1rem', color: '#9ca3af', fontSize: '0.9rem' }}>
            Complete the payment using GCash. Your balance will be updated after the payment is confirmed.
          </p>
        </>
      ) : (
        <p>No order specified.</p>
      )}
      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/profile">← Back to profile</Link>
      </p>
    </div>
  );
}
