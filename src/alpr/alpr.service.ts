import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { unlink } from 'fs/promises';

const sharp = require('sharp');
const execFileAsync = promisify(execFile);

type Candidate = { plate: string; confidence: number };

@Injectable()
export class AlprService {
  async recognizePlateFromFile(filePath: string) {
    const pre1 = join(tmpdir(), `plate-pre1-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
    const pre2 = join(tmpdir(), `plate-pre2-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
    const pre3 = join(tmpdir(), `plate-pre3-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);

    try {
      // 1) preprocess (3 biến thể) để kéo lại phần chữ "ABC" hay bị rụng
      await sharp(filePath)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .grayscale()
        .normalise()
        .sharpen()
        .png()
        .toFile(pre1);

      // invert + threshold: nhiều biển đen/chữ trắng hoặc ngược lại -> cái này cứu cực nhiều
      await sharp(filePath)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .grayscale()
        .normalise()
        .negate()
        .threshold(155)
        .png()
        .toFile(pre2);

      // threshold nhẹ không invert (đỡ phá chữ khi ảnh đã rõ)
      await sharp(filePath)
        .rotate()
        .resize({ width: 2000, withoutEnlargement: true })
        .grayscale()
        .normalise()
        .threshold(175)
        .png()
        .toFile(pre3);

      // 2) OCR ra stdout
      const TESS_PATH = process.env.TESSERACT_PATH || 'tesseract';

      const run = async (imgPath: string, psm: string) => {
        try {
          const { stdout, stderr } = await execFileAsync(TESS_PATH, [
            imgPath,
            'stdout',
            '-l',
            'eng',
            '--oem',
            '1',
            '--psm',
            psm,
            '-c',
            'tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
            '-c',
            'preserve_interword_spaces=1',
          ]);
          return {
            ok: true as const,
            imgPath,
            psm,
            rawOcrText: String(stdout || ''),
            stderr: String(stderr || ''),
          };
        } catch (e: any) {
          return {
            ok: false as const,
            imgPath,
            psm,
            rawOcrText: '',
            stderr: String(e?.message || e),
          };
        }
      };

      // PSM:
      // - 7: 1 dòng (best cho biển)
      // - 6: block text (hay bắt được chữ nếu bị tách)
      // - 11: sparse text (hay bắt được chữ lẻ)
      const tries = await Promise.all([
        run(pre1, '7'), run(pre1, '6'), run(pre1, '11'),
        run(pre2, '7'), run(pre2, '6'), run(pre2, '11'),
        run(pre3, '7'), run(pre3, '6'), run(pre3, '11'),
      ]);

      // 3) Chọn output tốt nhất bằng heuristic score
      const scoreOcr = (raw: string) => {
        const t = this.cleanupRawOcr(raw);
        const compact = t.replace(/[^A-Z0-9]/g, '');

        const hasLetters = /[A-Z]/.test(t) ? 1 : 0;
        const hasDigits = /[0-9]/.test(t) ? 1 : 0;

        // bonus nếu có pattern gần đúng
        const bonus =
          /\b[A-Z]{2,3}\s*-?\s*\d{4}\b/.test(t) ? 6 :
            /\b[A-Z]{2,3}\b.*\b\d{4}\b/.test(t) ? 4 :
              0;

        // phạt nếu chỉ có 4 số (5678) - vì hay bị rụng ABC
        const only4digits = /^\d{4}$/.test(compact) ? 5 : 0;

        // độ dài hợp lý (biển TW thường 6~7 ký tự gồm dash)
        const lenScore = Math.min(compact.length, 10);

        return (hasLetters + hasDigits) * 3 + lenScore + bonus - only4digits;
      };

      let best = tries[0];
      let bestScore = -999;
      for (const t of tries) {
        const sc = scoreOcr(t.rawOcrText);
        if (sc > bestScore) {
          bestScore = sc;
          best = t;
        }
      }

      const rawOcrText = best.rawOcrText;
      const rawText = this.cleanupRawOcr(rawOcrText);

      // 4) Extract candidates thông minh (ghép token chữ + số)
      const candidates = this.extractTaiwanCandidatesSmart(rawText);

      return {
        rawText,      // cleaned text
        rawOcrText,   // nguyên bản stdout (debug)
        candidates,
        best: candidates[0] || null,
        debug: {
          bestScore,
          usedPsm: best.psm,
          usedImage: best.imgPath,
          stderr: best.stderr,
          pre1, pre2, pre3, // nếu muốn mở file preprocess xem nó còn thấy chữ không
        },
      };
    } catch (e: any) {
      // nếu tesseract chưa cài / sai path thường sẽ rơi vào đây với ENOENT
      return {
        rawText: '',
        rawOcrText: '',
        candidates: [],
        best: null,
        error: String(e?.message || e),
        hint:
          'Nếu lỗi spawn tesseract ENOENT: bạn chưa cài Tesseract hoặc TESSERACT_PATH chưa đúng.',
      };
    } finally {
      // dọn file tmp (không bắt buộc)
      await unlink(pre1).catch(() => { });
      await unlink(pre2).catch(() => { });
      await unlink(pre3).catch(() => { });
    }
  }

  // cleanup raw OCR -> giữ A-Z 0-9 '-' và space
  private cleanupRawOcr(s: string) {
    return (s || '')
      .toUpperCase()
      .replace(/[^\S\r\n]+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/[^A-Z0-9- ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * ✅ Taiwan plate: thường 2-3 chữ + 4 số
   * - AB-1234 / AB1234
   * - ABC-1234 / ABC1234
   *
   * OCR hay tách: "ABC 1234" hoặc "A B C 1234" hoặc "ABC - 1234"
   * => hàm này ghép lại và normalize về dạng XXX-1234
   */
  private extractTaiwanCandidatesSmart(text: string): Candidate[] {
    const cleaned = this.cleanupRawOcr(text);

    const map = new Map<string, number>();
    const push = (raw: string, score: number) => {
      const norm = this.normalizeTaiwanPlate(raw);
      if (!norm) return;
      map.set(norm, Math.max(map.get(norm) || 0, score));
    };

    // 1) bắt trực tiếp pattern trong whole string
    const whole = cleaned;
    const m = whole.match(/\b[A-Z]{2,3}\s*\-?\s*\d{4}\b/g) || [];
    for (const x of m) push(x.replace(/\s+/g, ''), 1.0);

    const tokens = whole.split(' ').filter(Boolean);

    // 2) token dạng liền: ABC-1234 / ABC1234 / AB1234 ...
    for (const t of tokens) {
      if (/^[A-Z]{2,3}\-?\d{4}$/.test(t)) push(t, 0.95);
    }

    // 3) ghép 2 token: "ABC" + "1234"
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];

      if (/^[A-Z]{2,3}$/.test(a) && /^\d{4}$/.test(b)) {
        push(`${a}-${b}`, 0.92);
        push(`${a}${b}`, 0.90);
      }

      // "ABC" "-" "1234"
      if (/^[A-Z]{2,3}$/.test(a) && b === '-' && /^\d{4}$/.test(tokens[i + 2] || '')) {
        push(`${a}-${tokens[i + 2]}`, 0.92);
      }
    }

    // 4) ghép chữ bị tách: "A B C 1234"
    for (let i = 0; i < tokens.length - 3; i++) {
      const a = tokens[i], b = tokens[i + 1], c = tokens[i + 2], d = tokens[i + 3];
      if (/^[A-Z]$/.test(a) && /^[A-Z]$/.test(b) && /^[A-Z]$/.test(c) && /^\d{4}$/.test(d)) {
        push(`${a}${b}${c}-${d}`, 0.86);
      }
    }

    // 5) trường hợp OCR chỉ ra "5678" -> KHÔNG lấy làm best (vì thiếu chữ)
    // nhưng vẫn giữ nếu bạn muốn fallback thì score cực thấp:
    for (const t of tokens) {
      if (/^\d{4}$/.test(t)) {
        // không push (tránh trả 5678 sai format)
        // push(t, 0.1); // nếu bạn muốn fallback thật sự thì mở dòng này
      }
    }

    return [...map.entries()]
      .map(([plate, confidence]) => ({ plate, confidence }))
      .sort((x, y) => y.confidence - x.confidence);
  }

  private normalizeTaiwanPlate(raw: string) {
    const s = (raw || '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .trim();

    if (!s) return null;

    // 3 chữ + 4 số
    if (/^[A-Z]{3}\-\d{4}$/.test(s)) return s;
    if (/^[A-Z]{3}\d{4}$/.test(s)) return `${s.slice(0, 3)}-${s.slice(3)}`;

    // 2 chữ + 4 số
    if (/^[A-Z]{2}\-\d{4}$/.test(s)) return s;
    if (/^[A-Z]{2}\d{4}$/.test(s)) return `${s.slice(0, 2)}-${s.slice(2)}`;

    return null;
  }
}
