"use client";

import { Markdown } from "@/components/markdown";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

const privacyJa = `
# プライバシーポリシー

最終更新日: 2026年1月9日

## 1. はじめに

SkyTalk.Blue（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めています。本プライバシーポリシーでは、本サービスがどのような情報を収集し、どのように使用するかについて説明します。

## 2. 収集する情報

### 2.1 Blueskyアカウント情報

本サービスを利用する際、以下のBlueskyアカウント情報を取得します：

- DID（分散識別子）
- ハンドル名

### 2.2 投稿コンテンツ

ユーザーが投稿したスレッドやコメントの内容を保存します。これらのコンテンツはユーザーのPDS上にも保存され、AT Protocolを通じて公開されます。

### 2.3 技術的情報

サービス改善のため、以下の技術的情報を収集する場合があります：

- IPアドレス
- ブラウザの種類
- アクセス日時
- リファラー情報

## 3. 情報の使用目的

収集した情報は以下の目的で使用します：

- サービスの提供と運営
- ユーザーサポートの提供
- サービスの改善と新機能の開発
- 不正利用の防止

## 4. 情報の共有

本サービスは、以下の場合を除き、ユーザーの個人情報を第三者と共有しません：

- ユーザーの同意がある場合
- 法的義務を遵守するために必要な場合
- サービス運営に必要な業務委託先との共有（適切な契約のもと）

## 5. Cookie

本サービスでは、以下の目的でCookieを使用します：

- ログイン状態の維持
- 言語設定の保存
- テーマ設定の保存

## 6. データの保存

ユーザーデータは適切なセキュリティ対策を施したサーバーに保存されます。ただし、インターネット上での完全なセキュリティを保証することはできません。

## 7. 変更

本プライバシーポリシーは予告なく変更される場合があります。重要な変更がある場合は、本サービス上で通知します。

## 8. お問い合わせ

プライバシーに関するご質問がある場合は、Blueskyで [@skytalk.blue](https://bsky.app/profile/skytalk.blue) までご連絡ください。
`;

const privacyEn = `
# Privacy Policy

Last updated: January 9, 2026

## 1. Introduction

SkyTalk.Blue (the "Service") respects your privacy and is committed to protecting your personal information. This Privacy Policy explains what information we collect and how we use it.

## 2. Information We Collect

### 2.1 Bluesky Account Information

When you use our Service, we collect the following Bluesky account information:

- DID (Decentralized Identifier)
- Handle

### 2.2 Posted Content

We store the content of threads and comments you post. This content is also stored on your PDS and made public through AT Protocol.

### 2.3 Technical Information

We may collect the following technical information to improve our Service:

- IP address
- Browser type
- Access date and time
- Referrer information

## 3. How We Use Information

We use the collected information for the following purposes:

- Providing and operating the Service
- Providing user support
- Improving the Service and developing new features
- Preventing abuse

## 4. Information Sharing

We do not share your personal information with third parties except in the following cases:

- With your consent
- When required to comply with legal obligations
- With service providers necessary for operations (under appropriate agreements)

## 5. Cookies

We use cookies for the following purposes:

- Maintaining login status
- Saving language preferences
- Saving theme preferences

## 6. Data Storage

User data is stored on servers with appropriate security measures. However, we cannot guarantee complete security on the Internet.

## 7. Changes

This Privacy Policy may be changed without notice. We will notify you of significant changes through the Service.

## 8. Contact

If you have any questions about privacy, please contact us at [@skytalk.blue](https://bsky.app/profile/skytalk.blue) on Bluesky.
`;

export default function PrivacyPage() {
  const { t, locale } = useI18n();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: t("common.top"), href: "/" },
          { label: locale === "ja" ? "プライバシーポリシー" : "Privacy Policy" },
        ]}
        className="mb-6"
      />

      <Card>
        <CardContent className="pt-5 pb-6 px-6">
          <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0">
            <Markdown>{locale === "ja" ? privacyJa : privacyEn}</Markdown>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
