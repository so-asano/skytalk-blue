"use client";

import { Markdown } from "@/components/markdown";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

const termsJa = `
# 利用規約

最終更新日: 2026年1月9日

## 1. はじめに

SkyTalk.Blue（以下「本サービス」）をご利用いただきありがとうございます。本サービスは、AT Protocol（Bluesky）上に構築された掲示板サービスです。本サービスを利用することにより、以下の利用規約に同意したものとみなされます。

## 2. サービスの説明

本サービスは、Blueskyアカウントを使用してスレッドの作成やコメントの投稿ができる掲示板プラットフォームです。投稿されたコンテンツはユーザーのPDS（Personal Data Server）上に保存され、AT Protocolを通じて公開されます。

## 3. 利用条件

- Blueskyアカウントが必要です
- 13歳以上である必要があります
- 法律および本規約を遵守する必要があります

## 4. 禁止事項

以下の行為は禁止されています：

- 違法なコンテンツの投稿
- 他者への嫌がらせ、誹謗中傷
- スパムや悪意のあるリンクの投稿
- 他者の個人情報の無断公開
- 著作権を侵害するコンテンツの投稿
- サービスの運営を妨害する行為

## 5. コンテンツの所有権

投稿されたコンテンツの著作権は投稿者に帰属します。ただし、AT Protocol上に公開されることにより、他のユーザーがそのコンテンツを閲覧・共有できることに同意するものとします。

## 6. 免責事項

- 本サービスは「現状のまま」提供されます
- サービスの中断や停止について責任を負いません
- ユーザー間のトラブルについて責任を負いません
- AT Protocol上のデータの永続性を保証しません

## 7. 変更

本規約は予告なく変更される場合があります。重要な変更がある場合は、本サービス上で通知します。

## 8. お問い合わせ

ご質問がある場合は、Blueskyで [@skytalk.blue](https://bsky.app/profile/skytalk.blue) までご連絡ください。
`;

const termsEn = `
# Terms of Use

Last updated: January 9, 2026

## 1. Introduction

Thank you for using SkyTalk.Blue (the "Service"). This Service is a bulletin board built on AT Protocol (Bluesky). By using this Service, you agree to be bound by these Terms of Use.

## 2. Description of Service

This Service is a bulletin board platform that allows you to create threads and post comments using your Bluesky account. Posted content is stored on your PDS (Personal Data Server) and made public through AT Protocol.

## 3. Eligibility

- A Bluesky account is required
- You must be at least 13 years old
- You must comply with all applicable laws and these Terms

## 4. Prohibited Activities

The following activities are prohibited:

- Posting illegal content
- Harassment or defamation of others
- Posting spam or malicious links
- Unauthorized disclosure of others' personal information
- Posting content that infringes copyrights
- Interfering with the operation of the Service

## 5. Content Ownership

Copyright of posted content belongs to the poster. However, by posting on AT Protocol, you agree that other users may view and share your content.

## 6. Disclaimer

- The Service is provided "as is"
- We are not responsible for service interruptions or outages
- We are not responsible for disputes between users
- We do not guarantee the persistence of data on AT Protocol

## 7. Changes

These Terms may be changed without notice. We will notify you of significant changes through the Service.

## 8. Contact

If you have any questions, please contact us at [@skytalk.blue](https://bsky.app/profile/skytalk.blue) on Bluesky.
`;

export default function TermsPage() {
  const { t, locale } = useI18n();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: locale === "ja" ? "利用規約" : "Terms of Use" },
        ]}
        className="mb-6"
      />

      <Card>
        <CardContent className="pt-5 pb-6 px-6">
          <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0">
            <Markdown>{locale === "ja" ? termsJa : termsEn}</Markdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
