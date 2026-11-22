import { socketCliente } from '../servicos/socket-cliente.js';

function renderizarInventario(listaItens = []) {
  const ul = document.getElementById('inventory-list');
  ul.innerHTML = '';

  if (listaItens.length === 0) {
    ul.innerHTML = '<li>Mochila vazia</li>';
    return;
  }

  for (const item of listaItens) {
    const li = document.createElement('li');
    const info = document.createElement('span');
    info.textContent = `${item.nome} (x${item.quantidade || 1})`;

    const btn = document.createElement('button');
    btn.textContent = item.tipo === 'equipamento' ? (item.equipado ? 'Equipado' : 'Equipar') : 'Usar';
    btn.onclick = () => socketCliente.usarItem(item.id);

    li.appendChild(info);
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

export function inicializarFicha() {
  socketCliente.on('update_hud', (dados) => {
    document.getElementById('char-name').textContent = dados.nome;
    document.getElementById('char-avatar').src = dados.avatarUrl;
    document.getElementById('char-class').innerHTML = `${dados.classe} - Nível <span id="char-level">${dados.nivel}</span>`;

    const percentual = Math.max(0, Math.min(100, (dados.hpAtual / dados.hpMax) * 100));
    document.getElementById('hp-fill').style.width = `${percentual}%`;
    document.getElementById('hp-text').textContent = `${dados.hpAtual}/${dados.hpMax}`;

    if (dados.atributos) {
      document.getElementById('attr-for').textContent = dados.atributos.forca;
      document.getElementById('attr-des').textContent = dados.atributos.destreza;
      document.getElementById('attr-int').textContent = dados.atributos.inteligencia;
    }

    if (dados.inventario) {
      renderizarInventario(dados.inventario);
    }
  });

  socketCliente.on('update_inventory', (inventario) => {
    renderizarInventario(inventario);
  });
}