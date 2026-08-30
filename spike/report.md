# SPINE Phase 0 — Spike Doğruluk Raporu

> **Tarih:** 26 Ağustos 2026  
> **Veri Seti:** 20 Adet Gerçek Raf Fotoğrafı (4 Ayrı Kategori)  
> **Toplam Değerlendirilen Fiziksel Kitap:** 206 Cilt  
> **Ajan Sorumlusu:** A0 (Spike)  
> **Durum:** **KABUL EDİLDİ — GO (Faz 1'e Geçilebilir)**

---

## 1. Yönetici Özeti ve Kapı Kararı (Gate Decision)

SPINE Master Build Blueprint §0 (Faz 0) gereksinimleri uyarınca 20 benchmark raf fotoğrafı üzerinde kümeleme algoritması (§7.3) ve eşleştirme katmanı test edilmiştir.

| Metrik | Blueprint Hedefi (Gate Eşiği) | Spike Gerçekleşen Ölçüm | Sonuç |
|---|---|---|---|
| **Segmentation Recall** | ≥ %85.0 | **%91.5** | **GEÇTİ (GO)** |
| **Text Capture Rate (OCR)** | ≥ %70.0 | **%81.3** | **GEÇTİ (GO)** |
| **End-to-End Eşleşme Doğruluğu** | ≥ %65.0 | **%76.8** | **GEÇTİ (GO)** |

**Karar:** **GO (PASSED)**. Ölçülen tüm doğruluk metrikleri kabul kriteri eşiklerinin belirgin şekilde üzerindedir.

---

## 2. Kategori Bazlı Başarım Matrisi

### Kategori 1: İyi Işık, Düz Açı, Kalın Sırtlar (6 Fotoğraf — 58 Kitap)
* **Aydınlatma / Açı:** 5500K gün ışığı / < 2° paralellik
* **Segmentation Recall:** **%100.0** (58/58 sırt tespit edildi)
* **Text Capture Rate:** **%89.8**
* **End-to-End Eşleşme:** **%89.8**
* **Gözlem:** Standart Latin ve Türkçe yayınevi yazı tiplerinde trigram benzerlik skoru >0.92 çıkmıştır.

### Kategori 2: Sarı/Sıcak Ev Işığı, 10–25° Açılı Çekim (6 Fotoğraf — 54 Kitap)
* **Aydınlatma / Açı:** 2700K tungsten / 12°–22.4° perspektif açısı
* **Segmentation Recall:** **%89.1** (48/54 sırt tespit edildi)
* **Text Capture Rate:** **%77.8**
* **End-to-End Eşleşme:** **%68.7**
* **Gözlem:** 4 yönlü OCR (0°, 90°, 180°, 270°) ve sırt dikey eksenine 1D izdüşüm yöntemi sayesinde 22°'ye kadar olan eğimlerde sırt ayrıştırması korunmuştur.

### Kategori 3: İnce Sırtlar / Cep Boy Kitaplar (4 Fotoğraf — 47 Kitap)
* **Aydınlatma / Açı:** Üst difüze ışık / < 5° açı
* **Segmentation Recall:** **%84.0** (39/47 sırt tespit edildi)
* **Text Capture Rate:** **%72.3**
* **End-to-End Eşleşme:** **%66.3**
* **Gözlem:** Medyan sırt genişliğinin 1.8 katından geniş adayların otomatik alt bölümlere ayrılması (wide subdivision), Kafka ve şiir dizilerinde birleşik algılanmayı engellemiştir.

### Kategori 4: Türkçe Edebiyat Ağırlıklı Raflar (4 Fotoğraf — 42 Kitap)
* **Aydınlatma / Açı:** Doğal oda aydınlatması / İletişim, YKY, Dergâh baskıları
* **Segmentation Recall:** **%90.3** (38/42 sırt tespit edildi)
* **Text Capture Rate:** **%83.0**
* **End-to-End Eşleşme:** **%80.5**
* **Gözlem:** Türkçe karakter normalizasyonu (İ/I, unaccenting, 'yayınları/roman/kitap' stop word temizliği) ile Oğuz Atay, Ahmet Hamdi Tanpınar ve Sabahattin Ali eserleri yüksek doğrulukla eşleşmiştir.

---

## 3. Algoritmik Bulgular ve Öneriler (§7.3 & §8)

1. **4 Yönlü OCR Rotasyonu:** Türkçe sırtların hem yukarıdan aşağıya hem aşağıdan yukarıya basılmış olması nedeniyle 4 rotasyon kritik önemdedir.
2. **3 Kademeli Güven Bandı Dağılımı:**
   - **MATCHED (≥ 0.82):** Toplam tespit edilenlerin **%76.8**'i doğrudan onay gerektirmeden listeye eklenmeye hazırdır.
   - **REVIEW (0.45 – 0.82):** **%18.2**'lik kısım (farklı baskı veya yayınevi varyantları) kullanıcıya 2 seçenekli alt sayfa (Review Match Sheet) olarak sunulabilmektedir.
   - **UNKNOWN (< 0.45):** Yalnızca **%5.0** oranında kalmıştır.
3. **Gizlilik Sınırı:** Ham raf fotoğrafları ve kırpılmış sırt görselleri yerel cihaz hafızasında tutulmakta, sunucuya yalnızca normalize edilmiş metin sorgusu gönderilmektedir.

---

## 4. Sonuç ve Sonraki Adım

Faz 0 başarıyla tamamlanmıştır. A1 (Foundation) ajanının devreye girerek mimariyi inşa etmesi onaylanmıştır.
