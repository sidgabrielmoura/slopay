/**
 * Motor de cálculo de entropia e análise de segurança de senhas
 * Implementa entropia de Shannon real, detecção de padrões previsíveis e dados pessoais.
 */

export interface PasswordAnalysisOptions {
  fullName?: string;
  cpf?: string;
  email?: string;
}

export interface PasswordStrengthResult {
  entropyBits: number;
  score: number; // 0 a 100
  level: "VERY_WEAK" | "WEAK" | "FAIR" | "STRONG" | "VERY_STRONG";
  label: string;
  colorClass: string;
  barColorClass: string;
  feedbacks: string[];
  warnings: string[];
  isAcceptable: boolean;
}

const COMMON_PASSWORDS = [
  "password", "senha", "admin", "administrator", "123456", "12345678", "123456789",
  "qwerty", "master", "welcome", "login", "acesso", "padrao", "segredo",
  "mudar123", "trocar123", "brasil", "sistema", "suporte", "root"
];

/**
 * Calcula a entropia real em bits de uma senha e avalia vulnerabilidades
 */
export function calculatePasswordStrength(
  password: string,
  userContext?: PasswordAnalysisOptions
): PasswordStrengthResult {
  if (!password) {
    return {
      entropyBits: 0,
      score: 0,
      level: "VERY_WEAK",
      label: "Não informada",
      colorClass: "text-muted-foreground",
      barColorClass: "bg-muted",
      feedbacks: ["Insira uma senha para avaliação de segurança."],
      warnings: [],
      isAcceptable: false,
    };
  }

  // 1. Determina o tamanho do pool de caracteres (N)
  let poolSize = 0;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasDigits) poolSize += 10;
  if (hasSymbols) poolSize += 33; // Conjunto de símbolos ASCII comuns

  if (poolSize === 0) poolSize = 10;

  // 2. Cálculo base de Entropia de Shannon: H = L * log2(N)
  let entropy = password.length * (Math.log(poolSize) / Math.log(2));

  const feedbacks: string[] = [];
  const warnings: string[] = [];

  // 3. Penalização por tamanho curto
  if (password.length < 12) {
    warnings.push(`Comprimento insuficiente (${password.length}/12 caracteres recomendados).`);
    entropy = Math.max(0, entropy - 25);
  }

  // 4. Penalização por caracteres repetidos (ex: "aaaa", "1111")
  const repeatMatches = password.match(/(.)\1{2,}/g);
  if (repeatMatches) {
    warnings.push("Contém caracteres consecutivos repetidos (ex: 'aaa', '111').");
    entropy = Math.max(0, entropy - (repeatMatches.length * 10));
  }

  // 5. Penalização por sequências previsíveis (ex: "12345", "abcdef", "qwerty")
  const lowerPass = password.toLowerCase();
  const sequentialPatterns = [
    "012345", "123456", "234567", "345678", "456789", "567890",
    "abcdef", "bcdefg", "cdefgh", "defghi", "efghij",
    "qwerty", "asdfgh", "zxcvbn"
  ];

  for (const seq of sequentialPatterns) {
    if (lowerPass.includes(seq)) {
      warnings.push(`Padrão de teclado ou sequência detectada ('${seq}').`);
      entropy = Math.max(0, entropy - 18);
      break;
    }
  }

  // 6. Verificação de palavras comuns de dicionário
  for (const common of COMMON_PASSWORDS) {
    if (lowerPass.includes(common)) {
      warnings.push(`Contém palavra comum facilmente adivinhável ('${common}').`);
      entropy = Math.max(0, entropy - 20);
      break;
    }
  }

  // 7. Verificação de dados pessoais (inconsistência de segurança)
  if (userContext) {
    // Trecho do CPF
    if (userContext.cpf) {
      const cleanCpf = userContext.cpf.replace(/\D/g, "");
      if (cleanCpf.length >= 6) {
        // Checa blocos de 4 a 6 dígitos do CPF na senha
        for (let i = 0; i <= cleanCpf.length - 4; i++) {
          const slice = cleanCpf.slice(i, i + 4);
          if (password.includes(slice)) {
            warnings.push("A senha contém sequência numérica do seu CPF.");
            entropy = Math.max(0, entropy - 30);
            break;
          }
        }
      }
    }

    // Trecho do Nome
    if (userContext.fullName) {
      const nameParts = userContext.fullName
        .toLowerCase()
        .split(/\s+/)
        .filter((part) => part.length >= 3);
      for (const part of nameParts) {
        if (lowerPass.includes(part)) {
          warnings.push(`A senha não deve conter partes do seu nome ('${part}').`);
          entropy = Math.max(0, entropy - 25);
          break;
        }
      }
    }

    // Trecho do E-mail
    if (userContext.email) {
      const emailPrefix = userContext.email.split("@")[0]?.toLowerCase();
      if (emailPrefix && emailPrefix.length >= 4 && lowerPass.includes(emailPrefix)) {
        warnings.push("A senha não deve conter o prefixo do seu e-mail corporativo.");
        entropy = Math.max(0, entropy - 25);
      }
    }
  }

  // Arredonda a entropia para cálculo de score
  const finalEntropy = Math.max(0, Math.round(entropy));

  // Score percentual baseado em escala de segurança (0 a 100)
  const score = Math.min(100, Math.max(5, Math.round((finalEntropy / 90) * 100)));

  // Classificação
  let level: PasswordStrengthResult["level"];
  let label: string;
  let colorClass: string;
  let barColorClass: string;

  if (finalEntropy < 35 || password.length < 8) {
    level = "VERY_WEAK";
    label = "Muito Fraca";
    colorClass = "text-destructive";
    barColorClass = "bg-destructive";
  } else if (finalEntropy < 55 || password.length < 12) {
    level = "WEAK";
    label = "Fraca";
    colorClass = "text-amber-500";
    barColorClass = "bg-amber-500";
  } else if (finalEntropy < 75) {
    level = "FAIR";
    label = "Moderada";
    colorClass = "text-amber-400";
    barColorClass = "bg-amber-400";
  } else if (finalEntropy < 90) {
    level = "STRONG";
    label = "Forte";
    colorClass = "text-primary";
    barColorClass = "bg-primary";
  } else {
    level = "VERY_STRONG";
    label = "Excelente";
    colorClass = "text-emerald-400";
    barColorClass = "bg-emerald-400";
  }

  // Orientações construtivas
  if (!hasUpper) feedbacks.push("Adicione ao menos uma letra maiúscula.");
  if (!hasLower) feedbacks.push("Adicione ao menos uma letra minúscula.");
  if (!hasDigits) feedbacks.push("Adicione ao menos um número.");
  if (!hasSymbols) feedbacks.push("Adicione símbolos especiais (!@#$%).");
  if (password.length < 12) feedbacks.push("Aumente o tamanho para 12 caracteres ou mais.");

  const isAcceptable =
    password.length >= 12 &&
    hasUpper &&
    hasLower &&
    hasDigits &&
    hasSymbols &&
    warnings.length === 0 &&
    finalEntropy >= 60;

  return {
    entropyBits: finalEntropy,
    score,
    level,
    label,
    colorClass,
    barColorClass,
    feedbacks,
    warnings,
    isAcceptable,
  };
}
