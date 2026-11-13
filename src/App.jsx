import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calculator, History, Wallet, Settings, Save, Trash2, Sun, Moon, Download, Upload, Plus,
  RotateCcw, TrendingUp, TrendingDown, DollarSign, Car, Truck, Bus, Search, Check, X,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Fuel, Receipt, Percent, MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

/* ============================================================================
 * CONSTANTES E DADOS PADRÃO
 * ========================================================================== */

const STORAGE_KEYS = {
  tarifas: 'guincho:tarifas:v1',
  global: 'guincho:global:v1',
  atendimentos: 'guincho:atendimentos:v1',
  despesas: 'guincho:despesas:v1',
  tema: 'guincho:tema:v1',
};

const CATEGORIAS = [
  { id: 'leve', nome: 'Leve', desc: 'Carros de passeio e motos', icon: Car, cor: '#38bdf8' },
  { id: 'utilitario', nome: 'Utilitário', desc: 'Vans, pick-ups e SUVs', icon: Truck, cor: '#a78bfa' },
  { id: 'pesado', nome: 'Pesado', desc: 'Caminhões toco/truck e ônibus', icon: Bus, cor: '#f59e0b' },
  { id: 'extra', nome: 'Extra-Pesado', desc: 'Carretas, bitrens e máquinas', icon: Truck, cor: '#f43f5e' },
];
const CAT_MAP = Object.fromEntries(CATEGORIAS.map((c) => [c.id, c]));

const CAMPOS_TARIFA = [
  { key: 'bandeirada', label: 'Taxa de saída (bandeirada)', unit: 'R$', hint: 'Valor fixo por acionamento' },
  { key: 'kmFranquia', label: 'KM inclusos na saída', unit: 'km', hint: 'Franquia sem cobrança de KM' },
  { key: 'valorKm', label: 'Valor por KM rodado', unit: 'R$/km' },
  { key: 'horaParada', label: 'Hora parada / espera', unit: 'R$/h' },
  { key: 'diariaPatio', label: 'Diária de pátio', unit: 'R$/dia' },
  { key: 'patins', label: 'Uso de patins (por par)', unit: 'R$' },
  { key: 'munck', label: 'Munck / guindauto', unit: 'R$/h' },
  { key: 'custoKm', label: 'Custo operacional por KM', unit: 'R$/km', hint: 'Diesel + desgaste (estimativa interna)' },
];

const TARIFAS_PADRAO = {
  leve: { bandeirada: 150, kmFranquia: 10, valorKm: 4.5, horaParada: 60, diariaPatio: 40, patins: 80, munck: 150, custoKm: 1.6 },
  utilitario: { bandeirada: 220, kmFranquia: 10, valorKm: 6, horaParada: 80, diariaPatio: 60, patins: 120, munck: 200, custoKm: 2.2 },
  pesado: { bandeirada: 450, kmFranquia: 5, valorKm: 10, horaParada: 150, diariaPatio: 100, patins: 200, munck: 350, custoKm: 4.5 },
  extra: { bandeirada: 900, kmFranquia: 0, valorKm: 16, horaParada: 250, diariaPatio: 180, patins: 350, munck: 600, custoKm: 7.5 },
};

const GLOBAL_PADRAO = {
  empresa: 'Guincho & Resgate',
  comissaoMotorista: 10,
  adicionalNoturno: 30,
};

const TIPOS_DESPESA = [
  { id: 'combustivel', nome: 'Combustível / Diesel', cor: '#f59e0b' },
  { id: 'manut_prev', nome: 'Manutenção preventiva', cor: '#22c55e' },
  { id: 'manut_corr', nome: 'Manutenção corretiva', cor: '#ef4444' },
  { id: 'pneus', nome: 'Pneus', cor: '#64748b' },
  { id: 'seguros', nome: 'Seguros', cor: '#3b82f6' },
  { id: 'salarios', nome: 'Salários / Comissões', cor: '#a855f7' },
  { id: 'ipva', nome: 'IPVA / Licenciamento', cor: '#06b6d4' },
  { id: 'outros', nome: 'Outros', cor: '#94a3b8' },
];
const TIPO_DESPESA_MAP = Object.fromEntries(TIPOS_DESPESA.map((t) => [t.id, t]));

const FORMAS_PAGAMENTO = ['PIX', 'Dinheiro', 'Cartão', 'Boleto', 'Faturado (seguradora)', 'Faturado (empresa)'];

/* ============================================================================
 * UTILITÁRIOS
 * ========================================================================== */

const num = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const brl = (v) => num(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (v, d = 1) => num(v).toLocaleString('pt-BR', { maximumFractionDigits: d });

const pad = (n) => String(n).padStart(2, '0');
const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => toISODate(new Date());
const fmtData = (iso) => {
  if (!iso) return '-';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function intervaloPreset(preset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'hoje':
      return { de: hoje(), ate: hoje() };
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return { de: toISODate(d), ate: hoje() };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return { de: toISODate(d), ate: hoje() };
    }
    case 'mes':
      return { de: toISODate(new Date(y, m, 1)), ate: toISODate(new Date(y, m + 1, 0)) };
    case 'mesAnterior':
      return { de: toISODate(new Date(y, m - 1, 1)), ate: toISODate(new Date(y, m, 0)) };
    case 'ano':
      return { de: `${y}-01-01`, ate: `${y}-12-31` };
    default:
      return { de: '', ate: '' };
  }
}

const dentroPeriodo = (data, de, ate) => (!de || data >= de) && (!ate || data <= ate);

function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function paraCSV(linhas) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + linhas.map((l) => l.map(esc).join(';')).join('\n');
}

/* ============================================================================
 * CÁLCULO DO ORÇAMENTO
 * ========================================================================== */

function calcularOrcamento(params, entrada, global) {
  const km = num(entrada.km);
  const kmCobrado = Math.max(0, km - num(params.kmFranquia));
  const horas = num(entrada.horasParadas);
  const dias = num(entrada.diasPatio);
  const qtdPatins = entrada.usaPatins ? Math.max(1, num(entrada.qtdPatins)) : 0;
  const horasMunck = entrada.usaMunck ? num(entrada.horasMunck) : 0;
  const equip = num(entrada.equipEspecial);
  const pedagios = num(entrada.pedagios);

  const itens = [
    { label: 'Taxa de saída (bandeirada)', valor: num(params.bandeirada) },
    {
      label: `KM rodado (${fmtNum(kmCobrado)} km × ${brl(params.valorKm)})`,
      valor: kmCobrado * num(params.valorKm),
      nota: num(params.kmFranquia) > 0 ? `${fmtNum(params.kmFranquia)} km inclusos na saída` : '',
    },
    { label: `Hora parada (${fmtNum(horas)} h × ${brl(params.horaParada)})`, valor: horas * num(params.horaParada) },
    { label: `Diária de pátio (${fmtNum(dias, 0)} × ${brl(params.diariaPatio)})`, valor: dias * num(params.diariaPatio) },
    { label: `Patins (${qtdPatins} par(es))`, valor: qtdPatins * num(params.patins) },
    { label: `Munck (${fmtNum(horasMunck)} h)`, valor: horasMunck * num(params.munck) },
    { label: 'Equipamentos especiais', valor: equip },
    { label: 'Pedágios (repasse)', valor: pedagios },
  ];

  const subtotal = itens.reduce((s, i) => s + i.valor, 0);
  const baseAdicional = subtotal - pedagios;
  const adicional = entrada.noturno ? (baseAdicional * num(global.adicionalNoturno)) / 100 : 0;
  if (adicional > 0) {
    itens.push({ label: `Adicional noturno/feriado (${fmtNum(global.adicionalNoturno)}%)`, valor: adicional });
  }
  const desconto = Math.min(num(entrada.desconto), subtotal + adicional);
  if (desconto > 0) itens.push({ label: 'Desconto', valor: -desconto });

  const total = Math.max(0, subtotal + adicional - desconto);

  const custoKm = km * num(params.custoKm);
  const comissao = (Math.max(0, total - pedagios) * num(global.comissaoMotorista)) / 100;
  const outrosCustos = num(entrada.outrosCustos);
  const custos = [
    { label: `Diesel + desgaste (${fmtNum(km)} km × ${brl(params.custoKm)})`, valor: custoKm },
    { label: `Comissão motorista (${fmtNum(global.comissaoMotorista)}%)`, valor: comissao },
    { label: 'Pedágios pagos', valor: pedagios },
    { label: 'Outros custos (ajudante, alimentação...)', valor: outrosCustos },
  ];
  const custoTotal = custos.reduce((s, c) => s + c.valor, 0);
  const lucro = total - custoTotal;
  const margem = total > 0 ? (lucro / total) * 100 : 0;

  return { itens: itens.filter((i) => i.valor !== 0 || i.label.startsWith('Taxa')), custos, total, custoTotal, lucro, margem, km };
}

