/**
 * Relógio Determinístico de Demonstração
 * Permite que filtros como "Hoje", "Esta semana" e expirações de cobrança
 * funcionem de forma consistente e previsível em todos os cenários.
 */
class DemoClock {
  private referenceTime: number;
  private isFrozen: boolean = false;

  constructor() {
    // Data de referência padrão da simulação: 16 de Setembro de 2026 às 10:00 (America/Sao_Paulo)
    this.referenceTime = new Date("2026-09-16T13:00:00.000Z").getTime();
  }

  /**
   * Retorna a data/hora atual da simulação
   */
  public now(): Date {
    return new Date(this.referenceTime);
  }

  /**
   * Retorna o timestamp em milissegundos
   */
  public timestamp(): number {
    return this.referenceTime;
  }

  /**
   * Avança o relógio em minutos (útil para testar expiração de cobrança)
   */
  public advanceMinutes(minutes: number): void {
    if (!this.isFrozen) {
      this.referenceTime += minutes * 60 * 1000;
    }
  }

  /**
   * Reseta o relógio para a data de referência inicial
   */
  public reset(): void {
    this.referenceTime = new Date("2026-09-16T13:00:00.000Z").getTime();
    this.isFrozen = false;
  }

  public freeze(): void {
    this.isFrozen = true;
  }

  public unfreeze(): void {
    this.isFrozen = false;
  }

  public getReferenceIsoString(): string {
    return new Date(this.referenceTime).toISOString();
  }
}

export const demoClock = new DemoClock();
