# Çağdaş Türkçe Sözlük - Modern Turkish Dictionary

## Turkish Dictionary (EN)

### Project Aim

- The world and languages we use to understand the world are always changing, especially in the modern world. My goal is to create an engaging, non-native speaker-friendly, and up-to-date Turkish dictionary, by also consulting with experts in fields such as science.
- I'll follow the dictionary book that's been used in the [Official Turkish Dictionary](https://sozluk.gov.tr)

### Feature Roadmap

#### Current features

- Offline word search
- PWA support to install the app on your devices and use it offline
- Community contributions
  - Word pronunciations
  - Missing word requests (Detailed and simple word request forms)
  - Word details change suggestions
- User feedback system
  - Easy feature requests
  - Intuitive feedback submission
- Save words for later
- Creating Screenshots of words
- Sharing word URLs

#### Future features

- Minigames to learn or practice Turkish words and grammar
  - Randomized letter puzzles to find words
  - More games coming soon!
- Community contributions
  - Visual aids and images for words and meanings
- Personal learning tools
  - Flashcard creation system
  - Quick integration of saved words into learning cards
- Visual learning support
  - Images for words to enhance understanding
  - Visual context for different word meanings
  - User-contributed image suggestions

### Tech Stack

#### Core Technologies

- **Frontend & Backend**
  - Next.js (App Router) with React 19
  - create-t3-app stack
  - tRPC for type-safe API
  - HeroUI for modern UI components
  - next-intl for internationalization
  - PWA support with serwist
  - Uploadthing for file uploads

#### Database & Authentication

- PostgreSQL database (using DrizzleORM) hosted on DigitalOcean
- NextAuth for authentication
  - Multiple OAuth providers (Google, GitHub, Discord)

### Getting Started

#### Prerequisites

- Node.js
- Docker and Docker Compose (for local development)
- PostgreSQL (automatically handled by Docker)

#### Development Setup

1. Clone the repository
2. Copy the `.env.example` file to `.env` and fill in the required variables
3. Start the development environment:

   ```bash
   docker-compose up -d    # Starts PostgreSQL database
   npm install            # Install dependencies
   npm run dev           # Start development server
   ```

#### Environment Variables

```env
# Database
DATABASE_URL=              # PostgreSQL connection URL
DATABASE_SSL_CA=

# Authentication
NEXTAUTH_SECRET=          # See https://next-auth.js.org/configuration/options#secret
NEXTAUTH_URL=             # http://localhost:3000 for local development

# OAuth Providers
AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_TRUST_HOST=true

# Login via Email (Magic Link)
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_SERVER_HOST=
EMAIL_SERVER_PORT=
EMAIL_FROM=

# File Upload
UPLOADTHING_SECRET=       # From uploadthing.com
UPLOADTHING_TOKEN=

# Cron secret for scheduled tasks
CRON_SECRET=

# Email
NODEMAIL_PASSWORD=
NODEMAIL_EMAIL=

# Drizzle Studio DB URL
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_DATABASE=
DATABASE_SSLMODE=

# Recaptcha
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Cloudflare R2 for offline db

S3_API_URL=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
NEXT_PUBLIC_R2_CUSTOM_URL=
```

### Contributing

I welcome contributions! Please check my issues page for current tasks or bug reports. A detailed contribution guide will be added soon.

### License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0). This means:

- You can use, modify, and distribute this software.
- If you modify and use this software in a network service (like a web application), you must make the complete source code available to users.
- Any modifications must also be licensed under AGPL-3.0.
- Full license terms can be found in the LICENSE file.

## Contact

You can contact me at muhammedfurkancengiz@gmail.com

## Türkçe Sözlük (TR)

### Projenin Amacı

- Dünya ve onu anlamlandırmak için kullandığımız diller sürekli değişiyor — özellikle de modern dünyada. Amacım, alanında uzman kişilerle (örneğin bilim insanlarıyla) da görüşerek, güncel, ilgi çekici ve ana dili Türkçe olmayan kullanıcılar için de erişilebilir bir Türkçe sözlük oluşturmaktır.
- [Resmî Türkçe Sözlük](https://sozluk.gov.tr)'teki sözlük yapısı esas alınacaktır.

### Özellik Yol Haritası

#### Mevcut Özellikler

- Çevrimdışı kelime arama  
- Uygulama olarak indirip çevrimdışı kullanılabilen PWA desteği  
- Topluluk katkıları  
  - Kelime telaffuzları  
  - Eksik kelime bildirme (Detaylı ve basit formlar)  
  - Kelime detaylarında öneri/değişiklik sistemi  
- Kullanıcı geri bildirim sistemi  
  - Kolay özellik önerileri  
  - Anlaşılır geri bildirim gönderimi  
- Kelimeleri kaydetme  
- Kelime ekran görüntüsü oluşturma  
- Kelime bağlantılarını paylaşma  

#### Gelecek Özellikler

- Türkçe kelimeleri ve dil bilgisini öğrenmeye yönelik mini oyunlar  
  - Harf karıştırmaca türü kelime bulmaca oyunları  
  - Yeni oyunlar yolda!  
- Topluluk katkıları  
  - Kelimeler için görsel destek / çizimler  
- Kişisel öğrenme araçları  
  - Flashcard (kart destesi) oluşturma sistemi  
  - Kaydedilen kelimeleri hızlıca karta dönüştürme  
- Görsel öğrenme desteği  
  - Anlamı pekiştiren kelime görselleri  
  - Kelimelerin farklı anlamlarına görsel bağlam ekleme  
  - Kullanıcı katkılı görsel öneri sistemi  

### Teknoloji Yığını

#### Temel Teknolojiler

- **Frontend & Backend**  
  - Next.js (App Router) ve React 19  
  - create-t3-app altyapısı  
  - tRPC ile tür güvenli API  
  - HeroUI ile modern arayüz bileşenleri  
  - next-intl ile çok dilli destek  
  - serwist ile PWA desteği  
  - Uploadthing ile dosya yükleme sistemi  

#### Veritabanı & Kimlik Doğrulama

- PostgreSQL veritabanı (DrizzleORM kullanılarak) DigitalOcean üzerinde barındırılıyor  
- NextAuth ile kimlik doğrulama  
  - Birden fazla OAuth sağlayıcı (Google, GitHub, Discord)  

### Başlarken

#### Gereklilikler

- Node.js  
- Docker ve Docker Compose (yerel geliştirme için)  
- PostgreSQL (Docker tarafından otomatik kurulur)  

#### Geliştirme Ortamı Kurulumu

1. Depoyu klonlayın  
2. `.env.example` dosyasını `.env` olarak kopyalayın ve gerekli alanları doldurun  
3. Geliştirme ortamını başlatın:

   ```bash
   docker-compose up -d    # PostgreSQL veritabanını başlatır
   npm install             # Bağımlılıkları kurar
   npm run dev             # Geliştirme sunucusunu çalıştırır



