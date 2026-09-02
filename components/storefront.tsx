'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Clock3, MapPin, Minus, Plus, ShoppingCart, Star, Truck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBRL } from '@/lib/money';
import { buildWhatsAppMessage, whatsappUrl } from '@/lib/whatsapp';
import type { CartItem, CheckoutData, Product } from '@/types/store';

const categoryLabels: Record<string, string> = {
  'Discos de Ouro': 'Discos de Ouro',
  'Abertura do Show': 'Abertura do Show',
  "Rock'n'Drinks": "Rock'n'Drinks",
  'Grandes Hits': 'Grandes Hits',
  Encore: 'Encore',
};

const initialCheckout: CheckoutData = {
  customerName: '', customerPhone: '', street: '', number: '', neighborhood: '', reference: '', paymentType: 'pix', changeFor: null,
};

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData>(initialCheckout);
  const [sending, setSending] = useState(false);
  const [orderDone, setOrderDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error: queryError } = await supabase.rpc('get_hey_roll_catalog');
      if (!mounted) return;
      if (queryError) setError(queryError.message);
      else setProducts((data ?? []) as Product[]);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.product_price * item.quantity, 0), [cart]);
  const quantity = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  function add(product: Product, openCart = false) {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.product_id);
      if (existing) return current.map((item) => item.product_id === product.product_id ? { ...item, quantity: item.quantity + 1 } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    if (openCart) setCartOpen(true);
  }

  function changeQty(id: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.product_id !== id) return [item];
      const next = item.quantity + delta;
      return next > 0 ? [{ ...item, quantity: next }] : [];
    }));
  }

  async function finishOrder() {
    if (!cart.length) return;
    setSending(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('create_hey_roll_order', {
      p_customer_name: checkout.customerName.trim(),
      p_customer_phone: checkout.customerPhone.trim(),
      p_street: checkout.street.trim(),
      p_number: checkout.number.trim(),
      p_neighborhood: checkout.neighborhood.trim(),
      p_reference: checkout.reference.trim(),
      p_payment_type: checkout.paymentType,
      p_change_for: checkout.paymentType === 'dinheiro' ? checkout.changeFor : null,
      p_items: cart.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
    });

    if (rpcError || !data?.[0]) {
      setError(rpcError?.message ?? 'Não foi possível registrar o pedido.');
      setSending(false);
      return;
    }

    const result = data[0] as { order_number: number; total: number };
    const message = buildWhatsAppMessage(cart, checkout, result.order_number, Number(result.total));
    window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
    setCart([]);
    setCheckout(initialCheckout);
    setCheckoutOpen(false);
    setCartOpen(false);
    setOrderDone(true);
    setSending(false);
  }

  const grouped = products.reduce<Record<string, Product[]>>((acc, product) => {
    const key = product.category_name ?? 'Outros';
    (acc[key] ??= []).push(product);
    return acc;
  }, {});

  const scrollToMenu = () => document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="site-header sticky top-0 z-40 border-b border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[88px] max-w-[1440px] items-center gap-5 px-5 lg:px-8">
          <a href="#top" className="brand flex min-w-0 items-center gap-4" aria-label="Hey Roll Let's Go">
            <div className="brand-logo-wrap h-[74px] w-[74px] shrink-0 overflow-hidden rounded-full bg-white">
              <img src="/hey-roll-logo.svg" alt="Hey Roll Let's Go Hamburgueria Artesanal" className="h-full w-full object-cover" />
            </div>
            <div className="hidden leading-none sm:block">
              <div className="rock-title text-[27px] text-white">HEY ROLL</div>
              <div className="rock-title mt-1 text-[25px] text-[#d71920]">LET’S GO</div>
            </div>
          </a>
          <nav className="ml-auto hidden items-center gap-8 lg:flex" aria-label="Navegação principal">
            {[
              ['INÍCIO', '#top'], ['CARDÁPIO', '#menu'], ['COMBOS', '#combos'], ['SOBRE NÓS', '#sobre'], ['CONTATO', '#contato'],
            ].map(([label, href], index) => (
              <a key={label} href={href} className={`nav-link ${index === 0 ? 'active' : ''}`}>{label}{index === 0 && <Star size={18} fill="currentColor" className="absolute -bottom-6 left-1/2 -translate-x-1/2" />}</a>
            ))}
          </nav>
          <button onClick={() => setCartOpen(true)} className="ml-auto flex shrink-0 items-center gap-3 rounded-[4px] bg-[#d71920] px-5 py-3 text-sm font-black uppercase transition hover:bg-white hover:text-black lg:ml-8" aria-label="Abrir carrinho"><ShoppingCart size={21} /><span className="hidden sm:inline">Carrinho</span><span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-black px-1 text-xs text-white">{quantity}</span></button>
        </div>
      </header>

      <section id="top" className="hero-rock relative overflow-hidden">
        <div className="hero-paper absolute inset-0" /><div className="hero-splatter absolute inset-0" />
        <div className="relative mx-auto grid min-h-[675px] max-w-[1440px] items-center gap-6 px-5 py-16 lg:grid-cols-[1fr_.98fr] lg:px-8 lg:py-12">
          <div className="relative z-10 max-w-[700px]">
            <div className="mb-7 flex items-center gap-4 text-[16px] font-black uppercase tracking-[.12em] text-[#d71920] sm:text-[19px]"><Star size={20} fill="currentColor" /> Hamburgueria Artesanal <Star size={20} fill="currentColor" /></div>
            <h1 className="hero-title rock-title text-[72px] leading-[.82] sm:text-[105px] lg:text-[124px]">HEY ROLL<br /><span>LET’S GO</span></h1>
            <p className="mt-7 max-w-[660px] text-xl font-medium text-white sm:text-2xl">Hambúrgueres artesanais na hamburgueria artesanal! 🍔</p>
            <button onClick={scrollToMenu} className="mt-8 inline-flex items-center gap-5 rounded-[4px] bg-[#e11920] px-7 py-4 text-lg font-black uppercase shadow-[0_8px_28px_rgba(225,25,32,.2)] transition hover:scale-[1.02] hover:bg-white hover:text-black">Abrir o cardápio <ArrowRight size={26} /></button>
          </div>
          <div className="relative z-10 flex justify-center lg:justify-end"><div className="hero-logo-frame"><img src="/hey-roll-logo.svg" alt="Logo oficial Hey Roll Let's Go Hamburgueria Artesanal" className="h-full w-full object-contain" /></div></div>
        </div>
        <div className="relative mx-auto grid max-w-[1380px] gap-4 px-5 pb-8 sm:grid-cols-3 lg:px-8">
          <div className="info-card"><Clock3 size={50} strokeWidth={2} /><div><h3>HORÁRIO DE FUNCIONAMENTO</h3><p>Terça a Domingo: 18:00 às 00:00</p><strong>Segunda: Fechado</strong></div></div>
          <div className="info-card"><Truck size={50} strokeWidth={2} /><div><h3>DELIVERY</h3><p>Rápido, quente e com<br className="hidden sm:block" /> muito Rock ’n’ Roll!</p></div></div>
          <div className="info-card"><MapPin size={50} strokeWidth={2} /><div><h3>ENDEREÇO</h3><p>R. Miguel Gonçalves, 218<br />Bela Vista, Fortaleza - CE<br />60420-480</p></div></div>
        </div>
      </section>
      <div className="star-strip" aria-hidden="true">☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★ ☆ ★</div>

      <section id="menu" className="mx-auto max-w-[1380px] px-5 py-16 lg:px-8">
        <div className="section-heading"><div><p>O PALCO ESTÁ ABERTO</p><h2 className="rock-title">CARDÁPIO</h2></div><span>DIARIAMENTE<br />A PARTIR DAS 18H</span></div>
        {!loading && products.length > 0 && <div className="quick-bar"><div><p>ATENDIMENTO RÁPIDO</p><h3 className="rock-title">UM CLIQUE. UM HIT.</h3></div><div className="quick-products">{products.slice(0, 12).map((product) => <button key={product.product_id} onClick={() => add(product, false)}><Plus size={15} />{product.product_name}<b>{formatBRL(product.product_price)}</b></button>)}</div></div>}
        {loading && <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map((n) => <div key={n} className="h-72 animate-pulse border border-white/10 bg-white/5" />)}</div>}
        {!loading && error && <div className="border border-[#d71920]/50 bg-[#d71920]/10 p-5 font-bold">Não foi possível carregar o cardápio agora. Tente novamente em instantes.</div>}
        {!loading && !error && products.length === 0 && <div className="border-2 border-dashed border-white/15 px-6 py-20 text-center"><div className="rock-title text-4xl">O palco está sendo montado.</div><p className="mx-auto mt-3 max-w-md text-white/55">Cadastre os produtos no painel de configurações para que apareçam automaticamente aqui.</p></div>}
        <div className="space-y-16">{Object.entries(grouped).map(([category, items]) => <section key={category}><div className="mb-6 flex items-center gap-4"><h3 className="rock-title text-3xl sm:text-4xl">{categoryLabels[category] ?? category}</h3><div className="h-[2px] flex-1 bg-[#d71920]" /></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((product) => <article key={product.product_id} className="product-card group"><div className="relative aspect-[4/3] overflow-hidden bg-black">{product.product_image_url ? <img src={product.product_image_url} alt={product.product_name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><span className="rock-title text-5xl text-white/10">HRLG</span></div>}<div className="product-badge">★ {product.product_badge ?? 'Rock Hit'}</div></div><div className="p-5"><h4 className="rock-title text-2xl">{product.product_name}</h4><p className="mt-2 min-h-10 text-sm leading-6 text-white/55">{product.product_description ?? 'Preparado artesanalmente para o seu próximo show.'}</p><div className="mt-5 flex items-center justify-between gap-3"><strong className="text-xl">{formatBRL(product.product_price)}</strong><button onClick={() => add(product, true)} className="flex items-center gap-2 bg-[#d71920] px-4 py-3 text-xs font-black uppercase transition hover:bg-white hover:text-black"><Plus size={16} /> Adicionar</button></div></div></article>)}</div></section>)}</div>
      </section>

      <section id="combos" className="border-y border-[#d71920]/30 bg-[#0a0a0a] px-5 py-16 lg:px-8"><div className="mx-auto max-w-[1380px]"><div className="section-heading"><div><p>GRANDES HITS</p><h2 className="rock-title">COMBOS</h2></div></div><p className="max-w-2xl text-lg text-white/60">Monte seu show completo com os produtos cadastrados na categoria de combos.</p><button onClick={scrollToMenu} className="mt-6 inline-flex items-center gap-3 bg-[#d71920] px-6 py-4 text-sm font-black uppercase">Ver combos no cardápio <ArrowRight size={18} /></button></div></section>
      <section id="sobre" className="mx-auto max-w-[1380px] px-5 py-16 lg:px-8"><div className="grid gap-8 md:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[.3em] text-[#d71920]">A nossa banda</p><h2 className="rock-title mt-3 text-5xl">SOBRE NÓS</h2></div><p className="text-lg leading-8 text-white/65">A Hey Roll Let’s Go nasceu para transformar hambúrguer artesanal em experiência. Sabor marcante, identidade Rock ’n’ Roll e atendimento direto para você pedir sem complicação.</p></div></section>
      <section id="contato" className="border-t border-white/10 bg-black px-5 py-14 lg:px-8"><div className="mx-auto flex max-w-[1380px] flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.3em] text-[#d71920]">Contato</p><h2 className="rock-title mt-2 text-4xl">HEY HO, LET'S EAT!</h2><p className="mt-2 text-white/50">R. Miguel Gonçalves, 218 — Bela Vista, Fortaleza — CE</p></div><a href="https://wa.me/5585992443472" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center bg-[#d71920] px-7 py-4 text-sm font-black uppercase transition hover:bg-white hover:text-black">Falar no WhatsApp</a></div></section>
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs uppercase tracking-[.2em] text-white/35">HEY ROLL LET’S GO • HAMBURGUERIA ARTESANAL</footer>

      {cartOpen && <div className="fixed inset-0 z-50 bg-black/75" onClick={() => setCartOpen(false)}><aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b0b0b]" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-white/10 p-5"><div><div className="rock-title text-3xl">Seu Carrinho</div><p className="text-xs font-bold uppercase text-[#d71920]">Hey Ho, Let's Eat!</p></div><button onClick={() => setCartOpen(false)} className="p-2 hover:bg-white/10"><X /></button></div><div className="flex-1 overflow-y-auto p-5">{cart.length === 0 ? <div className="py-20 text-center text-white/40">Seu carrinho está vazio.</div> : <div className="space-y-4">{cart.map((item) => <div key={item.product_id} className="border border-white/10 p-4"><div className="flex justify-between gap-4"><div><div className="font-black uppercase">{item.product_name}</div><div className="mt-1 text-sm text-white/50">{formatBRL(item.product_price)} cada</div></div><strong>{formatBRL(item.product_price * item.quantity)}</strong></div><div className="mt-4 flex items-center gap-3"><button onClick={() => changeQty(item.product_id, -1)} className="border border-white/20 p-2"><Minus size={15}/></button><span className="w-5 text-center font-black">{item.quantity}</span><button onClick={() => changeQty(item.product_id, 1)} className="border border-white/20 p-2"><Plus size={15}/></button></div></div>)}</div>}</div><div className="border-t border-white/10 p-5"><div className="mb-4 flex justify-between text-lg font-black"><span>TOTAL</span><span>{formatBRL(total)}</span></div><button disabled={!cart.length} onClick={() => setCheckoutOpen(true)} className="w-full bg-[#d71920] py-4 text-sm font-black uppercase disabled:cursor-not-allowed disabled:opacity-30">Ir para checkout →</button></div></aside></div>}
      {checkoutOpen && <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/80 p-4" onClick={() => setCheckoutOpen(false)}><div className="mx-auto my-8 max-w-2xl border border-white/10 bg-[#0b0b0b] p-6 sm:p-8" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><div><div className="rock-title text-4xl">Checkout</div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d71920]">Último acorde antes do pedido</p></div><button onClick={() => setCheckoutOpen(false)}><X /></button></div><div className="mt-8 grid gap-4 sm:grid-cols-2">{([['customerName','Nome completo'],['customerPhone','Telefone'],['street','Rua'],['number','Número'],['neighborhood','Bairro'],['reference','Ponto de referência']] as const).map(([key,label]) => <label key={key} className={key === 'reference' ? 'sm:col-span-2' : ''}><span className="field-label">{label}{key !== 'reference' && ' *'}</span><input required={key !== 'reference'} value={checkout[key]} onChange={(e) => setCheckout((c) => ({...c,[key]:e.target.value}))} className="field" /></label>)}<fieldset className="sm:col-span-2"><legend className="mb-2 text-xs font-black uppercase text-white/50">Forma de pagamento *</legend><div className="grid grid-cols-3 gap-2">{([['pix','PIX'],['credito','Cartão'],['dinheiro','Dinheiro']] as const).map(([value,label]) => <button type="button" key={value} onClick={() => setCheckout((c) => ({...c,paymentType:value,changeFor:value==='dinheiro'?c.changeFor:null}))} className={`border px-3 py-3 text-xs font-black uppercase ${checkout.paymentType===value?'border-[#d71920] bg-[#d71920]':'border-white/15'}`}>{label}</button>)}</div></fieldset>{checkout.paymentType==='dinheiro' && <label className="sm:col-span-2"><span className="field-label">Valor para troco *</span><input type="number" min={total} step="0.01" required value={checkout.changeFor ?? ''} onChange={(e) => setCheckout((c) => ({...c,changeFor:e.target.value===''?null:Number(e.target.value)}))} className="field" placeholder={formatBRL(total)} /></label>}</div>{error && <div className="mt-4 border border-[#d71920]/50 bg-[#d71920]/10 p-4 text-sm font-bold">{error}</div>}<div className="mt-8 border-t border-white/10 pt-5"><div className="flex justify-between font-black"><span>Total do pedido</span><span>{formatBRL(total)}</span></div><button disabled={sending} onClick={() => { if (!checkout.customerName.trim() || !checkout.customerPhone.trim() || !checkout.street.trim() || !checkout.number.trim() || !checkout.neighborhood.trim() || (checkout.paymentType==='dinheiro' && (checkout.changeFor===null || checkout.changeFor < total))) { setError('Preencha todos os campos obrigatórios e confira o valor do troco.'); return; } void finishOrder(); }} className="pulse-red mt-5 flex w-full items-center justify-center gap-2 bg-[#d71920] py-4 text-sm font-black uppercase disabled:opacity-50">{sending ? 'Registrando pedido...' : <><Check size={18}/> Finalizar pedido no WhatsApp</>}</button></div></div></div>}
      {orderDone && <div className="fixed bottom-5 left-1/2 z-[70] -translate-x-1/2 border border-[#d71920]/50 bg-[#111] px-5 py-4 text-center text-sm font-bold shadow-2xl">Pedido registrado. WhatsApp aberto para enviar à hamburgueria. 🤘 <button onClick={() => setOrderDone(false)} className="ml-3 text-[#d71920]">×</button></div>}
    </main>
  );
}
