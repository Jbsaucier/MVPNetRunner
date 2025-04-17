async function renderViews() {
  // Charge les données
  const [gameRes, serverRes, rigRes] = await Promise.all([
    fetch("/api/game"),
    fetch("/api/servers"),
    fetch("/api/rigs")
  ]);
  const game = await gameRes.json();
  const servers = await serverRes.json();
  const rigs = await rigRes.json();

  // Vérifie que les champs servers existent
  const corpServerIds = (game.corp_state.servers || []);

  // Affiche les infos Corp
  document.getElementById("corpInfo").innerHTML = `
    <li><strong>Joueur :</strong> ${game.corp_state.user_id}</li>
    <li><strong>Crédits :</strong> ${game.corp_state.credits}</li>
    <li><strong>Clics :</strong> ${game.corp_state.clicks}</li>
    <li><strong>Tags :</strong> ${game.corp_state.tags}</li>
    <li><strong>Mauvaise publicité :</strong> ${game.corp_state.bad_publicity}</li>
    <li><strong>Hand size mod :</strong> ${game.corp_state.hand_size_mod}</li>
    <li><strong>Deck :</strong> ${game.corp_state.deck_id}</li>
    <li><strong>Has performed mandatory draw :</strong> ${game.corp_state.has_performed_mandatory_draw}</li>
  `;

  // Affiche les infos Runner
  document.getElementById("runnerInfo").innerHTML = `
    <li><strong>Joueur :</strong> ${game.runner_state.user_id}</li>
    <li><strong>Crédits :</strong> ${game.runner_state.credits}</li>
    <li><strong>Clics :</strong> ${game.runner_state.clicks}</li>
    <li><strong>Tags :</strong> ${game.runner_state.tags}</li>
    <li><strong>Mauvaise publicité :</strong> ${game.runner_state.bad_publicity}</li>
    <li><strong>Hand size mod :</strong> ${game.runner_state.hand_size_mod}</li>
    <li><strong>Deck :</strong> ${game.runner_state.deck_id}</li>
    <li><strong>Has performed mandatory draw :</strong> ${game.runner_state.has_performed_mandatory_draw}</li>
  `;

  // Affiche les serveurs pour Corp uniquement
  document.getElementById("corpServers").innerHTML = `<div class="corp-servers-row">${servers.filter(s => corpServerIds.includes(s.id)).map(serverBox).join("")}</div>`;

  // Affiche les rigs pour Runner uniquement
  document.getElementById("runnerRigs").innerHTML = `<div class="runner-rigs-row">${rigs.map(rigBox).join("")}</div>`;

  const corpDeckElem = document.getElementById("corpDeck");
  if (corpDeckElem) corpDeckElem.textContent = game.corp_state.deck_id;
  const runnerDeckElem = document.getElementById("runnerDeck");
  if (runnerDeckElem) runnerDeckElem.textContent = game.runner_state.deck_id;
}

// Génère le HTML pour un serveur
function serverBox(server) {
  return `
    <div class="server-box">
      <h4>${server.id}</h4>
      <div class="server-info">
        <strong>ICE :</strong>
        <div class="ice-row">
          ${(server.ice || []).map(ice_code =>
            `<img src="/static/images/${ice_code}.jpg" alt="${ice_code}" class="card-img-medium" />`
          ).join("")}
        </div>
      </div>
      <div class="server-info">
        <strong>Root :</strong>
        <div class="root-row">
          ${(server.root || []).map(root_code =>
            `<img src="/static/images/${root_code}.jpg" alt="${root_code}" class="card-img-medium" />`
          ).join("")}
        </div>
      </div>
    </div>
  `;
}

function rigBox(rig) {
  return `
    <div class="server-box">
      <h4>${rig.rig_id}</h4>
      <div class="server-info">
        <strong>Cartes :</strong>
        <div class="root-row">
          ${(rig.cards && rig.cards.length) ? rig.cards.map(card_code =>
            `<img src="/static/images/${card_code}.jpg" alt="${card_code}" class="card-img-medium" />`
          ).join("") : '<em>Aucune carte</em>'}
        </div>
      </div>
    </div>
  `;
}

function toggleImgSize() {
  // Récupère toutes les images de carte
  const imgs = document.querySelectorAll('.card-img-small, .card-img-medium, .card-img-large');
  imgs.forEach(img => {
    if (img.classList.contains('card-img-small')) {
      img.classList.remove('card-img-small');
      img.classList.add('card-img-medium');
    } else if (img.classList.contains('card-img-medium')) {
      img.classList.remove('card-img-medium');
      img.classList.add('card-img-large');
    } else if (img.classList.contains('card-img-large')) {
      img.classList.remove('card-img-large');
      img.classList.add('card-img-small');
    }
  });
}

