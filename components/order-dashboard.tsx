'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Clock3, MapPin, Printer, RefreshCw, Search, Truck, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBRL } from '@/lib/money';

type OrderStatus = 'novo' | 'confirmado' | 'preparando' | 'saiu_para_entrega' | 'entregue' | 'cancelado';

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  delivery_street: string;
  delivery_number: string;
  delivery_neighborhood: string;
  delivery_reference: string | null;
  payment_method: 'pix' | 'cartao' | 'dinheiro';
  change_for: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  whatsapp_sent: boolean;
  created_at: string;
  updated_at: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  item_total: number;
};

const statuses: { key: OrderStatus; label: string; short: string }[] = [
  { key: 'novo', label: 'Novos', short: 'NOVO' },
  { key: 'confirmado', label: 'Confirmados', short: 'CONFIRMADO' },
  { key: 'preparando', label: 'Preparando', short: 'PREPARANDO' },
  { key: 'saiu_para_entrega', label: 'Saiu para entrega', short: 'EM ENTREGA' },
  { key: 'entregue', label: 'Entregues', short: 'ENTREGUE' },
  { key: 'cancelado', label: 'Cancelados', short: 'CANCELADO' },
];

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  novo: 'confirmado',
  confirmado: 'preparando',
  preparando: 'saiu_para_entrega',
  saiu_para_entrega: 'entregue',
};

