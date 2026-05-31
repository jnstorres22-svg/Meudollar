# Resumo Técnico — Meudollar | Sessão 7

**Data:** 26 de maio de 2026
**URL produção:** https://tryfreed.com
**GitHub:** https://github.com/TryFreed/TryFreed
**Branch:** main
**Deploy:** GitHub Pages (automático via push)

---

## Arquivos do Projeto

```
/Users/joaotorres/Downloads/APP/
├── index.html        — App principal (~4600 linhas, tudo em 1 arquivo)
├── landing.html      — Página de vendas / marketing
├── CNAME             — tryfreed.com (domínio customizado GitHub Pages)
├── tryfreed_logo.svg — Logo SVG
└── 404.html          — Página de erro customizada
```

---

## Supabase

### Credenciais
```javascript
SUPA_URL = 'https://nyicbxrbabudbwahrjzx.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // chave ANON (legacy)
// ATENÇÃO: usar chave ANON, NÃO sb_publishable — causa erro 400
```

### Tabelas

#### `rendas` — Rendas do usuário
```
id            uuid (PK)
user_id       uuid (FK → auth.users)
name          text
val           numeric
type          text  — 'monthly' | 'biweekly' | 'weekly' | 'once'
day           int   — dia do mês (1–31) para monthly/biweekly/once
day2          int   — 2º dia para biweekly (ex: dia 5 e dia 20)
dow           int   — dia da semana (0=Dom … 6=Sáb) para weekly
month         int   — mês (0-indexado) para once
year          int   — ano para once
locked        bool
```

#### `bills` — Despesas do usuário
```
id            uuid (PK)
user_id       uuid (FK → auth.users)
name          text
val           numeric
type          text  — 'monthly' | 'weekly' | 'extra' | 'once'
day           int   — dia do mês para monthly/extra/once | dia da semana (0–6) para weekly
month         int   — mês (0-indexado) para once
year          int   — ano para once
cat           text  — categoria (ver CATS abaixo)
note          text  — observação livre
locked        bool
metaId        uuid  — se vinculada a uma meta (savings goal)
meta_end      text  — data fim da meta vinculada
```

#### `metas` — Metas / Objetivos de poupança
```
id            uuid (PK)
user_id       uuid (FK → auth.users)
name          text
val           numeric     — valor total da meta
day           int
month         int (0-idx)
year          int
desc          text        — descrição opcional
done          bool
billId        uuid        — despesa de poupança vinculada automaticamente
need_per_week numeric     — calculado: quanto guardar por semana
weeks_left    int         — calculado: semanas restantes
```

#### `dividas` — Dívidas / Empréstimos
```
id            uuid (PK)
user_id       uuid (FK → auth.users)
name          text
val           numeric     — valor total
parcelas      jsonb       — array de { due: 'YYYY-MM-DD', val: number, paid: bool }
freq          text        — 'monthly' | 'biweekly' | 'weekly'
```

#### `profiles` — Configurações do usuário
```
user_id           uuid (PK, FK → auth.users)
initial_balance   numeric   — saldo inicial (ponto de partida do cálculo)
```

### Permissões RLS (CRÍTICO — sem isso dá 403!)
```sql
-- Para cada tabela (rendas, bills, metas, dividas, profiles):
grant all on table <tabela> to authenticated;
grant all on table <tabela> to anon;

create policy "<tabela> all" on <tabela>
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Categorias de Despesa (CATS)

```javascript
const CATS = {
  moradia:       { icon: '', color: '#378ADD' },
  transporte:    { icon: '', color: '#EF9F27' },
  alimentacao:   { icon: '', color: '#3B6D11' },
  educacao:      { icon: '', color: '#7B3BB5' },
  viagem:        { icon: '', color: '#1D9E75' },
  assinaturas:   { icon: '', color: '#185FA5' },
  lazer:         { icon: '', color: '#D4537E' },
  saude:         { icon: '', color: '#E24B4A' },
  vestuario:     { icon: '', color: '#854F0B' },
  outros:        { icon: '', color: '#888780' },
  generosidade:  { icon: '', color: '#D4537E' },
}
// Labels via getter: get label(){ return t('cat_'+key) } — muda com o idioma
```

---

## Arquitetura do App (index.html)

### Boot (não alterar a ordem!)
```javascript
let _booted = false;

