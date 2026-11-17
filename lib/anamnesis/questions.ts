// Anamnese inicial — definição das perguntas (compartilhada entre client e server).
// Respostas são gravadas em patient_anamnesis.answers como { [questionId]: AnswerValue }.
// Ao mudar perguntas de forma incompatível, suba ANAMNESIS_VERSION.

export const ANAMNESIS_VERSION = 1

export type AnamnesisQuestionType =
  | 'text'       // resposta curta
  | 'textarea'   // resposta longa
  | 'time'       // HH:MM
  | 'number'
  | 'choice'     // uma opção
  | 'multi'      // várias opções
  | 'yesno'      // Sim/Não + detalhe opcional quando "Sim"
  | 'scale'      // 1..10

export type AnamnesisQuestion = {
  id: string
  label: string
  type: AnamnesisQuestionType
  hint?: string
  options?: string[]
  /** Opção de "nenhum" em multi: exclusiva com as demais */
  noneOption?: string
  /** yesno: rótulo do campo de detalhe (aparece quando "Sim") */
  detailLabel?: string
  /** yesno: detalhe obrigatório quando "Sim" */
  detailRequired?: boolean
  min?: number
  max?: number
  minLabel?: string
  maxLabel?: string
  unit?: string
  optional?: boolean
  image?: string
  /** Só mostra se a pergunta `id` tiver valor `equals` (yesno usa 'Sim'/'Não') */
  showIf?: { id: string; equals: string }
}

export type AnamnesisSection = { title: string; questions: AnamnesisQuestion[] }

export type AnswerValue =
  | string
  | string[]
  | { value: string; detail?: string }

export type AnamnesisAnswers = Record<string, AnswerValue>

const SIM_NAO_AS_VEZES = ['Sim', 'Não', 'Às vezes']

