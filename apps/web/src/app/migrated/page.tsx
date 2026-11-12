import type { Metadata } from 'next';

const NEW_URL = 'https://ac-studio.calyzr-ai.my.id';

export const metadata: Metadata = {
  title: 'Pindah Domain — AURA Creative Studio',
  robots: { index: false, follow: false },
};

const REDIRECT_SCRIPT = `setTimeout(function(){location.replace('${NEW_URL}');}, 6000);`;

export default function MigratedPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background:
          'radial-gradient(1200px 600px at 50% -10%, #1b1b3a 0%, #0a0a0f 60%)',
        color: '#e8e8f0',
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '20px',
          padding: '40px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ fontSize: '46px', marginBottom: '12px' }}>🚚</div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
          }}
        >
          AURA Creative Studio sudah pindah
        </h1>
        <p
          style={{
            fontSize: '15px',
            lineHeight: 1.6,
            color: '#b8b8c8',
            margin: '0 0 24px',
          }}
        >
          Alamat ini (<strong>axon-ryzr.vercel.app</strong>) tidak lagi
          digunakan. Aplikasi kini berjalan di domain resmi berikut. Anda akan
          dialihkan otomatis dalam beberapa detik.
        </p>
        <a
          href={NEW_URL}
          style={{
            display: 'inline-block',
            padding: '14px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6d5efc, #9b5efc)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '15px',
            textDecoration: 'none',
          }}
        >
          Buka ac-studio.calyzr-ai.my.id →
        </a>
        <p style={{ fontSize: '12px', color: '#6f6f84', margin: '22px 0 0' }}>
          Perbarui bookmark Anda ke{' '}
          <span style={{ color: '#b8b8c8' }}>ac-studio.calyzr-ai.my.id</span>
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: REDIRECT_SCRIPT }} />
    </main>
  );
}
