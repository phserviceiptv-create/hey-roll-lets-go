import type { CartItem, CheckoutData } from '@/types/store';
import { formatBRL } from './money';

const WHATSAPP = '5585992443472';

export function buildWhatsAppMessage(items: CartItem[], checkout: CheckoutData, orderNumber: number, total: number): string {
  const lines = items.map((item) => `• ${item.quantity}x ${item.product_name} — ${formatBRL(item.product_price * item.quantity)}`);
  const payment = checkout.paymentType === 'pix' ? 'PIX' : checkout.paymentType === 'credito' ? 'Cartão' : 'Dinheiro';
  const change = checkout.paymentType === 'dinheiro' && checkout.changeFor !== null
    ? `\nValor para troco: ${formatBRL(checkout.changeFor)}\nTroco: ${formatBRL(checkout.changeFor - total)}`
    : '';

  return [
    `*HEY ROLL LET'S GO — PEDIDO #${orderNumber}*`,
    '',
    '*🍔 PEDIDO*',
    ...lines,
    '',
    `*TOTAL: ${formatBRL(total)}*`,
    '',
    '*📍 ENTREGA*',
    `Nome: ${checkout.customerName}`,
    `Telefone: ${checkout.customerPhone}`,
    `Rua: ${checkout.street}, ${checkout.number}`,
    `Bairro: ${checkout.neighborhood}`,
    `Referência: ${checkout.reference || 'Não informado'}`,
    '',
    '*💳 PAGAMENTO*',
    `Forma: ${payment}${change}`,
    '',
    '*HEY HO, LET\'S EAT! 🤘*',
  ].join('\n');
}

export function whatsappUrl(message: string): string {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}
