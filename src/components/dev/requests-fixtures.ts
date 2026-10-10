import type { SelectRequest } from "@/db/schema/requests";

export const fixtureStates = ["demo", "worst", "empty", "one", "large", "error", "missing", "loading"] as const;
export type FixtureState = typeof fixtureStates[number];

export const longReason = [
  "Bu düzenleme önerisi, sözcüğün farklı metinlerde kullanılan anlamını mevcut açıklamayla karşılaştırmak için hazırlanmıştır. Tanımdaki son cümle yalnızca tek bir bağlamı kapsıyor; diğer kullanımın da ayrı bir anlam olarak değerlendirilmesini öneriyorum.",
  "Kaynak bağlantısı: https://example.com/arsiv/turkce-sozluk/kaynaklar/2025/duzeltmeler/belge-9f8e7d6c5b4a?surum=12&bolum=metin-karsilastirmasi&inceleme=anlam-ve-ornek. Bağlantının tamamını ekliyorum çünkü aynı belgenin farklı sürümleri bulunuyor.",
  "İlk örnekte sözcük gerçek anlamıyla kullanılıyor. İkinci örnekte ise anlatıcının değerlendirmesini belirtiyor. İki örnek birlikte okunduğunda mevcut tanımın neden eksik kaldığı daha açık görünüyor.",
  "Yazar bilgisinde Aleksandra Wiśniewska-Kowalczyk adı geçiyor. Kaynak künyesindeki aksanları korudum; arama sırasında farklı yazımlar bulunursa aynı kişiye ait oldukları ayrıca doğrulanmalıdır.",
  "Kısa örnek: Jo kitabın kenarına bir not düştü. Uzun örnek: Araştırmacılar, arşivdeki belgeleri karşılaştırıp sözcüğün döneme göre değişen kullanımını ayrıntılı biçimde açıkladılar.",
  "İlgili deyim ayrı bir başlık altında değerlendirilebilir. Bunun aynı anlamı mı genişlettiğini yoksa bağımsız bir kullanımı mı anlattığını belirlemek için örnek cümlenin de korunmasını istiyorum.",
  "İçe aktarılan eski kayıtta dil ve telaffuz bilgileri eksik. Bu alanlar için doğrulanmış bir kaynak bulunmadığından bir değer uydurmadım; mevcut kimliklerin inceleme ekranında görünmesi faydalı olacaktır.",
  "Karşılaştırma notu: 王秀英 — نور الهدى عبد الرحمن. Kaynakta geçen farklı alfabelerdeki adları değiştirmeden aktardım. Noktalama ve satır aralarını özgün metinle karşılaştırırken dikkate alınız.",
  "Önerinin onaylanması hâlinde eski örneğin silinmesi gerekmiyor. Yeni örnek, tanımın kapsamını açıklamak için eklenebilir. Kaynak sürümü ve bu gerekçe inceleme tamamlandıktan sonra da kayıtta korunmalıdır.",
].join("\n\n");
export const longWord = "muvaffakiyetsizleştiricileştiriveremeyebileceklerimizdenmişsinizcesine";

function request(id: number, overrides: Partial<SelectRequest> = {}): SelectRequest {
  return {
    id, userId: "fixture-user", entityType: "words", entityId: null,
    action: "create", status: "pending", requestDate: new Date("2026-10-08T20:30:00Z"),
    reason: null, resolvedAt: null, resolvedBy: null, moderationReason: null,
    newData: { name: "kitap", meanings: [{ meaning: "Okumak için yazılmış yaprakların bir araya getirilmiş biçimi." }] },
    ...overrides,
  };
}

export const demoRequests = [
  request(1),
  request(2, { entityType: "authors", status: "approved", newData: { name: "Yaşar Kemal" }, resolvedAt: new Date("2026-10-09T09:00:00Z") }),
  request(3, { entityType: "related_words", entityId: 1, newData: { relatedWordId: 2, relationType: "synonym" } }),
  request(4, { entityType: "meanings", action: "update", status: "rejected", entityId: 1, newData: { meaning: "Bir eserin basılı biçimi." }, moderationReason: "Mevcut anlam bu kullanımı kapsıyor." }),
];

// These values follow the request schemas and include historical JSON strings.
// Reason, moderation reason, and nested request text have no declared length limit.
export const worstRequests = [
  request(2147483647, { newData: { name: longWord, language: "unknown", phonetic: null, attributes: [999999], meanings: [
    { meaning: longReason, example: { sentence: "👩🏽‍💻 Jo: <b>Bu yazı düz metindir.</b> &amp; **vurgulu**", author: 999999 } },
    { meaning: "王秀英 — نور الهدى عبد الرحمن", attributes: [] },
  ] }, reason: longReason }),
  request(2, { entityType: "authors", status: "approved", newData: { name: "Aleksandra Wiśniewska-Kowalczyk" }, resolvedBy: "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f", resolvedAt: new Date("2025-12-31T23:30:00-08:00"), moderationReason: longReason }),
  request(3, { entityType: "meanings", action: "update", entityId: 1, status: "rejected", newData: { meaning: longReason, sentence: "https://example.com/workspaces/acme/projects/q3-launch/docs/9f8e7d6c5b4a?tab=comments&filter=unresolved", author_id: 999999 }, moderationReason: longReason }),
  request(4, { entityType: "related_words", entityId: 1, newData: { relatedWordId: 999999, relationType: "synonym" } }),
  request(5, { entityType: "pronunciations", entityId: 1, newData: { audio_url: null }, requestDate: new Date("2026-10-13T12:00:00Z") }),
  request(6, { entityType: "roots", action: "delete", status: "approved", newData: { root: "نور الهدى عبد الرحمن" }, requestDate: new Date("1970-01-01T00:00:00Z") }),
  request(7, { entityType: "words", newData: "{historical incomplete JSON", reason: "Eski kayıttaki veriler eksik." }),
  request(8, { entityType: "authors", newData: { name: "Jo" }, requestDate: new Date() }),
  request(9, { entityType: "authors", newData: null }),
  request(10, { entityType: "word_attributes", newData: { attribute: "Sözcüğün tarihî ve bölgesel kullanımına ilişkin açıklayıcı özellik" } }),
  request(11, { entityType: "related_phrases", entityId: 1, newData: { phraseId: 999999, description: longReason } }),
];

export function getFixtureRequests(state: FixtureState): SelectRequest[] {
  if (state === "empty") return [];
  if (state === "one") return [demoRequests[0]];
  if (state === "large") return Array.from({ length: 1284 }, (_, i) => request(i + 1, { status: i % 3 === 0 ? "approved" : "pending" }));
  return state === "worst" ? worstRequests : demoRequests;
}
