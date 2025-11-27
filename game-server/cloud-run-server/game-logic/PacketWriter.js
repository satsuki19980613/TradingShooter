/**
 * 【PacketWriter / PacketReader の役割: バイナリ変換】
 * データをネットワーク転送用に軽量なバイナリ形式へ変換（および復元）します。
 * * ■ 担当する責務 (Do):
 * - 数値、文字列、ブール値のバイト列へのエンコード/デコード
 * - バッファの管理
 * * ■ 担当しない責務 (Don't):
 * - 送信するデータの「意味」の理解
 * - ネットワークソケットの操作
 */
export class PacketWriter {
  constructor(capacity = 64 * 1024) {
    this.buffer = Buffer.allocUnsafe(capacity);
    this.offset = 0;
  }

  u8(value) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
  }

  u16(value) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
  }

  f32(value) {
    this.buffer.writeFloatLE(value, this.offset);
    this.offset += 4;
  }

  string(str) {
    const len = Buffer.byteLength(str);

    const safeLen = Math.min(len, 255);
    this.u8(safeLen);
    this.buffer.write(str, this.offset, safeLen, "utf8");
    this.offset += safeLen;
  }

  getData() {
    return this.buffer.subarray(0, this.offset);
  }
}
