# 📋 Resumo Técnico — Meudollar
**Data:** May 19, 2026
**Status:** Em desenvolvimento ativo
**URL produção:** https://TryFreed.github.io/TryFreed

---

## 🔐 Supabase

### Credenciais
```javascript
SUPA_URL = 'https://nyicbxrbabudbwahrjzx.supabase.co'
SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55aWNieHJiYWJ1ZGJ3YWhyanp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjg1MDYsImV4cCI6MjA5NDcwNDUwNn0.C8r8MdY3i12Q9fX1DSJTdopDf_mBepFp0ft9skluD4I'
// ⚠️ Usar chave ANON (legacy), NÃO sb_publishable
```

### Tabelas
```
rendas  — id (uuid), user_id, name, val, type, dow, day, month, year, locked
bills   — id (uuid), user_id, name, val, type, day, month, year, cat, note, locked, meta_id, meta_end
metas   — id (uuid), user_id, name, val, day, month, year, descricao, done, bill_id, need_per_week, weeks_left
```

### Permissões (CRÍTICO — sem isso dá 403!)
```sql
grant all on table rendas to authenticated;
grant all on table bills to authenticated;
grant all on table metas to authenticated;
grant all on table rendas to anon;
grant all on table bills to anon;
grant all on table metas to anon;

create policy "rendas all" on rendas for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "bills all" on bills for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "metas all" on metas for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 🚀 Boot (não alterar ordem!)

```javascript
let _booted = false;

_supa.auth.onAuthStateChange(async (event, session) => {
  if(!_booted) return; // CRÍTICO — evita race condition
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

---

## 📱 Mobile Layout

- **Header mobile:** logo + botão ☰
- **Navegação mobile:** barra inferior `.bottom-nav`
- **Drawer:** abre pela direita, contém email + sair + dark/light + idioma + saldo inicial
- **handleLogout()** SEMPRE chama `closeDrawer()` primeiro
- **Breakpoint:** `@media(max-width:640px)`

---

## 💰 Estado Global

```javascript
let _user = null          // usuário Supabase
let rendas = []           // rendas
let bills = []            // despesas
let metas = []            // metas
let initialBalance = 0    // saldo inicial (localStorage por user)
let dark = false          // tema
let lang = 'pt'           // idioma (localStorage)
START = hoje              // data início (dinâmica)
END = hoje + 10 anos      // sem limite
```

---

## 🌐 i18n (Bilíngue PT/EN)

- Objeto `TRANSLATIONS` com todas as strings
- Função `t(key)` retorna string no idioma ativo
- `setLang('pt'|'en')` — persiste no localStorage, chama `applyLang()` + `rebuild()`
- Toggle na **home screen** (🇧🇷 PT / 🇺🇸 EN) e no **drawer**
- `applyLang()` atualiza todos os elementos estáticos

---

## 🧭 Onboarding Wizard (5 passos)

- Aparece só na **primeira vez** que o usuário loga
- `localStorage['ob_done_'+userId]` controla se já foi feito
- **Passo 0:** Nome
- **Passo 1:** Saldo inicial
- **Passo 2:** Rendas (adiciona quantas quiser, lista com ×)
- **Passo 3:** Despesas (idem, com categoria)
- **Passo 4:** Resumo + botão "Fazer tour" ou "Pular"
- Botão **"Refazer configuração inicial"** no drawer para resetar

## 🗺 Tour Guiado (7 paradas)

- Ativado ao final do wizard ou manualmente
- Highlight azul + tooltip em cada elemento
- Paradas: Cards → Tabs → Renda → Despesas → Semana → Metas → Relatório
- `localStorage['tour_done_'+userId]` marca como feito

---

## 📝 Tipos de Renda

- `monthly` — Mensal
- `biweekly` — Quinzenal *(novo)*
- `weekly` — Semanal
- `once` — Única vez

---

## ⚠️ Notas Críticas

1. Chave Supabase = ANON legacy (não sb_publishable)
2. GRANTS são obrigatórios — sem eles dá 403
3. `_booted` flag — não remover
4. IDs são UUIDs — sempre aspas nos inline handlers: `onclick="fn('${id}')"`
5. `handleLogout()` → `closeDrawer()` primeiro
6. `showTab()` usa `tabId` como parâmetro (não `t` — conflito com função de tradução!)
7. GitHub Pages: deletar arquivos com nome errado antes de subir novo
8. Deploy: subir sempre um único `index.html` limpo

---

## ✅ Implementado

1. ✅ Bilíngue PT/EN completo
2. ✅ Formulários colapsáveis (renda, despesas, metas)
3. ✅ Modal de confirmação ao deletar
4. ✅ Onboarding wizard (5 passos)
5. ✅ Tour guiado do app (7 paradas)
6. ✅ Quinzenal nas rendas

---

## 🚀 Pendente (próxima sessão)

### Prioritário
1. 🔔 **Notificações de contas da semana** — banner/card mostrando o que vence nos próximos 7 dias, com valor total
2. 📊 **Exportar Excel** — exportar rendas, despesas e relatório para .xlsx

### Sugestões do Claude
3. 📱 **Ajustes mobile nos formulários** — inputs muito pequenos no mobile, especialmente no wizard
4. 🔄 **Edição inline** — poder editar nome/valor de renda ou despesa direto na lista sem precisar deletar e recriar
5. 🏷 **Tags/notas nas despesas** — campo de observação para anotar detalhes (ex: "parcela 2/12")
6. 📆 **Dia de recebimento na renda quinzenal** — definir os dois dias do mês (ex: dia 5 e dia 20)
7. 🎨 **Personalização** — escolher cor/ícone para categorias de despesa
8. 🔒 **Senha para o app** — PIN de 4 dígitos para abrir sem precisar logar todo dia

---

## 🔄 Como Continuar

1. Upload do `index.html` + este `RESUMO_TECNICO.md`
2. Falar o que quer implementar
3. Claude edita com `str_replace`
4. Deploy no GitHub Pages (subir só o `index.html`)
5. Gerar resumo atualizado ao final

---
*Meudollar — May 19, 2026 — Sessão 3*
