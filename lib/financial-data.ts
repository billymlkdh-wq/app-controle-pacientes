// Dados estáticos da planilha Financeiro (gid=1985385064) — Jan/2026
// Atualizar conforme novos meses forem fechando

export const PLANOS_STATUS = [
  { plano: 'Mensal',     ativos: 0,  cancelados: 0,  total: 0  },
  { plano: 'Trimestral', ativos: 2,  cancelados: 17, total: 19 },
  { plano: 'Semestral',  ativos: 2,  cancelados: 14, total: 16 },
  { plano: 'Anual',      ativos: 12, cancelados: 9,  total: 21 },
  { plano: 'Econômico',  ativos: 0,  cancelados: 4,  total: 4  },
  { plano: 'Consulta',   ativos: 0,  cancelados: 1,  total: 1  },
]
export const TOTAIS_STATUS = { ativos: 16, cancelados: 45, total: 61 }

export const VENDAS_PLANO_REAIS = [
  { plano: 'Mensal',     jan: 0,     total: 0     },
  { plano: 'Trimestral', jan: 3335,  total: 3335  },
  { plano: 'Semestral',  jan: 1400,  total: 1400  },
  { plano: 'Anual',      jan: 24720, total: 24720 },
  { plano: 'Econômico',  jan: 0,     total: 0     },
  { plano: 'Consulta',   jan: 0,     total: 0     },
]
export const TOTAL_VENDAS_JAN = 29455

export const VENDAS_PLANO_QTD = [
  { plano: 'Mensal',     jan: 0,  total: 0  },
  { plano: 'Trimestral', jan: 4,  total: 4  },
  { plano: 'Semestral',  jan: 2,  total: 2  },
  { plano: 'Anual',      jan: 12, total: 12 },
  { plano: 'Econômico',  jan: 0,  total: 0  },
  { plano: 'Consulta',   jan: 0,  total: 0  },
]
export const TOTAL_VENDAS_QTD_JAN = 18

export const VENDAS_ORIGEM_REAIS = [
  { origem: 'Frias',     jan: 22550, total: 22550 },
  { origem: 'Indicação', jan: 4205,  total: 4205  },
  { origem: 'Renovação', jan: 2700,  total: 2700  },
  { origem: 'Upsell',    jan: 0,     total: 0     },
  { origem: 'Downsell',  jan: 0,     total: 0     },
]

export const VENDAS_ORIGEM_QTD = [
  { origem: 'Frias',     jan: 14, total: 14 },
  { origem: 'Indicação', jan: 2,  total: 2  },
  { origem: 'Renovação', jan: 2,  total: 2  },
  { origem: 'Upsell',    jan: 0,  total: 0  },
  { origem: 'Downsell',  jan: 0,  total: 0  },
]
