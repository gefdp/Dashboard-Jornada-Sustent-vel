# Painel Jornada Formativa – Escola Sustentável

Dashboard web em React, Vite, TypeScript e ECharts para acompanhamento da Jornada Formativa – Escola Sustentável.

## Como executar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Dados

O painel lê os arquivos em `public/data`:

- `jornada_sustentavel.json`: cópia sanitizada do JSON fornecido.
- `paraiba-municipios.geojson`: malha municipal da Paraíba usada no mapa ECharts.
- `paraiba-regioes.json`: relação município/região com base na classificação municipal do IBGE.

O carregamento é dinâmico via `fetch`, com estado de carregamento e mensagem de erro.

## Regras implementadas

- Campos vazios e marcador `26` são tratados como nulos.
- GREs são padronizadas de `01ª GRE` a `16ª GRE`.
- O cruzamento de eficiência usa o INEP como chave das escolas.
- Campos pessoais como CPF, e-mail, telefone, documento, matrícula e nomes de representantes foram removidos da cópia pública do JSON.
- Todos os filtros atualizam cards, gráficos e tabela.
- Todos os gráficos têm tooltip e usam visualizações 2D.
- A tabela de eficiência tem busca, filtros, paginação e exportação CSV.