/* ============================================================================
 * PERSISTÊNCIA (localStorage)
 * ========================================================================== */

function useLocalStorage(key, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const salvo = window.localStorage.getItem(key);
      return salvo !== null ? JSON.parse(salvo) : inicial;
    } catch {
      return inicial;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(valor));
    } catch {
      /* armazenamento indisponível (modo privado / cota) */
    }
  }, [key, valor]);
  return [valor, setValor];
}

/* ============================================================================
 * TEMA (claro / escuro)
 * ========================================================================== */

const TEMAS = {
  escuro: {
    page: 'bg-slate-950 text-slate-100',
    header: 'bg-slate-900/95 border-slate-800',
    card: 'bg-slate-900 border-slate-800',
    subtle: 'bg-slate-800/60',
    input: 'bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:ring-amber-500/30',
    muted: 'text-slate-400',
    strong: 'text-white',
    border: 'border-slate-800',
    divide: 'divide-slate-800',
    hover: 'hover:bg-slate-800',
    thead: 'bg-slate-800/70 text-slate-400',
    btnGhost: 'border-slate-700 text-slate-200 hover:bg-slate-800',
    chip: 'bg-slate-800 text-slate-300',
    chipActive: 'bg-amber-500 text-slate-950',
    navInactive: 'text-slate-400 hover:text-white hover:bg-slate-800',
    grid: '#1e293b',
    axis: '#94a3b8',
    tooltipBg: '#0f172a',
  },
  claro: {
    page: 'bg-slate-100 text-slate-900',
    header: 'bg-white/95 border-slate-200',
    card: 'bg-white border-slate-200',
    subtle: 'bg-slate-50',
    input: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-amber-500 focus:ring-amber-500/30',
    muted: 'text-slate-500',
    strong: 'text-slate-900',
    border: 'border-slate-200',
    divide: 'divide-slate-200',
    hover: 'hover:bg-slate-50',
    thead: 'bg-slate-50 text-slate-500',
    btnGhost: 'border-slate-300 text-slate-700 hover:bg-slate-100',
    chip: 'bg-slate-200 text-slate-700',
    chipActive: 'bg-amber-500 text-slate-950',
    navInactive: 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    grid: '#e2e8f0',
    axis: '#64748b',
    tooltipBg: '#ffffff',
  },
};

const ThemeCtx = createContext(TEMAS.escuro);
const useT = () => useContext(ThemeCtx);

/* ============================================================================
 * COMPONENTES DE UI REUTILIZÁVEIS
 * ========================================================================== */

