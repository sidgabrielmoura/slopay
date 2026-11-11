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
  const clean = cleanDocument(cnpj);
  if (clean.length !== 14) return false;

  if (/^(\d)\1{13}$/.test(clean)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(clean.charAt(12), 10)) return false;

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

export function formatCPF(val: string): string {
  const clean = cleanDocument(val).slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function formatCNPJ(val: string): string {
  const clean = cleanDocument(val).slice(0, 14);
  return clean
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
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
