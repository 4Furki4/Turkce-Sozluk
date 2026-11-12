export type WordEditorial = {
    title: string;
    description: string;
    answer: string;
    example: string;
    relatedWords: readonly string[];
    guide?: "/sik-yapilan-yanlislar" | "/galati-meshur";
    additionalSource?: { label: string; href: string };
};

// Turkish editorial notes keyed by the resolved dictionary headword.
const entries: Readonly<Record<string, WordEditorial>> = {
    "şoför": {
        title: "Şoför ne demek? Şoför mü, şöför mü?",
        description: "Şoför, motorlu araç kullanan kişidir. Sözcüğün doğru yazımı şofördür.",
        answer: "Şoför, motorlu araç kullanan kişidir. Sözcük özellikle araç kullanmayı meslek edinmiş kişiler için kullanılır. Doğru yazım şoför, sık rastlanan yanlış yazım şöfördür.",
        example: "Okul servisinin şoförü öğrencileri her sabah aynı duraktan alıyor.",
        relatedWords: ["sürücü"],
        guide: "/sik-yapilan-yanlislar",
    },
    "orijinal": {
        title: "Orijinal ne demek? Orijinal mi, orjinal mi?",
        description: "Orijinal, bağlama göre özgün veya taklit olmayan demektir. Doğru yazımı orijinaldir.",
        answer: "Orijinal, bir fikir veya eser için özgün, bir ürün için taklit olmayan anlamına gelebilir. Doğru yazım orijinaldir. Orjinal biçiminde j’den önceki i harfi eksiktir.",
        example: "Tamirde orijinal parça kullandılar.",
        relatedWords: ["özgün", "taklit"],
        guide: "/sik-yapilan-yanlislar",
    },
    "mütevazı": {
        title: "Mütevazı ne demek? Mütevazi ile farkı",
        description: "Mütevazı, alçak gönüllü veya gösterişsiz demektir. Mütevazi ise birbirine paralel olan şeyleri anlatır.",
        answer: "Mütevazı, bir kişi için alçak gönüllü, bir eşya ya da ortam için gösterişsiz demektir. Mütevazi ise birbirine paralel anlamında ayrı bir sözcüktür.",
        example: "Ödül almasına rağmen mütevazı tavrını korudu.",
        relatedWords: ["mütevazi", "alçak gönüllü", "gösterişsiz"],
    },
    "mütevazi": {
        title: "Mütevazi ne demek? Paralel anlamı",
        description: "Mütevazi, birbirine paralel olan demektir. Sonu noktasız ı ile yazılan mütevazı ise alçak gönüllü veya gösterişsiz anlamına gelir.",
        answer: "Mütevazi, birbirine paralel olan çizgileri veya yönleri anlatır. Alçak gönüllü ya da gösterişsiz anlamındaki sözcük mütevazıdır ve son harfi noktasız ı ile yazılır.",
        example: "Eski geometri kitabında bu doğrular mütevazi olarak adlandırılmış.",
        relatedWords: ["mütevazı", "paralel"],
    },
    "vasat": {
        title: "Vasat ne demek? Anlamı ve kullanımı",
        description: "Vasat, nitelik ya da düzey bakımından orta demektir. Eleştiri bağlamındaki kullanımını örnekle görün.",
        answer: "Vasat, nitelik ya da düzey bakımından orta demektir. “Vasat bir film” ifadesi filmin orta düzeyde bulunduğunu belirtir. Eleştiri bağlamında filmin beklentileri karşılamadığını da ima edebilir.",
        example: "Filmin oyunculuğu iyiydi ama hikâyesi vasattı.",
        relatedWords: ["orta"],
        guide: "/galati-meshur",
    },
    "kaskatı": {
        title: "Kaskatı ne demek? Anlamı ve yazımı",
        description: "Kaskatı, çok sert veya hareketsiz demektir. Katı sözcüğünün pekiştirilmiş biçimi olan kaskatı bitişik yazılır.",
        answer: "Kaskatı, çok sert veya hiç esnemeyen şeyleri anlatır. “Kaskatı kesilmek” sözü hareketsiz kalmak anlamında da kullanılır. Katı sözcüğünün pekiştirilmiş biçimi olan kaskatı bitişik yazılır.",
        example: "Kapının ansızın çarpmasıyla kaskatı kesildi.",
        relatedWords: ["katı", "kaskatı kesilmek"],
        additionalSource: {
            label: "TDK Yazım Kuralları",
            href: "https://tdk.gov.tr/icerik/yazim-kurallari/pekistirmeli-sozlerin-yazilisi/",
        },
    },
    "temin etmek": {
        title: "Temin etmek ne demek? İki anlamı",
        description: "Temin etmek, bir şeyi sağlamak veya birine güvence vermek demektir. İki anlam arasındaki farkı öğrenin.",
        answer: "Temin etmek, ihtiyaç duyulan bir şeyi bulup sağlamak demektir. “Sizi temin ederim” ifadesinde ise birine söylenen bir şeyin doğru olduğuna veya gerçekleşeceğine dair güvence verme anlamı taşır.",
        example: "Kütüphane eksik kitapları başka bir şubeden temin etti.",
        relatedWords: ["temin", "tedarik etmek"],
    },
    "sıralama": {
        title: "Sıralama ne demek? İşlem ve liste anlamı",
        description: "Sıralama, bir ölçüte göre sıraya koyma işidir. Yarışma sıralaması gibi ifadelerde ortaya çıkan listeyi de anlatır.",
        answer: "Sıralama, kişi veya nesneleri bir ölçüte göre sıraya koyma işidir. “Yarışma sıralaması” gibi kullanımlarda işlemin sonucunda ortaya çıkan listeyi de anlatır. Listedeki tek bir konumu belirtmek için sıra sözcüğü kullanılır.",
        example: "Yarışma sıralamasında üçüncü oldu.",
        relatedWords: ["sıralamak", "sıra"],
    },
    "karıştırma": {
        title: "Karıştırma ne demek? İsim ve emir kullanımı",
        description: "Karıştırma, karıştırmak eyleminin adı veya olumsuz emir biçimi olabilir. İki kullanımı örnekle ayırt edin.",
        answer: "Karıştırma, karıştırmak eyleminin adıdır. Bir şeyleri birbirine katmayı, bir şeyi altüst etmeyi veya iki şeyi ayırt edememeyi anlatabilir. “Bu iki dosyayı birbirine karıştırma!” cümlesinde aynı yazım olumsuz emir biçimidir.",
        example: "Karıştırma işlemi bitince hamuru kalıba dökün.",
        relatedWords: ["karıştırmak", "karışım"],
    },
    "boyalı": {
        title: "Boyalı ne demek? Boya ve makyaj anlamı",
        description: "Boyalı, üzerine boya sürülmüş demektir. Yüz veya dudak için kullanıldığında makyajlı anlamına da gelebilir.",
        answer: "Boyalı, üzerine boya sürülmüş veya belli bir renge boyanmış demektir. Yüz ya da dudak gibi sözcüklerle kullanıldığında makyajlı anlamına da gelebilir.",
        example: "Bahçenin mavi boyalı kapısı uzaktan görünüyordu.",
        relatedWords: ["boya", "boyamak", "makyajlı"],
    },
    "seher kuşu": {
        title: "Seher kuşu ne demek? Hangi kuşlara denir?",
        description: "Seher kuşu, bülbül ve kumru gibi kuşlara verilen ortak addır. Seher, güneş doğmadan önceki vakittir.",
        answer: "Seher kuşu, bülbül ve kumru gibi kuşlara verilen ortak bir addır. Bu sözdeki seher, güneş doğmadan önceki vakti anlatır.",
        example: "Seher kuşlarının sesi duyulurken kasabanın sokakları hâlâ karanlıktı.",
        relatedWords: ["seher", "bülbül", "kumru"],
    },
    "yoldaşlık": {
        title: "Yoldaşlık ne demek? Yoldaş ile ilişkisi",
        description: "Yoldaşlık, yol arkadaşlığı veya ortak bir amaç için birlikte hareket etme durumudur.",
        answer: "Yoldaşlık, birine yol arkadaşlığı etme ya da ortak bir amaç için onunla birlikte hareket etme durumudur. Yoldaş kişiyi, yoldaşlık ise kişiler arasındaki bağı anlatır.",
        example: "Yıllarca aynı amaç için çalışan iki arkadaşın yoldaşlığı, yolları ayrıldıktan sonra da sürdü.",
        relatedWords: ["yoldaş"],
    },
};

export const editorialWordNames = Object.keys(entries);

export function getWordEditorial(wordName: string, locale: string): WordEditorial | undefined {
    return locale === "tr" && Object.hasOwn(entries, wordName) ? entries[wordName] : undefined;
}
