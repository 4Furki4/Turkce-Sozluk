import {
    Body,
    Container,
    Head,
    Heading,
    Html,
    Img,
    Preview,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface OtpEmailProps {
    validationCode?: string;
    locale?: string;
}

const translations = {
    en: {
        preview: "Your Login Code",
        heading: "Your Login Code",
        greeting: "Hello,",
        body: "Use the verification code below to sign in to your Turkish Dictionary account. This code is valid for 5 minutes.",
        ignore: "If you did not request this, you can safely ignore this email.",
    },
    tr: {
        preview: "Sözlüğe Giriş Kodunuz",
        heading: "Giriş Kodunuz",
        greeting: "Merhaba,",
        body: "Türkçe Sözlük hesabınıza giriş yapmak için aşağıdaki doğrulama kodunu kullanın. Bu kod 5 dakika süreyle geçerlidir.",
        ignore: "Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.",
    },
};

export default function OtpEmail({ validationCode = "123456", locale = "en" }: OtpEmailProps) {
    const t = translations[locale as keyof typeof translations] || translations.en;

    return (
        <Html>
            <Head />
            <Preview>{t.preview}</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        <Section className="mt-[32px]">
                            <Img
                                src={`${process.env.NEXT_PUBLIC_APP_URL}/icon.png`}
                                width="40"
                                height="40"
                                alt="Turkce Sozluk Logo"
                                className="my-0 mx-auto"
                            />
                        </Section>
                        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                            {t.heading}
                        </Heading>
                        <Text className="text-black text-[14px] leading-[24px]">
                            {t.greeting}
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            {t.body}
                        </Text>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Text className="text-center text-black bg-[#a91101] rounded-md py-4 px-6 text-2xl font-bold tracking-[10px] inline-block">
                                {validationCode}
                            </Text>
                        </Section>
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            {t.ignore}
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};