export const ANAMNESIS_SECTIONS: AnamnesisSection[] = [
  {
    title: 'Objetivo',
    questions: [
      { id: 'objetivo', label: 'Qual seu objetivo com a consulta?', type: 'textarea' },
    ],
  },
  {
    title: 'Sono',
    questions: [
      { id: 'hora_acorda', label: 'Qual horário você costuma acordar?', type: 'time' },
      { id: 'hora_dorme', label: 'Qual horário você costuma ir dormir?', type: 'time' },
      { id: 'demora_sono', label: 'Você demora pra pegar no sono?', type: 'choice', options: SIM_NAO_AS_VEZES },
      {
        id: 'qualidade_sono', label: 'Qualidade do sono', type: 'choice',
        options: ['Ruim', 'Regular', 'Boa', 'Muito boa'],
      },
      { id: 'acorda_noite', label: 'Acorda no meio da noite?', type: 'choice', options: SIM_NAO_AS_VEZES },
      {
        id: 'medicamento_dormir', label: 'Toma algum medicamento pra dormir?', type: 'yesno',
        detailLabel: 'Qual medicamento?', detailRequired: true,
      },
    ],
  },
  {
    title: 'Rotina',
    questions: [
      { id: 'rotina_trabalho', label: 'Como é sua rotina de trabalho/estudo?', type: 'textarea' },
      { id: 'lazer', label: 'O que você costuma fazer no seu momento livre/lazer?', type: 'textarea' },
    ],
  },
  {
    title: 'Atividade física',
    questions: [
      {
        id: 'atividade_fisica', label: 'Você pratica atividade física?', type: 'yesno',
        detailLabel: 'Qual(is)?', detailRequired: true,
      },
      {
        id: 'atividade_dias', label: 'Quantos dias na semana?', type: 'number', min: 1, max: 7, unit: 'dias',
        showIf: { id: 'atividade_fisica', equals: 'Sim' },
      },
      {
        id: 'atividade_duracao', label: 'Qual a duração?', type: 'number', min: 1, max: 600, unit: 'minutos',
        showIf: { id: 'atividade_fisica', equals: 'Sim' },
      },
      {
        id: 'atividade_intensidade', label: 'Qual intensidade?', type: 'choice',
        options: ['Fraco', 'Moderado', 'Intenso'],
        showIf: { id: 'atividade_fisica', equals: 'Sim' },
      },
    ],
  },
  {
    title: 'Dados clínicos',
    questions: [
      {
        id: 'sintomas', label: 'Marque o que você sente/sentiu nas últimas 3 semanas', type: 'multi',
        options: [
          'Vômito', 'Náusea', 'Dificuldade na mastigação', 'Dificuldade na deglutição',
          'Má digestão', 'Pirose (azia)', 'Refluxo', 'Diarreia', 'Constipação',
          'Insônia', 'Estresse', 'Cansaço', 'Ansiedade',
        ],
        noneOption: 'Nenhum',
      },
      { id: 'urina_frequencia', label: 'Quantas vezes por dia você vai ao banheiro pra fazer xixi?', type: 'number', min: 0, max: 50, unit: 'vezes/dia' },
      {
        id: 'urina_cor', label: 'Qual a coloração da urina?', type: 'choice',
        options: ['Transparente', 'Amarelo claro', 'Amarelo', 'Amarelo escuro', 'Âmbar / alaranjada'],
      },
      { id: 'evacuacao_frequencia', label: 'Quantas vezes por dia você vai ao banheiro pra evacuar?', type: 'text', hint: 'Ex.: 1x ao dia, a cada 2 dias...' },
      {
        id: 'fezes_consistencia', label: 'Qual a consistência das fezes?', type: 'choice',
        hint: 'Use a escala de Bristol da imagem como referência.',
        image: '/bristol-scale.svg',
        options: ['Tipo 1', 'Tipo 2', 'Tipo 3', 'Tipo 4', 'Tipo 5', 'Tipo 6', 'Tipo 7'],
      },
    ],
  },
  {
    title: 'Histórico de saúde',
    questions: [
      { id: 'cirurgia', label: 'Já fez alguma cirurgia?', type: 'yesno', detailLabel: 'Qual(is) e quando?', detailRequired: true },
      { id: 'lesao', label: 'Tem alguma lesão?', type: 'yesno', detailLabel: 'Qual(is)?', detailRequired: true },
      { id: 'medicacao', label: 'Toma alguma medicação?', type: 'yesno', detailLabel: 'Qual(is) e dose?', detailRequired: true },
      { id: 'suplemento', label: 'Toma algum suplemento?', type: 'yesno', detailLabel: 'Qual(is)?', detailRequired: true },
      { id: 'fuma', label: 'Você fuma?', type: 'choice', options: ['Não', 'Sim', 'Ex-fumante'] },
      {
        id: 'alcool', label: 'Ingere bebidas alcoólicas? Com que frequência?', type: 'choice',
        options: ['Não bebo', 'Raramente', '1 a 2x por semana', '3x ou mais por semana', 'Todos os dias'],
      },
      {
        id: 'historico_familiar', label: 'Possui histórico familiar de doenças?', type: 'multi',
        options: ['Diabetes', 'Dislipidemia', 'HAS (hipertensão)', 'Obesidade', 'Doença renal', 'Doença autoimune'],
        noneOption: 'Nenhuma',
      },
      { id: 'historico_familiar_obs', label: 'Quer detalhar o histórico familiar? (quem, qual doença)', type: 'textarea', optional: true },
      { id: 'intolerancia', label: 'Possui alguma intolerância alimentar?', type: 'yesno', detailLabel: 'Qual(is)?', detailRequired: true },
      { id: 'alergia', label: 'Possui alguma alergia?', type: 'yesno', detailLabel: 'Qual(is)?', detailRequired: true },
    ],
  },
  {
    title: 'Qualidade de vida e alimentação',
    questions: [
      {
        id: 'qualidade_vida', label: 'Em uma escala de 1 a 10, como você avalia sua qualidade de vida no geral?',
        type: 'scale', min: 1, max: 10, minLabel: 'Muito ruim', maxLabel: 'Excelente',
      },
      {
        id: 'avaliacao_alimentacao', label: 'Em uma escala de 1 a 10, como você avalia sua alimentação?',
        type: 'scale', min: 1, max: 10, minLabel: 'Muito ruim', maxLabel: 'Excelente',
      },
      { id: 'dificuldade_alimentacao', label: 'Qual sua principal dificuldade com a alimentação?', type: 'textarea' },
    ],
  },
]

