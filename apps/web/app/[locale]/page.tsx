import { PlainVoiceLanding, englishContent, frenchContent } from "../page";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function LocaleHomePage({ params }: Props) {
  const { locale } = await params;

  return (
    <PlainVoiceLanding content={locale === "fr" ? frenchContent : englishContent} />
  );
}