_supa.auth.onAuthStateChange(async (event, session) => {
  if(!_booted) return; // CRÍTICO — evita race condition no carregamento inicial
  if(event==='SIGNED_IN') → loadFromSupabase() → initApp()
  if(event==='SIGNED_OUT') → showHome()
});

async function bootApp(){
  const {data:{session}} = await _supa.auth.getSession();
  _booted = true;
  if(session?.user) → loadFromSupabase() → initApp()
  else → showHome()
}
bootApp();
```

### Estado Global
```javascript
let _user = null          // usuário Supabase
let rendas = []           // rendas (carregadas do Supabase)
let bills = []            // despesas
let metas = []            // metas
let dividas = []          // dívidas
let initialBalance = 0    // saldo inicial (salvo na tabela profiles)
let dark = false          // tema escuro (localStorage)
let lang = 'pt'           // idioma ativo (localStorage)
let _dayEdit = null       // estado do modal de edição de agenda
```

### Funções Centrais
```javascript
loadFromSupabase(uid)     // carrega tudo em paralelo com Promise.all
initApp()                 // monta todas as telas após carregar dados
rebuild()                 // recalcula e re-renderiza tudo (cards, semana, calendário, relatório)
showTab(tabId)            // navega entre tabs — ATENÇÃO: parâmetro é 'tabId', não 't' (conflito com função de tradução)
```

---

## Navegação / Bottom Nav (Mobile)

### Wave Navbar — App (index.html)
```javascript
function updateBnShape(tabId, instant){
  if(window.innerWidth >= 640) return; // só mobile
  // usa getBoundingClientRect() do botão ativo
  // desenha SVG path com bezier côncavo sob o ícone ativo
  // anima com CSS transition se !instant
}
// chamada em: showTab(), initApp(), resize
```

Elementos HTML necessários:
- `#bottomNav` — container
- `#bn-<tabId>` — botão de cada tab (renda, bills, dividas, semana, cal, metas, relatorio)
- `#bn-bubble` — bolha flutuante com ícone
- `#bnShapePath` — `<path>` SVG do recorte

### Wave Navbar — Landing (landing.html)
```javascript
function _setWave(tabN){
  // tabN = número 1–7 (posição do nav ativo)
  // calcula cx baseado em largura fixa do mockup (254px)
  // sem getBoundingClientRect — usa posição estática
}
// chamada em showScreen(n) e no requestAnimationFrame inicial
```

---

## i18n (PT / EN)

```javascript
const TRANSLATIONS = { pt: {...}, en: {...} }
function t(key){ return TRANSLATIONS[lang][key] ?? TRANSLATIONS['pt'][key] ?? key; }
function setLang('pt'|'en')  // persiste localStorage + chama applyLang() + rebuild()
```

Toggle disponível na home screen e no drawer.

---

## Modal de Edição de Agenda (Day Edit Modal)

Abre ao clicar no label de dia de qualquer renda/despesa desbloqueada.

### Conteúdo para rendas:
1. Select de frequência: Mensal | Quinzenal | Semanal | Única vez
2. Input de dia correspondente ao tipo

### Conteúdo para despesas (bills):
1. Select de frequência: Mensal | Semanal | Extra | Única vez
2. **Select de categoria** (novo na sessão 7) — todos os CATS
3. Input de dia correspondente ao tipo