const statusClass: Record<OrderStatus, string> = {
  novo: 'border-[#d71920]/50 bg-[#d71920]/10 text-[#ff5960]',
  confirmado: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
  preparando: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  saiu_para_entrega: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
  entregue: 'border-green-500/30 bg-green-500/10 text-green-300',
  cancelado: 'border-white/15 bg-white/5 text-white/40',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function paymentLabel(value: Order['payment_method']) {
  return value === 'pix' ? 'PIX' : value === 'cartao' ? 'CARTÃO' : 'DINHEIRO';
}

export default function OrderDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | OrderStatus>('todos');
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage('');
    const [{ data: orderData, error: orderError }, { data: itemData, error: itemError }] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      supabase.from('order_items').select('*').order('created_at', { ascending: true }),
    ]);
    if (orderError || itemError) setMessage(orderError?.message ?? itemError?.message ?? 'Não foi possível carregar os pedidos.');
    setOrders((orderData ?? []) as Order[]);
    setItems((itemData ?? []) as OrderItem[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('hey-roll-orders-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void load(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  const counts = useMemo(() => statuses.reduce<Record<string, number>>((acc, status) => { acc[status.key] = orders.filter((order) => order.status === status.key).length; return acc; }, {}), [orders]);
  const todayTotal = useMemo(() => orders.filter((order) => new Date(order.created_at).toDateString() === new Date().toDateString() && order.status !== 'cancelado').reduce((sum, order) => sum + Number(order.total), 0), [orders]);
  const pending = useMemo(() => orders.filter((order) => ['novo', 'confirmado', 'preparando', 'saiu_para_entrega'].includes(order.status)).length, [orders]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesFilter = filter === 'todos' || order.status === filter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || String(order.order_number).includes(term) || order.customer_name.toLowerCase().includes(term) || order.customer_phone.includes(term) || order.delivery_neighborhood.toLowerCase().includes(term);
    return matchesFilter && matchesSearch;
  }), [orders, filter, search]);

  async function updateStatus(order: Order, status: OrderStatus) {
    setUpdating(order.id); setMessage('');
    const { error } = await supabase.from('orders').update({ status }).eq('id', order.id);
    if (error) setMessage(error.message); else setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    setUpdating(null);
  }

  function printOrder(order: Order) {
    setSelected(order);
    window.setTimeout(() => window.print(), 150);
  }

  const selectedItems = selected ? items.filter((item) => item.order_id === selected.id) : [];

  return (
    <section className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[.3em] text-[#d71920]">Central de operação</p><h2 className="rock-title mt-2 text-4xl sm:text-5xl">PEDIDOS & DESPACHO</h2><p className="mt-2 text-sm text-white/45">Acompanhe os pedidos em tempo real e avance cada entrega pelo fluxo.</p></div>
        <button onClick={() => void load()} className="flex items-center justify-center gap-2 border border-white/15 px-4 py-3 text-xs font-black uppercase"><RefreshCw size={15}/> Atualizar</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-white/10 bg-[#0b0b0b] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Pedidos pendentes</p><strong className="mt-2 block text-3xl">{pending}</strong></div>
        <div className="border border-white/10 bg-[#0b0b0b] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Pedidos hoje</p><strong className="mt-2 block text-3xl">{orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length}</strong></div>
        <div className="border border-white/10 bg-[#0b0b0b] p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-white/40">Faturamento hoje</p><strong className="mt-2 block text-3xl text-[#d71920]">{formatBRL(todayTotal)}</strong></div>
      </div>

      {message && <div className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-4 text-sm font-bold">{message}</div>}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row">
        <label className="relative flex-1"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"/><input value={search} onChange={(e) => setSearch(e.target.value)} className="field pl-10" placeholder="Buscar por pedido, cliente, telefone ou bairro..." /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value as 'todos' | OrderStatus)} className="field lg:w-64"><option value="todos">Todos os pedidos ({orders.length})</option>{statuses.map((status) => <option key={status.key} value={status.key}>{status.label} ({counts[status.key] ?? 0})</option>)}</select>
      </div>

      {loading ? <div className="mt-6 animate-pulse border border-white/10 bg-[#0b0b0b] p-10 text-center text-white/40">Carregando pedidos...</div> : visibleOrders.length === 0 ? <div className="mt-6 border-2 border-dashed border-white/10 p-14 text-center"><Clock3 className="mx-auto text-white/20" size={38}/><p className="rock-title mt-4 text-2xl">Nenhum pedido encontrado</p><p className="mt-2 text-sm text-white/40">Os novos pedidos do cardápio aparecerão aqui automaticamente.</p></div> : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {visibleOrders.map((order) => {
            const orderItems = items.filter((item) => item.order_id === order.id);
            const next = nextStatus[order.status];
            return <article key={order.id} className="border border-white/10 bg-[#0b0b0b] p-5 shadow-[0_8px_30px_rgba(0,0,0,.2)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex items-center gap-3"><span className="rock-title text-2xl">PEDIDO #{order.order_number}</span><span className={`border px-2 py-1 text-[9px] font-black uppercase ${statusClass[order.status]}`}>{statuses.find((s) => s.key === order.status)?.short}</span></div><p className="mt-1 text-xs text-white/35">{formatDate(order.created_at)} • {paymentLabel(order.payment_method)}</p></div>
                <strong className="text-xl">{formatBRL(Number(order.total))}</strong>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-3">
                  <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Cliente</p><p className="mt-1 font-bold">{order.customer_name}</p><a className="text-sm text-[#ff5960]" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></div>
                  <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Entrega</p><p className="mt-1 flex gap-2 text-sm"><MapPin size={16} className="mt-0.5 shrink-0 text-[#d71920]"/>{order.delivery_street}, {order.delivery_number}<br />{order.delivery_neighborhood}</p>{order.delivery_reference && <p className="ml-6 mt-1 text-xs text-white/40">Ref.: {order.delivery_reference}</p>}</div>
                </div>
                <div className="border border-white/10 bg-black/40 p-3"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/35">Itens</p>{orderItems.map((item) => <div key={item.id} className="mt-2 flex justify-between gap-3 text-sm"><span>{item.quantity}x {item.product_name}</span><b>{formatBRL(Number(item.item_total))}</b></div>)}<div className="mt-3 border-t border-white/10 pt-3 text-xs text-white/50">Subtotal {formatBRL(Number(order.subtotal))} {Number(order.delivery_fee) > 0 && <>• Entrega {formatBRL(Number(order.delivery_fee))}</>}</div>{order.payment_method === 'dinheiro' && order.change_for && <p className="mt-2 text-xs font-bold text-yellow-300">Troco para: {formatBRL(Number(order.change_for))}</p>}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {next && <button disabled={updating === order.id} onClick={() => void updateStatus(order, next)} className="flex flex-1 items-center justify-center gap-2 bg-[#d71920] px-4 py-3 text-xs font-black uppercase disabled:opacity-50"><CheckCircle2 size={16}/>{next === 'confirmado' ? 'Confirmar pedido' : next === 'preparando' ? 'Enviar para preparo' : next === 'saiu_para_entrega' ? 'Despachar entrega' : 'Marcar como entregue'}</button>}
                {order.status === 'novo' && <button onClick={() => void updateStatus(order, 'cancelado')} disabled={updating === order.id} className="border border-[#d71920]/30 px-4 py-3 text-xs font-black uppercase text-[#ff5960]"><XCircle size={16}/></button>}
                {order.status === 'preparando' && <span className="flex items-center gap-2 border border-purple-500/20 px-4 py-3 text-xs font-black uppercase text-purple-300"><Truck size={16}/> Pronto para despacho</span>}
                <button onClick={() => printOrder(order)} className="flex items-center gap-2 border border-white/15 px-4 py-3 text-xs font-black uppercase"><Printer size={15}/> Imprimir</button>
                <button onClick={() => setSelected(order)} className="flex items-center gap-2 border border-white/15 px-4 py-3 text-xs font-black uppercase">Detalhes <ChevronDown size={15}/></button>
              </div>
            </article>;
          })}
        </div>
      )}

      {selected && <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 p-4" onClick={() => setSelected(null)}><div className="mx-auto my-8 max-w-2xl border border-white/10 bg-[#0b0b0b] p-6" onClick={(e) => e.stopPropagation()}><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.25em] text-[#d71920]">Detalhes do pedido</p><h3 className="rock-title mt-2 text-3xl">#{selected.order_number} • {selected.customer_name}</h3></div><button onClick={() => setSelected(null)}><XCircle/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="border border-white/10 p-4"><p className="text-[9px] font-black uppercase text-white/35">Contato</p><p className="mt-2 font-bold">{selected.customer_phone}</p><p className="mt-3 text-sm text-white/60">{selected.delivery_street}, {selected.delivery_number}<br/>{selected.delivery_neighborhood}</p>{selected.delivery_reference && <p className="mt-2 text-xs text-white/40">Referência: {selected.delivery_reference}</p>}</div><div className="border border-white/10 p-4"><p className="text-[9px] font-black uppercase text-white/35">Pagamento</p><p className="mt-2 font-bold">{paymentLabel(selected.payment_method)}</p><p className="mt-3 text-2xl font-black">{formatBRL(Number(selected.total))}</p>{selected.change_for && <p className="mt-1 text-sm text-yellow-300">Troco para {formatBRL(Number(selected.change_for))}</p>}</div></div><div className="mt-4 border border-white/10 p-4">{selectedItems.map((item) => <div key={item.id} className="flex justify-between border-b border-white/5 py-3 text-sm last:border-0"><span>{item.quantity}x {item.product_name}</span><b>{formatBRL(Number(item.item_total))}</b></div>)}</div><button onClick={() => printOrder(selected)} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#d71920] py-4 text-xs font-black uppercase"><Printer size={16}/> Imprimir comanda 80 mm</button></div></div>}

      <div className="print-order-sheet" aria-hidden="true">{selected && <div className="thermal-print"><img src="/images/Logo%20Hamburgueria.png" alt="Hey Roll Let's Go"/><h1>HEY ROLL LET'S GO</h1><p>HAMBURGUERIA ARTESANAL</p><hr/><strong>PEDIDO #{selected.order_number}</strong><p>{formatDate(selected.created_at)}</p><hr/>{selectedItems.map((item) => <div key={item.id} className="print-line"><span>{item.quantity}x {item.product_name}</span><b>{formatBRL(Number(item.item_total))}</b></div>)}<hr/><div className="print-total"><span>TOTAL</span><b>{formatBRL(Number(selected.total))}</b></div><p>PAGAMENTO: {paymentLabel(selected.payment_method)}</p>{selected.change_for && <p>TROCO PARA: {formatBRL(Number(selected.change_for))}</p>}<hr/><p><strong>{selected.customer_name}</strong><br/>{selected.delivery_street}, {selected.delivery_number}<br/>{selected.delivery_neighborhood}</p>{selected.delivery_reference && <p>REF.: {selected.delivery_reference}</p>}<hr/><p>OBRIGADO PELA PREFERÊNCIA!<br/>HEY HO, LET'S EAT!</p></div>}</div>
    </section>
  );
}
