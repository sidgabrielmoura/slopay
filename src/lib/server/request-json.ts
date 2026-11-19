import "server-only";

export class RequestBodyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function readJson(request: Request, maxBytes: number): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    throw new RequestBodyError(415, "Envie os dados em JSON.");
  }

  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError(400, "Envie os dados da solicitação.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new RequestBodyError(413, "Os dados da solicitação excedem o limite.");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks, bytes).toString("utf8"));
}
