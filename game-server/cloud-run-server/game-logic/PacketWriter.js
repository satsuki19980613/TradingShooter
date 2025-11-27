/**
 * サーバー用: バイナリデータの書き込みを補助するクラス
 * オフセット管理を自動化し、ミスを防ぐ
 */
export class PacketWriter {
  constructor(capacity = 64 * 1024) {
    this.buffer = Buffer.allocUnsafe(capacity);
    this.offset = 0;
  }

  // 1バイト整数 (0~255)
  u8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  // 2バイト整数 (0~65535)
  u16(value) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  // 浮動小数点数 (小数)
  f32(value) {
    this.buffer.writeFloatLE(value, this.offset);
    this.offset += 4;
  }

  // 文字列 (長さ(u8) + 文字列本体)
  string(str) {
    const len = Buffer.byteLength(str);
    // 安全のため255バイトに制限（仕様に合わせて調整可）
    const safeLen = Math.min(len, 255);
    this.u8(safeLen);
    this.buffer.write(str, this.offset, safeLen, "utf8");
    this.offset += safeLen;
  }

  // 最終的なバッファを取得
  getData() {
    return this.buffer.subarray(0, this.offset);
  }
}