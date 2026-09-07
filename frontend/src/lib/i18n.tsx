"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "id" | "en";

export interface Translations {
  common: {
    save: string;
    cancel: string;
    close: string;
    search: string;
    copy: string;
    copied: string;
    delete: string;
    refresh: string;
    loading: string;
    apply: string;
    applyToEditor: string;
    back: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    rows: string;
    columns: string;
  };
  navbar: {
    brandSubtitle: string;
    datasetsCount: string;
    tablesCount: string;
    history: string;
    savedQueries: string;
    challenges: string;
    about: string;
    commandPalette: string;
    logout: string;
    login: string;
    register: string;
    workspace: string;
    personalLab: string;
    menuFile: string;
    menuQuery: string;
    menuView: string;
    menuHelp: string;
    menuUploadCsv: string;
    menuWorkspaces: string;
    menuLogout: string;
    menuSnippets: string;
    menuHistory: string;
    menuSavedQueries: string;
    menuErd: string;
    menuChallenges: string;
    menuAbout: string;
    snippetsBtn: string;
    erdBtn: string;
    profileTooltip: string;
    logoutTooltip: string;
  };
  footer: {
    duckdbEngine: string;
    inMemoryConnected: string;
    executionTimeMs: string;
    totalRows: string;
    themeLight: string;
    themeDark: string;
    switchLanguage: string;
    activeLanguage: string;
  };
  sidebar: {
    title: string;
    databaseExplorer: string;
    uploadCSV: string;
    emptyDatasets: string;
    emptyDatasetsDesc: string;
    totalRows: string;
    totalColumns: string;
    previewTable: string;
    copyName: string;
    dropTable: string;
    searchDatasets: string;
    searchPlaceholder: string;
    relationships: string;
    noDatasets: string;
    importCsv: string;
    deleteConfirm: string;
    preview: string;
    inspectStats: string;
    insertSelect: string;
    insertCol: string;
    datasetsCount: string;
    refresh: string;
  };
  editor: {
    title: string;
    run: string;
    running: string;
    runQuery: string;
    format: string;
    formatQuery: string;
    formatSuccess: string;
    formatStyleTitle: string;
    autoCaps: string;
    autoUppercase: string;
    upper: string;
    presetStandard: string;
    presetStandardDesc: string;
    presetCompact: string;
    presetCompactDesc: string;
    presetExpanded: string;
    presetExpandedDesc: string;
    presetTabular: string;
    presetTabularDesc: string;
    presetUppercase: string;
    presetUppercaseDesc: string;
    explainAI: string;
    plan: string;
    snippets: string;
    save: string;
    saveQuery: string;
    clear: string;
    clearEditor: string;
    fullscreen: string;
    emptyEditorWarning: string;
    placeholder: string;
  };
  results: {
    resultsTitle: string;
    title: string;
    emptyQuery: string;
    emptyQueryDesc: string;
    querySuccess: string;
    queryFailed: string;
    copyData: string;
    exportData: string;
    compareRuns: string;
    profileQuality: string;
    chartView: string;
    gridView: string;
    duration: string;
    rowsReturned: string;
    showingRows: string;
    ofTotal: string;
    previousPage: string;
    nextPage: string;
    pageOf: string;
    noResultsFound: string;
    explainErrorWithAI: string;
    errorTitle: string;
    executionTime: string;
    askAiFix: string;
    noResults: string;
    noResultsSub: string;
    success: string;
    rows: string;
    columns: string;
    diffPrevious: string;
    export: string;
    exportCustom: string;
    downloadCsv: string;
    downloadJson: string;
    downloadMd: string;
    copyCsv: string;
    copyMd: string;
    copied: string;
  };
  aiModal: {
    title: string;
    close: string;
    privacyNotice: string;
    privacyBanner: string;
    tabExplain: string;
    tabFix: string;
    tabGenerate: string;
    explainDesc: string;
    fixDesc: string;
    generateDesc: string;
    generatePlaceholder: string;
    analyzeBtn: string;
    fixBtn: string;
    generateBtn: string;
    btnExplain: string;
    btnFix: string;
    btnGenerate: string;
    emptyEditor: string;
    analysisResult: string;
    copyAll: string;
    copied: string;
    detectedSQL: string;
    detectedQuery: string;
    applyToEditor: string;
    applyEditor: string;
  };
  dataQuality: {
    title: string;
    close: string;
    catalog: string;
    summary: (rows: number, cols: number) => string;
    loadingSummary: string;
    tabStructure: string;
    tabQuality: string;
    loadingAnalyzing: string;
    auditSubtitle: string;
    healthScore: string;
    grade: string;
    duplicateRows: string;
    missingValues: string;
    constantColumns: string;
    outliers: string;
    remediationSQL: string;
    loadRemediationSQL: string;
    columnProfile: string;
    colStructureTitle: string;
    colName: string;
    dataType: string;
    distinctVals: string;
    nullCount: string;
    sampleTitle: string;
    remediateBtn: string;
    copied: string;
    copySql: string;
    applySql: string;
    severityHigh: string;
    severityMedium: string;
    severityInfo: string;
    noIssuesFound: string;
  };
  queryDiff: {
    title: string;
    close: string;
    compareSubtitle: string;
    runA: string;
    runB: string;
    duration: string;
    durationDelta: string;
    faster: (pct: number, ms: number) => string;
    slower: (pct: number, ms: number) => string;
    identicalDur: string;
    rowCount: string;
    rowDelta: string;
    rowsDelta: (delta: number) => string;
    identicalRows: (count: number) => string;
    status: string;
    completedAt: (time: string) => string;
    sameSpeed: string;
    linesAdded: string;
    linesRemoved: string;
    applyA: string;
    applyB: string;
    selectRunPrompt: string;
    load: string;
  };
  exportModal: {
    title: string;
    cancel: string;
    targetInfo: (rows: number, cols: number) => string;
    chooseFormat: string;
    formatLabel: string;
    csvComma: string;
    csvSemicolon: string;
    tsvTab: string;
    pipeSeparated: string;
    jsonFormat: string;
    markdownFormat: string;
    includeHeaders: string;
    quoteAllValues: string;
    quoteAll: string;
    filenameLabel: string;
    copyToClipboard: string;
    copyClipboard: string;
    copied: string;
    downloadFile: string;
    previewExport: string;
  };
  challenges: {
    title: string;
    close: string;
    subtitle: string;
    difficultyAll: string;
    difficultyBeginner: string;
    difficultyIntermediate: string;
    difficultyAdvanced: string;
    pointsXP: string;
    statusPassed: string;
    statusUnsolved: string;
    submitQuery: string;
    evaluating: string;
    rankTitle: string;
    totalXP: string;
    solvedCount: string;
    stats: (completed: number, total: number, xp: number, totalXp: number) => string;
    loadSql: string;
    verifying: string;
    submitVerify: string;
    hintTitle: string;
    hintsProgress: (count: number) => string;
    hintLabel: (idx: number) => string;
    revealHintBtn: (idx: number, isLast: boolean) => string;
    revealAction: string;
    passedMsg: (xp: number) => string;
    failedMsg: string;
  };
  savedQueries: {
    title: string;
    close: string;
    searchPlaceholder: string;
    allTags: string;
    noQueriesFound: string;
    empty: string;
    loadToEditor: string;
    deleteConfirm: string;
  };
  history: {
    title: string;
    close: string;
    searchPlaceholder: string;
    statusSuccess: string;
    statusFailed: string;
    clearHistory: string;
    clearConfirm: string;
    clearAll: string;
    loadToEditor: string;
    noHistoryFound: string;
    empty: string;
    filterAll: string;
    filterSuccess: string;
    filterError: string;
    rows: string;
  };
  aboutModal: {
    title: string;
    close: string;
    badge: string;
    tabAbout: string;
    tabAboutMe: string;
    tabSpecs: string;
    tabShortcuts: string;
    tabCredits: string;
    platformStory: string;
    developedBy: string;
    developerName: string;
    developerRole: string;
    role: string;
    roleSub: string;
    developerBio: string;
    bio: string;
    skillsTitle: string;
    contactTitle: string;
    systemSpecsTitle: string;
    buildVersion: string;
    engineStatus: string;
    healthyStatus: string;
    specsStatus: string;
    shortcutsTitle: string;
    tipsTitle: string;
    tipCsv: string;
    tipWorkspace: string;
    tipSnippets: string;
    tipTheme: string;
    creditsDesc: string;
  };
  workspaceModal: {
    title: string;
    close: string;
    subtitle: string;
    workspaceName: string;
    slug: string;
    switchWorkspace: string;
    createWorkspace: string;
    deleteWorkspace: string;
    limitWarning: string;
    tabCreate: string;
    tabManage: string;
    quotaWarning: string;
    nameLabel: string;
    namePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    creating: string;
    createBtn: string;
    saveChanges: string;
    cancel: string;
  };
  uploadModal: {
    title: string;
    close: string;
    subtitle: string;
    dragDropText: string;
    dropzoneTitle: string;
    dropzoneSub: string;
    dropzoneDesc: string;
    browseFiles: string;
    maxLimit: string;
    uploading: string;
    queueTitle: (count: number) => string;
    uploadBtn: (count: number) => string;
    uploadSuccess: string;
    uploadFailed: string;
  };
  savePrompt: {
    title: string;
    queryTitleLabel: string;
    queryTitlePlaceholder: string;
    tagsLabel: string;
    tagsPlaceholder: string;
    saveBtn: string;
    cancelBtn: string;
  };
  snippets: {
    title: string;
    subTitle: string;
    searchPlaceholder: string;
    allCategories: string;
    displayed: (count: number) => string;
    noSnippets: string;
    copy: string;
    copied: string;
    useCase: string;
    insertEditor: string;
    replaceEditor: string;
    close: string;
  };
  erd: {
    title: string;
    filterPlaceholder: string;
    stats: (tables: number, relations: number) => string;
    refresh: string;
    mapping: string;
    noTables: string;
    noTablesSub: string;
    queryTable: string;
    detectedRelations: string;
    close: string;
  };
  commandPalette: {
    title: string;
    placeholder: string;
    noResults: string;
    categoryQuery: string;
    categoryNav: string;
    categoryWorkspaces: string;
    categoryTables: string;
    categoryExport: string;
    escPrompt: string;
    close: string;
    actRunTitle: string;
    actRunSub: string;
    actFormatTitle: string;
    actFormatSub: string;
    actUpperTitle: string;
    actUpperSub: string;
    actExplainTitle: string;
    actExplainSub: string;
    actAiExplainTitle: string;
    actAiExplainSub: string;
    actClearTitle: string;
    actClearSub: string;
    navAboutTitle: string;
    navAboutSub: string;
    navSnippetsTitle: string;
    navSnippetsSub: string;
    navErdTitle: string;
    navErdSub: string;
    navChallengesTitle: string;
    navChallengesSub: string;
    navHistoryTitle: string;
    navHistorySub: string;
    navSavedTitle: string;
    navSavedSub: string;
    navUploadTitle: string;
    navUploadSub: string;
    navProfileTitle: string;
    navProfileSub: string;
    navWorkspacesTitle: string;
    navWorkspacesSub: string;
    expCsvTitle: string;
    expCsvSub: string;
    expJsonTitle: string;
    expJsonSub: string;
    expCopyCsvTitle: string;
    expCopyCsvSub: string;
    expCopyMdTitle: string;
    expCopyMdSub: string;
    expCustomTitle: string;
    expCustomSub: string;
  };
  explainModal: {
    title: string;
    analyzing: string;
    operatorsFound: string;
    duration: string;
    planHeader: string;
    close: string;
  };
  profileModal: {
    title: string;
    tabStats: string;
    tabEdit: string;
    tabSecurity: string;
    tabPreferences: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    saveProfile: string;
    saving: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    updatePassword: string;
    autoCaps: string;
    defaultLimit: string;
    close: string;
  };
  authModal: {
    title: string;
    loginTitle: string;
    registerTitle: string;
    subtitle: string;
    username: string;
    usernamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    password: string;
    passwordPlaceholder: string;
    fullName: string;
    fullNamePlaceholder: string;
    loginBtn: string;
    registerBtn: string;
    demoBtn: string;
    switchToRegister: string;
    switchToLogin: string;
    loading: string;
  };
}