// Fusion de l'initialisation dans un seul DOMContentLoaded
window.addEventListener("DOMContentLoaded", function() {
  // Utilise les données injectées si elles existent, sinon fallback fetch
  const initialGame = window.initialGame || null;
  const servers = window.initialServers || null;

  if (initialGame && servers) {
    renderViewsWithData(initialGame, servers);
  } else {
    renderViews();
  }

  // Affichage du bouton "Ajouter un serveur" seulement pour Corp et sur la vue Corp
  const addServerBtn = document.getElementById('addServerBtn');
  const userRole = window.userRole || null;
  if (addServerBtn) {
    // On attend que les données soient chargées pour afficher/masquer le bouton
    fetch('/api/game').then(r => r.json()).then(game => {
      if (game && game.current_view === 'corp' && userRole === 'corp') {
        addServerBtn.style.display = '';
      } else {
        addServerBtn.style.display = 'none';
      }
    });
  }

  // Ajout d'une popup pour afficher la main (Hand) si pas déjà présent
  if (!document.getElementById('handPopup')) {
    const handPopup = document.createElement('div');
    handPopup.id = 'handPopup';
    handPopup.style.display = 'none';
    handPopup.style.position = 'fixed';
    handPopup.style.left = '50%';
    handPopup.style.top = '50%';
    handPopup.style.transform = 'translate(-50%, -50%)';
    handPopup.style.background = '#fff';
    handPopup.style.border = '2px solid #444';
    handPopup.style.borderRadius = '12px';
    handPopup.style.boxShadow = '0 4px 24px #2228';
    handPopup.style.padding = '32px 24px 24px 24px';
    handPopup.style.zIndex = '1000';
    handPopup.innerHTML = `
      <h3 id="handTitle"></h3>
      <div id="handCards" style="display: flex; gap: 12px; margin: 16px 0;"></div>
      <button onclick="document.getElementById('handPopup').style.display='none'">Fermer</button>
    `;
    document.body.appendChild(handPopup);
  }

  // Attache l'événement au bouton Hand
  const btn = document.getElementById('handBtn');
  if (btn) btn.onclick = window.showHandPopup;

  // Lance l'auto-refresh
  autoRefreshGame();
});

function renderViewsWithData(game, servers) {
  const corpServerIds = (game.corp_state.servers || []);
  // Affiche les infos Corp
  document.getElementById("corpInfo").innerHTML = `
    <li><strong>Joueur :</strong> ${game.corp_state.user_id}</li>
    <li><strong>Crédits :</strong> ${game.corp_state.credits}</li>
    <li><strong>Clics :</strong> ${game.corp_state.clicks}</li>
    <li><strong>Tags :</strong> ${game.corp_state.tags}</li>
    <li><strong>Mauvaise publicité :</strong> ${game.corp_state.bad_publicity}</li>
    <li><strong>Hand size mod :</strong> ${game.corp_state.hand_size_mod}</li>
    <li><strong>Deck :</strong> ${game.corp_state.deck_id}</li>
    <li><strong>Has performed mandatory draw :</strong> ${game.corp_state.has_performed_mandatory_draw}</li>
  `;
  // Affiche les infos Runner
  document.getElementById("runnerInfo").innerHTML = `
    <li><strong>Joueur :</strong> ${game.runner_state.user_id}</li>
    <li><strong>Crédits :</strong> ${game.runner_state.credits}</li>
    <li><strong>Clics :</strong> ${game.runner_state.clicks}</li>
    <li><strong>Tags :</strong> ${game.runner_state.tags}</li>
    <li><strong>Mauvaise publicité :</strong> ${game.runner_state.bad_publicity}</li>
    <li><strong>Hand size mod :</strong> ${game.runner_state.hand_size_mod}</li>
    <li><strong>Deck :</strong> ${game.runner_state.deck_id}</li>
    <li><strong>Has performed mandatory draw :</strong> ${game.runner_state.has_performed_mandatory_draw}</li>
  `;
  // Affiche les serveurs dans les bons conteneurs
  document.getElementById("corpServers").innerHTML = `<div class="corp-servers-row">${servers.filter(s => corpServerIds.includes(s.id)).map(serverBox).join("")}</div>`;
  // Affiche les rigs du runner comme les serveurs du corps
  fetch('/api/rigs').then(r => r.json()).then(rigs => {
    document.getElementById("runnerRigs").innerHTML = `<div class="corp-servers-row">${rigs.map(rigBox).join("")}</div>`;
  });
  const corpDeckElem = document.getElementById("corpDeck");
  if (corpDeckElem) corpDeckElem.textContent = game.corp_state.deck_id;
  const runnerDeckElem = document.getElementById("runnerDeck");
  if (runnerDeckElem) runnerDeckElem.textContent = game.runner_state.deck_id;
}

function autoRefreshGame() {
  setInterval(() => {
    Promise.all([
      fetch("/api/game").then(r => r.json()),
      fetch("/api/servers").then(r => r.json()),
      fetch("/api/rigs").then(r => r.json())
    ]).then(([game, servers, rigs]) => {
      window.initialGame = game;
      window.initialServers = servers;
      window.currentRigs = rigs;
      renderViewsWithData(game, servers);
    });
  }, 10000);
}

window.showHandPopup = function() {
  const currentUserId = window.userId;
  fetch('/api/game').then(r => r.json()).then(game => {
    Promise.all([
      fetch('/api/servers').then(r => r.json()),
      fetch('/api/rigs').then(r => r.json())
    ]).then(([servers, rigs]) => {
      let cards = [];
      let title = '';
      let debug = `<div style='color:red;font-size:12px'>userId: ${currentUserId} | corp: ${game.corp_state.user_id} | runner: ${game.runner_state.user_id}</div>`;
      if (game.corp_state.user_id === currentUserId) {
        const hq = servers.find(s => s.id === 'HQ');
        title = 'Main du joueur Corp (HQ)';
        cards = (hq && hq.root) ? hq.root : [];
      } else if (game.runner_state.user_id === currentUserId) {
        const identityRig = rigs.find(r => r.rig_id === 'identity');
        title = 'Main du joueur Runner (Identity)';
        cards = (identityRig && identityRig.cards) ? identityRig.cards : [];
      } else {
        title = 'Vous n\'êtes ni Corp ni Runner dans cette partie.';
        cards = [];
      }
      document.getElementById('handTitle').innerHTML = title + debug;
      const handDiv = document.getElementById('handCards');
      handDiv.innerHTML = cards.length
        ? cards.map(code => `<img src="/static/images/${code}.jpg" alt="${code}" class="card-img-medium" />`).join('')
        : '<em>Aucune carte en main.</em>';
      document.getElementById('handPopup').style.display = '';
    });
  });
};