### Salvamento:
```javascript
function saveDayEdit(){
  // lê _dayEdit.{itemType, id, type}
  // lê dei0 (e dei1 para biweekly)
  // lê dei-cat para bills → item.cat
  // salva via saveRenda() ou saveBill()
  // chama buildRendaList() ou renderBills() + rebuild()
}
```

---

## Ordenação Cronológica

### Rendas (buildRendaList)
```javascript
// Recorrentes: ordenadas por dia (weekly usa dow, demais usam day)
const rec = rendas.filter(r => r.type !== 'once').sort((a, b) => {
  const da = a.type === 'weekly' ? Number(a.dow || 0) : Number(a.day || 1);
  const db = b.type === 'weekly' ? Number(b.dow || 0) : Number(b.day || 1);
  return da - db;
});
// Únicas: ordenadas por data completa
const uni = rendas.filter(r => r.type === 'once').sort((a,b) =>
  new Date(a.year, a.month, a.day) - new Date(b.year, b.month, b.day)
);
```

### Despesas (renderBills)
```javascript
// ATENÇÃO: bills NUNCA usam campo 'dow' — weekly usa 'day' (0–6)
const rec = bills.filter(b => b.type !== 'once' && !b.metaId).sort((a, b) => {
  const da = Number(a.day === 99 ? 31 : a.day) || 1; // 99 = último dia do mês
  const db = Number(b.day === 99 ? 31 : b.day) || 1;
  return da - db;
});
```

**Regra crítica:** `Number()` é obrigatório porque Supabase pode retornar strings em vez de inteiros.

---

## Deploy

```bash
# 1. Editar index.html e/ou landing.html localmente
# 2. Commitar
git add index.html landing.html
git commit -m "descrição das mudanças"

# 3. Subir
git push --force https://TOKEN@github.com/TryFreed/TryFreed.git main

# GitHub Pages detecta o push e publica automaticamente
# URL: https://tryfreed.com (via CNAME)
# Tempo de propagação: 1–2 minutos
```

**Não é necessário nenhum build step — arquivos HTML são servidos diretamente.**

---

## O que Foi Implementado (Sessão 7 — 26/05/2026)

### landing.html
1. **Announce bar** com altura corrigida — `height:64px` igual à navbar, usando `display:flex; align-items:center` em vez de padding
2. **Calculadora corrigida** — lógica mudada de `income * 0.085` para `expenses * 0.12` (despesas ocultas), evita mostrar "você pode economizar" quando income = expense
3. **Texto explicativo** abaixo do resultado da calculadora — explica que são gastos escondidos não percebidos
4. **Section labels centralizados** — removido `display:inline-block` que quebrava o `text-align:center`
5. **Wave navbar no mockup do celular** — SVG bezier côncavo que anima ao trocar de aba, igual ao app real
6. **Scroll reveal** via IntersectionObserver — elementos entram com fade+translate ao aparecer na tela
7. **Toast de signup ao vivo** — notificações falsas ciclando a cada 13 segundos ("João acabou de se cadastrar...")
8. **CTA mobile sticky** — aparece quando o CTA do hero sai da tela
9. **Parallax no mockup** — rotação 3D suave seguindo o mouse
10. **Contador animado** na proof bar — anima de 0 até o valor alvo ao entrar na viewport
11. **FAQ accordion** — abre/fecha perguntas frequentes

### index.html
12. **Wave navbar no app** — `updateBnShape()` com SVG bezier côncavo, animado, só no mobile (< 640px)
13. **Ordenação cronológica de rendas** — dia 1→31, weekly por dia da semana (0→6)
14. **Ordenação cronológica de despesas** — dia 1→31, com `Number()` para coerção de strings do Supabase
15. **Modal de edição: select de frequência** — muda entre Mensal/Semanal/Quinzenal/Única vez
16. **Modal de edição: select de categoria** — para despesas, aparece abaixo do select de frequência, pre-selecionado com a categoria atual
17. **saldo inicial salvo no Supabase** — tabela `profiles`, campo `initial_balance`, sobrevive a logout/login

