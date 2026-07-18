# Çağdaş Türkçe Sözlük

[turkce-sozluk.com](https://turkce-sozluk.com) üzerinde yayımlanan, toplulukla gelişen ve açık kaynaklı bir Türkçe sözlük uygulaması.

Kelimeleri; anlamları, örnek cümleleri, telaffuzları ve ilişkili maddeleriyle keşfedin. Sözlüğe katkıda bulunun, kelimeleri kaydedin, çevrim dışı kullanın ve Türkçe öğrenme araçlarıyla pratik yapın.

## Öne çıkan özellikler

- Türkçe kelime, anlam, örnek cümle, sözcük türü ve ilişkili madde araması
- Paylaşılabilir ve arama motorlarına uygun kelime sayfaları
- Günün kelimesi, kelime listeleri ve kaydedilen kelimeler
- Uygulama olarak yüklenebilen PWA ve isteğe bağlı çevrim dışı sözlük verisi
- Topluluk katkıları: yeni kelime, anlam, ilişki, örnek, görsel ve telaffuz önerileri
- Telaffuz yükleme ve oylama akışı ile geri bildirim sistemi
- Kelime türetme ve fiil çekim araçları
- Kelime kartları, eşleştirme ve hızlı tur oyunları; skor tabloları
- Türkçe ve İngilizce arayüzler

## Teknoloji

- **Uygulama:** Next.js 16 (App Router), React 19 ve TypeScript
- **Arayüz:** Tailwind CSS v4, HeroUI, Radix UI ve lucide-react
- **API ve veri:** tRPC, TanStack Query, PostgreSQL ve Drizzle ORM
- **Kimlik doğrulama:** Better Auth; e-posta OTP ve sosyal sağlayıcılar
- **Çok dillilik:** next-intl
- **Çevrim dışı/PWA:** Serwist, IndexedDB ve oluşturulmuş çevrim dışı sözlük verisi
- **Arama:** PostgreSQL araması ve Meilisearch eşitlemesi

## Yerelde çalıştırma

### Gereksinimler

- [Bun](https://bun.sh/)
- Yerel PostgreSQL kurulumu veya örnek ortam dosyasındaki Docker/Pi geliştirme veritabanına erişim

### Kurulum

```bash
git clone https://github.com/4Furki4/Turkish-Dictionary.git
cd Turkish-Dictionary

bun install
cp .env.development.pi.example .env.local
```

`.env.local` içindeki veritabanı ve kullanacağınız servis ayarlarını kendi geliştirme ortamınıza göre güncelleyin. Gizli anahtarları sürüm kontrolüne eklemeyin.

Ardından yerel şemayı uygulayıp geliştirme sunucusunu başlatın:

```bash
bun run db:push:local
bun run dev
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde açılır.

## Sık kullanılan komutlar

```bash
# Uygulama
bun run dev
bun run build
bun run start

# Testler
bun run test
bun run test:watch

# Veritabanı
bun run db:generate
bun run db:migrate:local
bun run studio:local

# Sözlük verisi ve arama
bun run seed:tdk
bun run seed:daily
bun run offline-data:generate
bun run search:sync
```

`bun run build`, üretim derlemesi için temel doğrulama komutudur. Bu proje Bun ile yönetilir; npm yalnızca gerekli bir geri dönüş seçeneği olduğunda kullanılmalıdır.

## Ortam değişkenleri

Uygulamanın doğrulanan ortam değişkenleri [`src/env.mjs`](src/env.mjs) içinde; yerel geliştirme için örnek ayarlar [`.env.development.pi.example`](.env.development.pi.example) içinde bulunur.

Kullandığınız özelliğe göre PostgreSQL, Better Auth, e-posta, OAuth, Meilisearch, UploadThing, R2/S3, reCAPTCHA ve web push ayarlarını yapılandırmanız gerekebilir. Yeni bir uygulama değişkeni eklerken önce `src/env.mjs` dosyasını güncelleyin.

## Proje yapısı

- `src/app/`: App Router sayfaları, API uçları, sitemap/robots ve servis çalışanı
- `src/_pages/` ve `src/components/`: sayfa seviyesindeki arayüzler ve yeniden kullanılabilir bileşenler
- `src/server/api/`: tRPC yönlendiricileri, şemalar ve istek işleyicileri
- `src/lib/`: arama, SEO, kimlik doğrulama, çevrim dışı veri, biçimbilim ve oyun yardımcıları
- `db/schema/`: Drizzle tablo ve ilişki tanımları
- `messages/`: Türkçe ve İngilizce metinler
- `docs/`: Raspberry Pi dağıtımı, veritabanı ve operasyon belgeleri

Pi veritabanı ve dağıtım işlemleri için sırasıyla [veritabanı geçişleri](docs/raspberry-pi-database-migrations.md) ve [dağıtım kılavuzu](docs/raspberry-pi-deployments.md) belgelerini izleyin.

## Katkıda bulunma

Hata bildirimi, özellik önerisi ve pull request'ler memnuniyetle karşılanır. Kapsamı netleştirmek için büyük değişikliklerden önce bir issue açın. Uygulama içinden yapılan sözlük katkıları da mevcut moderasyon akışından geçer.

## Lisans

Bu proje [GNU Affero General Public License v3.0](LICENSE) ile lisanslanmıştır. Uygulamayı değiştirip ağ üzerinden hizmete sunarsanız, değiştirilmiş kaynak kodunu kullanıcılara aynı lisansla sunmanız gerekir.

## İletişim

Muhammed Furkan Cengiz — [GitHub](https://github.com/4Furki4) · [muhammedfurkancengiz@gmail.com](mailto:muhammedfurkancengiz@gmail.com)

---

## English

**Çağdaş Türkçe Sözlük** is an open-source, community-driven Turkish dictionary available at [turkce-sozluk.com](https://turkce-sozluk.com).

It offers searchable dictionary entries with meanings, examples, related terms, pronunciations, contribution and feedback workflows, offline/PWA support, word-building tools, verb conjugation, and flashcard, matching, and speed-round games. The project uses Next.js 16, React 19, TypeScript, tRPC, PostgreSQL/Drizzle, Better Auth, next-intl, Tailwind CSS v4, HeroUI, Serwist, and Meilisearch.

For local development, install dependencies with `bun install`, copy `.env.development.pi.example` to `.env.local`, configure the required services, run `bun run db:push:local`, then start the app with `bun run dev`.

Contributions and issue reports are welcome. The project is licensed under [AGPL-3.0](LICENSE).
