import { randomUUID } from 'node:crypto';
import { findOrRename } from './branding.mjs';

export async function setupProductPriceSync(api) {
  const name = 'JuZ.io · Produktpreise in Verkäufen aktualisieren';
  let flow = await findOrRename(api, '/flows', name, 'Juze · Produktpreise in Verkäufen aktualisieren');
  if (flow) return;
  flow = await api('/flows', 'POST', {
    name, icon: 'price_change', status: 'inactive', trigger: 'event', accountability: 'all',
    options: { type: 'filter', scope: ['items.update'], collections: ['products'], return: '$trigger.payload' }
  });
  const condition = randomUUID(), update = randomUUID(), unchanged = randomUUID();
  await api('/operations', 'POST', {
    id: unchanged, flow: flow.id, name: 'Produktänderung beibehalten', key: 'unchanged', type: 'transform',
    position_x: 40, position_y: 20, options: { json: '{{ $trigger.payload }}' }
  });
  await api('/operations', 'POST', {
    id: update, flow: flow.id, name: 'Warenpreise aktualisieren', key: 'update_sales', type: 'item-update',
    position_x: 40, position_y: 1, options: {
      collection: 'sales', permissions: '$full', emitEvents: false,
      query: { filter: { product: { _in: '{{ $trigger.keys }}' }, _or: [
        { kind: { _eq: 'sale' } }, { kind: { _null: true } }
      ] } }, payload: { price_cents: '{{ $trigger.payload.price_cents }}' }
    }
  });
  await api('/operations', 'POST', {
    id: condition, flow: flow.id, name: 'Warenpreis enthalten?', key: 'price_changed', type: 'condition',
    position_x: 20, position_y: 1, resolve: update, reject: unchanged,
    options: { filter: { $trigger: { payload: { price_cents: { _nnull: true, _gte: 0 } } } } }
  });
  await api(`/flows/${flow.id}`, 'PATCH', { operation: condition, status: 'active' });
}
