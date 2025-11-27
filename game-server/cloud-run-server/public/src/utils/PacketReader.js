/**
 * クライアント用: バイナリデータの読み込みを補助するクラス
 */
export class PacketReader {
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
    this.decoder = new TextDecoder("utf-8");
  }

  u8() {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  u16() {
    const val = this.view.getUint16(this.offset, true); // Little Endian
    this.offset += 2;
    return val;
  }

  f32() {
    const val = this.view.getFloat32(this.offset, true); // Little Endian
    this.offset += 4;
    return val;
  }

  string() {
    const len = this.u8();
    const bytes = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.offset,
      len
    );
    this.offset += len;
    return this.decoder.decode(bytes);
  }
}