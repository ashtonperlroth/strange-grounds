import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Strange Grounds — Backcountry Conditions Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d4 40%, #d1c8b8 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
            </svg>
            <span
              style={{
                fontSize: '56px',
                fontWeight: 700,
                color: '#292524',
                letterSpacing: '-0.02em',
              }}
            >
              Strange Grounds
            </span>
          </div>
          <span
            style={{
              fontSize: '28px',
              fontWeight: 300,
              color: '#57534e',
              maxWidth: '700px',
              textAlign: 'center',
            }}
          >
            Backcountry conditions intelligence — every data source, one
            briefing
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