export const ALL_ANAMNESIS_QUESTIONS = ANAMNESIS_SECTIONS.flatMap((s) => s.questions)

export function isQuestionVisible(q: AnamnesisQuestion, answers: AnamnesisAnswers): boolean {
  if (!q.showIf) return true
  return answerMainValue(answers[q.showIf.id]) === q.showIf.equals
}

export function answerMainValue(a: AnswerValue | undefined): string {
  if (a == null) return ''
  if (typeof a === 'string') return a
  if (Array.isArray(a)) return a.join(', ')
  return a.value ?? ''
}

/** Retorna ids das perguntas visíveis sem resposta válida. */
export function validateAnamnesis(answers: AnamnesisAnswers): string[] {
  const missing: string[] = []
  for (const q of ALL_ANAMNESIS_QUESTIONS) {
    if (!isQuestionVisible(q, answers) || q.optional) continue
    const a = answers[q.id]
    if (q.type === 'multi') {
      if (!Array.isArray(a) || a.length === 0) missing.push(q.id)
    } else if (q.type === 'yesno') {
      const v = a && typeof a === 'object' && !Array.isArray(a) ? a : null
      if (!v || (v.value !== 'Sim' && v.value !== 'Não')) missing.push(q.id)
      else if (v.value === 'Sim' && q.detailRequired && !v.detail?.trim()) missing.push(q.id)
    } else if (q.type === 'number' || q.type === 'scale') {
      const n = typeof a === 'string' && a.trim() !== '' ? Number(a) : NaN
      if (!Number.isFinite(n)) missing.push(q.id)
      else if ((q.min != null && n < q.min) || (q.max != null && n > q.max)) missing.push(q.id)
    } else if (q.type === 'choice') {
      if (typeof a !== 'string' || !(q.options ?? []).includes(a)) missing.push(q.id)
    } else {
      if (typeof a !== 'string' || !a.trim()) missing.push(q.id)
    }
  }
  return missing
}

/** Mantém só respostas de perguntas conhecidas e visíveis, com formato limpo. */
export function sanitizeAnamnesis(raw: unknown): AnamnesisAnswers {
  const src = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  const out: AnamnesisAnswers = {}
  const clip = (s: unknown, n = 2000) => String(s ?? '').slice(0, n).trim()
  for (const q of ALL_ANAMNESIS_QUESTIONS) {
    const v = src[q.id]
    if (v == null) continue
    if (q.type === 'multi') {
      if (!Array.isArray(v)) continue
      const allowed = new Set([...(q.options ?? []), ...(q.noneOption ? [q.noneOption] : [])])
      const arr = v.map((x) => String(x)).filter((x) => allowed.has(x))
      if (arr.length) out[q.id] = arr
    } else if (q.type === 'yesno') {
      if (typeof v !== 'object' || Array.isArray(v)) continue
      const o = v as Record<string, unknown>
      const value = clip(o.value, 10)
      if (value !== 'Sim' && value !== 'Não') continue
      out[q.id] = value === 'Sim' ? { value, detail: clip(o.detail) } : { value }
    } else {
      const s = clip(v)
      if (s) out[q.id] = s
    }
  }
  // Remove respostas de perguntas condicionais escondidas
  for (const q of ALL_ANAMNESIS_QUESTIONS) {
    if (!isQuestionVisible(q, out)) delete out[q.id]
  }
  return out
}

/** Texto legível de uma resposta (usado na visão do admin). */
export function formatAnswer(q: AnamnesisQuestion, a: AnswerValue | undefined): string {
  if (a == null || (Array.isArray(a) && a.length === 0)) return '-'
  if (typeof a === 'string') return q.unit ? `${a} ${q.unit}` : q.type === 'scale' ? `${a}/10` : a
  if (Array.isArray(a)) return a.join(', ')
  return a.value === 'Sim' && a.detail ? `Sim: ${a.detail}` : a.value
}