### Sessões anteriores (histórico resumido)
- Autenticação Supabase com race condition fix
- PIN de 4 dígitos via `auth.user_metadata`
- Trocar senha dentro do app
- Onboarding wizard 5 passos
- Tour guiado 7 paradas
- i18n PT/EN completo
- Rendas quinzenais (day + day2)
- Metas com poupança automática (bill vinculado)
- Dívidas com parcelas
- Relatório com gráfico pizza por categoria + exportar Excel/PDF
- Semana e calendário com previsão de contas

---

## Bugs Corrigidos na Sessão 7

| Bug | Causa | Correção |
|-----|-------|----------|
| Announce bar menor que navbar | padding em vez de height fixa | `height:64px; display:flex; align-items:center` |
| Calculadora mostrava economia quando income=expense | fórmula `income*0.085` | mudado para `expenses*0.12` (despesas ocultas) |
| Section labels alinhados à esquerda | `display:inline-block` no CSS quebrando `text-align:center` | removido o `display:inline-block` |
| Despesas não ordenavam cronologicamente | sort usava `a.dow` para bills (campo inexistente em bills) | bills usam `a.day` para tudo, incluindo weekly |
| Rendas não ordenavam (possível) | Supabase retorna strings, `"15" - "3"` funciona mas `"15"` > `"3"` (lexicográfico em alguns contextos) | adicionado `Number()` em toda comparação de dia |
| Category não editável no modal | campo não existia no modal | adicionado `<select id="dei-cat">` para bills |

---

## Regras Críticas do Código

1. **Chave Supabase = ANON legacy** — não trocar para `sb_publishable` (dá erro 400)
2. **GRANTS são obrigatórios** no Supabase — sem eles qualquer operação dá 403
3. **`_booted` flag** — não remover, evita race condition na inicialização
4. **IDs são UUIDs** — sempre usar aspas nos inline handlers: `onclick="fn('${id}')"`
5. **`showTab(tabId)`** — parâmetro chamado `tabId`, nunca `t` (conflito com função de tradução)
6. **`handleLogout()`** — deve chamar `closeDrawer()` primeiro antes de fazer signOut
7. **`Number()` nos sort** — Supabase pode retornar campos numéricos como strings
8. **bills.weekly usa `day` (não `dow`)** — ao contrário de rendas.weekly que usa `dow`
9. **`day=99` = último dia do mês** — tratado como 31 nos sorts e nos labels como "último dia"
10. **Deploy = git push** — nenhum build necessário, GitHub Pages serve os HTML diretamente

---

## Pendências para a Sessão 8

### Prioritário
- [ ] **Notificações push** — alertas de contas que vencem nos próximos X dias
- [ ] **Editar nome/valor inline** nas listas de rendas e despesas sem precisar deletar
- [ ] **Tela de perfil** — foto, nome exibido, dados da conta

### Desejável
- [ ] **Importar extrato bancário** (CSV/OFX) para popular despesas automaticamente
- [ ] **Recorrência "todo último dia do mês"** — já existe `day=99` na lógica, falta UI
- [ ] **Pesquisa/filtro** nas listas de rendas e despesas
- [ ] **Múltiplos usuários** (casal/família) com dados compartilhados

---

## Como Retomar na Sessão 8

1. Abrir o Claude Code na pasta `/Users/joaotorres/Downloads/APP`
2. Mostrar este arquivo ao Claude
3. Descrever o que quer implementar
4. Claude edita `index.html` e/ou `landing.html`
5. Revisar no browser local abrindo o arquivo ou com `python3 -m http.server`
6. Deploy: `git add index.html && git commit -m "..." && git push`
7. Aguardar 1–2 minutos e conferir em https://tryfreed.com
8. Gerar `RESUMO_TECNICO_SESSAO8.md` ao final

---

*Meudollar — Sessão 7 — 26 de maio de 2026*