export const translations: Record<Language, Translations> = {
  id: {
    common: {
      save: "Simpan",
      cancel: "Batal",
      close: "Tutup",
      search: "Cari...",
      copy: "Salin",
      copied: "Disalin!",
      delete: "Hapus",
      refresh: "Segarkan",
      loading: "Memuat...",
      apply: "Terapkan",
      applyToEditor: "Terapkan ke Editor",
      back: "Kembali",
      success: "Sukses",
      error: "Error",
      warning: "Peringatan",
      info: "Informasi",
      rows: "baris",
      columns: "kolom",
    },
    navbar: {
      brandSubtitle: "Studio Analisis DuckDB In-Memory",
      datasetsCount: "Dataset",
      tablesCount: "Tabel",
      history: "History",
      savedQueries: "Saved",
      challenges: "Challenges",
      about: "About",
      commandPalette: "Cari / Perintah",
      logout: "Keluar",
      login: "Masuk",
      register: "Daftar",
      workspace: "Workspace",
      personalLab: "Personal Lab",
      menuFile: "File",
      menuQuery: "Query",
      menuView: "View",
      menuHelp: "Help",
      menuUploadCsv: "Upload CSV...",
      menuWorkspaces: "Workspaces...",
      menuLogout: "Exit (Logout)",
      menuSnippets: "SQL Snippets...",
      menuHistory: "Query History...",
      menuSavedQueries: "Saved Queries...",
      menuErd: "ERD Schema Diagram...",
      menuChallenges: "Challenges...",
      menuAbout: "About SQLDataLab...",
      snippetsBtn: "Snippets",
      erdBtn: "ERD",
      profileTooltip: "Profil Pengguna",
      logoutTooltip: "Log Off (Keluar)",
    },
    footer: {
      duckdbEngine: "DuckDB Engine",
      inMemoryConnected: "In-Memory Terhubung",
      executionTimeMs: "Durasi Eksekusi",
      totalRows: "Total Baris",
      themeLight: "☀️ Light",
      themeDark: "🌙 Dark",
      switchLanguage: "Ganti Bahasa (ID / EN)",
      activeLanguage: "🇮🇩 ID",
    },
    sidebar: {
      title: "DATABASE EXPLORER",
      databaseExplorer: "DATABASE EXPLORER",
      uploadCSV: "Import CSV",
      emptyDatasets: "Belum Ada Dataset",
      emptyDatasetsDesc: "Unggah file CSV untuk memulai query data analitis Anda.",
      totalRows: "Total Baris",
      totalColumns: "Total Kolom",
      previewTable: "Pratinjau Tabel",
      copyName: "Salin Nama",
      dropTable: "Hapus Tabel",
      searchDatasets: "Cari dataset / tabel...",
      searchPlaceholder: "Cari dataset / tabel...",
      relationships: "Relasi Skema (ERD)",
      noDatasets: "Tidak ada tabel yang sesuai pencarian.",
      importCsv: "Import CSV Dataset",
      deleteConfirm: "Hapus dataset ini secara permanen?",
      preview: "Pratinjau",
      inspectStats: "Audit & Statistik",
      insertSelect: "SELECT * FROM ke Editor",
      insertCol: "Sisipkan Nama Kolom",
      datasetsCount: "Dataset Terpasang",
      refresh: "Segarkan",
    },
    editor: {
      title: "SQL QUERY EDITOR",
      run: "Jalankan",
      running: "Mengeksekusi...",
      runQuery: "Jalankan (Ctrl+Enter)",
      format: "Format SQL",
      formatQuery: "Format SQL",
      formatSuccess: "Format SQL berhasil diterapkan!",
      formatStyleTitle: "Pilihan Gaya Indentasi SQL",
      autoCaps: "Auto-Caps Kata Kunci",
      autoUppercase: "Auto-Uppercase Kata Kunci SQL",
      upper: "UPPER",
      presetStandard: "Standard SQL",
      presetStandardDesc: "Indentasi rapi 2 spasi & koma di awal klausa",
      presetCompact: "Compact Inline",
      presetCompactDesc: "Klausa singkat efisien cocok untuk query sederhana",
      presetExpanded: "Expanded Multi-line",
      presetExpandedDesc: "Indentasi 4 spasi terperinci untuk query kompleks",
      presetTabular: "Tabular Columns",
      presetTabularDesc: "Kolom SELECT disejajarkan rata vertikal",
      presetUppercase: "UPPERCASE Keywords",
      presetUppercaseDesc: "Ubah SELECT, FROM, WHERE dll menjadi huruf kapital",
      explainAI: "Tanya AI",
      plan: "Plan",
      snippets: "Snippets",
      save: "Simpan",
      saveQuery: "Simpan Query...",
      clear: "Bersihkan",
      clearEditor: "Kosongkan Editor",
      fullscreen: "Layar Penuh",
      emptyEditorWarning: "Editor masih kosong. Ketik perintah SQL terlebih dahulu.",
      placeholder: "Tulis kueri SQL di sini... (Contoh: SELECT * FROM customers LIMIT 10;)",
    },
    results: {
      resultsTitle: "DATA RESULTS & INSIGHTS",
      title: "DATA RESULTS & INSIGHTS",
      emptyQuery: "Menunggu Eksekusi SQL",
      emptyQueryDesc: "Ketik kueri SQL di editor dan klik tombol Jalankan (Ctrl+Enter) untuk melihat data.",
      querySuccess: "Query Berhasil Dijalankan",
      queryFailed: "Eksekusi Query Gagal",
      copyData: "Salin Data",
      exportData: "Ekspor",
      compareRuns: "Bandingkan",
      profileQuality: "Audit Kualitas",
      chartView: "Visualisasi Grafik",
      gridView: "Tampilan Tabel",
      duration: "Durasi",
      rowsReturned: "Baris Ditampilkan",
      showingRows: "Menampilkan",
      ofTotal: "dari total",
      previousPage: "Halaman Sebelumnya",
      nextPage: "Halaman Selanjutnya",
      pageOf: "Halaman",
      noResultsFound: "Query berhasil tetapi tidak mengembalikan baris data.",
      explainErrorWithAI: "Minta AI Diagnosis Error",
      errorTitle: "Error Eksekusi DuckDB",
      executionTime: "Waktu Eksekusi",
      askAiFix: "Minta AI Perbaiki",
      noResults: "Tidak ada baris data dikembalikan",
      noResultsSub: "Query selesai tanpa output set.",
      success: "BERHASIL",
      rows: "baris",
      columns: "kolom",
      diffPrevious: "Bandingkan dgn Run Sebelumnya",
      export: "Ekspor",
      exportCustom: "Ekspor Kustom...",
      downloadCsv: "Download CSV",
      downloadJson: "Download JSON",
      downloadMd: "Download Markdown",
      copyCsv: "Salin CSV",
      copyMd: "Salin Markdown",
      copied: "Disalin!",
    },
    aiModal: {
      title: "AI SQL Assistant",
      close: "Tutup Dialog",
      privacyNotice: "🔒 AI Assistant memproses struktur kueri tanpa menyimpan data rahasia tabel.",
      privacyBanner: "🔒 AI Assistant memproses struktur kueri tanpa menyimpan data rahasia tabel.",
      tabExplain: "Jelaskan Query",
      tabFix: "Perbaiki Error",
      tabGenerate: "Buat SQL Otomatis",
      explainDesc: "Minta AI menguraikan alur kerja, logika klausa, dan estimasi beban kueri SQL Anda.",
      fixDesc: "Minta AI mendiagnosa pesan error DuckDB dan memberikan solusi query yang sudah diperbaiki.",
      generateDesc: "Ketik deskripsi hasil analisis yang Anda butuhkan dalam bahasa manusia biasa.",
      generatePlaceholder: "Contoh: Tampilkan 5 pelanggan dengan total pembelian tertinggi di tahun 2024...",
      analyzeBtn: "Mulai Analisis AI",
      fixBtn: "Perbaiki Error Sekarang",
      generateBtn: "Hasilkan Query SQL",
      btnExplain: "Analisis Alur Query",
      btnFix: "Minta AI Solusi Error",
      btnGenerate: "Hasilkan Query SQL",
      emptyEditor: "Editor SQL masih kosong. Tulis kueri terlebih dahulu.",
      analysisResult: "Hasil Analisis & Solusi AI:",
      copyAll: "Salin Penjelasan",
      copied: "Disalin!",
      detectedSQL: "SQL Terdeteksi:",
      detectedQuery: "Rekomendasi Query Terdeteksi:",
      applyToEditor: "Terapkan ke Editor",
      applyEditor: "Terapkan ke Editor",
    },
    dataQuality: {
      title: "Audit Profil & Kualitas Data",
      close: "Tutup Audit",
      catalog: "Katalog Kolom & Skema",
      summary: (rows, cols) => `${rows.toLocaleString()} baris • ${cols} kolom terdaftar`,
      loadingSummary: "Menganalisis anomali dan distribusi data...",
      tabStructure: "Struktur & Sampel",
      tabQuality: "Pemeriksaan Kualitas",
      loadingAnalyzing: "Memproses audit statistik DuckDB...",
      auditSubtitle: "Audit kelengkapan, tipe data, nilai anomali, dan skrip remediasi.",
      healthScore: "Health Score",
      grade: "Grade",
      duplicateRows: "Baris Duplikat",
      missingValues: "Nilai Hilang (NULL)",
      constantColumns: "Kolom Konstan",
      outliers: "Nilai Outlier Terdeteksi",
      remediationSQL: "Skrip Remediasi SQL Pembersihan",
      loadRemediationSQL: "Muat Remediasi ke Editor",
      columnProfile: "Profil Setiap Kolom",
      colStructureTitle: "Struktur Skema Kolom",
      colName: "Nama Kolom",
      dataType: "Tipe Data",
      distinctVals: "Nilai Unik",
      nullCount: "Jumlah NULL",
      sampleTitle: "Sampel Data (5 Baris Teratas)",
      remediateBtn: "Remediasi SQL Pembersihan",
      copied: "Disalin!",
      copySql: "Salin Skrip",
      applySql: "Muat ke Editor",
      severityHigh: "Tinggi",
      severityMedium: "Sedang",
      severityInfo: "Info",
      noIssuesFound: "Kondisi data sangat prima. Tidak ditemukan masalah duplikasi atau nilai kosong.",
    },
    queryDiff: {
      title: "Perbandingan Eksekusi Query (Run Diff)",
      close: "Tutup Pembanding",
      compareSubtitle: "Analisis perbedaan performa durasi, jumlah baris, dan baris SQL yang berubah.",
      runA: "Run A (Basis)",
      runB: "Run B (Pembanding)",
      duration: "Durasi Waktu",
      durationDelta: "Selisih Durasi",
      faster: (pct, ms) => `${pct}% (${ms}ms) Lebih Cepat`,
      slower: (pct, ms) => `${pct}% (${ms}ms) Lebih Lambat`,
      identicalDur: "Kecepatan Identik",
      rowCount: "Jumlah Baris",
      rowDelta: "Selisih Baris",
      rowsDelta: (delta) => `${delta > 0 ? "+" : ""}${delta} baris`,
      identicalRows: (count) => `Baris Sama (${count})`,
      status: "Status Eksekusi",
      completedAt: (time) => `Selesai ${time}`,
      sameSpeed: "Durasi Eksekusi Sama",
      linesAdded: "Baris Ditambahkan",
      linesRemoved: "Baris Dihapus",
      applyA: "Terapkan SQL Run A",
      applyB: "Terapkan SQL Run B",
      selectRunPrompt: "Pilih dua riwayat kueri untuk mulai membandingkan.",
      load: "Muat ke Editor",
    },
    exportModal: {
      title: "Kustomisasi Ekspor Data",
      cancel: "Batal",
      targetInfo: (rows, cols) => `Ekspor ${rows} baris x ${cols} kolom data`,
      chooseFormat: "Pilih Format Pemisah Data:",
      formatLabel: "Format Berkas",
      csvComma: "CSV (Koma `,` - Standar Excel)",
      csvSemicolon: "CSV (Titik Koma `;` - Regional Indo/Eropa)",
      tsvTab: "TSV (Tab `\\t` - Clipboard Friendly)",
      pipeSeparated: "DSV (Garis Tegak `|` - Database Dump)",
      jsonFormat: "JSON (Array of Objects)",
      markdownFormat: "Markdown Table (`| col |`)",
      includeHeaders: "Sertakan Baris Judul Kolom (Headers)",
      quoteAllValues: "Bungkus Semua Nilai dengan Tanda Kutip (Quotes)",
      quoteAll: "Bungkus Semua Nilai dengan Tanda Petik Ganda",
      filenameLabel: "Nama File Ekspor:",
      copyToClipboard: "Salin ke Clipboard",
      copyClipboard: "Salin ke Clipboard",
      copied: "Disalin!",
      downloadFile: "Download File",
      previewExport: "Pratinjau Format:",
    },
    challenges: {
      title: "SQL Practice Challenges",
      close: "Tutup Tantangan",
      subtitle: "Asah keterampilan SQL analitis Anda dengan skenario bisnis nyata.",
      difficultyAll: "Semua Tingkat",
      difficultyBeginner: "Pemula (Beginner)",
      difficultyIntermediate: "Menengah (Intermediate)",
      difficultyAdvanced: "Mahir (Advanced)",
      pointsXP: "XP",
      statusPassed: "Tuntas",
      statusUnsolved: "Belum Selesai",
      submitQuery: "Validasi Query",
      evaluating: "Mengevaluasi...",
      rankTitle: "Peringkat Analis",
      totalXP: "Total XP",
      solvedCount: "Tantangan Selesai",
      stats: (completed, total, xp, totalXp) => `${completed}/${total} Selesai • ${xp}/${totalXp} XP`,
      loadSql: "Muat Starter SQL",
      verifying: "Memverifikasi Jawaban...",
      submitVerify: "Kirim & Verifikasi Jawaban",
      hintTitle: "Petunjuk Bertahap",
      hintsProgress: (count) => `Petunjuk Bertahap (${count} Petunjuk)`,
      hintLabel: (idx) => `Petunjuk ${idx + 1}:`,
      revealHintBtn: (idx, isLast) => `Buka Petunjuk ${idx + 1} ${isLast ? "(Solusi Penuh)" : ""}`,
      revealAction: "Buka",
      passedMsg: (xp) => `BERHASIL! Tantangan Lulus! (+${xp} XP)`,
      failedMsg: "Hasil Query Belum Sesuai Kriteria Target",
    },
    savedQueries: {
      title: "Pustaka Kueri Tersimpan",
      close: "Tutup",
      searchPlaceholder: "Cari kueri tersimpan atau filter tag...",
      allTags: "Semua Tag",
      noQueriesFound: "Belum ada kueri tersimpan yang cocok dengan pencarian.",
      empty: "Belum ada query yang disimpan di workspace ini.",
      loadToEditor: "Muat ke Editor",
      deleteConfirm: "Hapus kueri tersimpan ini?",
    },
    history: {
      title: "Riwayat Eksekusi Kueri",
      close: "Tutup Riwayat",
      searchPlaceholder: "Cari riwayat kueri...",
      statusSuccess: "Berhasil",
      statusFailed: "Gagal",
      clearHistory: "Bersihkan Riwayat",
      clearConfirm: "Hapus seluruh riwayat eksekusi di workspace ini?",
      clearAll: "Bersihkan Semua",
      loadToEditor: "Muat ke Editor",
      noHistoryFound: "Belum ada riwayat eksekusi kueri.",
      empty: "Belum ada kueri yang dieksekusi.",
      filterAll: "Semua Status",
      filterSuccess: "Sukses Saja",
      filterError: "Error Saja",
      rows: "baris",
    },
    aboutModal: {
      title: "Tentang SQLDataLab Studio",
      close: "Tutup Dialog",
      badge: "In-Memory Analytics v1.0",
      tabAbout: "Tentang Aplikasi",
      tabAboutMe: "Tentang Pengembang",
      tabSpecs: "Spesifikasi Sistem",
      tabShortcuts: "Pintasan Keyboard",
      tabCredits: "Kredit & Lisensi",
      platformStory: "SQLDataLab adalah platform analitis data interaktif berbasis DuckDB in-memory engine yang dirancang untuk kecepatan komputasi tinggi tanpa memerlukan setup database eksternal.",
      developedBy: "Dibuat & Dikembangkan Oleh:",
      developerName: "Muhammad Yasin",
      developerRole: "Full Stack Engineer & Data Analyst",
      role: "Full Stack Software Engineer & Data Specialist",
      roleSub: "Spesialisasi dalam Sistem Basis Data, Arsitektur Web Retro, dan Komputasi DuckDB",
      developerBio: "Pengembang perangkat lunak dengan fokus pada arsitektur data performa tinggi, SQL optimization, dan antarmuka web modern dengan sentuhan estetika sistem operasi klasik.",
      bio: "Fokus pada pembuatan perkakas analitik data yang cepat, responsif, dan mudah digunakan oleh analis bisnis maupun teknisi data di seluruh dunia.",
      skillsTitle: "Keahlian & Teknologi:",
      contactTitle: "Hubungi & Kolaborasi:",
      systemSpecsTitle: "Spesifikasi & Status Mesin:",
      buildVersion: "Versi Rilis: v1.0 (Production Ready)",
      engineStatus: "Mesin Database: DuckDB In-Memory OLAP",
      healthyStatus: "Status Engine: TERHUBUNG & SEHAT",
      specsStatus: "Koneksi Mesin Lokal:",
      shortcutsTitle: "Daftar Pintasan Keyboard Cepat:",
      tipsTitle: "Tips Penggunaan Cerdas:",
      tipCsv: "Tarik & Lepas File: Seret file CSV langsung ke jendela browser untuk mengunggah otomatis.",
      tipWorkspace: "Ruang Kerja Terisolasi: Buat workspace terpisah untuk setiap proyek analitik.",
      tipSnippets: "Pustaka Template: Akses SQL Snippets untuk fungsi Window dan Pivot siap pakai.",
      tipTheme: "Tema Ganda: Beralih mulus antara gaya retro Windows Classic dan Modern Dark Mode.",
      creditsDesc: "SQLDataLab dibangun dengan Next.js, FastAPI, DuckDB, Monaco Editor, dan Tailwind CSS.",
    },
    workspaceModal: {
      title: "Kelola Ruang Kerja (Workspaces)",
      close: "Tutup",
      subtitle: "Pilih, buat, atau kelola workspace analitik DuckDB Anda.",
      workspaceName: "Nama Workspace",
      slug: "Identifier / Slug",
      switchWorkspace: "Ganti Workspace",
      createWorkspace: "Buat Workspace Baru",
      deleteWorkspace: "Hapus Workspace",
      limitWarning: "Batas maksimal 5 workspace untuk akun saat ini.",
      tabCreate: "Buat Workspace Baru",
      tabManage: "Kelola Workspace Terdaftar",
      quotaWarning: "Kapasitas Kuota: Maksimum 5 workspace per akun pengguna.",
      nameLabel: "Nama Ruang Kerja:",
      namePlaceholder: "Contoh: Marketing Analytics Q4",
      descLabel: "Deskripsi Singkat:",
      descPlaceholder: "Tujuan analisis data atau cakupan proyek...",
      creating: "Membuat Workspace...",
      createBtn: "Buat Workspace Sekarang",
      saveChanges: "Simpan Perubahan",
      cancel: "Batal",
    },
    uploadModal: {
      title: "Import Dataset CSV",
      close: "Tutup",
      subtitle: "Unggah berkas CSV ke dalam database in-memory DuckDB.",
      dragDropText: "Tarik & Lepas file CSV di sini, atau",
      dropzoneTitle: "Tarik & Lepas file CSV ke area ini",
      dropzoneSub: "atau klik untuk memilih berkas dari komputer",
      dropzoneDesc: "Mendukung format berkas .csv dengan deteksi otomatis header, delimiter, dan tipe kolom.",
      browseFiles: "Pilih File Komputer",
      maxLimit: "Maksimal ukuran file: 50MB per berkas",
      uploading: "Sedang Mengunggah & Memetakan Dataset...",
      queueTitle: (count) => `Antrean Berkas (${count} Berkas Terpilih):`,
      uploadBtn: (count) => `Mulai Impor (${count} Berkas) ke DuckDB`,
      uploadSuccess: "Dataset CSV berhasil diimpor ke DuckDB!",
      uploadFailed: "Gagal mengunggah berkas CSV.",
    },
    savePrompt: {
      title: "Simpan Kueri ke Pustaka",
      queryTitleLabel: "Judul Kueri SQL:",
      queryTitlePlaceholder: "Contoh: Ringkasan Penjualan Bulanan",
      tagsLabel: "Tag / Kategori (Pisahkan dengan koma):",
      tagsPlaceholder: "misal: reporting, kpi, bulanan",
      saveBtn: "Simpan Kueri",
      cancelBtn: "Batal",
    },
    snippets: {
      title: "SQL Snippets & Templates",
      subTitle: "Pustaka template analitik siap pakai untuk DuckDB",
      searchPlaceholder: "Cari snippet (misal: running total, lag, pivot, qualify)...",
      allCategories: "Semua Kategori",
      displayed: (count) => `${count} ditampilkan`,
      noSnippets: "Tidak ada template SQL yang cocok dengan pencarian Anda.",
      copy: "Salin",
      copied: "Disalin!",
      useCase: "Use Case:",
      insertEditor: "Sisipkan ke Editor",
      replaceEditor: "Ganti Seluruh Editor",
      close: "Tutup Snippets",
    },
    erd: {
      title: "Schema Relationship Diagram (ERD)",
      filterPlaceholder: "Filter tabel atau kolom...",
      stats: (tables, relations) => `${tables} Tabel • ${relations} Relasi`,
      refresh: "Segarkan",
      mapping: "Memetakan relasi skema database...",
      noTables: "Belum ada tabel di workspace ini.",
      noTablesSub: "Unggah dataset CSV untuk melihat diagram relasi ERD.",
      queryTable: "Kueri tabel ini di editor",
      detectedRelations: "Relasi Antar-Tabel Terdeteksi (Inferred Foreign Keys)",
      close: "Tutup Diagram",
    },
    commandPalette: {
      title: "Command Palette & Quick Launcher",
      placeholder: "Ketik perintah, nama tabel, atau fitur (misal: format, snippets, run)...",
      noResults: "Tidak ada perintah atau tabel yang cocok.",
      categoryQuery: "Aksi Kueri",
      categoryNav: "Navigasi Menu",
      categoryWorkspaces: "Ruang Kerja",
      categoryTables: "Tabel Database",
      categoryExport: "Ekspor & Salin",
      escPrompt: "ESC untuk keluar",
      close: "Tutup Dialog",
      actRunTitle: "Jalankan Kueri SQL",
      actRunSub: "Eksekusi kode SQL di editor aktif",
      actFormatTitle: "Format SQL Query",
      actFormatSub: "Rapikan indentasi dan klausa SQL",
      actUpperTitle: "UPPERCASE Kata Kunci",
      actUpperSub: "Ubah kata kunci SQL menjadi huruf kapital",
      actExplainTitle: "DuckDB EXPLAIN Query Plan",
      actExplainSub: "Inspeksi alur pohon eksekusi rencana kueri",
      actAiExplainTitle: "Tanya AI Assistant",
      actAiExplainSub: "Minta penjelasan logika kueri atau diagnosa error",
      actClearTitle: "Kosongkan Editor SQL",
      actClearSub: "Hapus seluruh teks di editor",
      navAboutTitle: "Tentang SQLDataLab",
      navAboutSub: "Profil pembuat, spesifikasi DuckDB, dan panduan",
      navSnippetsTitle: "Buka SQL Snippets",
      navSnippetsSub: "Koleksi rumus Window Functions, Running Totals, dan Pivot",
      navErdTitle: "Buka ERD Schema Diagram",
      navErdSub: "Visualisasi relasi skema antar tabel dan foreign keys",
      navChallengesTitle: "Buka SQL Challenges",
      navChallengesSub: "Latihan studi kasus SQL dengan perolehan XP",
      navHistoryTitle: "Buka Execution History",
      navHistorySub: "Riwayat eksekusi kueri dengan auto-retention",
      navSavedTitle: "Buka Saved Queries Library",
      navSavedSub: "Koleksi kueri favorit yang disimpan",
      navUploadTitle: "Upload Dataset CSV",
      navUploadSub: "Impor file CSV baru ke dalam DuckDB",
      navProfileTitle: "Profil Akun & Preferensi",
      navProfileSub: "Pengaturan akun, nama, dan keamanan sandi",
      navWorkspacesTitle: "Kelola Workspaces",
      navWorkspacesSub: "Buat atau beralih antar ruang kerja analitik",
      expCsvTitle: "Download Data sebagai CSV",
      expCsvSub: "Ekspor tabel hasil query aktif ke format CSV",
      expJsonTitle: "Download Data sebagai JSON",
      expJsonSub: "Ekspor hasil query ke format JSON array",
      expCopyCsvTitle: "Salin Hasil Query sebagai CSV",
      expCopyCsvSub: "Salin tabel data terformat koma ke clipboard",
      expCopyMdTitle: "Salin Hasil Query sebagai Markdown",
      expCopyMdSub: "Salin tabel data berformat Markdown tabel",
      expCustomTitle: "Buka Kustomisasi Ekspor",
      expCustomSub: "Konfigurasi pemisah delimiter dan kutip ekspor kustom",
    },
    explainModal: {
      title: "DuckDB Query Execution Plan",
      analyzing: "Menganalisis physical execution plan...",
      operatorsFound: "Operators Terdeteksi:",
      duration: "Durasi Rencana:",
      planHeader: "Teks Rencana Eksekusi Fisik (DuckDB EXPLAIN):",
      close: "Tutup Plan",
    },
    profileModal: {
      title: "Profil Pengguna & Pengaturan",
      tabStats: "Statistik Aktivitas",
      tabEdit: "Edit Profil",
      tabSecurity: "Keamanan Sandi",
      tabPreferences: "Preferensi Editor",
      fullName: "Nama Lengkap:",
      fullNamePlaceholder: "Nama lengkap Anda",
      email: "Alamat Email:",
      emailPlaceholder: "nama@contoh.com",
      saveProfile: "Simpan Profil",
      saving: "Menyimpan...",
      changePassword: "Ubah Kata Sandi",
      currentPassword: "Kata Sandi Saat Ini:",
      newPassword: "Kata Sandi Baru:",
      confirmPassword: "Konfirmasi Kata Sandi Baru:",
      updatePassword: "Ganti Kata Sandi",
      autoCaps: "Otomatis Ubah Kata Kunci SQL Menjadi Huruf Kapital",
      defaultLimit: "Batas Baris Default (LIMIT):",
      close: "Tutup",
    },
    authModal: {
      title: "Masuk ke SQLDataLab",
      loginTitle: "Logon ke SQLDataLab Studio",
      registerTitle: "Daftar Akun Baru SQLDataLab",
      subtitle: "Platform analitik DuckDB in-memory berkecepatan tinggi.",
      username: "Nama Pengguna (Username):",
      usernamePlaceholder: "Masukkan username...",
      email: "Alamat Email:",
      emailPlaceholder: "Masukkan email...",
      password: "Kata Sandi (Password):",
      passwordPlaceholder: "Masukkan kata sandi...",
      fullName: "Nama Lengkap:",
      fullNamePlaceholder: "Masukkan nama lengkap...",
      loginBtn: "Masuk (Log In)",
      registerBtn: "Daftar Akun (Register)",
      demoBtn: "Masuk Cepat Mode Tamu (Demo Guest)",
      switchToRegister: "Belum punya akun? Daftar sekarang",
      switchToLogin: "Sudah punya akun? Masuk di sini",
      loading: "Memproses Otentikasi...",
    },
  },
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      search: "Search...",
      copy: "Copy",
      copied: "Copied!",
      delete: "Delete",
      refresh: "Refresh",
      loading: "Loading...",
      apply: "Apply",
      applyToEditor: "Apply to Editor",
      back: "Back",
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Information",
      rows: "rows",
      columns: "columns",
    },
    navbar: {
      brandSubtitle: "In-Memory DuckDB Analysis Studio",
      datasetsCount: "Datasets",
      tablesCount: "Tables",
      history: "History",
      savedQueries: "Saved",
      challenges: "Challenges",
      about: "About",
      commandPalette: "Search / Command",
      logout: "Log Off",
      login: "Log In",
      register: "Register",
      workspace: "Workspace",
      personalLab: "Personal Lab",
      menuFile: "File",
      menuQuery: "Query",
      menuView: "View",
      menuHelp: "Help",
      menuUploadCsv: "Upload CSV...",
      menuWorkspaces: "Workspaces...",
      menuLogout: "Exit (Log Off)",
      menuSnippets: "SQL Snippets...",
      menuHistory: "Query History...",
      menuSavedQueries: "Saved Queries...",
      menuErd: "ERD Schema Diagram...",
      menuChallenges: "Challenges...",
      menuAbout: "About SQLDataLab...",
      snippetsBtn: "Snippets",
      erdBtn: "ERD",
      profileTooltip: "User Profile",
      logoutTooltip: "Log Off (Sign Out)",
    },
    footer: {
      duckdbEngine: "DuckDB Engine",
      inMemoryConnected: "In-Memory Connected",
      executionTimeMs: "Execution Time",
      totalRows: "Total Rows",
      themeLight: "☀️ Light",
      themeDark: "🌙 Dark",
      switchLanguage: "Toggle Language (ID / EN)",
      activeLanguage: "🇬🇧 EN",
    },
    sidebar: {
      title: "DATABASE EXPLORER",
      databaseExplorer: "DATABASE EXPLORER",
      uploadCSV: "Import CSV",
      emptyDatasets: "No Datasets Yet",
      emptyDatasetsDesc: "Upload CSV files to begin analytical queries on your data.",
      totalRows: "Total Rows",
      totalColumns: "Total Columns",
      previewTable: "Preview Table",
      copyName: "Copy Name",
      dropTable: "Drop Table",
      searchDatasets: "Search datasets / tables...",
      searchPlaceholder: "Search datasets / tables...",
      relationships: "Schema Diagram (ERD)",
      noDatasets: "No tables matching your search.",
      importCsv: "Import CSV Dataset",
      deleteConfirm: "Permanently drop this table?",
      preview: "Preview",
      inspectStats: "Audit & Statistics",
      insertSelect: "SELECT * FROM to Editor",
      insertCol: "Insert Column Name",
      datasetsCount: "Mounted Datasets",
      refresh: "Refresh",
    },
    editor: {
      title: "SQL QUERY EDITOR",
      run: "Run",
      running: "Executing...",
      runQuery: "Run Query (Ctrl+Enter)",
      format: "Format SQL",
      formatQuery: "Format SQL",
      formatSuccess: "SQL formatting successfully applied!",
      formatStyleTitle: "SQL Indentation Style Presets",
      autoCaps: "Auto-Caps Keywords",
      autoUppercase: "Auto-Uppercase SQL Keywords",
      upper: "UPPER",
      presetStandard: "Standard SQL",
      presetStandardDesc: "Clean 2-space indentation with leading commas",
      presetCompact: "Compact Inline",
      presetCompactDesc: "Single-line efficient syntax for simple queries",
      presetExpanded: "Expanded Multi-line",
      presetExpandedDesc: "Detailed 4-space layout for complex analytical queries",
      presetTabular: "Tabular Columns",
      presetTabularDesc: "Vertically aligned SELECT columns",
      presetUppercase: "UPPERCASE Keywords",
      presetUppercaseDesc: "Capitalize SELECT, FROM, WHERE, etc.",
      explainAI: "Ask AI",
      plan: "Plan",
      snippets: "Snippets",
      save: "Save",
      saveQuery: "Save Query...",
      clear: "Clear",
      clearEditor: "Clear Editor",
      fullscreen: "Fullscreen",
      emptyEditorWarning: "The SQL editor is currently empty. Type a query first.",
      placeholder: "Write your SQL query here... (e.g., SELECT * FROM customers LIMIT 10;)",
    },
    results: {
      resultsTitle: "DATA RESULTS & INSIGHTS",
      title: "DATA RESULTS & INSIGHTS",
      emptyQuery: "Waiting for Query Execution",
      emptyQueryDesc: "Type a SQL query in the editor and click Run (Ctrl+Enter) to view results.",
      querySuccess: "Query Executed Successfully",
      queryFailed: "Query Execution Failed",
      copyData: "Copy Data",
      exportData: "Export",
      compareRuns: "Compare",
      profileQuality: "Quality Audit",
      chartView: "Chart Visualization",
      gridView: "Table Grid",
      duration: "Duration",
      rowsReturned: "Rows Returned",
      showingRows: "Showing",
      ofTotal: "of",
      previousPage: "Previous Page",
      nextPage: "Next Page",
      pageOf: "Page",
      noResultsFound: "Query executed successfully with 0 rows returned.",
      explainErrorWithAI: "Diagnose Error with AI",
      errorTitle: "DuckDB Execution Error",
      executionTime: "Execution Time",
      askAiFix: "Ask AI to Fix",
      noResults: "No rows returned",
      noResultsSub: "Query executed with an empty output set.",
      success: "SUCCESS",
      rows: "rows",
      columns: "columns",
      diffPrevious: "Compare with Previous Run",
      export: "Export",
      exportCustom: "Custom Export...",
      downloadCsv: "Download CSV",
      downloadJson: "Download JSON",
      downloadMd: "Download Markdown",
      copyCsv: "Copy CSV",
      copyMd: "Copy Markdown",
      copied: "Copied!",
    },
    aiModal: {
      title: "AI SQL Assistant",
      close: "Close Dialog",
      privacyNotice: "🔒 AI Assistant inspects query syntax without storing sensitive table records.",
      privacyBanner: "🔒 AI Assistant inspects query syntax without storing sensitive table records.",
      tabExplain: "Explain Query",
      tabFix: "Fix SQL Error",
      tabGenerate: "Generate SQL",
      explainDesc: "Ask AI to break down the query logic, clauses, and performance implications.",
      fixDesc: "Ask AI to diagnose DuckDB syntax errors and generate a corrected SQL query.",
      generateDesc: "Describe the desired analytical outcome in plain human language.",
      generatePlaceholder: "e.g., Show top 5 customers with highest sales volume in 2024...",
      analyzeBtn: "Start AI Analysis",
      fixBtn: "Fix Error Now",
      generateBtn: "Generate SQL Query",
      btnExplain: "Explain Query Logic",
      btnFix: "Get AI Error Solution",
      btnGenerate: "Generate SQL Query",
      emptyEditor: "SQL Editor is currently empty. Type a query first.",
      analysisResult: "AI Analysis & Recommendations:",
      copyAll: "Copy Explanation",
      copied: "Copied!",
      detectedSQL: "Detected SQL:",
      detectedQuery: "Recommended Query Solution:",
      applyToEditor: "Apply to Editor",
      applyEditor: "Apply to Editor",
    },
    dataQuality: {
      title: "Data Quality Profile & Audit",
      close: "Close Audit",
      catalog: "Column Catalog & Schema",
      summary: (rows, cols) => `${rows.toLocaleString()} rows • ${cols} columns registered`,
      loadingSummary: "Analyzing data anomalies and distributions...",
      tabStructure: "Structure & Samples",
      tabQuality: "Quality Inspection",
      loadingAnalyzing: "Processing DuckDB statistical profile...",
      auditSubtitle: "Audit completeness, data types, anomalies, and remediation scripts.",
      healthScore: "Health Score",
      grade: "Grade",
      duplicateRows: "Duplicate Rows",
      missingValues: "Missing Values (NULL)",
      constantColumns: "Constant Columns",
      outliers: "Outliers Detected",
      remediationSQL: "Cleaning Remediation SQL",
      loadRemediationSQL: "Load Remediation to Editor",
      columnProfile: "Per-Column Profile",
      colStructureTitle: "Column Schema Structure",
      colName: "Column Name",
      dataType: "Data Type",
      distinctVals: "Distinct Values",
      nullCount: "NULL Count",
      sampleTitle: "Data Sample (Top 5 Rows)",
      remediateBtn: "Cleaning Remediation SQL",
      copied: "Copied!",
      copySql: "Copy Script",
      applySql: "Load to Editor",
      severityHigh: "High",
      severityMedium: "Medium",
      severityInfo: "Info",
      noIssuesFound: "Excellent data condition. No duplicate rows or excessive null values detected.",
    },
    queryDiff: {
      title: "Query Execution Comparator (Run Diff)",
      close: "Close Comparator",
      compareSubtitle: "Compare performance duration, row count, and SQL line differences side by side.",
      runA: "Run A (Baseline)",
      runB: "Run B (Comparison)",
      duration: "Runtime Duration",
      durationDelta: "Duration Delta",
      faster: (pct, ms) => `${pct}% (${ms}ms) Faster`,
      slower: (pct, ms) => `${pct}% (${ms}ms) Slower`,
      identicalDur: "Identical Speed",
      rowCount: "Row Count",
      rowDelta: "Row Delta",
      rowsDelta: (delta) => `${delta > 0 ? "+" : ""}${delta} rows`,
      identicalRows: (count) => `Identical Rows (${count})`,
      status: "Execution Status",
      completedAt: (time) => `Finished ${time}`,
      sameSpeed: "Identical Execution Duration",
      linesAdded: "Lines Added",
      linesRemoved: "Lines Removed",
      applyA: "Load Run A SQL",
      applyB: "Load Run B SQL",
      selectRunPrompt: "Select two execution runs from history to compare.",
      load: "Load to Editor",
    },
    exportModal: {
      title: "Custom Export Settings",
      cancel: "Cancel",
      targetInfo: (rows, cols) => `Exporting ${rows} rows x ${cols} columns of data`,
      chooseFormat: "Choose Delimiter Format:",
      formatLabel: "File Format",
      csvComma: "CSV (Comma `,` - Standard Excel)",
      csvSemicolon: "CSV (Semicolon `;` - European/Regional)",
      tsvTab: "TSV (Tab `\\t` - Clipboard Friendly)",
      pipeSeparated: "DSV (Pipe `|` - Database Dump)",
      jsonFormat: "JSON (Array of Objects)",
      markdownFormat: "Markdown Table (`| col |`)",
      includeHeaders: "Include Header Column Names",
      quoteAllValues: "Wrap All Values with Double Quotes",
      quoteAll: "Wrap All Values with Double Quotes",
      filenameLabel: "Export Filename:",
      copyToClipboard: "Copy to Clipboard",
      copyClipboard: "Copy to Clipboard",
      copied: "Copied!",
      downloadFile: "Download File",
      previewExport: "Format Preview:",
    },
    challenges: {
      title: "SQL Practice Challenges",
      close: "Close Challenges",
      subtitle: "Sharpen your analytical SQL proficiency with real-world business scenarios.",
      difficultyAll: "All Difficulties",
      difficultyBeginner: "Beginner",
      difficultyIntermediate: "Intermediate",
      difficultyAdvanced: "Advanced",
      pointsXP: "XP",
      statusPassed: "Completed",
      statusUnsolved: "Unsolved",
      submitQuery: "Validate Query",
      evaluating: "Evaluating...",
      rankTitle: "Analyst Rank",
      totalXP: "Total XP",
      solvedCount: "Challenges Solved",
      stats: (completed, total, xp, totalXp) => `${completed}/${total} Solved • ${xp}/${totalXp} XP`,
      loadSql: "Load Starter SQL",
      verifying: "Verifying Answer...",
      submitVerify: "Submit & Verify Answer",
      hintTitle: "Tiered Hints",
      hintsProgress: (count) => `Tiered Hints (${count} Available)`,
      hintLabel: (idx) => `Hint ${idx + 1}:`,
      revealHintBtn: (idx, isLast) => `Reveal Hint ${idx + 1} ${isLast ? "(Full Solution)" : ""}`,
      revealAction: "Reveal",
      passedMsg: (xp) => `SUCCESS! Challenge Passed! (+${xp} XP)`,
      failedMsg: "Query results do not match expected criteria.",
    },
    savedQueries: {
      title: "Saved Queries Library",
      close: "Close",
      searchPlaceholder: "Search saved queries or filter tags...",
      allTags: "All Tags",
      noQueriesFound: "No saved queries match your search criteria.",
      empty: "No saved queries in this workspace yet.",
      loadToEditor: "Load to Editor",
      deleteConfirm: "Delete this saved query?",
    },
    history: {
      title: "Query Execution History",
      close: "Close History",
      searchPlaceholder: "Search execution history...",
      statusSuccess: "Success",
      statusFailed: "Failed",
      clearHistory: "Clear History",
      clearConfirm: "Delete all execution history for this workspace?",
      clearAll: "Clear All",
      loadToEditor: "Load to Editor",
      noHistoryFound: "No execution history found.",
      empty: "No queries have been executed yet.",
      filterAll: "All Status",
      filterSuccess: "Success Only",
      filterError: "Errors Only",
      rows: "rows",
    },
    aboutModal: {
      title: "About SQLDataLab Studio",
      close: "Close Dialog",
      badge: "In-Memory Analytics v1.0",
      tabAbout: "About Application",
      tabAboutMe: "About Developer",
      tabSpecs: "System Specs",
      tabShortcuts: "Keyboard Shortcuts",
      tabCredits: "Credits & Tech",
      platformStory: "SQLDataLab is an interactive data analytics workstation powered by the embedded DuckDB in-memory OLAP engine, designed for sub-second query performance without external database administration.",
      developedBy: "Architected & Engineered by:",
      developerName: "Muhammad Yasin",
      developerRole: "Full Stack Engineer & Data Analyst",
      role: "Full Stack Software Engineer & Data Specialist",
      roleSub: "Specialized in High-Performance Database Systems, Retro UI Engineering & DuckDB",
      developerBio: "Software engineer passionate about high-performance data architectures, SQL execution optimization, and crafting nostalgic desktop-grade web applications.",
      bio: "Committed to engineering lightning-fast, intuitive data exploration tools for business analysts and data practitioners worldwide.",
      skillsTitle: "Core Competencies & Stack:",
      contactTitle: "Get in Touch & Connect:",
      systemSpecsTitle: "System Specs & Engine Status:",
      buildVersion: "Release Version: v1.0 (Production Ready)",
      engineStatus: "Database Engine: DuckDB In-Memory OLAP",
      healthyStatus: "Engine Status: CONNECTED & HEALTHY",
      specsStatus: "Local Engine State:",
      shortcutsTitle: "Quick Keyboard Shortcuts:",
      tipsTitle: "Pro User Tips:",
      tipCsv: "Drag and Drop: Drop CSV files anywhere onto the app window to import instantly.",
      tipWorkspace: "Workspace Isolation: Create separate workspaces for distinct analytical projects.",
      tipSnippets: "Template Library: Leverage SQL Snippets for window functions and pivot transforms.",
      tipTheme: "Dual Themes: Switch between Windows Classic retro look and Modern Dark Mode.",
      creditsDesc: "Built with Next.js, FastAPI, DuckDB, Monaco Editor, and Tailwind CSS.",
    },
    workspaceModal: {
      title: "Manage Workspaces",
      close: "Close",
      subtitle: "Select, create, or organize your DuckDB analytical workspaces.",
      workspaceName: "Workspace Name",
      slug: "Identifier / Slug",
      switchWorkspace: "Switch Workspace",
      createWorkspace: "Create New Workspace",
      deleteWorkspace: "Delete Workspace",
      limitWarning: "Workspace quota reached (Maximum 5 per account).",
      tabCreate: "Create New Workspace",
      tabManage: "Manage Existing Workspaces",
      quotaWarning: "Quota Limit: Maximum 5 active workspaces per user account.",
      nameLabel: "Workspace Name:",
      namePlaceholder: "e.g., Marketing Analytics Q4",
      descLabel: "Brief Description:",
      descPlaceholder: "Objectives, domain scope, or analytical goals...",
      creating: "Creating Workspace...",
      createBtn: "Create Workspace Now",
      saveChanges: "Save Changes",
      cancel: "Cancel",
    },
    uploadModal: {
      title: "Import CSV Datasets",
      close: "Close",
      subtitle: "Mount CSV files directly into the in-memory DuckDB engine.",
      dragDropText: "Drag & drop CSV files here, or",
      dropzoneTitle: "Drag & drop CSV files into this dropzone",
      dropzoneSub: "or click to select files from your computer",
      dropzoneDesc: "Supports .csv files with automatic schema inference, delimiter detection, and type parsing.",
      browseFiles: "Browse Local Files",
      maxLimit: "Maximum file size: 50MB per file",
      uploading: "Uploading & Parsing Datasets...",
      queueTitle: (count) => `Selected Files Queue (${count} Files):`,
      uploadBtn: (count) => `Import ${count} Files to DuckDB`,
      uploadSuccess: "CSV dataset successfully mounted into DuckDB!",
      uploadFailed: "Failed to upload CSV dataset.",
    },
    savePrompt: {
      title: "Save Query to Library",
      queryTitleLabel: "SQL Query Title:",
      queryTitlePlaceholder: "e.g., Monthly Sales Performance Aggregation",
      tagsLabel: "Tags / Categories (Comma-separated):",
      tagsPlaceholder: "e.g., reporting, kpi, monthly",
      saveBtn: "Save Query",
      cancelBtn: "Cancel",
    },
    snippets: {
      title: "SQL Snippets & Templates",
      subTitle: "Ready-to-use analytical query templates for DuckDB",
      searchPlaceholder: "Search snippets (e.g., running total, lag, pivot, qualify)...",
      allCategories: "All Categories",
      displayed: (count) => `${count} displayed`,
      noSnippets: "No SQL templates match your search criteria.",
      copy: "Copy",
      copied: "Copied!",
      useCase: "Use Case:",
      insertEditor: "Insert to Editor",
      replaceEditor: "Replace Whole Editor",
      close: "Close Snippets",
    },
    erd: {
      title: "Schema Relationship Diagram (ERD)",
      filterPlaceholder: "Filter tables or columns...",
      stats: (tables, relations) => `${tables} Tables • ${relations} Relations`,
      refresh: "Refresh",
      mapping: "Mapping database schema relationships...",
      noTables: "No tables found in this workspace.",
      noTablesSub: "Upload CSV datasets to visualize ERD entity relations.",
      queryTable: "Query this table in editor",
      detectedRelations: "Detected Table Relationships (Inferred Foreign Keys)",
      close: "Close Diagram",
    },
    commandPalette: {
      title: "Command Palette & Quick Launcher",
      placeholder: "Type a command, table name, or feature (e.g., format, snippets, run)...",
      noResults: "No commands or tables matched your search.",
      categoryQuery: "Query Actions",
      categoryNav: "Navigation",
      categoryWorkspaces: "Workspaces",
      categoryTables: "Database Tables",
      categoryExport: "Export & Copy",
      escPrompt: "ESC to exit",
      close: "Close Dialog",
      actRunTitle: "Run SQL Query",
      actRunSub: "Execute SQL code in active editor",
      actFormatTitle: "Format SQL Query",
      actFormatSub: "Beautify indentation and SQL clauses",
      actUpperTitle: "UPPERCASE Keywords",
      actUpperSub: "Capitalize all SQL keywords",
      actExplainTitle: "DuckDB EXPLAIN Query Plan",
      actExplainSub: "Inspect query execution plan tree",
      actAiExplainTitle: "Ask AI Assistant",
      actAiExplainSub: "Explain query logic or diagnose errors",
      actClearTitle: "Clear Query Editor",
      actClearSub: "Wipe all text in the editor",
      navAboutTitle: "About SQLDataLab",
      navAboutSub: "Developer bio, DuckDB architecture, and shortcuts",
      navSnippetsTitle: "Open SQL Snippets",
      navSnippetsSub: "Window functions, running totals, and pivot formulas",
      navErdTitle: "Open ERD Schema Diagram",
      navErdSub: "Visualize schema relationships and foreign key links",
      navChallengesTitle: "Open SQL Challenges",
      navChallengesSub: "Practice tiered SQL problems with XP tracking",
      navHistoryTitle: "Open Execution History",
      navHistorySub: "Query history log with automatic retention",
      navSavedTitle: "Open Saved Queries Library",
      navSavedSub: "Collection of bookmarked queries",
      navUploadTitle: "Upload CSV Dataset",
      navUploadSub: "Import new CSV data into DuckDB",
      navProfileTitle: "Account Profile & Preferences",
      navProfileSub: "User profile details, credentials, and settings",
      navWorkspacesTitle: "Manage Workspaces",
      navWorkspacesSub: "Create or switch between analytical workspaces",
      expCsvTitle: "Download Data as CSV",
      expCsvSub: "Export active query output as CSV file",
      expJsonTitle: "Download Data as JSON",
      expJsonSub: "Export active query output as JSON array",
      expCopyCsvTitle: "Copy Results as CSV",
      expCopyCsvSub: "Copy comma-separated rows to clipboard",
      expCopyMdTitle: "Copy Results as Markdown",
      expCopyMdSub: "Copy formatted Markdown table to clipboard",
      expCustomTitle: "Open Custom Export",
      expCustomSub: "Configure custom delimiters, enclosures, and headers",
    },
    explainModal: {
      title: "DuckDB Query Execution Plan",
      analyzing: "Analyzing physical execution plan...",
      operatorsFound: "Operators Detected:",
      duration: "Plan Duration:",
      planHeader: "Physical Plan Output (DuckDB EXPLAIN):",
      close: "Close Plan",
    },
    profileModal: {
      title: "User Profile & Preferences",
      tabStats: "Activity Stats",
      tabEdit: "Edit Profile",
      tabSecurity: "Security & Password",
      tabPreferences: "Editor Preferences",
      fullName: "Full Name:",
      fullNamePlaceholder: "Your full name",
      email: "Email Address:",
      emailPlaceholder: "name@example.com",
      saveProfile: "Save Profile",
      saving: "Saving...",
      changePassword: "Change Password",
      currentPassword: "Current Password:",
      newPassword: "New Password:",
      confirmPassword: "Confirm New Password:",
      updatePassword: "Update Password",
      autoCaps: "Automatically Capitalize SQL Keywords",
      defaultLimit: "Default Query Limit (LIMIT):",
      close: "Close",
    },
    authModal: {
      title: "Sign in to SQLDataLab",
      loginTitle: "Logon to SQLDataLab Studio",
      registerTitle: "Register New Account",
      subtitle: "High-performance in-memory DuckDB analytical workstation.",
      username: "Username:",
      usernamePlaceholder: "Enter username...",
      email: "Email Address:",
      emailPlaceholder: "Enter email...",
      password: "Password:",
      passwordPlaceholder: "Enter password...",
      fullName: "Full Name:",
      fullNamePlaceholder: "Enter full name...",
      loginBtn: "Sign In (Log In)",
      registerBtn: "Create Account (Register)",
      demoBtn: "Quick Guest Session (Demo)",
      switchToRegister: "Don't have an account? Sign up now",
      switchToLogin: "Already have an account? Sign in here",
      loading: "Processing Authentication...",
    },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = "sqltrain_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("id");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (stored === "id" || stored === "en") {
        setLanguageState(stored);
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === "id" ? "en" : "id";
    setLanguage(nextLang);
  };

  const value = {
    language,
    setLanguage,
    toggleLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
