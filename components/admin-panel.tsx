'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, LogIn, LogOut, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatBRL } from '@/lib/money';
import type { AdminProduct, Category } from '@/types/admin';

const emptyProduct: Partial<AdminProduct> = { name: '', slug: '', description: '', price: 0, image_url: '', badge: 'Rock Hit', sort_order: 0, is_active: true };

export default function AdminPanel() {
  const [sessionReady, setSessionReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [editing, setEditing] = useState<Partial<AdminProduct> | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: cats, error: catError }, { data: prods, error: prodError }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select('*').order('sort_order'),
    ]);
    setCategories((cats ?? []) as Category[]);
    setProducts((prods ?? []) as AdminProduct[]);
    if (catError || prodError) setMessage(catError?.message ?? prodError?.message ?? 'Não foi possível carregar os dados.');
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        setIsAdmin(true);
        await load();
      }
      setSessionReady(true);
    });
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); return; }
    setIsAdmin(true); await load();
  }

  async function logout() { await supabase.auth.signOut(); setIsAdmin(false); setProducts([]); }

  function newProduct() {
    setEditing({ ...emptyProduct, category_id: selectedCategory || categories[0]?.id || '' });
  }

  async function saveProduct() {
    if (!editing?.name || !editing.category_id || Number(editing.price) <= 0) { setMessage('Informe nome, categoria e preço.'); return; }
    setLoading(true); setMessage('');
    const payload = { category_id: editing.category_id, name: editing.name.trim(), slug: editing.slug?.trim() || editing.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), description: editing.description?.trim() || null, price: Number(editing.price), image_url: editing.image_url?.trim() || null, badge: editing.badge?.trim() || null, sort_order: Number(editing.sort_order) || 0, is_active: editing.is_active !== false };
    const result = editing.id ? await supabase.from('products').update(payload).eq('id', editing.id) : await supabase.from('products').insert(payload);
    if (result.error) setMessage(result.error.message); else { setEditing(null); await load(); }
    setLoading(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm('Excluir este produto?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) setMessage(error.message); else await load();
  }

  async function uploadImage(file: File) {
    if (!editing?.id && !editing?.name) { setMessage('Salve o produto primeiro para enviar a imagem.'); return; }
    const safeName = `${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')}`;
    const { error } = await supabase.storage.from('product-images').upload(safeName, file, { upsert: true, contentType: file.type });
    if (error) { setMessage(error.message); return; }
    const { data } = supabase.storage.from('product-images').getPublicUrl(safeName);
    setEditing((current) => current ? { ...current, image_url: data.publicUrl } : current);
  }

  if (!sessionReady) return <main className="min-h-screen bg-[#050505] p-8 text-white">Carregando...</main>;
  if (!isAdmin) return <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white"><form onSubmit={login} className="w-full max-w-md border border-white/10 bg-[#0b0b0b] p-7"><div className="rock-title text-4xl">PAINEL</div><p className="mt-2 text-sm text-white/50">Hey Roll Let’s Go — acesso do proprietário</p><label className="field-label mt-7">E-mail</label><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /><label className="field-label mt-4">Senha</label><input className="field" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />{message && <p className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-3 text-sm font-bold">{message}</p>}<button className="mt-5 flex w-full items-center justify-center gap-2 bg-[#d71920] py-4 font-black uppercase"><LogIn size={18}/> Entrar</button></form></main>;

  return <main className="min-h-screen bg-[#050505] text-white"><header className="border-b border-white/10 bg-black px-5 py-5"><div className="mx-auto flex max-w-[1400px] items-center justify-between"><div><div className="rock-title text-3xl">HEY ROLL LET’S GO</div><p className="text-xs uppercase tracking-[.25em] text-[#d71920]">Configurações / Cardápio</p></div><button onClick={logout} className="flex items-center gap-2 border border-white/15 px-4 py-2 text-xs font-black uppercase"><LogOut size={15}/> Sair</button></div></header><div className="mx-auto max-w-[1400px] px-5 py-8"><div className="flex flex-col gap-4 border border-white/10 bg-[#0b0b0b] p-5 md:flex-row md:items-center md:justify-between"><div><div className="font-black uppercase">Produtos</div><p className="text-sm text-white/45">Gerencie nome, preço, categoria, imagem e destaque.</p></div><div className="flex gap-2"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="field max-w-xs"><option value="">Todas as categorias</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><button onClick={newProduct} className="flex items-center gap-2 bg-[#d71920] px-4 py-3 text-xs font-black uppercase"><Plus size={16}/> Novo</button><button onClick={load} className="border border-white/15 px-4 py-3" title="Atualizar"><RefreshCw size={16}/></button></div></div>{message && <div className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-4 text-sm font-bold">{message}</div>}<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{products.filter((p) => !selectedCategory || p.category_id === selectedCategory).map((p) => <article key={p.id} className="border border-white/10 bg-[#111] p-4"><div className="aspect-[4/3] overflow-hidden bg-black">{p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/15">SEM IMAGEM</div>}</div><div className="mt-4 flex items-start justify-between gap-3"><div><h2 className="rock-title text-xl">{p.name}</h2><p className="mt-1 text-xs text-[#d71920]">{categoryMap.get(p.category_id) ?? 'Sem categoria'}</p><p className="mt-2 font-black">{formatBRL(p.price)}</p></div><span className="text-[10px] font-black uppercase text-white/40">{p.is_active ? 'Ativo' : 'Oculto'}</span></div><div className="mt-4 flex gap-2"><button onClick={() => setEditing(p)} className="flex flex-1 items-center justify-center gap-2 border border-white/15 py-2 text-xs font-black uppercase"><Pencil size={14}/> Editar</button><button onClick={() => deleteProduct(p.id)} className="border border-[#d71920]/40 px-3 text-[#d71920]" title="Excluir"><Trash2 size={15}/></button></div></article>)}</div></div>{editing && <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4"><div className="mx-auto my-8 max-w-2xl border border-white/10 bg-[#0b0b0b] p-6 sm:p-8"><div className="flex items-center justify-between"><div className="rock-title text-3xl">{editing.id ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</div><button onClick={() => setEditing(null)}><X/></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="field-label">Nome *</span><input className="field" value={editing.name ?? ''} onChange={(e) => setEditing((p) => ({...p,name:e.target.value}))}/></label><label><span className="field-label">Categoria *</span><select className="field" value={editing.category_id ?? ''} onChange={(e) => setEditing((p) => ({...p,category_id:e.target.value}))}><option value="">Selecione</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label><span className="field-label">Preço *</span><input className="field" type="number" min="0.01" step="0.01" value={editing.price ?? 0} onChange={(e) => setEditing((p) => ({...p,price:Number(e.target.value)}))}/></label><label><span className="field-label">Destaque</span><input className="field" value={editing.badge ?? ''} onChange={(e) => setEditing((p) => ({...p,badge:e.target.value}))}/></label><label className="sm:col-span-2"><span className="field-label">Descrição</span><textarea className="field min-h-28" value={editing.description ?? ''} onChange={(e) => setEditing((p) => ({...p,description:e.target.value}))}/></label><label className="sm:col-span-2"><span className="field-label">URL da imagem</span><input className="field" value={editing.image_url ?? ''} onChange={(e) => setEditing((p) => ({...p,image_url:e.target.value}))}/></label><label className="sm:col-span-2 flex items-center gap-3 border border-white/10 p-4"><ImagePlus size={20} className="text-[#d71920]"/><span className="flex-1 text-xs font-black uppercase">Enviar imagem</span><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} /></label><label className="flex items-center gap-2 text-xs font-black uppercase"><input type="checkbox" checked={editing.is_active !== false} onChange={(e) => setEditing((p) => ({...p,is_active:e.target.checked}))}/> Produto ativo</label></div><div className="mt-7 flex gap-3"><button onClick={() => setEditing(null)} className="flex-1 border border-white/15 py-3 font-black uppercase">Cancelar</button><button disabled={loading} onClick={saveProduct} className="flex flex-1 items-center justify-center gap-2 bg-[#d71920] py-3 font-black uppercase disabled:opacity-50"><Save size={17}/> Salvar</button></div></div></div>}</main>;
}