function Card({ title, icon: Icon, actions, children, className = '' }) {
  const t = useT();
  return (
    <section className={`rounded-2xl border shadow-sm ${t.card} ${className}`}>
      {(title || actions) && (
        <header className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5 ${t.border}`}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
            {Icon && <Icon className="h-4 w-4 text-amber-500" />}
            {title}
          </h2>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({ label, hint, children, className = '' }) {
  const t = useT();
  return (
    <label className={`block ${className}`}>
      <span className={`mb-1 block text-xs font-medium ${t.muted}`}>{label}</span>
      {children}
      {hint && <span className={`mt-1 block text-[11px] ${t.muted}`}>{hint}</span>}
    </label>
  );
}

function Input({ className = '', ...props }) {
  const t = useT();
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${t.input} ${className}`}
    />
  );
}

function NumInput({ value, onChange, unit, step = 'any', min = 0, ...props }) {
  const t = useT();
  return (
    <div className="relative">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        {...props}
        className={`w-full rounded-lg border py-2 pl-3 text-sm outline-none transition focus:ring-2 ${unit ? 'pr-14' : 'pr-3'} ${t.input}`}
      />
      {unit && (
        <span className={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs ${t.muted}`}>{unit}</span>
      )}
    </div>
  );
}

function Select({ children, className = '', ...props }) {
  const t = useT();
  return (
    <select
      {...props}
      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 ${t.input} ${className}`}
    >
      {children}
    </select>
  );
}

function Toggle({ checked, onChange, label }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${t.border} ${t.hover}`}
    >
      <span>{label}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-amber-500' : 'bg-slate-500/40'}`}>
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-4' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

function Button({ variant = 'primary', icon: Icon, children, className = '', ...props }) {
  const t = useT();
  const estilos = {
    primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400 border-amber-500',
    ghost: t.btnGhost,
    danger: 'border-red-500/40 text-red-500 hover:bg-red-500/10',
    success: 'bg-emerald-600 text-white hover:bg-emerald-500 border-emerald-600',
  };
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${estilos[variant]} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}

function Stat({ label, value, icon: Icon, tone = 'neutral', sub }) {
  const t = useT();
  const tons = {
    neutral: 'text-amber-500 bg-amber-500/10',
    green: 'text-emerald-500 bg-emerald-500/10',
    red: 'text-red-500 bg-red-500/10',
    blue: 'text-sky-500 bg-sky-500/10',
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${t.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-xs font-medium uppercase tracking-wide ${t.muted}`}>{label}</p>
          <p className="mt-1 truncate text-xl font-bold sm:text-2xl">{value}</p>
          {sub && <p className={`mt-1 text-xs ${t.muted}`}>{sub}</p>}
        </div>
        {Icon && (
          <span className={`rounded-xl p-2 ${tons[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

function CategoriaBadge({ id }) {
  const c = CAT_MAP[id];
  if (!c) return null;
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: `${c.cor}22`, color: c.cor }}
    >
      <c.icon className="h-3 w-3" />
      {c.nome}
    </span>
  );
}

function FiltroPeriodo({ filtro, setFiltro }) {
  const t = useT();
  const presets = [
    ['todos', 'Todos'],
    ['hoje', 'Hoje'],
    ['7d', '7 dias'],
    ['30d', '30 dias'],
    ['mes', 'Este mês'],
    ['mesAnterior', 'Mês anterior'],
    ['ano', 'Este ano'],
    ['custom', 'Personalizado'],
  ];
  const escolher = (p) => {
    if (p === 'custom') setFiltro({ ...filtro, preset: p });
    else setFiltro({ ...filtro, preset: p, ...intervaloPreset(p) });
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(([id, nome]) => (
          <button
            key={id}
            type="button"
            onClick={() => escolher(id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filtro.preset === id ? t.chipActive : t.chip}`}
          >
            {nome}
          </button>
        ))}
      </div>
      {filtro.preset === 'custom' && (
        <div className="grid grid-cols-2 gap-2 sm:max-w-md">
          <Field label="De">
            <Input type="date" value={filtro.de} onChange={(e) => setFiltro({ ...filtro, de: e.target.value })} />
          </Field>
          <Field label="Até">
            <Input type="date" value={filtro.ate} onChange={(e) => setFiltro({ ...filtro, ate: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.tipo === 'erro' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toast.tipo === 'erro' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {toast.msg}
        </div>
      ))}
    </div>
  );
}

function Vazio({ icon: Icon, titulo, texto }) {
  const t = useT();
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed px-4 py-10 text-center ${t.border}`}>
      <Icon className={`mb-2 h-8 w-8 ${t.muted}`} />
      <p className="font-semibold">{titulo}</p>
      {texto && <p className={`mt-1 text-sm ${t.muted}`}>{texto}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  const t = useT();
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs shadow-lg ${t.card}`}>
      {label && <p className="mb-1 font-semibold">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.payload?.cor }} />
          <span className={t.muted}>{p.name}:</span>
          <span className="font-semibold">{brl(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

/* ============================================================================
 * MÓDULO 1 — SIMULADOR / CALCULADORA DE ORÇAMENTOS
 * ========================================================================== */

const ENTRADA_INICIAL = {
  data: '',
  cliente: '',
  telefone: '',
  veiculo: '',
  placa: '',
  origem: '',
  destino: '',
  km: '',
  horasParadas: '',
  diasPatio: '',
  usaPatins: false,
  qtdPatins: '1',
  usaMunck: false,
  horasMunck: '',
  equipEspecial: '',
  pedagios: '',
  noturno: false,
  desconto: '',
  outrosCustos: '',
  formaPagamento: 'PIX',
  status: 'pendente',
  observacoes: '',
};

function Simulador({ tarifas, setTarifas, global, onSalvar, notificar }) {
  const t = useT();
  const [categoria, setCategoria] = useState('leve');
  const [params, setParams] = useState(() => ({ ...tarifas.leve }));
  const [entrada, setEntrada] = useState(() => ({ ...ENTRADA_INICIAL, data: hoje() }));

  // Ao trocar de categoria, carrega as tarifas padrão dela
  const trocarCategoria = (id) => {
    setCategoria(id);
    setParams({ ...tarifas[id] });
  };

  const set = (k) => (v) => setEntrada((e) => ({ ...e, [k]: v }));
  const setEv = (k) => (e) => setEntrada((s) => ({ ...s, [k]: e.target.value }));
  const setParam = (k) => (v) => setParams((p) => ({ ...p, [k]: v }));

  const resultado = useMemo(() => calcularOrcamento(params, entrada, global), [params, entrada, global]);
  const alterado = CAMPOS_TARIFA.some((c) => num(params[c.key]) !== num(tarifas[categoria][c.key]));

  const salvarComoPadrao = () => {
    const limpo = Object.fromEntries(CAMPOS_TARIFA.map((c) => [c.key, num(params[c.key])]));
    setTarifas((tf) => ({ ...tf, [categoria]: limpo }));
    notificar(`Tarifas padrão de ${CAT_MAP[categoria].nome} atualizadas`);
  };

  const salvar = () => {
    if (!entrada.cliente.trim()) {
      notificar('Informe o nome do cliente para salvar', 'erro');
      return;
    }
    if (num(entrada.km) <= 0) {
      notificar('Informe os KM rodados', 'erro');
      return;
    }
    onSalvar({
      id: uid(),
      criadoEm: new Date().toISOString(),
      data: entrada.data || hoje(),
      categoria,
      cliente: entrada.cliente.trim(),
      telefone: entrada.telefone.trim(),
      veiculo: entrada.veiculo.trim(),
      placa: entrada.placa.trim().toUpperCase(),
      origem: entrada.origem.trim(),
      destino: entrada.destino.trim(),
      km: num(entrada.km),
      formaPagamento: entrada.formaPagamento,
      status: entrada.status,
      observacoes: entrada.observacoes.trim(),
      valor: round2(resultado.total),
      custo: round2(resultado.custoTotal),
      lucro: round2(resultado.lucro),
      itens: resultado.itens.map((i) => ({ label: i.label, valor: round2(i.valor) })),
      custos: resultado.custos.map((c) => ({ label: c.label, valor: round2(c.valor) })),
    });
    setEntrada({ ...ENTRADA_INICIAL, data: hoje(), formaPagamento: entrada.formaPagamento });
    notificar('Atendimento salvo no histórico');
  };

  const limpar = () => {
    setEntrada({ ...ENTRADA_INICIAL, data: hoje() });
    setParams({ ...tarifas[categoria] });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Categoria */}
        <Card title="Categoria do veículo" icon={Truck}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIAS.map((c) => {
              const ativo = c.id === categoria;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => trocarCategoria(c.id)}
                  className={`rounded-xl border-2 p-3 text-left transition ${ativo ? 'border-amber-500 bg-amber-500/10' : `${t.border} ${t.hover}`}`}
                >
                  <c.icon className="mb-1 h-6 w-6" style={{ color: c.cor }} />
                  <p className="text-sm font-bold">{c.nome}</p>
                  <p className={`text-[11px] leading-tight ${t.muted}`}>{c.desc}</p>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Dados do serviço */}
        <Card title="Dados do atendimento" icon={MapPin}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Data">
              <Input type="date" value={entrada.data} onChange={setEv('data')} />
            </Field>
            <Field label="Cliente *">
              <Input placeholder="Nome / seguradora" value={entrada.cliente} onChange={setEv('cliente')} />
            </Field>
            <Field label="Telefone">
              <Input type="tel" placeholder="(00) 00000-0000" value={entrada.telefone} onChange={setEv('telefone')} />
            </Field>
            <Field label="Veículo">
              <Input placeholder="Modelo" value={entrada.veiculo} onChange={setEv('veiculo')} />
            </Field>
            <Field label="Placa">
              <Input placeholder="ABC1D23" value={entrada.placa} onChange={setEv('placa')} className="uppercase" />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={entrada.formaPagamento} onChange={setEv('formaPagamento')}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </Select>
            </Field>
            <Field label="Origem">
              <Input placeholder="Local de retirada" value={entrada.origem} onChange={setEv('origem')} />
            </Field>
            <Field label="Destino">
              <Input placeholder="Local de entrega" value={entrada.destino} onChange={setEv('destino')} />
            </Field>
            <Field label="Status do pagamento">
              <Select value={entrada.status} onChange={setEv('status')}>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </Select>
            </Field>
          </div>
        </Card>

        {/* Serviço */}
        <Card title="Serviço executado" icon={Calculator}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="KM rodados (total) *">
              <NumInput value={entrada.km} onChange={set('km')} unit="km" placeholder="0" />
            </Field>
            <Field label="Horas paradas / espera">
              <NumInput value={entrada.horasParadas} onChange={set('horasParadas')} unit="h" placeholder="0" />
            </Field>
            <Field label="Diárias de pátio">
              <NumInput value={entrada.diasPatio} onChange={set('diasPatio')} unit="dias" step="1" placeholder="0" />
            </Field>
            <Field label="Pedágios">
              <NumInput value={entrada.pedagios} onChange={set('pedagios')} unit="R$" placeholder="0,00" />
            </Field>
            <Field label="Equipamentos especiais" hint="Cintas, dolly, rodas-guia, etc.">
              <NumInput value={entrada.equipEspecial} onChange={set('equipEspecial')} unit="R$" placeholder="0,00" />
            </Field>
            <Field label="Desconto">
              <NumInput value={entrada.desconto} onChange={set('desconto')} unit="R$" placeholder="0,00" />
            </Field>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Toggle checked={entrada.usaPatins} onChange={set('usaPatins')} label="Uso de patins" />
              {entrada.usaPatins && (
                <NumInput value={entrada.qtdPatins} onChange={set('qtdPatins')} unit="pares" step="1" min={1} />
              )}
            </div>
            <div className="space-y-2">
              <Toggle checked={entrada.usaMunck} onChange={set('usaMunck')} label="Munck / guindauto" />
              {entrada.usaMunck && (
                <NumInput value={entrada.horasMunck} onChange={set('horasMunck')} unit="h" placeholder="Horas" />
              )}
            </div>
            <Toggle
              checked={entrada.noturno}
              onChange={set('noturno')}
              label={`Noturno/feriado (+${fmtNum(global.adicionalNoturno)}%)`}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Outros custos da viagem (interno)" hint="Ajudante, alimentação, estadia...">
              <NumInput value={entrada.outrosCustos} onChange={set('outrosCustos')} unit="R$" placeholder="0,00" />
            </Field>
            <Field label="Observações">
              <Input placeholder="Detalhes do resgate" value={entrada.observacoes} onChange={setEv('observacoes')} />
            </Field>
          </div>
        </Card>

        {/* Parâmetros editáveis */}
        <Card
          title={`Tarifas aplicadas — ${CAT_MAP[categoria].nome}`}
          icon={Settings}
          actions={
            <>
              {alterado && (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                  Editado neste orçamento
                </span>
              )}
              <Button variant="ghost" icon={RotateCcw} onClick={() => setParams({ ...tarifas[categoria] })} disabled={!alterado}>
                Restaurar
              </Button>
              <Button variant="ghost" icon={Save} onClick={salvarComoPadrao} disabled={!alterado}>
                Salvar como padrão
              </Button>
            </>
          }
        >
          <p className={`mb-3 text-xs ${t.muted}`}>
            Ajuste os valores apenas para este orçamento ou salve como novo padrão da categoria.
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CAMPOS_TARIFA.map((c) => (
              <Field key={c.key} label={c.label}>
                <NumInput value={params[c.key]} onChange={setParam(c.key)} unit={c.unit} />
              </Field>
            ))}
          </div>
        </Card>
      </div>

      {/* Resumo do orçamento */}
      <div className="lg:col-span-1">
        <div className="space-y-4 lg:sticky lg:top-24">
          <Card title="Orçamento" icon={Receipt}>
            <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Valor final da corrida</p>
              <p className="mt-1 text-3xl font-extrabold">{brl(resultado.total)}</p>
              <p className="mt-1 text-xs font-medium opacity-80">
                {CAT_MAP[categoria].nome} · {fmtNum(resultado.km)} km
              </p>
            </div>

            <ul className={`mt-4 divide-y text-sm ${t.divide}`}>
              {resultado.itens.map((i) => (
                <li key={i.label} className="flex items-start justify-between gap-3 py-2">
                  <span className={t.muted}>
                    {i.label}
                    {i.nota && <span className="block text-[11px] opacity-75">{i.nota}</span>}
                  </span>
                  <span className={`whitespace-nowrap font-semibold ${i.valor < 0 ? 'text-red-500' : ''}`}>{brl(i.valor)}</span>
                </li>
              ))}
            </ul>

            <div className={`mt-4 rounded-xl p-3 text-sm ${t.subtle}`}>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${t.muted}`}>Custos estimados da viagem</p>
              {resultado.custos.map((c) => (
                <div key={c.label} className="flex justify-between gap-3 py-0.5">
                  <span className={`text-xs ${t.muted}`}>{c.label}</span>
                  <span className="whitespace-nowrap text-xs font-medium">{brl(c.valor)}</span>
                </div>
              ))}
              <div className={`mt-2 flex justify-between border-t pt-2 ${t.border}`}>
                <span className="font-medium">Custo total</span>
                <span className="font-semibold text-red-500">{brl(resultado.custoTotal)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-medium">Lucro líquido</span>
                <span className={`font-bold ${resultado.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {brl(resultado.lucro)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className={`text-xs ${t.muted}`}>Margem</span>
                <span className={`text-xs font-semibold ${resultado.margem >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtNum(resultado.margem)}%
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button variant="ghost" icon={RotateCcw} onClick={limpar}>
                Limpar
              </Button>
              <Button variant="success" icon={Save} onClick={salvar} className="col-span-2">
                Salvar Atendimento
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

const round2 = (v) => Math.round(num(v) * 100) / 100;

/* ============================================================================
 * MÓDULO 2 — HISTÓRICO DE ATENDIMENTOS
 * ========================================================================== */

function Historico({ atendimentos, setAtendimentos, notificar }) {
  const t = useT();
  const [filtro, setFiltro] = useState({ preset: 'mes', ...intervaloPreset('mes') });
  const [categoria, setCategoria] = useState('todas');
  const [status, setStatus] = useState('todos');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return atendimentos
      .filter((a) => dentroPeriodo(a.data, filtro.de, filtro.ate))
      .filter((a) => categoria === 'todas' || a.categoria === categoria)
      .filter((a) => status === 'todos' || a.status === status)
      .filter(
        (a) =>
          !q ||
          [a.cliente, a.placa, a.veiculo, a.origem, a.destino, a.telefone].some((s) => (s || '').toLowerCase().includes(q))
      )
      .sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm));
  }, [atendimentos, filtro, categoria, status, busca]);

  const tot = useMemo(
    () =>
      lista.reduce(
        (s, a) => ({ km: s.km + num(a.km), valor: s.valor + num(a.valor), custo: s.custo + num(a.custo), lucro: s.lucro + num(a.lucro) }),
        { km: 0, valor: 0, custo: 0, lucro: 0 }
      ),
    [lista]
  );

  const excluir = (id) => {
    if (!window.confirm('Excluir este atendimento do histórico?')) return;
    setAtendimentos((l) => l.filter((a) => a.id !== id));
    notificar('Atendimento excluído');
  };

  const alternarStatus = (id) =>
    setAtendimentos((l) => l.map((a) => (a.id === id ? { ...a, status: a.status === 'pago' ? 'pendente' : 'pago' } : a)));

  const exportar = () => {
    const linhas = [
      ['Data', 'Cliente', 'Telefone', 'Categoria', 'Veículo', 'Placa', 'Origem', 'Destino', 'KM', 'Valor', 'Custo', 'Lucro', 'Pagamento', 'Status', 'Observações'],
      ...lista.map((a) => [
        fmtData(a.data), a.cliente, a.telefone, CAT_MAP[a.categoria]?.nome, a.veiculo, a.placa, a.origem, a.destino,
        fmtNum(a.km), fmtNum(a.valor, 2), fmtNum(a.custo, 2), fmtNum(a.lucro, 2), a.formaPagamento, a.status, a.observacoes,
      ]),
    ];
    baixarArquivo(`atendimentos_${hoje()}.csv`, paraCSV(linhas), 'text/csv;charset=utf-8');
  };

  const StatusBadge = ({ a }) => (
    <button
      type="button"
      onClick={() => alternarStatus(a.id)}
      title="Clique para alternar"
      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
        a.status === 'pago' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'
      }`}
    >
      {a.status === 'pago' ? 'Pago' : 'Pendente'}
    </button>
  );

  const Detalhes = ({ a }) => (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <p className={`mb-1 text-xs font-semibold uppercase ${t.muted}`}>Composição do valor</p>
        {(a.itens || []).map((i) => (
          <div key={i.label} className="flex justify-between gap-2 py-0.5">
            <span className={t.muted}>{i.label}</span>
            <span className="whitespace-nowrap">{brl(i.valor)}</span>
          </div>
        ))}
      </div>
      <div>
        <p className={`mb-1 text-xs font-semibold uppercase ${t.muted}`}>Custos estimados</p>
        {(a.custos || []).map((c) => (
          <div key={c.label} className="flex justify-between gap-2 py-0.5">
            <span className={t.muted}>{c.label}</span>
            <span className="whitespace-nowrap">{brl(c.valor)}</span>
          </div>
        ))}
        <div className={`mt-2 space-y-0.5 text-xs ${t.muted}`}>
          {(a.origem || a.destino) && <p>Trajeto: {a.origem || '?'} → {a.destino || '?'}</p>}
          {a.telefone && <p>Telefone: {a.telefone}</p>}
          <p>Pagamento: {a.formaPagamento}</p>
          {a.observacoes && <p>Obs.: {a.observacoes}</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card title="Filtros" icon={Search}>
        <div className="space-y-3">
          <FiltroPeriodo filtro={filtro} setFiltro={setFiltro} />
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Tipo de guincho">
              <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="todas">Todas as categorias</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="pago">Pagos</option>
                <option value="pendente">Pendentes</option>
              </Select>
            </Field>
            <Field label="Buscar">
              <Input placeholder="Cliente, placa, local..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Atendimentos" value={lista.length} icon={Truck} sub={`${fmtNum(tot.km, 0)} km rodados`} />
        <Stat label="Faturado" value={brl(tot.valor)} icon={DollarSign} tone="blue" />
        <Stat label="Custos estimados" value={brl(tot.custo)} icon={TrendingDown} tone="red" />
        <Stat
          label="Lucro líquido"
          value={brl(tot.lucro)}
          icon={TrendingUp}
          tone={tot.lucro >= 0 ? 'green' : 'red'}
          sub={tot.valor > 0 ? `Margem ${fmtNum((tot.lucro / tot.valor) * 100)}%` : undefined}
        />
      </div>

      <Card
        title="Atendimentos realizados"
        icon={History}
        actions={
          <Button variant="ghost" icon={Download} onClick={exportar} disabled={!lista.length}>
            Exportar CSV
          </Button>
        }
      >
        {lista.length === 0 ? (
          <Vazio icon={History} titulo="Nenhum atendimento encontrado" texto="Ajuste os filtros ou salve um atendimento no Simulador." />
        ) : (
          <>
            {/* Tabela (desktop) */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className={`text-left text-xs uppercase ${t.thead}`}>
                  <tr>
                    <th className="rounded-l-lg px-3 py-2">Data</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2 text-right">KM</th>
                    <th className="px-3 py-2 text-right">Valor cobrado</th>
                    <th className="px-3 py-2 text-right">Custos</th>
                    <th className="px-3 py-2 text-right">Lucro líquido</th>
                    <th className="px-3 py-2 text-center">Status</th>
                    <th className="rounded-r-lg px-3 py-2" />
                  </tr>
                </thead>
                <tbody className={`divide-y ${t.divide}`}>
                  {lista.map((a) => (
                    <React.Fragment key={a.id}>
                      <tr className={t.hover}>
                        <td className="whitespace-nowrap px-3 py-2">{fmtData(a.data)}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{a.cliente}</p>
                          <p className={`text-xs ${t.muted}`}>{[a.veiculo, a.placa].filter(Boolean).join(' · ')}</p>
                        </td>
                        <td className="px-3 py-2"><CategoriaBadge id={a.categoria} /></td>
                        <td className="px-3 py-2 text-right">{fmtNum(a.km)}</td>
                        <td className="px-3 py-2 text-right font-semibold">{brl(a.valor)}</td>
                        <td className="px-3 py-2 text-right text-red-500">{brl(a.custo)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${a.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {brl(a.lucro)}
                        </td>
                        <td className="px-3 py-2 text-center"><StatusBadge a={a} /></td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button type="button" onClick={() => setAberto(aberto === a.id ? null : a.id)} className={`rounded p-1 ${t.hover}`} title="Detalhes">
                            {aberto === a.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <button type="button" onClick={() => excluir(a.id)} className="rounded p-1 text-red-500 hover:bg-red-500/10" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {aberto === a.id && (
                        <tr>
                          <td colSpan={9} className={`px-4 py-3 ${t.subtle}`}>
                            <Detalhes a={a} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartões (mobile) */}
            <div className="space-y-2 md:hidden">
              {lista.map((a) => (
                <div key={a.id} className={`rounded-xl border p-3 ${t.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{a.cliente}</p>
                      <p className={`text-xs ${t.muted}`}>
                        {fmtData(a.data)} · {fmtNum(a.km)} km {a.placa && `· ${a.placa}`}
                      </p>
                    </div>
                    <CategoriaBadge id={a.categoria} />
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className={`rounded-lg p-2 ${t.subtle}`}>
                      <p className={t.muted}>Valor</p>
                      <p className="font-bold">{brl(a.valor)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${t.subtle}`}>
                      <p className={t.muted}>Custos</p>
                      <p className="font-bold text-red-500">{brl(a.custo)}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${t.subtle}`}>
                      <p className={t.muted}>Lucro</p>
                      <p className={`font-bold ${a.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{brl(a.lucro)}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <StatusBadge a={a} />
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setAberto(aberto === a.id ? null : a.id)} className={`rounded-lg border px-2 py-1 text-xs ${t.btnGhost}`}>
                        {aberto === a.id ? 'Ocultar' : 'Detalhes'}
                      </button>
                      <button type="button" onClick={() => excluir(a.id)} className="rounded-lg border border-red-500/40 px-2 py-1 text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {aberto === a.id && (
                    <div className={`mt-3 border-t pt-3 ${t.border}`}>
                      <Detalhes a={a} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * MÓDULO 3 — GASTOS E CUSTOS OPERACIONAIS
 * ========================================================================== */

const DESPESA_INICIAL = { data: '', tipo: 'combustivel', categoria: 'geral', placa: '', descricao: '', valor: '' };

function Gastos({ despesas, setDespesas, atendimentos, notificar }) {
  const t = useT();
  const [form, setForm] = useState(() => ({ ...DESPESA_INICIAL, data: hoje() }));
  const [filtro, setFiltro] = useState({ preset: 'mes', ...intervaloPreset('mes') });
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [incluirEstimados, setIncluirEstimados] = useState(false);

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const adicionar = (e) => {
    e.preventDefault();
    if (num(form.valor) <= 0) {
      notificar('Informe um valor maior que zero', 'erro');
      return;
    }
    setDespesas((l) => [
      {
        id: uid(),
        criadoEm: new Date().toISOString(),
        data: form.data || hoje(),
        tipo: form.tipo,
        categoria: form.categoria,
        placa: form.placa.trim().toUpperCase(),
        descricao: form.descricao.trim(),
        valor: round2(form.valor),
      },
      ...l,
    ]);
    setForm({ ...DESPESA_INICIAL, data: form.data, tipo: form.tipo, categoria: form.categoria });
    notificar('Despesa registrada');
  };

  const excluir = (id) => {
    if (!window.confirm('Excluir esta despesa?')) return;
    setDespesas((l) => l.filter((d) => d.id !== id));
    notificar('Despesa excluída');
  };

  const despesasFiltradas = useMemo(
    () =>
      despesas
        .filter((d) => dentroPeriodo(d.data, filtro.de, filtro.ate))
        .filter((d) => tipoFiltro === 'todos' || d.tipo === tipoFiltro)
        .sort((a, b) => (b.data + b.criadoEm).localeCompare(a.data + a.criadoEm)),
    [despesas, filtro, tipoFiltro]
  );

  const atendPeriodo = useMemo(() => atendimentos.filter((a) => dentroPeriodo(a.data, filtro.de, filtro.ate)), [atendimentos, filtro]);
  const despPeriodo = useMemo(() => despesas.filter((d) => dentroPeriodo(d.data, filtro.de, filtro.ate)), [despesas, filtro]);

  const faturamento = atendPeriodo.reduce((s, a) => s + num(a.valor), 0);
  const custoEstimado = atendPeriodo.reduce((s, a) => s + num(a.custo), 0);
  const totalDespesas = despPeriodo.reduce((s, d) => s + num(d.valor), 0);
  const custosTotais = totalDespesas + (incluirEstimados ? custoEstimado : 0);
  const lucroReal = faturamento - custosTotais;
  const margem = faturamento > 0 ? (lucroReal / faturamento) * 100 : 0;

  // Gráfico mensal: últimos 6 meses (independente do filtro)
  const dadosMensais = useMemo(() => {
    const now = new Date();
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push({ chave: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, nome: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` });
    }
    return meses.map(({ chave, nome }) => {
      const fat = atendimentos.filter((a) => a.data.startsWith(chave)).reduce((s, a) => s + num(a.valor), 0);
      const est = atendimentos.filter((a) => a.data.startsWith(chave)).reduce((s, a) => s + num(a.custo), 0);
      const desp = despesas.filter((d) => d.data.startsWith(chave)).reduce((s, d) => s + num(d.valor), 0);
      const custos = desp + (incluirEstimados ? est : 0);
      return { nome, Faturamento: round2(fat), Custos: round2(custos), Lucro: round2(fat - custos) };
    });
  }, [atendimentos, despesas, incluirEstimados]);

  const dadosPorTipo = useMemo(() => {
    const mapa = {};
    despPeriodo.forEach((d) => {
      mapa[d.tipo] = (mapa[d.tipo] || 0) + num(d.valor);
    });
    return TIPOS_DESPESA.filter((tp) => mapa[tp.id]).map((tp) => ({ name: tp.nome, value: round2(mapa[tp.id]), cor: tp.cor }));
  }, [despPeriodo]);

  const dadosPorCategoria = useMemo(
    () =>
      CATEGORIAS.map((c) => {
        const fat = atendPeriodo.filter((a) => a.categoria === c.id).reduce((s, a) => s + num(a.valor), 0);
        const desp = despPeriodo.filter((d) => d.categoria === c.id).reduce((s, d) => s + num(d.valor), 0);
        return { nome: c.nome, Faturamento: round2(fat), Despesas: round2(desp) };
      }),
    [atendPeriodo, despPeriodo]
  );

  const exportar = () => {
    const linhas = [
      ['Data', 'Tipo', 'Guincho', 'Placa', 'Descrição', 'Valor'],
      ...despesasFiltradas.map((d) => [
        fmtData(d.data), TIPO_DESPESA_MAP[d.tipo]?.nome, d.categoria === 'geral' ? 'Geral' : CAT_MAP[d.categoria]?.nome, d.placa, d.descricao, fmtNum(d.valor, 2),
      ]),
    ];
    baixarArquivo(`despesas_${hoje()}.csv`, paraCSV(linhas), 'text/csv;charset=utf-8');
  };

  return (
    <div className="space-y-4">
      <Card title="Período de análise" icon={Search}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <FiltroPeriodo filtro={filtro} setFiltro={setFiltro} />
          <div className="lg:w-80">
            <Toggle checked={incluirEstimados} onChange={setIncluirEstimados} label="Somar custos estimados das corridas" />
            <p className={`mt-1 text-[11px] ${t.muted}`}>
              Ative apenas se diesel/comissões NÃO forem lançados aqui como despesa, para evitar contagem dupla.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Faturamento bruto" value={brl(faturamento)} icon={DollarSign} tone="blue" sub={`${atendPeriodo.length} atendimento(s)`} />
        <Stat
          label="Custos totais"
          value={brl(custosTotais)}
          icon={TrendingDown}
          tone="red"
          sub={incluirEstimados ? `Despesas ${brl(totalDespesas)} + estim. ${brl(custoEstimado)}` : `${despPeriodo.length} despesa(s)`}
        />
        <Stat label="Lucro líquido real" value={brl(lucroReal)} icon={TrendingUp} tone={lucroReal >= 0 ? 'green' : 'red'} />
        <Stat label="Margem líquida" value={`${fmtNum(margem)}%`} icon={Percent} tone={margem >= 0 ? 'green' : 'red'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Faturamento × Custos × Lucro (6 meses)" icon={TrendingUp} className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: t.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: t.axis, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                  tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${fmtNum(v / 1000)}k` : fmtNum(v, 0))}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: t.grid, opacity: 0.4 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Faturamento" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Custos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Lucro" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Despesas por tipo" icon={Fuel}>
          {dadosPorTipo.length === 0 ? (
            <Vazio icon={Wallet} titulo="Sem despesas no período" />
          ) : (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={dadosPorTipo} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={dadosPorTipo.length > 1 ? 2 : 0} stroke="none">
                      {dadosPorTipo.map((d) => (
                        <Cell key={d.name} fill={d.cor} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                {dadosPorTipo.map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.cor }} />
                      {d.name}
                    </span>
                    <span className="font-semibold">
                      {brl(d.value)} <span className={t.muted}>({fmtNum((d.value / totalDespesas) * 100, 0)}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <Card title="Resultado por tipo de guincho (período)" icon={Truck}>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosPorCategoria} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={t.grid} vertical={false} />
              <XAxis dataKey="nome" tick={{ fill: t.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: t.axis, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${fmtNum(v / 1000)}k` : fmtNum(v, 0))}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: t.grid, opacity: 0.4 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Faturamento" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className={`mt-2 text-[11px] ${t.muted}`}>Despesas marcadas como “Geral” não entram neste comparativo por categoria.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Registrar despesa" icon={Plus}>
          <form onSubmit={adicionar} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <Input type="date" value={form.data} onChange={setF('data')} />
              </Field>
              <Field label="Valor *">
                <NumInput value={form.valor} onChange={(v) => setForm((f) => ({ ...f, valor: v }))} unit="R$" placeholder="0,00" />
              </Field>
            </div>
            <Field label="Tipo de despesa">
              <Select value={form.tipo} onChange={setF('tipo')}>
                {TIPOS_DESPESA.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.nome}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Guincho vinculado">
                <Select value={form.categoria} onChange={setF('categoria')}>
                  <option value="geral">Geral (frota)</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Placa do guincho">
                <Input placeholder="Opcional" value={form.placa} onChange={setF('placa')} className="uppercase" />
              </Field>
            </div>
            <Field label="Descrição">
              <Input placeholder="Ex.: 200 L diesel S10 posto X" value={form.descricao} onChange={setF('descricao')} />
            </Field>
            <Button type="submit" icon={Plus} className="w-full">
              Adicionar despesa
            </Button>
          </form>
        </Card>

        <Card
          title="Despesas lançadas"
          icon={Wallet}
          className="lg:col-span-2"
          actions={
            <>
              <Select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="!w-auto !py-1.5 text-xs">
                <option value="todos">Todos os tipos</option>
                {TIPOS_DESPESA.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.nome}</option>
                ))}
              </Select>
              <Button variant="ghost" icon={Download} onClick={exportar} disabled={!despesasFiltradas.length}>
                CSV
              </Button>
            </>
          }
        >
          {despesasFiltradas.length === 0 ? (
            <Vazio icon={Receipt} titulo="Nenhuma despesa no período" texto="Registre combustível, manutenção, pneus, seguros e outros custos." />
          ) : (
            <ul className={`max-h-[28rem] divide-y overflow-y-auto ${t.divide}`}>
              {despesasFiltradas.map((d) => {
                const tp = TIPO_DESPESA_MAP[d.tipo] || TIPO_DESPESA_MAP.outros;
                return (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tp.cor }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.descricao || tp.nome}</p>
                      <p className={`flex flex-wrap items-center gap-x-2 text-xs ${t.muted}`}>
                        <span>{fmtData(d.data)}</span>
                        <span>· {tp.nome}</span>
                        <span>· {d.categoria === 'geral' ? 'Geral' : CAT_MAP[d.categoria]?.nome}</span>
                        {d.placa && <span>· {d.placa}</span>}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold text-red-500">{brl(d.valor)}</span>
                    <button type="button" onClick={() => excluir(d.id)} className="rounded p-1 text-red-500 hover:bg-red-500/10" title="Excluir">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {despesasFiltradas.length > 0 && (
            <div className={`mt-3 flex justify-between border-t pt-3 text-sm ${t.border}`}>
              <span className={t.muted}>Total listado</span>
              <span className="font-bold text-red-500">{brl(despesasFiltradas.reduce((s, d) => s + num(d.valor), 0))}</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================================
 * MÓDULO 4 — CONFIGURAÇÕES DE TARIFAS E PARÂMETROS
 * ========================================================================== */

function Configuracoes({ tarifas, setTarifas, global, setGlobal, dados, restaurarBackup, limparTudo, notificar }) {
  const t = useT();
  const [rascunho, setRascunho] = useState(tarifas);
  const [rascGlobal, setRascGlobal] = useState(global);
  const inputArquivo = useRef(null);

  // Sincroniza caso as tarifas sejam alteradas a partir do Simulador
  useEffect(() => setRascunho(tarifas), [tarifas]);
  useEffect(() => setRascGlobal(global), [global]);

  const pendente =
    JSON.stringify(normalizarTarifas(rascunho)) !== JSON.stringify(normalizarTarifas(tarifas)) ||
    rascGlobal.empresa !== global.empresa ||
    num(rascGlobal.comissaoMotorista) !== num(global.comissaoMotorista) ||
    num(rascGlobal.adicionalNoturno) !== num(global.adicionalNoturno);

  const salvar = () => {
    setTarifas(normalizarTarifas(rascunho));
    setGlobal({
      empresa: (rascGlobal.empresa || '').trim() || GLOBAL_PADRAO.empresa,
      comissaoMotorista: num(rascGlobal.comissaoMotorista),
      adicionalNoturno: num(rascGlobal.adicionalNoturno),
    });
    notificar('Configurações salvas');
  };

  const restaurarPadroes = () => {
    if (!window.confirm('Restaurar todas as tarifas e parâmetros para os valores de fábrica?')) return;
    setTarifas(TARIFAS_PADRAO);
    setGlobal(GLOBAL_PADRAO);
    notificar('Tarifas padrão restauradas');
  };

  const exportarBackup = () => {
    baixarArquivo(
      `backup_guincho_${hoje()}.json`,
      JSON.stringify({ versao: 1, exportadoEm: new Date().toISOString(), ...dados }, null, 2),
      'application/json'
    );
  };

  const importarBackup = (e) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const json = JSON.parse(String(leitor.result));
        if (!json || typeof json !== 'object' || !json.tarifas) throw new Error('formato');
        if (!window.confirm('Importar o backup substituirá os dados atuais. Continuar?')) return;
        restaurarBackup(json);
        notificar('Backup importado com sucesso');
      } catch {
        notificar('Arquivo de backup inválido', 'erro');
      }
    };
    leitor.readAsText(arquivo);
  };

  return (
    <div className="space-y-4">
      <div className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between ${t.card}`}>
        <div>
          <p className="font-semibold">Tabela de tarifas e parâmetros</p>
          <p className={`text-sm ${t.muted}`}>Os valores salvos aqui são carregados automaticamente no Simulador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" icon={X} onClick={() => { setRascunho(tarifas); setRascGlobal(global); }} disabled={!pendente}>
            Descartar
          </Button>
          <Button icon={Save} onClick={salvar} disabled={!pendente}>
            Salvar alterações
          </Button>
        </div>
      </div>

      <Card title="Parâmetros gerais" icon={Settings}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome da empresa">
            <Input value={rascGlobal.empresa} onChange={(e) => setRascGlobal((g) => ({ ...g, empresa: e.target.value }))} />
          </Field>
          <Field label="Comissão do motorista" hint="Sobre o valor do serviço (sem pedágios)">
            <NumInput value={rascGlobal.comissaoMotorista} onChange={(v) => setRascGlobal((g) => ({ ...g, comissaoMotorista: v }))} unit="%" />
          </Field>
          <Field label="Adicional noturno / feriado" hint="Aplicado quando marcado no orçamento">
            <NumInput value={rascGlobal.adicionalNoturno} onChange={(v) => setRascGlobal((g) => ({ ...g, adicionalNoturno: v }))} unit="%" />
          </Field>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {CATEGORIAS.map((c) => (
          <Card
            key={c.id}
            title={`Guincho ${c.nome}`}
            icon={c.icon}
            actions={
              <button
                type="button"
                onClick={() => setRascunho((r) => ({ ...r, [c.id]: { ...TARIFAS_PADRAO[c.id] } }))}
                className={`text-xs font-medium underline-offset-2 hover:underline ${t.muted}`}
              >
                Valores de fábrica
              </button>
            }
          >
            <p className={`mb-3 text-xs ${t.muted}`}>{c.desc}</p>
            <div className="grid grid-cols-2 gap-3">
              {CAMPOS_TARIFA.map((campo) => (
                <Field key={campo.key} label={campo.label} hint={campo.hint}>
                  <NumInput
                    value={rascunho[c.id]?.[campo.key] ?? ''}
                    onChange={(v) => setRascunho((r) => ({ ...r, [c.id]: { ...r[c.id], [campo.key]: v } }))}
                    unit={campo.unit}
                  />
                </Field>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card title="Dados e backup" icon={Download}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Button variant="ghost" icon={Download} onClick={exportarBackup}>
            Exportar backup (JSON)
          </Button>
          <Button variant="ghost" icon={Upload} onClick={() => inputArquivo.current?.click()}>
            Importar backup
          </Button>
          <Button variant="ghost" icon={RotateCcw} onClick={restaurarPadroes}>
            Restaurar tarifas de fábrica
          </Button>
          <Button variant="danger" icon={Trash2} onClick={limparTudo}>
            Apagar histórico e despesas
          </Button>
          <input ref={inputArquivo} type="file" accept="application/json,.json" className="hidden" onChange={importarBackup} />
        </div>
        <p className={`mt-3 text-xs ${t.muted}`}>
          Todos os dados ficam salvos neste navegador (localStorage): {dados.atendimentos.length} atendimento(s) e{' '}
          {dados.despesas.length} despesa(s). Faça backups periódicos para não perder informações ao limpar o navegador.
        </p>
      </Card>
    </div>
  );
}

function normalizarTarifas(tf) {
  return Object.fromEntries(
    CATEGORIAS.map((c) => [c.id, Object.fromEntries(CAMPOS_TARIFA.map((f) => [f.key, num(tf?.[c.id]?.[f.key])]))])
  );
}

/* ============================================================================
 * APLICATIVO PRINCIPAL
 * ========================================================================== */

const ABAS = [
  { id: 'simulador', nome: 'Simulador', nomeLongo: 'Simulador / Orçamentos', icon: Calculator },
  { id: 'historico', nome: 'Histórico', nomeLongo: 'Histórico de Atendimentos', icon: History },
  { id: 'gastos', nome: 'Gastos', nomeLongo: 'Gastos e Custos', icon: Wallet },
  { id: 'config', nome: 'Tarifas', nomeLongo: 'Configurações de Tarifas', icon: Settings },
];

export default function App() {
  const [tema, setTema] = useLocalStorage(STORAGE_KEYS.tema, 'escuro');
  const [tarifasSalvas, setTarifas] = useLocalStorage(STORAGE_KEYS.tarifas, TARIFAS_PADRAO);
  const [globalSalvo, setGlobal] = useLocalStorage(STORAGE_KEYS.global, GLOBAL_PADRAO);
  const [atendimentos, setAtendimentos] = useLocalStorage(STORAGE_KEYS.atendimentos, []);
  const [despesas, setDespesas] = useLocalStorage(STORAGE_KEYS.despesas, []);
  const [aba, setAba] = useState('simulador');
  const [toasts, setToasts] = useState([]);

  // Garante estrutura completa mesmo com dados antigos/corrompidos no storage
  const tarifas = useMemo(() => {
    const base = {};
    CATEGORIAS.forEach((c) => {
      base[c.id] = { ...TARIFAS_PADRAO[c.id], ...(tarifasSalvas?.[c.id] || {}) };
    });
    return base;
  }, [tarifasSalvas]);
  const global = useMemo(() => ({ ...GLOBAL_PADRAO, ...(globalSalvo || {}) }), [globalSalvo]);

  const t = TEMAS[tema] || TEMAS.escuro;

  const notificar = (msg, tipo = 'ok') => {
    const id = uid();
    setToasts((l) => [...l, { id, msg, tipo }]);
    setTimeout(() => setToasts((l) => l.filter((x) => x.id !== id)), 2800);
  };

  const resumoMes = useMemo(() => {
    const { de, ate } = intervaloPreset('mes');
    const fat = atendimentos.filter((a) => dentroPeriodo(a.data, de, ate)).reduce((s, a) => s + num(a.valor), 0);
    const desp = despesas.filter((d) => dentroPeriodo(d.data, de, ate)).reduce((s, d) => s + num(d.valor), 0);
    return { fat, lucro: fat - desp };
  }, [atendimentos, despesas]);

  const restaurarBackup = (json) => {
    setTarifas(normalizarTarifas({ ...TARIFAS_PADRAO, ...json.tarifas }));
    setGlobal({ ...GLOBAL_PADRAO, ...(json.global || {}) });
    setAtendimentos(Array.isArray(json.atendimentos) ? json.atendimentos : []);
    setDespesas(Array.isArray(json.despesas) ? json.despesas : []);
  };

  const limparTudo = () => {
    if (!window.confirm('Apagar TODO o histórico de atendimentos e despesas? Esta ação não pode ser desfeita.')) return;
    setAtendimentos([]);
    setDespesas([]);
    notificar('Histórico e despesas apagados');
  };

  const abaAtual = ABAS.find((a) => a.id === aba);

  return (
    <ThemeCtx.Provider value={t}>
      <div className={`min-h-screen pb-20 md:pb-8 ${t.page}`}>
        {/* Cabeçalho */}
        <header className={`sticky top-0 z-40 border-b backdrop-blur ${t.header}`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950">
                <Truck className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight">{global.empresa}</p>
                <p className={`truncate text-xs ${t.muted}`}>Gestão de frota · Leves a Extra-Pesados</p>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAba(a.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    aba === a.id ? 'bg-amber-500 text-slate-950' : t.navInactive
                  }`}
                >
                  <a.icon className="h-4 w-4" />
                  {a.nome}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className={`hidden text-right text-xs lg:block ${t.muted}`}>
                <p>Mês atual: <span className="font-semibold text-sky-500">{brl(resumoMes.fat)}</span></p>
                <p>Lucro: <span className={`font-semibold ${resumoMes.lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{brl(resumoMes.lucro)}</span></p>
              </div>
              <button
                type="button"
                onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
                className={`rounded-lg border p-2 transition ${t.btnGhost}`}
                title="Alternar tema"
                aria-label="Alternar tema claro/escuro"
              >
                {tema === 'escuro' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <h1 className="mb-4 flex items-center gap-2 text-lg font-bold sm:text-xl">
            <abaAtual.icon className="h-5 w-5 text-amber-500" />
            {abaAtual.nomeLongo}
          </h1>

          {aba === 'simulador' && (
            <Simulador
              tarifas={tarifas}
              setTarifas={setTarifas}
              global={global}
              notificar={notificar}
              onSalvar={(a) => setAtendimentos((l) => [a, ...l])}
            />
          )}
          {aba === 'historico' && <Historico atendimentos={atendimentos} setAtendimentos={setAtendimentos} notificar={notificar} />}
          {aba === 'gastos' && (
            <Gastos despesas={despesas} setDespesas={setDespesas} atendimentos={atendimentos} notificar={notificar} />
          )}
          {aba === 'config' && (
            <Configuracoes
              tarifas={tarifas}
              setTarifas={setTarifas}
              global={global}
              setGlobal={setGlobal}
              dados={{ tarifas, global, atendimentos, despesas }}
              restaurarBackup={restaurarBackup}
              limparTudo={limparTudo}
              notificar={notificar}
            />
          )}
        </main>

        {/* Navegação inferior (mobile) */}
        <nav className={`fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t backdrop-blur md:hidden ${t.header}`}>
          {ABAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAba(a.id)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${aba === a.id ? 'text-amber-500' : t.muted}`}
            >
              <a.icon className="h-5 w-5" />
              {a.nome}
            </button>
          ))}
        </nav>

        <Toasts toasts={toasts} />
      </div>
    </ThemeCtx.Provider>
  );
}
