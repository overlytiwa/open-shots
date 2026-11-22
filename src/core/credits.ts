/** Put model attribution into image metadata as well as the readable companion file. */
export async function creditImage(blob: Blob, format: string, credit: string): Promise<Blob> {
  if (!credit || !['png', 'jpeg', 'gif'].includes(format)) return blob
  const bytes = new Uint8Array(await blob.arrayBuffer()),
    encoder = new TextEncoder()
  if (format === 'png') {
    const data = encoder.encode('Description\0\0\0\0\0' + credit),
      type = encoder.encode('iTXt'),
      chunk = new Uint8Array(data.length + 12),
      view = new DataView(chunk.buffer)
    view.setUint32(0, data.length)
    chunk.set(type, 4)
    chunk.set(data, 8)
    let crc = 0xffffffff
    for (const byte of chunk.subarray(4, -4)) {
      crc ^= byte
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
    view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0)
    return new Blob([bytes.subarray(0, -12), chunk, bytes.subarray(-12)], { type: blob.type })
  }
  if (format === 'jpeg') {
    const text = encoder.encode(credit).subarray(0, 65000),
      header = new Uint8Array([255, 254, (text.length + 2) >> 8, (text.length + 2) & 255])
    return new Blob([bytes.subarray(0, 2), header, text, bytes.subarray(2)], { type: blob.type })
  }
  const text = encoder.encode(credit),
    blocks: Uint8Array<ArrayBuffer>[] = [new Uint8Array([0x21, 0xfe])]
  for (let i = 0; i < text.length; i += 255) {
    const block = text.subarray(i, i + 255)
    blocks.push(new Uint8Array([block.length]), block)
  }
  blocks.push(new Uint8Array([0]))
  return new Blob([bytes.subarray(0, -1), ...blocks, bytes.subarray(-1)], { type: blob.type })
}
