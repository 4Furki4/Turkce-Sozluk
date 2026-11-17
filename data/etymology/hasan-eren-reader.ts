// Editorial summaries of Hasan Eren, Türk Dilinin Etimolojik Sözlüğü (1999),
// printed pages 1–10. Keys identify the corresponding entry in the scan.
type ReaderSummary = {
  meaning?: string;
  origin: string;
  lastPage?: number;
  related?: string[];
};

export const hasanErenReader: Record<string, ReaderSummary> = {
  "p1-l1": {
    meaning: "Kalın yün kumaşı veya bu kumaştan yapılan giysi.",
    origin: "Eren, kelimeyi yün manto anlamındaki Arapça bir söze bağlar.",
  },
  "p1-l12": {
    meaning: "Lambanın ışığını bir yöne toplayan siper.",
    origin: "Fransızca abat-jour sözünden gelir. Eren, aynı Fransızca biçimin Türkçedeki pancur ve panjur ile ilişkisine de değinir.",
  },
  "p1-l24": {
    meaning: "Aşağı, alt.",
    origin: "İtalyanca abbasso sözünden gelir.",
  },
  "p1-l30": {
    origin: "Eren bu başlıkta okuru habazan maddesine yönlendirir.",
  },
  "p1-l32": {
    meaning: "Bir tür balık ağı.",
    origin: "Eren, kelimeyi Rumcada bir ağ türünü adlandıran biçimin çoğuluna bağlar. Bu ağ adının da “basit” anlamındaki bir sıfattan türediğini belirtir.",
  },
  "p1-l47": {
    meaning: "Yelkeni idare etmeye yarayan halat.",
    origin: "Rumcadan alınmış bir denizcilik sözü.",
  },
  "p1-l53": {
    meaning: "Bir yerin dışarıyla bağlantısını güç kullanarak kesme, kuşatma.",
    origin: "Eren, abluka ve abloka biçimlerini Venedik İtalyancasındaki ablóco sözüne bağlar. Bu biçimin Rumcaya da geçtiğini belirtir.",
  },
  "p1-l2": {
    meaning: "Terazinin hafif gelen kefesini dengelemek için konan ağırlık, dara.",
    origin: "Eren, kelimeyi Ermenice apray biçimine, onu da Arapçaya bağlar. Anadolu ağızlarında abara, apra ve arba biçimleri de görülür.",
  },
  "p1-l25": {
    meaning: "Başarmak veya bir deniz taşıtını yönetmek.",
    origin: "Eren, kelimeyi kurtarmak ve yardım etmek gibi anlamları olan Moğolca abura- fiiline bağlar. Kumancada abra- biçimi görülür.",
  },
  "p1-l49": {
    meaning: "Alacalı, benekli.",
    origin: "Arapçada benekli veya alacalı anlamına gelen bir sözden alınmıştır.",
  },
  "p1-l55": {
    meaning: "Yerel ağızlarda nisan ayı.",
    origin: "Eren, ay adını Rumcaya bağlar. Abril gibi b’li biçimlerin Ermenice üzerinden geçmiş olabileceğini de belirtir.",
  },
  "p2-l0": {
    meaning: "Hantal, kaba veya özensiz giyinen kimse.",
    origin: "Eren, kelimeyi Anadolu ağızlarındaki abul abut sözüyle açıklar. İlk parçayı obur ile ilişkilendirir. Abut bu ağızlarda “iş bilmez, sersem” anlamındadır.",
  },
  "p2-l25": {
    meaning: "Gürbüz, dinç veya becerikli. Kitapta semiz ve yeni anlamları da verilir.",
    origin: "Eren, kelimeyi Arapçaya bağlar. Anadolu ağızlarında acer biçimi de kullanılır.",
  },
  "p2-l38": {
    meaning: "Yaban turpu.",
    origin: "Bazı araştırmacılar eski Çağatay sözlüklerindeki “yaban turpu” anlamını yazma hatası saymıştır. Eren, bu anlamın Anadolu ağızlarında da yaşadığını vurgular. Çağataycada Moğolcadan alınmış ve “aygır” anlamına gelen bir acırga da vardır.",
  },
  "p2-l34": {
    meaning: "Çizgili ve tüylü bir hıyar türü.",
    origin: "Eren, kelimeyi Arapçaya bağlar. Anadolu ağızlarında acır biçimi de yaşar.",
  },
  "p2-l52": {
    meaning: "Her yanı suyla çevrili kara parçası.",
    origin: "Eren, ada sözünün başka Türk dillerindeki biçimlerini ve tarihî otrug gibi başka ada adlarını karşılaştırır. Sözcüğün Türkçeden Kürtçeye ve bazı Balkan dillerine geçtiğini belirtir.",
    lastPage: 3,
  },
  "p3-l16": {
    meaning: "Yerel ağızlarda mart ayı.",
    origin: "Suriye Arapçasındaki mart ayı adından gelir. Kürtçede de adar biçimi vardır.",
  },
  "p3-l24": {
    meaning: "Küçük gümüş balığı.",
    origin: "Eren, kelimenin Rumcadan alınmış olabileceğini belirtir.",
  },
  "p3-l31": {
    meaning: "Argoda dost veya metres.",
    origin: "Eren, kelimeyi Rumcada “bu” anlamındaki bir söze bağlar.",
  },
  "p3-l37": {
    meaning: "Argoda önemsiz, değersiz.",
    origin: "Eren, sözü Rumcada “Bu kim?” anlamına gelen bir ifadeyle ilişkilendirir.",
  },
  "p3-l45": {
    meaning: "Şeker ya da pekmez kaynatılarak elde edilen koyu ve yapışkan macun.",
    origin: "Eren, kelimenin Suriye Arapçasındaki bir şurup adından konuşma yoluyla Türkçeye geçtiğini düşünür. Aynı Arapça biçimi akide ile de ilişkilendirir.",
    related: ["p6-l54"],
  },
  "p3-l65": {
    meaning: "Koyun ve keçi sürülerinin gece kaldığı çevrili yer.",
    origin: "Eski Türkçeden beri kullanılan ağıl sözünün kökü Eren’e göre belirsizdir. Eren, Moğolca ayil biçiminin eski bir Türkçe alıntı olduğunu savunur.",
  },
  "p3-l72": {
    meaning: "Ağırlığı fazla olan. Kitapta davranışları yavaş, değeri yüksek ve çetin anlamları da var.",
    origin: "Eren, sözcüğü “ağır gelmek” anlamındaki ağ- fiiline bağlar. Bu fiile -(ı)r eki gelmiştir. Ağır biçimi Eski Türkçeden beri görülür.",
    lastPage: 4,
  },
  "p4-l30": {
    meaning: "Yün eğrilen iğin altına takılan delikli parça.",
    origin: "Eren, ağır sözüne -şak eki gelmiş olabileceğini belirtir. Aynı zamanda bu ekin bir sıfata gelmesinin alışılmadık olduğuna dikkat çeker. Eski örneklerde ağırçak ve ağırşuk biçimleri de bulunur.",
    related: ["p3-l72"],
  },
  "p4-l59": {
    meaning: "Yüzdeki ağız ve onun açıklığı. Bir kabın açıklığı, bir akarsuyun döküldüğü yer ve bölgesel söyleyiş için de kullanılır.",
    origin: "Söz Eski Türkçeden beri belgelenir. Eren, Türk dillerindeki biçimlerini ve sondaki -z sesini ek olarak açıklayan görüşleri aktarır.",
    lastPage: 5,
  },
  "p5-l76": {
    meaning: "Yeni doğurmuş ineğin ilk sütü.",
    origin: "Orta Türkçede ağuz biçimi görülür. Eren, sözün diğer Türk dillerindeki biçimlerini karşılaştırır ve Türkçeden Moğolcaya geçtiğini belirtir.",
  },
  "p5-l78": {
    meaning: "Bazı ağızlarda gübre.",
    origin: "Eren, ahbun sözünü Ermeniceye bağlar. Türkçedeki bölgesel biçimleri arasında ahpun, akpın ve akpun da vardır.",
    lastPage: 6,
  },
  "p6-l10": {
    meaning: "Yavaş, ağır ağır.",
    origin: "Farsça āhista sözünden gelir.",
  },
  "p6-l17": {
    meaning: "At ve sığır gibi hayvanların barındığı kapalı yer.",
    origin: "Eren, kelimeyi Farsça āxūr biçimine bağlar. Orta Türkçede akur biçimi kayıtlıdır. Sözcük Türkçeden Rumcaya ve Arapçaya da geçmiştir.",
  },
  "p6-l40": {
    meaning: "Yabani armut.",
    origin: "Eren, kelimeyi Rumcaya bağlar. Bazı ağızlarda bu ağaca çöğür veya çördek de denir.",
  },
  "p6-l54": {
    meaning: "Şeker kaynatılarak yapılan renkli ve kokulu bir sert şeker.",
    origin: "Eren’e göre akide ve ağda aynı Suriye Arapçası biçimine dayanır. Akidenin yazı diliyle, ağdanın konuşma yoluyla Türkçeye geçtiğini belirtir.",
    related: ["p3-l45"],
  },
  "p6-l78": {
    meaning: "Kuyruğunda zehirli iğnesi olan bir hayvan.",
    origin: "Arapçada aynı hayvanı adlandıran bir sözden alınmıştır.",
  },
  "p6-l1": {
    meaning: "Gündüzün sona erdiği, gecenin başladığı vakit.",
    origin: "Eren, sözcüğü İran dillerine bağlar. Türkçeye hangi İran dilinden geçtiğinin belirsiz olduğunu belirtir. Soğdca ve Harezmce, maddede ele alınan öneriler arasındadır.",
    lastPage: 7,
  },
  "p7-l34": {
    meaning: "Baharat ve çeşitli küçük ihtiyaç ürünleri satan kimse.",
    origin: "Arapçada güzel kokulu yağlar satan kimseyi belirten sözden gelir. Eren, Türkçedeki attar biçiminde iki t’den birinin k’ye dönüşmesiyle aktar biçiminin oluştuğunu açıklar.",
  },
  "p7-l46": {
    meaning: "Bir geminin devrilecek kadar yana yatması. Kitapta serenin dik konuma getirilmesi ve dalyan ağının kaldırılması da geçer.",
    origin: "Eren, denizcilik sözünü Venedik İtalyancasındaki albora biçimine bağlar. Türkçede ikinci ünlü sonradan ortaya çıkmıştır.",
  },
  "p7-l66": {
    meaning: "Çalı ve çırpıdan yapılmış kulübe.",
    origin: "Eski Türkçede alaçu biçimi görülür. Kelimenin daha eski kökü Eren’e göre bilinmiyor. Maddede Türkçe içinden türetme ve başka bir dilden alıntı olma görüşlerine yer verilir.",
  },
  "p7-l73": {
    meaning: "Saman, kuru ot veya mısır sapı.",
    origin: "Yemlik ot ve saman anlamındaki Arapça bir sözden alınmıştır.",
  },
  "p8-l0": {
    meaning: "Avrupa gelenek ve yaşayışına uygun.",
    origin: "İtalyanca alla franca ifadesinden gelir.",
  },
  "p8-l10": {
    meaning: "Balık avlamak veya yük taşımak için kullanılan büyük kayık.",
    origin: "Eren, sözün kökenini bilinmiyor olarak bırakır.",
  },
  "p8-l22": {
    meaning: "Geleneksel Türk yaşayışına ve göreneklerine uygun.",
    origin: "İtalyanca alla turca ifadesinden gelir.",
  },
  "p8-l32": {
    meaning: "Tören topluluğu veya askerî birlik.",
    origin: "Eren, kelimeyi Rumcaya bağlar. Türkçede halay biçimini de anar ve alayın Arapça ile Farsçaya Türkçeden geçtiğini belirtir.",
  },
  "p8-l62": {
    meaning: "Hasatta dökülen tanelerden ertesi yıl kendiliğinden çıkan ekin.",
    origin: "Eren, sözün kökünü bilinmiyor olarak bırakır. Halaza biçiminin başındaki h’nin sonradan ortaya çıktığını belirtir.",
  },
  "p8-l76": {
    meaning: "Alçı taşının ısıtılıp öğütülmesiyle elde edilen madde.",
    origin: "Eren, kökenin belirsiz olduğunu belirtir. Kıbrıs ağzındaki yalçı biçimini ve sözün Türkçeden Balkan dillerine geçtiği örnekleri verir.",
  },
  "p8-l13": {
    meaning: "Argoda gösterişli, fiyakalı veya alımlı.",
    origin: "Köken belirsizdir. Eren, Tietze’nin alangle biçimine dayanan önerisini aktarır.",
  },
  "p8-l23": {
    meaning: "Gemide kullanılan makaralı kısa dikme veya ağır yükleri kaldıran vinçli deniz teknesi.",
    origin: "Eren, kelimeyi Venedik İtalyancasındaki argagno sözüne bağlar. Türkçedeki algarina biçimini de verir.",
  },
  "p8-l41": {
    meaning: "Yabani bir ağaç. Bazı ağızlarda yemişen adı da kullanılır.",
    origin: "Orta Türkçede aluç biçimi vardır. Eren, Farsçadan veya Ermeniceden alınmış olabileceği yönündeki farklı görüşleri aktarır.",
  },
  "p9-l0": {
    meaning: "Eyer, semer veya eskimiş giyecek.",
    origin: "Eski Kıpçakçada ve bazı ağızlarda aluk biçimi görülür. Eren’e göre sözün kökü bilinmiyor.",
  },
  "p9-l9": {
    meaning: "Deniz dibindeki kabukluları toplamak için kullanılan, ağzı demirden ağ.",
    origin: "Eren, kelimeyi Kuzey İtalyancası argagna biçimine bağlar. Türkçede alkarna biçimine ulaşan birkaç ara biçim önerir.",
  },
  "p9-l31": {
    meaning: "Beğeni belirtmek için el çırpma.",
    origin: "Eren, alkış sözünü “övmek” anlamındaki alka- köküne -ş ekinin gelmesiyle açıklar. Eski Türkçede örnekleri vardır.",
  },
  "p9-l71": {
    meaning: "Beşten sonra gelen sayı.",
    origin: "Eren, sözcüğün başka Türk dillerindeki biçimlerini verir. Al- fiiline veya alt sözüne bağlayan açıklamalar maddede farklı öneriler olarak yer alır.",
  },
  "p9-l42": {
    meaning: "Değerli bir metal.",
    origin: "Eski Türkçede altun biçimi görülür. Eren, Moğolca altan ile ilişkisi ve başka köken önerileri üzerine görüşleri aktarır. Sözcüğün daha eski kökeninin belirsiz olduğunu belirtir.",
    lastPage: 10,
  },
  "p10-l56": {
    meaning: "Altı kere on, 60.",
    origin: "Kitabın bu sayfasında altmışın Türk dillerindeki farklı biçimleri karşılaştırılır. Örneğin Kazakçada alpıs, Kırgızcada altımış kullanılır.",
  },
};
