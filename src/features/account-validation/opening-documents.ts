import { z } from "zod";
import { requestPixGateway } from "@/lib/pix-gateway-client";

export const maxOpeningDocumentBytes = 3 * 1024 * 1024;
export const openingDocumentKind = z.enum(["CIN", "RG", "CNH"]);
export const openingDocumentSide = z.enum(["FRONT", "BACK"]);
export const openingDocumentSchema = z.object({
  id: z.uuid(),
  side: openingDocumentSide,
  kind: openingDocumentKind,
  verifiedAt: z.iso.datetime().nullable(),
  replacementRequested: z.boolean(),
  replacementReason: z.string().nullable().optional(),
});

export type OpeningDocument = z.infer<typeof openingDocumentSchema>;
export type OpeningDocumentKind = z.infer<typeof openingDocumentKind>;
export type OpeningDocumentSide = z.infer<typeof openingDocumentSide>;

export const openingDocumentLabels = { FRONT: "Frente", BACK: "Verso" } as const;
export const openingDocumentSides = ["FRONT", "BACK"] as const;
export const documentKinds = [
  { value: "CIN", label: "Carteira de Identidade Nacional (CIN)" },
  { value: "RG", label: "Registro Geral (RG)" },
  { value: "CNH", label: "Carteira Nacional de Habilitação (CNH)" },
];
export const openingDocumentVersion = z.object({ version: z.int().min(0).max(2_000_000_000) });
export const verifiedDocumentSchema = openingDocumentVersion.extend({ cpf: z.string().regex(/^\d{11}$/) }).strict();
export const replacementReasonLabels = {
  BLURRY: "Imagem desfocada ou ilegível",
  CROPPED: "Documento cortado",
  GLARE: "Reflexo ou sombra",
  WRONG_SIDE: "Lado incorreto",
  DIFFERENT_DOCUMENT: "Frente e verso de documentos diferentes",
  DATA_MISMATCH: "Dados divergentes do cadastro",
  INVALID_DOCUMENT: "Documento vencido ou não aceito",
  OTHER: "Outros",
} as const;
const replacementCategory = z.enum(Object.keys(replacementReasonLabels) as [keyof typeof replacementReasonLabels]);
export type ReplacementCategory = z.infer<typeof replacementCategory>;
export const replacementDocumentSchema = openingDocumentVersion.extend({
  category: replacementCategory.optional(),
  reason: z.string().trim().min(1).max(600).regex(/^(?:[^\p{Cc}\p{Cf}]|[\r\n])*$/u).optional(),
}).strict().refine(({ category, reason }) => Boolean(category && category !== "OTHER" || reason));
export const documentUpdatedSchema = z.object({ updated: z.literal(true) });

export function openingDocumentsComplete(documents: OpeningDocument[], verified = false) {
  return documents.length === 2 && documents[0].side !== documents[1].side && documents[0].kind === documents[1].kind &&
    documents.every((document) => !document.replacementRequested && (!verified || document.verifiedAt));
}

export function uploadOpeningDocument(side: OpeningDocumentSide, kind: OpeningDocumentKind, image: File) {
  return requestPixGateway("/api/account-opening/documents/" + side + "?kind=" + kind, openingDocumentSchema,
    "Não foi possível enviar a imagem.", {
      method: "POST", body: image, timeoutMs: 25_000, headers: { "Content-Type": "application/octet-stream" },
    });
}

const captureEndpoint = "/api/account-opening/documents/capture";
export const mobileDocumentPath = "/capturar-documentos";
export const captureTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const captureIdSchema = z.string().regex(/^[0-9a-f]{32}$/);
export const captureIdHeader = "x-slopay-document-capture";
export const startCaptureSchema = z.strictObject({ kind: openingDocumentKind, side: openingDocumentSide });
export const claimCaptureSchema = z.strictObject({ pairing: captureTokenSchema });
export const capturePairingSchema = claimCaptureSchema.extend({ expiresAt: z.iso.datetime() });
export const captureProgressSchema = z.object({
  kind: openingDocumentKind, pending: z.array(openingDocumentSide).max(2), expiresAt: z.iso.datetime(),
});
export const claimedCaptureSchema = z.object({ device: captureTokenSchema, progress: captureProgressSchema });
const captureSessionSchema = captureProgressSchema.extend({ id: captureIdSchema });
export type CaptureSession = z.infer<typeof captureSessionSchema>;
export type CapturePairing = z.infer<typeof capturePairingSchema>;

const captureUnavailable = "O envio pelo celular está temporariamente indisponível.";

export function startOpeningCapture(kind: OpeningDocumentKind, side: OpeningDocumentSide) {
  return requestPixGateway(captureEndpoint + "/start", capturePairingSchema, "Não foi possível gerar o QR Code.", {
    method: "POST", body: JSON.stringify({ kind, side }), headers: { "Content-Type": "application/json" },
  });
}

export function claimOpeningCapture(pairing: string) {
  return requestPixGateway(captureEndpoint, captureSessionSchema, captureUnavailable, {
    method: "POST", body: JSON.stringify({ pairing }), headers: { "Content-Type": "application/json" },
  });
}

export function readOpeningCapture(id: string) {
  return requestPixGateway(captureEndpoint, captureSessionSchema, captureUnavailable, { headers: { [captureIdHeader]: id } });
}

export function sendCapturePhoto(id: string, side: OpeningDocumentSide, file: File) {
  return requestPixGateway(captureEndpoint + "/" + side, openingDocumentSchema, captureUnavailable, {
    method: "POST", body: file, timeoutMs: 25_000,
    headers: { "Content-Type": "application/octet-stream", [captureIdHeader]: id },
  });
}

export function openingDocumentPath(ownerId: string, documentId: string) {
  return "/api/admin/account-openings/" + ownerId + "/documents/" + documentId;
}

export function verifyOpeningDocuments(ownerId: string, version: number, cpf: string) {
  return requestPixGateway("/api/admin/account-openings/" + ownerId + "/documents/verify", documentUpdatedSchema,
    "Não foi possível registrar a conferência.", {
      method: "POST", body: JSON.stringify({ version, cpf }), headers: { "Content-Type": "application/json" },
    });
}

export function requestOpeningDocumentReplacement(ownerId: string, documentId: string, version: number,
  category: ReplacementCategory, reason?: string) {
  return requestPixGateway(openingDocumentPath(ownerId, documentId) + "/replacement", documentUpdatedSchema,
    "Não foi possível solicitar o reenvio.", {
      method: "POST", body: JSON.stringify({ version, category, reason }), headers: { "Content-Type": "application/json" },
    });
}
