/* ==================================================================
   NUVEM — conexão com o servidor.

   É o que faz o cardápio e os pedidos funcionarem entre aparelhos
   diferentes: o dono edita no computador e aparece no celular do
   cliente; o cliente faz o pedido no celular dele e cai no painel
   do dono na hora.

   Pra clonar esse projeto pra outro cliente, o único ajuste aqui
   é trocar a <meta name="loja-slug"> no <head> de cada .html —
   não precisa mexer neste arquivo.
================================================================== */

const NUVEM = (() => {
  const URL_BASE = "https://emzecdpduqvdtqbmqwmk.supabase.co";
  const CHAVE = "sb_publishable_QyOMP2smMlDWT0HRHwQq3w_wuGsV6dj";

  // Identificador da loja — cada cliente tem o seu, lido do HTML.
  const LOJA = document.querySelector('meta[name="loja-slug"]')?.content || "burgueria-21";

  const cab = (extra = {}) => ({
    "apikey": CHAVE,
    "Authorization": "Bearer " + CHAVE,
    "Content-Type": "application/json",
    ...extra
  });

  async function req(caminho, opcoes = {}) {
    const r = await fetch(URL_BASE + "/rest/v1/" + caminho, {
      keepalive: true, // sobrevive mesmo se a página for trocada (ex: redirecionar pro WhatsApp) logo em seguida
      ...opcoes,
      headers: cab(opcoes.headers)
    });
    if (!r.ok) throw new Error("Servidor respondeu " + r.status + ": " + (await r.text()));
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  /* ---------- cardápio ---------- */

  async function carregarCardapio() {
    const r = await req(`lojas?slug=eq.${LOJA}&select=dados,atualizado`);
    return r && r.length ? r[0] : null;
  }

  async function salvarCardapio(dados) {
    return req(`lojas?on_conflict=slug`, {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ slug: LOJA, dados, atualizado: new Date().toISOString() })
    });
  }

  /* ---------- pedidos ---------- */

  async function enviarPedido(p) {
    return req("pedidos", {
      method: "POST",
      headers: { "Prefer": "return=representation" },
      body: JSON.stringify({ ...p, loja_slug: LOJA })
    });
  }

  // Traz os pedidos do dia (o painel não precisa de histórico antigo).
  async function listarPedidos() {
    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return req(`pedidos?loja_slug=eq.${LOJA}&criado_em=gte.${desde}` +
               `&select=*&order=criado_em.desc&limit=200`);
  }

  async function mudarStatus(id, status) {
    return req(`pedidos?id=eq.${id}`, {
      method: "PATCH",
      headers: { "Prefer": "return=minimal" },
      body: JSON.stringify({ status, atualizado: new Date().toISOString() })
    });
  }

  return { LOJA, carregarCardapio, salvarCardapio, enviarPedido, listarPedidos, mudarStatus };
})();
