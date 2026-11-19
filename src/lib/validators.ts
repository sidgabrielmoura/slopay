export function cleanDocument(val: string): string {
  return (val || "").replace(/\D/g, "");
}

export function isValidCPF(cpf: string): boolean {
  const clean = cleanDocument(cpf);
  if (clean.length !== 11) return false;

  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function isValidCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/[./\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(clean) || /^(\d)\1{13}$/.test(clean)) return false;

  function checkDigit(length: number) {
    let total = 0;
    for (let i = 0; i < length; i++) {
      total += (clean.charCodeAt(length - i - 1) - 48) * (2 + i % 8);
    }
    return total % 11 < 2 ? 0 : 11 - total % 11;
  }
  return checkDigit(12) === Number(clean[12]) && checkDigit(13) === Number(clean[13]);
}

export function formatCPF(val: string): string {
  const clean = cleanDocument(val).slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCNPJ(val: string): string {
  const clean = val.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 14);
  const prefix = [clean.slice(0, 2), clean.slice(2, 5), clean.slice(5, 8)].filter(Boolean).join(".");
  const order = clean.slice(8, 12);
  const checkDigits = clean.slice(12);
  return prefix + (order ? "/" + order : "") + (checkDigits ? "-" + checkDigits : "");
}

export function formatPhone(val: string): string {
  const clean = cleanDocument(val).slice(0, 11);
  if (clean.length <= 10) {
    return clean
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return clean
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export type BrazilianInputMask = "CPF" | "CNPJ" | "CNPJ_NUMERIC" | "PHONE" | "CPF_OR_CNPJ";

export function pixKeyInputMask(type: string): BrazilianInputMask | undefined {
  if (type === "CPF" || type === "CNPJ" || type === "PHONE") return type;
}

export function formatBrazilianInput(mask: BrazilianInputMask, value: string): string | null {
  const text = value.trim();
  if (mask === "PHONE") {
    if (!/^\+?[\d().\s-]*$/.test(text)) return null;
    const digits = cleanDocument(text);
    if (/^55\d{10,11}$/.test(digits)) return "+55 " + formatPhone(digits.slice(2));
    if (!text.startsWith("+")) return digits.length <= 11 ? formatPhone(digits) : null;
    if ("55".startsWith(digits)) return "+" + digits;
    return /^55\d{1,11}$/.test(digits) ? "+55 " + formatPhone(digits.slice(2)) : null;
  }

  const document = text.replace(/[./\s-]/g, "");
  const cpf = mask === "CPF" || (mask === "CPF_OR_CNPJ" && /^\d{0,11}$/.test(document));
  if (cpf) return /^\d{0,11}$/.test(document) ? formatCPF(document) : null;
  if (mask === "CNPJ_NUMERIC" && !/^\d*$/.test(document)) return null;
  return /^[A-Z0-9]{0,12}\d{0,2}$/i.test(document) ? formatCNPJ(document) : null;
}

export function maskCPF(cpf: string): string {
  const clean = cleanDocument(cpf);
  if (clean.length !== 11) return cpf;
  return `•••.${clean.slice(3, 6)}.${clean.slice(6, 9)}-••`;
}

export function maskCNPJ(cnpj: string): string {
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) return cnpj;
  return `${clean.slice(0, 2)}.•••.•••/${clean.slice(8, 12)}-••`;
}
