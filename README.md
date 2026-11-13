# Gestão de Guinchos — Orçamentos, Histórico e Custos

Aplicativo web (React + Tailwind CSS) para empresas de guincho que atendem
**Leves, Utilitários, Pesados e Extra-Pesados**. Todos os dados são salvos no
navegador via `localStorage`.

## Módulos

1. **Simulador / Orçamentos** – escolha a categoria, informe KM, horas paradas,
   diárias de pátio, patins, munck, equipamentos especiais, pedágios, adicional
   noturno e desconto. O valor final, os custos estimados da viagem (diesel +
   desgaste, comissão, pedágios, outros) e o lucro são calculados em tempo real.
   As tarifas podem ser ajustadas só para o orçamento ou salvas como novo padrão.
   "Salvar Atendimento" grava no histórico.
2. **Histórico** – tabela (cartões no celular) com data, cliente, categoria, KM,
   valor, custos e lucro líquido. Filtros por período, tipo de guincho, status e
   busca; detalhamento por corrida; alternar pago/pendente; exportar CSV.
3. **Gastos e Custos** – registro de despesas (diesel, manutenção preventiva e
   corretiva, pneus, seguros, salários/comissões, IPVA/licenciamento, outros),
   cartões de faturamento bruto × custos totais × lucro líquido real, gráfico
   mensal (6 meses), pizza por tipo de despesa e comparativo por categoria.
4. **Tarifas** – edição dos valores-base por categoria (bandeirada, KM
   inclusos, R$/km, hora parada, diária de pátio, patins, munck, custo/km),
   comissão do motorista, adicional noturno, backup/restauração em JSON.

Tema claro/escuro, layout responsivo com navegação inferior no celular.

## Rodando localmente

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção em dist/
```

## Usando em Claude Artifacts

O arquivo [`src/App.jsx`](src/App.jsx) é autocontido (exporta o componente
`App` por padrão e usa apenas `react`, `lucide-react` e `recharts`). Basta
copiar o conteúdo dele para um artifact React.
