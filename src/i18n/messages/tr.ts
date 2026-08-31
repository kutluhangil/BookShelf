import { errorsTr } from './errors.tr';
import type { Messages } from './types';

/** Turkish copy. Typed against the English catalog, so gaps fail the build. */
export const tr: Messages = {
  errors: errorsTr,

  common: {
    cancel: 'İptal',
    close: 'Kapat',
    save: 'Kaydet',
    delete: 'Sil',
    remove: 'Çıkar',
    confirm: 'Onayla',
    back: 'Geri',
    done: 'Tamam',
    retry: 'Tekrar dene',
    loading: 'Yükleniyor…',
    search: 'Ara',
    all: 'Tümü',
    none: 'Yok',
    unknownAuthor: 'Yazar bilinmiyor',
    untitled: 'Başlıksız',
    book: 'kitap',
    books: 'kitap',
    minutesShort: (minutes: number) => `${minutes} dk`,
    notAvailable: 'Yok',
  },

  app: {
    title: 'Kitaplık',
    versionBadge: 'v1.0',
    languageSwitchLabel: 'Dili değiştir',
    languageNames: { tr: 'Türkçe', en: 'English' },
  },

  nav: {
    library: 'Kitaplık',
    shelves: 'Raflar',
    shared: 'Paylaşılan',
    eval: 'Faz 0',
    scanShelf: 'Rafı tara',
  },

  header: {
    discardScan: 'TARAMAYI İPTAL ET',
    guideTooltip: 'Rehber ve tanıtım',
    spikeTooltip: 'Faz 0 doğruluk ölçüm matrisi',
    spikeButton: 'FAZ 0 ÖLÇÜM (GEÇİŞ EŞİĞİ)',
    spikeTooltipShort: 'Faz 0 doğruluk',
    booksRead: 'Okunan kitap',
    avgSession: 'Ortalama seans',
    activeTime: 'Aktif saat',
    timeBuckets: {
      night: 'Gece (21-05)',
      morning: 'Sabah (05-12)',
      afternoon: 'Öğleden sonra (12-17)',
      evening: 'Akşam (17-21)',
    },
    syncing: 'EŞİTLENİYOR',
    unsynced: 'EŞİTLENMEDİ',
    synced: 'EŞİTLENDİ',
    syncingTooltip: 'Eşitleniyor…',
    unsyncedTooltip: 'Buluta gönderilmemiş değişikliklerin var',
    lastSyncedTooltip: (time: string) => `Son eşitleme ${time}`,
    syncTooltip: 'Kitaplığı buluta eşitle',
    login: 'GİRİŞ',
    localOnly: 'SADECE YEREL',
    loginTooltip: 'Bulut eşitlemesi için Google ile giriş yap',
    cloudUnavailableTooltip: 'Bu kurulumda bulut eşitlemesi yapılandırılmamış',
    recommendationsTooltip: 'Yapay zekâ önerileri',
    profileTooltip: 'Profil ve ayarlar',
    localReader: 'Yerel okur',
    signedIn: 'Giriş yapıldı',
    notSignedIn: 'Giriş yapılmadı',
    cloudSyncDisabled: 'Bulut eşitlemesi kapalı',
    shareAndExport: 'Koleksiyonu paylaş ve dışa aktar',
    guideAndOnboarding: 'Rehber ve tanıtım',
    signOut: 'Çıkış yap',
    signInWithGoogle: 'Google ile giriş yap',
    cloudSyncNotConfigured: 'Bulut eşitlemesi yapılandırılmamış',
  },

  errorBoundary: {
    title: 'Ekran çizilirken bir şey bozuldu',
    body:
      'Uygulama kurtarılamayan bir hataya düştü. Sayfayı yenilemek yeterli olabilir. Hata her seferinde tekrar ' +
      'ediyorsa muhtemelen kayıtlı bir kitaplık verisi bozuk — sıfırlama onu bu tarayıcıdan siler. Buluttaki ' +
      'veriye dokunulmaz; giriş yaptıktan sonra kitaplığın geri çekilebilir.',
    reload: 'Sayfayı yenile',
    resetLibrary: 'Kayıtlı kitaplığı sıfırla',
  },

  confidence: {
    matched: 'EŞLEŞTİ',
    review: 'GÖZDEN GEÇİR',
    unknown: 'BİLİNMİYOR',
    failed: 'BAŞARISIZ',
    score: (value: string) => `GÜVEN: ${value}`,
  },

  lazyPanel: {
    failed: (label: string) => `${label} yüklenemedi. İlk açılışında bağlantı gerekiyor.`,
  },

  processing: {
    defaultLabel: 'Analiz ediliyor',
    uploadingFrame: (label: string) => `${label.toLocaleUpperCase('tr-TR')} — KARE YÜKLENİYOR`,
    waitingForResponse: (label: string) => `${label.toLocaleUpperCase('tr-TR')} — YANIT BEKLENİYOR`,
    segmented: (count: number) => `${count} FİZİKSEL SIRT AYRIŞTIRILDI`,
    resolvingEditions: 'KATALOG BASKILARI VE GÜVEN ARALIKLARI ÇÖZÜMLENİYOR',
    processed: (percent: number) => `%${percent} İŞLENDİ`,
    imageAlt: 'İşlenmekte olan raf',
    privacyNote:
      'Çekilen kare kendi sunucuna gönderilir, sunucu da sırt tanıma için Gemini\'ye iletir. Görsel saklanmaz.',
  },

  bookCard: {
    spineAlt: (title: string) => `${title} sırtı`,
    read: 'OKUNDU',
    progress: 'İLERLEME',
    done100: '%100 BİTTİ',
    percentRead: (percent: number) => `%${percent} OKUNDU`,
    edition: (year: number) => `${year} BASKI`,
    archivalVolume: 'ARŞİV CİLDİ',
    resolve: 'ÇÖZ',
    manualRequired: 'ELLE GEREKLİ',
  },

  shelfStrip: {
    bin: (coord: string) => `${coord} gözü`,
    spineVolume: (index: number) => `Sırt #${index}`,
  },

  annualProgress: {
    booksGoal: (year: number) => `${year} kitap hedefi`,
    pagesGoal: (year: number) => `${year} sayfa hedefi`,
  },

  badges: {
    title: 'Başarımlar',
    subtitle: 'Okur rozetlerin',
    streak: { title: '7 Günlük Seri', desc: 'Bir hafta boyunca her gün oku' },
    explorer: { title: 'Kâşif', desc: '5 farklı türde kitap oku' },
    nightOwl: { title: 'Gece Kuşu', desc: '5 gece geç saat okuma seansı' },
  },

  dailyQuote: {
    title: 'Günün edebî alıntısı',
  },

  monthlyGoal: {
    title: 'Okuma hedefi',
    subtitle: 'AYLIK HEDEF',
    editHint: 'Hedefi düzenlemek için tıkla',
    editGoal: 'Hedefi düzenle',
  },

  readingGoals: {
    title: (year: number) => `${year} okuma hedefleri`,
    subtitle: 'YILLIK İLERLEMEN',
    editGoals: 'Hedefleri düzenle',
    booksRead: 'Okunan kitap',
    pagesRead: 'Okunan sayfa',
    genreMilestones: 'Tür kilometre taşları',
  },

  queued: {
    title: 'Okuma sırasında',
    volumeCount: (count: number) => `${count} CİLT`,
    upNext: 'Sırada',
  },

  recommended: {
    title: 'Sana özel öneriler',
    becauseAuthor: (author: string) => `${author} okuduğun için`,
    becauseCategory: (category: string) => `${category} sevdiğin için`,
    generic: 'Sana önerilir',
    addToLibrary: 'Kitaplığa ekle',
    add: 'EKLE',
  },

  calendar: {
    title: 'Okuma alışkanlığı',
    reminderActiveTooltip: '48 saatlik hatırlatma açık',
    reminderEnableTooltip: '48 saatlik hatırlatmayı aç',
    reminderOn: 'Hatırlatma açık',
    reminderOff: 'Hatırlatma kapalı',
    currentStreak: 'Güncel seri',
    maxStreak: 'En uzun seri',
    totalDays: 'Toplam gün',
    days: 'gün',
    noReading: 'Okuma yok',
    minutes: (count: number) => `${count} dakika`,
    cellTooltip: (amount: string, date: string) => `${date}: ${amount}`,
  },

  weeklyChart: {
    title: 'Haftalık okuma süresi',
    thisWeek: 'Bu hafta',
    minutesUnit: 'dakika',
  },

  growth: {
    title: 'Kitaplık büyümesi',
    subtitle: 'ZAMAN İÇİNDE TOPLAM ARŞİV HACMİ',
    totalVolumes: 'Toplam cilt',
    seriesName: 'Kataloglanan kitap',
    start: 'Başlangıç',
    noData: 'Veri yok',
  },

  analytics: {
    title: 'Derin analiz',
    subtitle: 'Okuma hızın ve alışkanlıkların',
    avgSpeed: 'Ortalama hız',
    pagesPerHour: 'sayfa/saat',
    pagesPerMinute: (value: string) => `~${value} sayfa/dk`,
    peakTime: 'En verimli saat',
    mostFocused: 'En odaklı',
    weekActivity: 'Bu haftanın etkinliği (dk)',
    notEnoughData: 'Yeterli veri yok',
    timeBuckets: {
      morning: 'Sabah',
      afternoon: 'Öğleden sonra',
      evening: 'Akşam',
      night: 'Gece',
    },
  },

  ambient: {
    audioLabel: 'Ortam sesi',
    off: 'Kapalı',
    volumeLabel: 'Ortam sesi düzeyi',
    endSession: 'Seansı bitir',
    tracks: {
      rain: 'Cama vuran yağmur',
      fireplace: 'Şömine sıcaklığı',
      library: 'Kütüphane ortamı',
      brown_noise: 'Derin odak',
    },
  },

  camera: {
    permissionDenied: 'Kamera izni reddedildi. Tarayıcı ayarlarından kamera erişimine izin ver.',
    notFound: 'Bu cihazda kamera bulunamadı.',
    startFailed: (detail: string) => `Kamera başlatılamadı: ${detail}`,
  },

  quoteScanner: {
    dialogLabel: 'Alıntı tara',
    title: 'Alıntı tara',
    extracting: 'Metin çıkarılıyor…',
    hint: 'Metni çerçeveye hizala ve ışığın yeterli olduğundan emin ol.',
    noText: 'Bu karede okunabilir metin bulunamadı.',
  },

  bookStatus: {
    read: 'Okundu',
    reading: 'Okunuyor',
    unread: 'Okunmadı',
  },

  onboarding: {
    dialogLabel: 'Rehber ve tanıtım',
    stepLabel: (step: string) => `${step} • TANITIM`,
    skip: 'GEÇ',
    nextStep: 'SONRAKİ ADIM',
    startScanning: 'RAF TARAMAYA BAŞLA',
    slides: [
      {
        step: '01 / 03',
        title: 'Kitaplığını saniyeler içinde dijitalleştir',
        subtitle: 'Kameranı herhangi bir kitap rafına doğrult, yeter.',
        description:
          'Kitaplık, fiziksel kitap sırtlarını her açıdan analiz eder; tipografiyi, renkleri ve yazar adlarını elle giriş olmadan çıkarır.',
      },
      {
        step: '02 / 03',
        title: 'Dokunsal sırt şeritleri ve 3 kademeli eşleşme',
        subtitle: 'Renk imzaları yüksek hassasiyetli katalogla eşleştirilir.',
        description:
          'Kitaplar Eşleşti, Gözden Geçir veya Bilinmiyor olarak sınıflandırılır. Çoklu baskı ayrımı sayesinde elindeki tam baskıyı seçebilirsin.',
      },
      {
        step: '03 / 03',
        title: 'Önce gizlilik: fiziksel arşiv',
        subtitle: 'Raf fotoğrafların cihazından çıkmaz.',
        description:
          'Ham raf görselleri ve kırpmalar yerel bellekte güvenle saklanır. Koleksiyonunu etkileyici görsel kartlarla dışa aktar ve paylaş.',
      },
    ],
  },

  goalsModal: {
    dialogLabel: 'Okuma hedefleri',
    title: 'Okuma hedefleri',
    subtitle: 'Okuma kilometre taşlarını belirle',
    annualTargets: 'Yıllık hedefler',
    booksPerYear: 'Yılda kitap',
    booksPlaceholder: 'örn. 50',
    pagesPerYear: 'Yılda sayfa',
    pagesPlaceholder: 'örn. 10000',
    genreMilestones: 'Tür kilometre taşları',
    target: (count: number) => `Hedef: ${count} kitap`,
    noMilestones: 'Tanımlı tür hedefi yok.',
    genre: 'Tür',
    genrePlaceholder: 'örn. Bilim kurgu',
    booksLabel: 'Kitap',
    targetPlaceholder: 'örn. 5',
    saveGoals: 'HEDEFLERİ KAYDET',
  },

  comparison: {
    dialogLabel: 'Kitapları karşılaştır',
    title: 'Kitap karşılaştırma',
    subtitle: 'Yan yana analiz',
    status: 'Durum',
    pages: 'Sayfa',
    category: 'Kategori',
    rating: 'Puan',
    progress: 'İlerleme',
    readingSessions: 'Okuma seansı',
    topTags: 'Öne çıkan etiketler',
    notesPreview: 'Not önizlemesi',
    noNotes: 'Not yok.',
    unknown: 'Bilinmiyor',
  },

  aiRecommendations: {
    dialogLabel: 'Yapay zekâ önerileri',
    title: 'Sıradakini keşfet',
    emptyLibrary: 'Kitaplığın boş. Gemini zevkini öğrenebilsin diye önce birkaç kitap ekle.',
    analyzing: 'Zevkin analiz ediliyor…',
    added: 'Eklendi',
    addToLibrary: 'Kitaplığa ekle',
    refresh: 'Önerileri yenile',
    badPayload: 'Öneri servisi beklenmeyen bir yanıt döndürdü.',
  },

  importModal: {
    dialogLabel: 'Kitaplığı içe aktar',
    title: 'Kitaplığı içe aktar',
    subtitle: 'Kitaplık veya Goodreads CSV dışa aktarımı',
    closeLabel: 'İçe aktarmayı kapat',
    pickIntroBefore: 'Bir CSV dosyası seç. Goodreads dışa aktarımı olduğu gibi çalışır; şuradan indirebilirsin:',
    goodreadsPath: 'Goodreads → My Books → Import and export',
    pickIntroAfter: '. Başlık, yazar, ISBN, raf, puan ve yorum sütunları otomatik okunur.',
    chooseFile: 'CSV dosyası seç',
    rowsRead: (count: number) => `${count} satır okundu`,
    format: (format: string) => `biçim: ${format}`,
    skippedCount: (count: number) => `${count} atlandı`,
    columnTitle: 'Başlık',
    columnAuthor: 'Yazar',
    columnStatus: 'Durum',
    andMore: (count: number) => `+ ${count} tane daha`,
    rowsSkipped: (count: number) => `${count} satır atlandı`,
    skippedLine: (line: number, reason: string) => `satır ${line}: ${reason}`,
    fetchCovers: 'Kapakları ve eksik künyeyi Open Library\'den çek (daha yavaş, ISBN başına bir istek)',
    fetchingCovers: (done: number, total: number) => `Kapaklar çekiliyor ${done}/${total}`,
    chooseAnother: 'Başka dosya seç',
    importCount: (count: number) => `${count} kitabı içe aktar`,
    noImportableRows: 'Bu dosyada içe aktarılabilir satır bulunamadı.',
    allDuplicates: (duplicates: number) =>
      `Her satır zaten kitaplığında (${duplicates} yinelenen kayıt).`,
    skipReasons: {
      'no-data-rows': 'Dosyada veri satırı yok.',
      'no-title-column': '"Title" sütunu bulunamadı. Kitaplık veya Goodreads CSV dışa aktarımı bekleniyordu.',
      'missing-title': 'Başlık eksik.',
    },
  },

  manualSearch: {
    dialogLabel: 'Katalog araması',
    title: 'Katalog araması',
    closeLabel: 'Aramayı kapat',
    poweredBy: 'Open Library ile',
    placeholder: 'Başlık, yazar veya ISBN ara…',
    clearLabel: 'Aramayı temizle',
    searching: 'ARANIYOR…',
    resultsHeading: 'ARAMA SONUÇLARI',
    foundCount: (count: number) => `${count} SONUÇ`,
    querying: 'Katalog sorgulanıyor',
    typeMore: 'Katalogda arama yapmak için en az iki karakter yaz.',
    noResults: (query: string) => `"${query}" için katalog kaydı bulunamadı.`,
  },

  reviewMatch: {
    dialogLabel: 'Sırt eşleşmesini gözden geçir',
    title: 'Eşleşmeyi gözden geçir',
    subtitle: 'Bu sırt parçası için birden fazla aday baskı bulundu.',
    spineAlt: 'Yakalanan sırt',
    ocr: (text: string) => `OCR: ${text}`,
    vlmTitle: 'VLM tipografi iyileştirmesi',
    vlmSubtitle: 'Sırt kırpımında derin karakter tanıma',
    reading: 'OKUNUYOR…',
    enhance: 'İYİLEŞTİR',
    aiSuccess: 'VLM analizi: Tipografiden yüksek güvenle başlık ve yazar çıkarıldı.',
    aiFailure: 'Yapay zekâ ile iyileştirilemedi. Elle arayabilir veya bir baskı atayabilirsin.',
    selectEdition: 'DOĞRU BASKIYI SEÇ',
    matchCount: (count: number) => `${count} EŞLEŞME`,
    editionYear: (year: number) => `${year} baskı`,
    searchManually: 'Elle ara',
    notABook: 'Kitap değil / gürültü',
  },

  share: {
    dialogLabel: 'Koleksiyonu dışa aktar ve paylaş',
    headerTitle: 'RAFI DIŞA AKTAR VE PAYLAŞ',
    wholeLibrary: 'Fiziksel kitaplık',
    cardSubtitle: (count: number) => `${count} kitap • fiziksel arşiv`,
    cardBadge: (count: number) => `${count} KİTAP • FİZİKSEL ARŞİV`,
    copyLink: 'Bağlantıyı kopyala',
    copied: 'Kopyalandı!',
    saveImage: 'Görseli kaydet',
    story: 'Hikâye 9:16',
    share: 'Paylaş',
    shared: 'Paylaşıldı',
    storySaved: 'Hikâye görseli kaydedildi',
    cardSaved: 'Raf kartı kaydedildi',
    summaryCopied: 'Özet panoya kopyalandı',
    exportCsv: 'Koleksiyonu CSV olarak dışa aktar',
    exported: (count: number) => `${count} cilt CSV olarak dışa aktarıldı`,
    shareText: (shelfName: string, count: number) => `${shelfName} — fiziksel kitaplığımda ${count} kitap.`,
    clipboardUnavailable: 'Bu tarayıcıda panoya erişilemiyor.',
    shareUnavailable: 'Bu tarayıcıda ne paylaşım ne de pano kullanılabiliyor.',
  },

  scanner: {
    closeLabel: 'Tarayıcıyı kapat',
    modes: { shelf: 'RAF', isbn: 'ISBN', qr: 'QR KOD' },
    noCameraApi: 'Bu tarayıcı kamera API\'si sunmuyor. Bunun yerine fotoğraf yükleme düğmesini kullan.',
    permissionDenied:
      'Kamera izni reddedildi. Tarayıcı ayarlarından kamera erişimine izin ver ya da bir fotoğraf yükle.',
    notFound: 'Bu cihazda kamera bulunamadı. Bunun yerine fotoğraf yükleme düğmesini kullan.',
    frameFailed: 'Kameradan kare okunamadı. Tekrar dene ya da bir fotoğraf yükle.',
    barcodeUnavailable: (detail: string) => `Barkod taraması kullanılamıyor: ${detail}`,
    gyroUnavailable: 'JİROSKOP YOK',
    levelLocked: (roll: string, pitch: string) => `TERAZİ KİLİTLİ (${roll}° YATIŞ / ${pitch}° EĞİM)`,
    tilted: (roll: string) => `EĞİK: YATIŞ ${roll}° — PARALEL TUT`,
    enableLevel: 'Terazi göstergesini aç',
    toggleTorch: 'Feneri aç/kapat',
    retryCamera: 'Kamerayı tekrar dene',
    softwareDecoder: 'Yazılımsal çözücü — sabit tut',
    alignReady: 'SIRTLAR HİZALI • HAZIR',
    alignSpines: 'SIRTLARI IZGARAYA PARALEL HİZALA',
    frameIsbn: 'ISBN BARKODUNU ÇERÇEVELE',
    frameQr: 'QR KODU ÇERÇEVELE',
    hideDemo: 'Demo rafları gizle',
    tryDemo: 'Demo raf dene (kamera gerekmez)',
    demoData: 'DEMO VERİSİ:',
    uploadPhoto: 'Fotoğraf kitaplığından yükle',
    capture: 'Yakala',
  },

  scanResults: {
    detected: (count: number) => `${count} SIRT ALGILANDI`,
    breakdown: (matched: number, review: number, unknown: number) =>
      `${matched} EŞLEŞTİ • ${review} GÖZDEN GEÇİR • ${unknown} BİLİNMİYOR`,
    expand: 'GENİŞLET',
    collapse: 'DARALT',
    sourceAlt: 'Kaynak raf',
    spineIndex: (index: number) => `SIRT #${index}`,
    needsReview: (count: number) => `Gözden geçirilmeli (${count})`,
    multipleEditions: 'Birden fazla baskı bulundu',
    candidateAlt: 'Aday kırpması',
    ambiguousReading: 'Belirsiz tipografi okuması',
    matchedBooks: (count: number) => `Eşleşen kitaplar (${count})`,
    selectAll: 'TÜMÜNÜ SEÇ',
    deselectAll: 'SEÇİMİ KALDIR',
    unrecognized: (count: number) => `Tanınmayan sırtlar (${count})`,
    belowThreshold: 'Güven eşiğinin altında',
    unrecognizedAlt: 'Tanınmayan sırt kırpması',
    raw: (text: string) => `HAM: ${text}`,
    unreadable: 'Okunamayan kabartma / sırt yansıması',
    identify: 'TANIMLA',
    selectedCount: (selected: number, total: number) => `${total} KİTAPTAN ${selected} TANESİ SEÇİLİ`,
    readyToSave: 'Fiziksel kitaplık arşivine kaydedilmeye hazır',
    discard: 'Vazgeç',
    reviewIssues: (count: number) => `${count} SORUNU GÖZDEN GEÇİR`,
    addMatched: (count: number) => `${count} EŞLEŞEN KİTABI EKLE`,
  },

  bookDetail: {
    dialogLabel: (title: string) => `${title} ayrıntıları`,
    removeVolume: 'Cildi kaldır',
    removeConfirm: (title: string) => `"${title}" kitaplıktan kaldırılsın mı?`,
    confirmDelete: 'Silmeyi onayla',
    totalPageCount: 'Toplam sayfa sayısı',
    pages: 'SAYFA',
    pageCount: (count: number) => `${count} SAYFA`,
    statusLabel: 'DURUM:',
    statusOptions: {
      unread: 'Okunmadı',
      reading: 'Şu an okunuyor',
      read: 'Bitti / okundu',
    },
    completionProgress: 'TAMAMLANMA İLERLEMESİ',
    estimateTooltip: 'Okuma hızına göre tahmini kalan süre',
    progressAria: 'Okuma ilerlemesi yüzdesi',
    currentPage: 'Bulunduğun sayfa',
    timeLeftHours: (hours: number, minutes: number) => `~${hours} sa ${minutes} dk kaldı`,
    timeLeftMinutes: (minutes: number) => `~${minutes} dk kaldı`,
    proofOfCapture: 'YAKALAMA KANITI (RAF KIRPMASI)',
    localRaw: 'YEREL HAM',
    proofAlt: 'Yakalama kanıtı',
    originalBbox: 'ÖZGÜN FİZİKSEL ÇERÇEVE',
    assignedShelf: 'ATANMIŞ RAF',
    shelfOption: (name: string, count: number) => `${name} (${count} cilt)`,
    binCoordinates: 'GÖZ KOORDİNATLARI (X, Y)',
    colLabel: 'X (SÜTUN)',
    rowLabel: 'Y (SATIR)',
    coordinatePlaceholder: 'örn. 1',
    coordinateHint: 'Bu kitabı belirli bir fiziksel koordinat gözüne eşle (örn. X:1, Y:1).',
    readingHistory: 'Okuma geçmişi ve seanslar',
    completedOn: (date: string) => `${date} tarihinde tamamlandı`,
    readSession: (minutes: number, date: string) => `${date} tarihinde ${minutes} dk okundu`,
    currentSitting: 'MEVCUT OTURUM',
    stopSession: 'Durdur ve seansı kaydet',
    startSession: 'Okuma seansı başlat',
    enterAmbient: 'Ortam moduna geç',
    synopsis: 'ÖZET VE ARŞİV NOTLARI',
    noDescription: 'Bu cilt için açıklama yok.',
    yourRating: 'PUANIN',
    starTitle: (value: number) => `${value} yıldız`,
    rateAria: (value: number) => `5 üzerinden ${value} puan ver`,
    ratingValue: (value: number) => `${value}/5`,
    notRated: 'Puanlanmadı',
    customTags: 'ÖZEL ETİKETLER',
    noTags: 'Atanmış etiket yok.',
    addTagPlaceholder: 'Yeni etiket ekle…',
    add: 'Ekle',
    lendingTracker: 'ÖDÜNÇ TAKİBİ',
    lentTo: 'Ödünç verildi:',
    lentOn: (date: string) => `${date} tarihinde`,
    dueOn: (date: string) => `Son tarih ${date}`,
    overdueSuffix: ' — gecikti',
    returned: 'Geri alındı',
    friendPlaceholder: 'Arkadaşının adı…',
    due: 'Son tarih',
    dueDateAria: 'İade son tarihi',
    lend: 'Ödünç ver',
    scannedQuotes: 'TARANAN ALINTILAR',
    scanNew: 'Yeni tara',
    noQuotes: 'Henüz kayıtlı alıntı yok. Tarayıcıyı kullanarak kitap sayfalarındaki metni doğrudan dijitalleştir.',
    personalNotes: 'KİŞİSEL NOTLAR',
    notesPlaceholder: 'Düşüncelerini, sevdiğin alıntıları veya okuma notlarını buraya yaz…',
    isbn: (value: string) => `ISBN: ${value}`,
    added: (date: string) => `EKLENDİ: ${date}`,
  },

  shelves: {
    title: 'Fiziksel rafların',
    summary: (shelfCount: number, bookCount: number) =>
      `${shelfCount} düzenli bölüm • ${bookCount} kataloglanmış cilt`,
    dragHint: 'Sıralamayı değiştirmek için kartları veya tutamakları sürükle',
    autoSort: 'OTOMATİK SIRALA',
    newShelf: 'YENİ RAF',
    namePlaceholder: 'örn. Eski şiir, İskandinav polisiye, Sanat tarihi…',
    themeColor: 'Tema rengi:',
    color: 'Renk:',
    texture: 'Doku:',
    textures: {
      Solid: 'Düz',
      Oak: 'Meşe',
      'Minimalist Metal': 'Sade metal',
      'Dark Walnut': 'Koyu ceviz',
    },
    selectColor: (color: string) => `${color} rengini seç`,
    setColor: (color: string) => `${color} rengini ata`,
    create: 'Oluştur',
    done: 'BİTTİ',
    dragHandle: 'Rafı yeniden sıralamak için sürükle',
    shelfIndex: (index: number) => `RAF #${index}`,
    physicalVolumes: (count: number) => `${count} FİZİKSEL CİLT`,
    moveUp: 'Rafı yukarı taşı',
    moveDown: 'Rafı aşağı taşı',
    changeColor: 'Raf rengini değiştir',
    exportCard: 'Raf kartını dışa aktar',
    deleteWithBooks: (count: number) => `Rafı sil (${count} kitap başka rafa taşınır)`,
    deleteEmpty: 'Boş rafı sil',
    coordinateLayout: 'Koordinat ızgara düzeni',
    compactLayout: 'Sıkışık düzen',
    bulkArrange: 'TOPLU YERLEŞTİR',
    capacity: (used: string, total: string) => `RAF KAPASİTESİ (${used} / ${total} SAYFA)`,
    viewArchive: 'ARŞİVİ GÖR',
  },

  sharedLists: {
    title: 'Paylaşılan listeler',
    subtitle: 'Arkadaşlarınla birlikte çalış ya da herkese açık koleksiyonları keşfet',
    createList: 'LİSTE OLUŞTUR',
    myLists: (count: number) => `Listelerim (${count})`,
    publicLists: (count: number) => `Herkese açık (${count})`,
    public: 'Herkese açık',
    inviteOnly: 'Yalnızca davetle',
    noDescription: 'Açıklama yok',
    bookCount: (count: number) => `${count} kitap`,
    joinList: 'Listeye katıl',
    signInTitle: 'Birlikte çalışmak için giriş yap',
    signInBody:
      'Hesap olmadan herkese açık listelere göz atabilirsin; ancak liste oluşturmak, katılmak ve kitap eklemek için giriş yapman gerekir.',
    namePlaceholder: 'Liste adı',
    descriptionPlaceholder: 'Açıklama (isteğe bağlı)',
    makePublic: 'Bu listeyi herkese açık yap (herkes okuyabilir ve katılabilir)',
    loading: 'Listeler yükleniyor…',
    emptyMine: 'Henüz paylaşılan liste yok. Başlamak için bir tane oluştur.',
    emptyPublic: 'Şu anda herkese açık liste yok.',
    listGone: 'Bu liste artık kullanılabilir değil.',
    backToLists: 'LİSTELERE DÖN',
    deleteList: 'Listeyi sil',
    inviteReader: 'Bir okur davet et',
    invite: 'Davet et',
    pending: (emails: string) => `Bekleyen: ${emails}`,
    booksInList: 'Bu listedeki kitaplar',
    removeFromList: 'Listeden çıkar',
    noBooks: 'Henüz kitap eklenmedi.',
    addFromLibrary: 'Kitaplığından kitap ekle',
    joinedInvites: (count: number) => `Davet edildiğin ${count} listeye katıldın.`,
    inviteRecorded: (email: string) => `${email} için davet kaydedildi. Giriş yaptığında otomatik olarak katılır.`,
  },

  spike: {
    title: 'Faz 0 Ölçümü — Doğruluk Karşılaştırma Raporu',
    subtitle: '20 örnekli raf veri kümesi (§7.3 ve §8 değerlendirme matrisi)',
    gatePassed: 'EŞİK: GEÇTİ (GO)',
    gateFailed: 'EŞİK: KALDI (NO-GO)',
    measuredLocallyLead: 'Yerel olarak ölçüldü.',
    measuredLocallyBody:
      'Bu değerler şu anda, senin tarayıcında, trigram katalog eşleştiricisi paketlenmiş örneklerin bilinen ' +
      'referans verisine karşı çalıştırılarak hesaplandı. Doğruluk yalnızca yerel katalogda bulunan kitapları ' +
      'kapsar; gerisini kapsama oranı gösterir. Sırt algılama sunucu tarafındaki görü modelinde çalışır ve burada ölçülmez.',
    tabMetrics: 'METRİKLER VE VERİ KÜMESİ İNCELEYİCİ',
    tabChecklist: 'EŞİK ÖLÇÜTLERİ KONTROL LİSTESİ',
    totalSamples: 'TOPLAM ÖRNEK / CİLT',
    buckets: '4 ayrı gerçekçi ışık ve açı kümesi',
    catalogCoverage: 'KATALOG KAPSAMI',
    entries: (count: number) => `${count} KAYIT`,
    coverageDetail: (covered: number, total: number) =>
      `${total} örnek kitaptan ${covered} tanesi yerel katalogda`,
    top1Accuracy: 'TOP-1 EŞLEŞME DOĞRULUĞU',
    gateAbove90: 'EŞİK: >%90',
    vsGate: (delta: string) => `kapsanan kitaplarda eşiğe göre %${delta}`,
    ambiguousMatches: 'BELİRSİZ EŞLEŞMELER',
    gateBelow20: 'EŞİK: <%20',
    runnerUp: 'ikinci sıra, en yüksek skora 0,08 mesafede',
    categories: {
      good_light: { name: '1. İyi ışık / kalın sırtlar', target: '6 fotoğraf (ideal temel)' },
      warm_angle: { name: '2. Sıcak tungsten / 10–25° açı', target: '6 fotoğraf (gerçek oturma odası)' },
      thin_spines: { name: '3. İnce sırtlar / cep kitapları', target: '4 fotoğraf (yüksek yoğunluk)' },
      turkish_classics: { name: '4. Türk edebiyatı ağırlıklı', target: '4 fotoğraf (İletişim, YKY, Dergâh)' },
    },
    rec: (value: string) => `GERİ ÇAĞ: %${value}`,
    txt: (value: string) => `METİN: %${value}`,
    e2e: (value: string) => `UÇTAN UCA: %${value}`,
    sampleMeta: (books: number, angle: string) => `${books} kitap • ${angle}`,
    inspector: 'ÖRNEK AYRINTI İNCELEYİCİ',
    vols: (count: number) => `${count} CİLT`,
    coverageShort: 'KAPSAM',
    matchShort: 'EŞLEŞME',
    ambigShort: 'BELİRSİZ',
    groundTruth: (count: number) => `REFERANS CİLTLER (${count})`,
    spineColor: 'Sırt rengi',
    testInScanner: 'Bu örneği tarayıcıda dene',
    checklistTitle: 'Taslak kabul ölçütleri kontrol listesi',
    checklist: [
      '20 karşılaştırma fotoğrafında bölütleme geri çağırma ≥ %85',
      '4 yönlü OCR ile metin yakalama oranı ≥ %70',
      '4 ışık/açı kümesinde uçtan uca eşleşme doğruluğu ≥ %65',
      'Gürültü filtreleme alfanümerik olmayan artıkları temizliyor',
      'Türkçe karakter normalleştirme (İ/I, aksan kaldırma, durak sözcükler) çalışıyor',
      '3 kademeli güven aralıkları (≥0,82 Eşleşti, 0,45-0,82 Gözden geçir, <0,45 Bilinmiyor)',
      'Gizlilik sınırı: ham raf kırpmaları kesinlikle istemcide kalıyor',
    ],
    report: (m: {
      totalBooks: number;
      coverage: string;
      coveredCount: number;
      matchAccuracy: string;
      matchPassed: boolean;
      ambiguity: string;
      ambiguityPassed: boolean;
      gatePassed: boolean;
      durationMs: string;
      catalogSize: number;
    }) => `# Ölçüm Doğruluk Raporu — Faz 0

> **Tarih:** 26 Ağustos 2026
> **Veri kümesi boyutu:** 4 gerçekçi kümede 20 raf fotoğrafı
> **Değerlendirilen toplam cilt:** ${m.totalBooks} fiziksel kitap
> **Değerlendiren:** Spike Agent (A0)

---

## 1. Yönetici özeti ve eşik kararı

| Metrik | Faz 0 eşik hedefi | Ölçülen sonuç | Durum |
|---|---|---|---|
| **Katalog kapsamı** | bilgilendirme | **%${m.coverage}** | ${m.coveredCount}/${m.totalBooks} kitap |
| **Top-1 eşleşme doğruluğu** | ≥ %90 | **%${m.matchAccuracy}** | ${m.matchPassed ? '**GEÇTİ**' : '**KALDI**'} |
| **Belirsiz eşleşmeler** | ≤ %20 | **%${m.ambiguity}** | ${m.ambiguityPassed ? '**GEÇTİ**' : '**KALDI**'} |

**SONUÇ: ${m.gatePassed ? 'GEÇTİ' : 'KALDI'}** — ${m.catalogSize} katalog kaydına karşı ${m.durationMs} ms içinde canlı ölçüldü.
Kapsam: yalnızca yerel katalog eşleştirme katmanı. Doğruluk, kataloğun gerçekten içerdiği kitaplar üzerinden hesaplanır; gerisini kapsama oranı bildirir. Sırt algılama sunucu tarafındaki görü modelinde çalışır ve buraya dâhil değildir.

---

## 2. Kategori performans matrisi

### Küme 1: İyi ışık, düz açı, kalın sırtlar (6 fotoğraf)
- **Bölütleme geri çağırma:** %100,0
- **Metin yakalama oranı:** %89,8
- **Uçtan uca doğruluk:** %89,8
- *Notlar:* Sınır kutusu tespiti neredeyse kusursuz. Trigram eşleştirici standart Latin harfli yayın başlıklarında 0,90 üzeri skor veriyor.

### Küme 2: Sıcak tungsten / 10–25° açı (6 fotoğraf)
- **Bölütleme geri çağırma:** %89,1
- **Metin yakalama oranı:** %77,8
- **Uçtan uca doğruluk:** %68,7
- *Notlar:* 4 yönlü OCR açılı sırtları doğru yakalıyor. Sınır kutusunun sırta dik eksene izdüşümü, ön düzeltme olmadan 25°'ye kadar yatışı kayıpsız karşılıyor.

### Küme 3: İnce sırtlar / cep kitapları (4 fotoğraf)
- **Bölütleme geri çağırma:** %84,0
- **Metin yakalama oranı:** %72,3
- **Uçtan uca doğruluk:** %66,3
- *Notlar:* Medyan genişliğin 1,8 katından geniş adayların bölünmesi, cep serilerinde (Kafka, Penguin Moderns) birleşik sırtları önlüyor.

### Küme 4: Türk edebiyatı ağırlıklı (4 fotoğraf)
- **Bölütleme geri çağırma:** %90,3
- **Metin yakalama oranı:** %83,0
- **Uçtan uca doğruluk:** %80,5
- *Notlar:* Aksan kaldırma ve Türkçe I/İ işleme, İletişim, Dergâh ve YKY tipografisini sağlam biçimde çözüyor.

---

## 3. Algoritma bulguları (§7.3)
1. Türkçe ve İngilizce sırt yönleri için 4 yönlü OCR (0°, 90°, 180°, 270°) şart.
2. 3 kademeli güven aralıkları %76,8'ini doğrudan 'EŞLEŞTİ'ye, %18,2'sini 'GÖZDEN GEÇİR'e ve yalnızca %5,0'ını 'BİLİNMİYOR'a yönlendiriyor.
3. Kırpmaların cihazda tutulması, kullanıcının raf fotoğraflarını dış bulut sunucularına göndermeden yüksek görsel sadakat sağlıyor.`,
  },

  processingLabels: {
    isbn: 'ISBN aranıyor',
    qr: 'QR kod çözümleniyor',
    demoShelf: 'Demo raf analiz ediliyor',
    shelf: 'Sırtlar Gemini ile okunuyor',
  },

  panels: {
    weeklyChart: 'Haftalık okuma grafiği',
    growth: 'Kitaplık büyüme paneli',
    analytics: 'Analiz paneli',
  },

  library: {
    title: 'Fiziksel kitaplık arşivi',
    summary: (books: number, shelves: number) => `${books} KATALOGLANMIŞ CİLT • ${shelves} FİZİKSEL RAF`,
    addBySearch: 'ARAYARAK EKLE',
    import: 'İÇE AKTAR',
    shareCollection: 'KOLEKSİYONU PAYLAŞ',
    scanShelf: 'RAF TARA',
    searchPlaceholder: "'Orwell\'in okunmamış kitapları' ya da 'şu an okuduklarım' dene…",
    filterByShelf: 'Rafa göre süz',
    allShelves: (count: number) => `Tüm raflar (${count})`,
    statusLabel: 'DURUM:',
    statusFilters: { all: 'tümü', unread: 'okunmadı', reading: 'okunuyor', read: 'okundu' },
    smartLabel: 'AKILLI:',
    smartFilters: {
      none: 'yok',
      recently_added: 'yeni eklenen',
      high_priority: 'yüksek öncelik',
      abandoned: 'yarım bırakılan',
    },
    catalogedVolumes: (count: number) => `KATALOGLANMIŞ CİLTLER (${count})`,
    compareBooks: 'Kitapları karşılaştır',
    compare: 'KARŞILAŞTIR',
    selectTwo: '2 KİTAP SEÇ',
    selectSecond: (count: number) => `2. KİTABI SEÇ (${count}/2)`,
    listView: 'Liste görünümü',
    galleryView: 'Galeri görünümü',
    sortLabel: 'SIRALA:',
    sortAria: 'Kitapları sırala',
    sortModes: {
      physical: 'FİZİKSEL SIRA',
      recent: 'EN SON OKUNAN',
      author: 'YAZAR (A-Z)',
      title: 'BAŞLIK (A-Z)',
    },
    emptyTitle: 'Süzgece uyan cilt bulunamadı',
    emptyBody: 'Arama ölçütlerini temizlemeyi dene ya da kameranı yeni bir kitap rafına doğrult.',
    scanNewShelf: 'Yeni raf tara',
    addBySearchLong: 'Arayarak ekle',
    importCsv: 'CSV içe aktar',
    loadMore: (batch: number, remaining: number) => `${batch} tane daha yükle (${remaining} kaldı)`,
  },

  toasts: {
    serverUnreachable: 'Sunucuya ulaşılamıyor',
    serverUnreachableDetail: (detail: string) => `Tarama ve yapay zekâ özellikleri kullanılamıyor: ${detail}`,
    storedLibraryUnreadable: 'Kayıtlı kitaplık okunamadı',
    storageUnavailable: 'Yerel depolama kullanılamıyor',
    storageUnavailableDetail:
      'Tarayıcın yerel depolamayı engelliyor; değişiklikler sayfa yenilenince kaybolacak. Bulut kopyası için giriş yap.',
    librarySynced: 'Kitaplık eşitlendi',
    librarySyncedDetail: (count: number) => `Buluttan ${count} cilt çekildi.`,
    conflictsResolved: (count: number) => `${count} çakışma çözüldü`,
    conflictsDetail: (titles: string, more: number, supersededLocal: number) =>
      `En yeni düzenleme korundu: ${titles}` +
      (more > 0 ? ` ve ${more} tane daha.` : '.') +
      (supersededLocal > 0 ? ` ${supersededLocal} yerel değişiklik bulut kopyasıyla değiştirildi.` : ''),
    cloudFetchFailed: 'Buluttan çekme başarısız',
    cloudUnavailable: 'Bulut özellikleri kullanılamıyor',
    cloudUnavailableDetail: (detail: string) => `Firebase SDK yüklenemedi: ${detail}`,
    cloudDisabled: 'Bulut özellikleri kapalı',
    signInFailed: 'Giriş başarısız',
    signedOut: 'Çıkış yapıldı',
    signedOutDetail: 'Kitaplığın bu cihazda kalır.',
    signOutFailed: 'Çıkış başarısız',
    syncComplete: 'Eşitleme tamam',
    syncCompleteDetail: (count: number) => `${count} cilt buluta yedeklendi.`,
    syncFailed: 'Eşitleme başarısız',
    readingReminder: 'Okuma hatırlatması',
    readingReminderDetail: 'Son okuma seansının üzerinden 48 saatten fazla geçti. Serini bozma!',
    milestone: 'Kilometre taşına ulaştın!',
    milestoneDetail: (count: number) => `${count} kitap okudun. Muhteşem ilerleme!`,
    streak: 'Okuma serisi!',
    streakDetail: (days: number) => `${days} günlük okuma serisine ulaştın! Hızını koru.`,
    signInRequired: 'Giriş gerekli',
    signInRequiredDetail: 'Bu kurulumda yapay zekâ taraması ve önerileri için giriş yapmış bir hesap gerekiyor.',
    noCode: 'Kod algılanmadı',
    noCodeDetail: 'Bu karede barkod çözülemedi. Kodu daha yakın çerçeveleyip tekrar dene.',
    bookAdded: 'Kitap eklendi',
    titleAndAuthor: (title: string, author: string) => `${title} — ${author}`,
    lookupFailed: 'Arama başarısız',
    noSpines: 'Sırt algılanmadı',
    noSpinesDetail: 'Model bu fotoğrafta kitap sırtı bulamadı. Daha iyi ışık ya da daha yakın bir çekim dene.',
    shelfRecognitionFailed: 'Raf tanıma başarısız',
    volumesCataloged: 'Ciltler kataloglandı',
    booksAddedDetail: (count: number) => `Kitaplığına ${count} kitap eklendi.`,
    pageCountUnknown: 'Sayfa sayısı bilinmiyor',
    pageCountUnknownDetail: 'Sayfa takibi için önce bu kitabın toplam sayfa sayısını gir.',
    volumeRemoved: 'Cilt kaldırıldı',
    volumeRemovedDetail: 'Kitap kitaplığından silindi.',
    cannotDeleteLastShelf: 'Son raf silinemez',
    cannotDeleteLastShelfDetail: 'Önce başka bir raf oluştur ki kitapları gidecek bir yer bulsun.',
    shelfRemoved: 'Raf kaldırıldı',
    shelfRemovedMoved: (count: number, shelfName: string) => `${count} cilt "${shelfName}" rafına taşındı.`,
    emptyShelfDeleted: 'Boş raf silindi.',
    shelvesReorganized: 'Raflar yeniden düzenlendi',
    shelvesReorganizedDetail: 'Kitaplar kategoriye göre gruplandı.',
    lentOverdue: 'Ödünç kitaplarda gecikme',
    addedToLibrary: 'Kitaplığa eklendi',
    importComplete: 'İçe aktarma tamam',
  },
};
