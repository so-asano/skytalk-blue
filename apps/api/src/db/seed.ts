import { db } from "./index.js";
import { channels } from "./schema.js";

const initialChannels = [
  // Entertainment
  { id: "anime", nameJa: "アニメ", nameEn: "Anime" },
  { id: "game", nameJa: "ゲーム", nameEn: "Gaming" },
  { id: "music", nameJa: "音楽", nameEn: "Music" },
  { id: "movie", nameJa: "映画", nameEn: "Movies" },
  { id: "drama", nameJa: "ドラマ", nameEn: "TV Shows" },
  { id: "book", nameJa: "読書・漫画", nameEn: "Books & Manga" },
  { id: "sports", nameJa: "スポーツ", nameEn: "Sports" },
  { id: "idol", nameJa: "アイドル・推し活", nameEn: "Idols & Fandom" },
  // Lifestyle
  { id: "travel", nameJa: "旅行", nameEn: "Travel" },
  { id: "food", nameJa: "グルメ・料理", nameEn: "Food & Cooking" },
  { id: "photo", nameJa: "写真・カメラ", nameEn: "Photography" },
  { id: "fashion", nameJa: "ファッション", nameEn: "Fashion" },
  { id: "pet", nameJa: "ペット", nameEn: "Pets" },
  { id: "diy", nameJa: "DIY・ものづくり", nameEn: "DIY & Crafts" },
  { id: "fitness", nameJa: "筋トレ・健康", nameEn: "Fitness & Health" },
  // Tech & Creative
  { id: "tech", nameJa: "テクノロジー", nameEn: "Technology" },
  { id: "dev", nameJa: "プログラミング", nameEn: "Programming" },
  { id: "design", nameJa: "デザイン", nameEn: "Design" },
  { id: "ai", nameJa: "AI・機械学習", nameEn: "AI & ML" },
  { id: "crypto", nameJa: "暗号資産", nameEn: "Crypto & Web3" },
  { id: "gadget", nameJa: "ガジェット", nameEn: "Gadgets" },
  // Community
  { id: "career", nameJa: "仕事・キャリア", nameEn: "Career" },
  { id: "study", nameJa: "勉強・資格", nameEn: "Study" },
  { id: "news", nameJa: "ニュース・時事", nameEn: "News" },
  { id: "ask", nameJa: "質問・相談", nameEn: "Q&A" },
  // Meta
  { id: "bluesky", nameJa: "Bluesky", nameEn: "Bluesky" },
  { id: "intro", nameJa: "自己紹介", nameEn: "Introductions" },
  { id: "random", nameJa: "雑談", nameEn: "Random" },
  { id: "feedback", nameJa: "サイトへの要望", nameEn: "Feedback" },
];

export async function seedChannels() {
  for (const channel of initialChannels) {
    await db
      .insert(channels)
      .values(channel)
      .onConflictDoNothing({ target: channels.id });
  }
  console.log("Seeded channels (upsert)");
}
