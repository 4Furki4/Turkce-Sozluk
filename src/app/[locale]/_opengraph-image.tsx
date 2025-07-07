import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

// Image metadata
export const alt = 'Türkçe Sözlük - Turkish Dictionary';
export const size = {
    width: 1200,
    height: 630,
};
export const contentType = 'image/png';

// Image generation
export default async function Image({ params }: { params: { locale: string } }) {
    // Determine the language and set the text accordingly
    const isEnglish = params.locale === 'en';
    const title = isEnglish ? 'Turkish Dictionary' : 'Türkçe Sözlük';
    const subtitle = isEnglish
        ? 'Community Driven, Modern and Open Source Turkish Dictionary'
        : 'Toplulukla Gelişen, Modern ve Açık Kaynak Türkçe Sözlüğü';

    // --- Font Fetching from local files ---
    const geistSemiBold = await readFile(
        join(process.cwd(), 'src/assets/Geist-SemiBold.ttf')
    )
    const geistRegular = await readFile(
        join(process.cwd(), 'src/assets/Geist-Regular.ttf')
    )

    // --- Logo Fetching from local files ---
    const logoData = await readFile(join(process.cwd(), 'src/app/icon.svg'))
    // IMPORTANT: The next/image `Image` component cannot be used here.
    // We must use a standard `img` tag. The `src` requires the raw image data.
    // The previous code was also missing this conversion for the logo.
    const logoSrc = `data:image/svg+xml;base64,${logoData.toString('base64')}`;

    return new ImageResponse(
        (
            // --- JSX for the Image ---
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'radial-gradient(circle at 50% 50%, #380000 0%, #0a0a0a 70%)',
                    color: 'white',
                    fontFamily: '"Inter"',
                }}
            >
                {/* Your Logo */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    width="400"
                    height="400"
                    src={logoSrc}
                    alt="Turkish Dictionary Logo"
                    style={{
                        position: 'absolute',
                        opacity: 0.1, // Greatly reduce opacity
                    }}
                />

                {/* Title */}
                <p
                    style={{
                        fontSize: '90px', // Slightly smaller title to give subtitle more room
                        fontWeight: 700,
                        // Using the brand's red color again for consistency
                        color: '#a91101', // A slightly brighter red for better visibility
                        lineHeight: 1,
                        marginBottom: 20,
                        textAlign: 'center',
                    }}
                >
                    {title}
                </p>

                {/* Subtitle */}
                <p
                    style={{
                        fontSize: '32px', // Slightly smaller subtitle to prevent wrapping
                        fontWeight: 400,
                        color: '#d4d4d8',
                        textAlign: 'center',
                        maxWidth: '90%', // Increase max-width slightly
                        lineHeight: 1.3,
                    }}
                >
                    {subtitle}
                </p>

                {/* Improvement 3: Make the URL more prominent but still balanced */}
                <p
                    style={{
                        position: 'absolute',
                        bottom: 40,
                        fontSize: '28px',
                        fontWeight: 400,
                        color: '#a1a1aa', // A mid-gray for subtlety (zinc-400)
                    }}
                >
                    turkce-sozluk.com
                </p>
            </div>
        ),
        // --- ImageResponse Options ---
        {
            ...size,
            fonts: [
                {
                    name: 'Inter',
                    data: geistRegular,
                    style: 'normal',
                    weight: 400,
                },
                {
                    name: 'Inter',
                    data: geistSemiBold,
                    style: 'normal',
                    weight: 600,
                },
            ],
        }
    );
}
