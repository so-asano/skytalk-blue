"use client";

import { Markdown } from "@/components/markdown";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

const contentJa = `
# SkyTalk.Blue について

SkyTalk.Blue は、[AT Protocol](https://atproto.com/) を基盤とした、自由な会話のための場所です。

以下のような特長があります:

- シンプルでクリーンなデザイン
- GitHub Flavored Markdown が使用可能
- ATProto サービスとして高い相互運用性を持つ
- データはあなたが所有し、ポータビリティがあり、あなたがコントロール可能

## 運営

- [Bluecast Team](https://www.bluecast.app)

## お問い合わせ

- Bluesky: [@skytalk.blue](https://bsky.app/profile/skytalk.blue)
`;

const contentEn = `
# About SkyTalk.Blue

SkyTalk.Blue is a place for free conversations, built on [AT Protocol](https://atproto.com/).

Key features:

- Simple and clean design
- GitHub Flavored Markdown supported
- High interoperability as an ATProto service
- Your data is owned by you, portable, and under your control

## Operated by

- [Bluecast Team](https://www.bluecast.app)

## Contact

- Bluesky: [@skytalk.blue](https://bsky.app/profile/skytalk.blue)
`;

export default function AboutPage() {
  const { t, locale } = useI18n();
  const content = locale === "ja" ? contentJa : contentEn;

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: locale === "ja" ? "SkyTalk.Blue について" : "About" },
        ]}
        className="mb-6"
      />

      <Card>
        <CardContent className="pt-5 pb-6 px-6">
          <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0">
            <Markdown>{content}</Markdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
