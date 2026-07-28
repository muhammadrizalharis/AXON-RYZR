/**
 * Translates raw pipeline errors (ComfyUI / queue / quota) into a short,
 * human-friendly explanation with a suggested action.
 */
export interface HumanError {
  /** Short headline, e.g. "GPU sedang penuh". */
  title: string;
  /** One-sentence cause + what to do. */
  hint: string;
  /** Whether retrying is likely to succeed. */
  retryable: boolean;
}

const RULES: Array<{ re: RegExp; out: HumanError }> = [
  {
    re: /vram|out of memory|oom|cuda.*memory|grow failed|allocat/i,
    out: {
      title: 'GPU sedang penuh',
      hint: 'Memori GPU sedang dipakai proses lain. Tunggu 1–5 menit lalu generate ulang, atau turunkan resolusi/batch.',
      retryable: true,
    },
  },
  {
    re: /econnrefused|enotfound|etimedout|econnreset|timeout|unreachable|fetch failed|socket|network/i,
    out: {
      title: 'Server render tidak terjangkau',
      hint: 'Mesin render (ComfyUI) kemungkinan sedang down atau restart. Cek indikator NEURAL GRID di kanan atas, lalu coba lagi.',
      retryable: true,
    },
  },
  {
    re: /insufficient credits/i,
    out: {
      title: 'Kredit tidak cukup',
      hint: 'Saldo kredit habis saat job dijalankan. Minta kredit ke admin lalu generate ulang.',
      retryable: false,
    },
  },
  {
    re: /storage quota/i,
    out: {
      title: 'Kuota penyimpanan penuh',
      hint: 'Ruang penyimpananmu habis. Hapus beberapa aset lama di My Gallery lalu coba lagi.',
      retryable: false,
    },
  },
  {
    re: /failed to enqueue|queue/i,
    out: {
      title: 'Antrean render sibuk',
      hint: 'Job gagal masuk antrean. Biasanya sementara — langsung coba generate ulang.',
      retryable: true,
    },
  },
  {
    re: /belum tersedia|not implemented/i,
    out: {
      title: 'Fitur belum tersedia',
      hint: 'Model untuk jenis render ini belum terpasang di server.',
      retryable: false,
    },
  },
];

const FALLBACK: HumanError = {
  title: 'Render gagal',
  hint: 'Terjadi kesalahan internal pada pipeline render. Kredit sudah dikembalikan — coba generate ulang.',
  retryable: true,
};

export function humanizeJobError(raw?: string | null): HumanError {
  if (!raw) return FALLBACK;
  for (const rule of RULES) {
    if (rule.re.test(raw)) return rule.out;
  }
  return FALLBACK;
}
