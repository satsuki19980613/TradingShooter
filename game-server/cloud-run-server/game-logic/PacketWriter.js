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
export class PacketReader {
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
    this.decoder = new TextDecoder("utf-8");
  }

  u8() {
    // ★ここが範囲外アクセスエラーの原因になりやすい
    // オフセットがバッファサイズを超えていないかチェック
    if (this.offset >= this.view.byteLength) {
        console.error(`[PacketReader] Buffer overflow reading u8 at ${this.offset}/${this.view.byteLength}`);
        return 0; 
    }
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
  
  // ★重要：サーバーで writeUInt32LE を使っているなら、クライアントも u32 で読む必要がある
  u32() { 
    const val = this.view.getUint32(this.offset, true); // Little Endian
    this.offset += 4;
    return val;
  }

  string() {
    const len = this.u8(); // 長さを読む
    
    // ★ここもエラー箇所
    if (this.offset + len > this.view.byteLength) {
        console.error(`[PacketReader] String length overflow: len=${len}, offset=${this.offset}, total=${this.view.byteLength}`);
        return "";
    }

    const bytes = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.offset,
      len
    );
    this.offset += len;
    return this.decoder.decode(bytes);
  }
}export class PacketReader {
  constructor(arrayBuffer) {
    this.view = new DataView(arrayBuffer);
    this.offset = 0;
    this.decoder = new TextDecoder("utf-8");
  }

  u8() {
    // ★ここが範囲外アクセスエラーの原因になりやすい
    // オフセットがバッファサイズを超えていないかチェック
    if (this.offset >= this.view.byteLength) {
        console.error(`[PacketReader] Buffer overflow reading u8 at ${this.offset}/${this.view.byteLength}`);
        return 0; 
    }
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
  
  // ★重要：サーバーで writeUInt32LE を使っているなら、クライアントも u32 で読む必要がある
  u32() { 
    const val = this.view.getUint32(this.offset, true); // Little Endian
    this.offset += 4;
    return val;
  }

  string() {
    const len = this.u8(); // 長さを読む
    
    // ★ここもエラー箇所
    if (this.offset + len > this.view.byteLength) {
        console.error(`[PacketReader] String length overflow: len=${len}, offset=${this.offset}, total=${this.view.byteLength}`);
        return "";
    }

    const bytes = new Uint8Array(
      this.view.buffer,
      this.view.byteOffset + this.offset,
      len
    );
    this.offset += len;
    return this.decoder.decode(bytes);
  }
}