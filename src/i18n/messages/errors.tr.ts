import type { ErrorMessages } from './errors.types';

export const errorsTr: ErrorMessages = {
  'lookup.network': ({ subject }) =>
    `"${subject}" aranırken Open Library'ye ulaşılamadı. Ağ bağlantını kontrol et.`,
  'lookup.http': ({ subject, status }) =>
    `Open Library "${subject}" için HTTP ${status} döndürdü. Birazdan tekrar dene.`,
  'lookup.invalidIsbn': ({ value }) => `"${value}" geçerli bir ISBN-10 veya ISBN-13 değil.`,
  'lookup.notFound': ({ isbn }) => `Open Library'de ${isbn} ISBN'li kitap bulunamadı.`,
  'lookup.qrUnrecognized': () => 'Bu QR kodu bir kitap kimliği içermiyor.',

  'api.healthFailed': ({ status }) => `Yapay zekâ sunucusu sağlık kontrolüne yanıt vermedi (HTTP ${status}).`,
  'api.requestFailed': ({ status }) => `Yapay zekâ sunucusu isteği reddetti (HTTP ${status}).`,
  'api.unauthorized': () => 'Bu özelliği kullanmak için giriş yap.',

  'shelf.signInRequired': () => 'Raf tarayıcısını kullanmak için giriş yap.',
  'shelf.noSpines': () => 'Raf tanıma hiç kitap sırtı bulamadı. Daha net ve iyi aydınlatılmış bir fotoğraf dene.',

  'sharedList.missing': ({ listId }) => `${listId} kimlikli paylaşılan liste artık mevcut değil.`,
  'sharedList.alreadyMember': ({ person }) => `${person ?? 'Bu kişi'} zaten bu listenin üyesi.`,
  'sharedList.invalidEmail': ({ email }) => `"${email}" geçerli bir e-posta adresi değil.`,
  'sharedList.alreadyInvited': ({ email }) => `${email} adresine zaten davet gönderildi.`,
  'sharedList.inviteOnly': () => 'Bu liste yalnızca davetle katılıma açık.',

  'storage.schemaMismatch': ({ found, expected, key }) =>
    `Kayıtlı kitaplık ${String(found)} numaralı şema sürümünü kullanıyor, beklenen ${expected}. ` +
    `Sıfırlamak için "${key}" localStorage anahtarını temizle.`,

  'device.audioUnavailable': () => 'Web Audio API bu tarayıcıda kullanılamıyor.',
  'device.canvasUnavailable': () => '2D canvas bu tarayıcıda kullanılamıyor.',

  'firebase.notConfigured': ({ missing }) =>
    `Firebase yapılandırılmamış. Eksik ortam değişkenleri: ${missing}. ` +
    '.env.example dosyasını .env olarak kopyalayıp Firebase web uygulama bilgilerini doldur.',
};
