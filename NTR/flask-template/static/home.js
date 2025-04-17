// Runner action functions
function gainCredit() {
  if (window.userRole === "runner") {
    const game = JSON.parse(JSON.stringify(window.initialGame));
    game.runner_state.credits = (game.runner_state.credits || 0) + 1;

    // Update game state via API
    fetch('/api/game', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(game)
    })
    .then(response => response.json())
    .then(data => {
      console.log('Credit gained');
      window.initialGame = game;
      updateRunnerInfo();
    });
  }
}

// Function to draw a card from stack to grip (hand)
function drawCard() {
  if (window.userRole === "runner") {
    const game = JSON.parse(JSON.stringify(window.initialGame));
    
    // Check if there are cards in the stack
    if (game.runner_state.stack && game.runner_state.stack.length > 0) {
      // Initialize grip if it doesn't exist
      if (!game.runner_state.grip) {
        game.runner_state.grip = [];
      }
      
      // Draw the top card from stack
      const drawnCard = game.runner_state.stack.shift();
      game.runner_state.grip.push(drawnCard);
      
      // Update game state via API
      fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(game)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Card drawn');
        window.initialGame = game;
        updateRunnerInfo();
      });
    } else {
      alert("No more cards in stack!");
    }
  }
}

// Function to install a card from hand to rig
function installCard() {
  if (window.userRole === "runner") {
    // For now, just simulate selecting the first card in hand
    const game = JSON.parse(JSON.stringify(window.initialGame));
    
    if (game.runner_state.grip && game.runner_state.grip.length > 0) {
      // Get rig data
      fetch('/api/rigs')
        .then(response => response.json())
        .then(rig => {
          // Select first card in hand for this example
          const cardToInstall = game.runner_state.grip[0];
          let installed = false;
          
          // Check card type using the reference we added
          if (game.runner_state.card_types.programs.includes(cardToInstall.id)) {
            rig.programs.push(cardToInstall);
            installed = true;
            console.log('Installing program:', cardToInstall.title);
          } else if (game.runner_state.card_types.hardware.includes(cardToInstall.id)) {
            rig.hardware.push(cardToInstall);
            installed = true;
            console.log('Installing hardware:', cardToInstall.title);
          } else if (game.runner_state.card_types.resources.includes(cardToInstall.id)) {
            rig.resources.push(cardToInstall);
            installed = true;
            console.log('Installing resource:', cardToInstall.title);
          } else {
            alert("Cannot install this card type (might be an event)");
            return;
          }
          
          if (installed) {
            // Remove from hand
            game.runner_state.grip.shift();
            
            // Update game state
            fetch('/api/game', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(game)
            });
            
            // Update rig state
            fetch('/api/rigs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(rig)
            })
            .then(() => {
              window.initialGame = game;
              updateRunnerInfo();
              // Could also update rig display here
            });
          }
        });
    } else {
      alert("No cards in hand to install!");
    }
  }
}

function playEvent() {
  if (window.userRole === "runner") {
    console.log('Playing event card');
    // Add implementation for playing an event card
  }
}

function runServer() {
  if (window.userRole === "runner") {
    console.log('Initiating run on server');
    // Implementation for running a server
  }
}

function removeTag() {
  if (window.userRole === "runner") {
    const game = JSON.parse(JSON.stringify(window.initialGame));
    
    // Check if runner has enough credits and at least one tag
    const currentCredits = game.runner_state.credits || 0;
    const currentTags = game.runner_state.tags || 0;
    
    if (currentCredits >= 2 && currentTags > 0) {
      game.runner_state.credits = currentCredits - 2;
      game.runner_state.tags = currentTags - 1;
      
      // Update game state via API
      fetch('/api/game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(game)
      })
      .then(response => response.json())
      .then(data => {
        console.log('Tag removed');
        window.initialGame = game;
        updateRunnerInfo();
      });
    } else {
      alert(currentCredits < 2 ? 
        "Not enough credits to remove tag!" : 
        "No tags to remove!");
    }
  }
}

// Function to update runner info display with improved UI
function updateRunnerInfo() {
  const runnerInfo = document.getElementById('runnerInfo');
  if (runnerInfo) {
    const state = window.initialGame.runner_state || {};
    
    runnerInfo.innerHTML = `
      <div class="card mb-3">
        <div class="card-header bg-dark text-white">
          <strong>Joueur : ${window.userId}</strong>
        </div>
        <ul class="list-group list-group-flush">
          <li class="list-group-item">Crédits : ${state.credits || 0}</li>
          <li class="list-group-item">Clics : ${state.clicks || 0}</li>
          <li class="list-group-item">Tags : ${state.tags || 0}</li>
          <li class="list-group-item">Mauvaise publicité : ${state.bad_publicity || 0}</li>
          <li class="list-group-item">Hand size mod : ${state.hand_size_mod || 0}</li>
          <li class="list-group-item">Deck : ${state.deck_name || "System Gateway Runner Starter CATALYST"}</li>
          <li class="list-group-item">Has performed mandatory draw : ${state.mandatory_draw ? "Yes" : "No"}</li>
        </ul>
      </div>
    `;
  }
}

// Single combined function to handle button visibility
document.addEventListener('DOMContentLoaded', function() {
  // First initialize runner info
  updateRunnerInfo();
  
  // Function to update button visibility
  function updateButtonVisibility() {
    const actionButtons = document.getElementById('runnerActionButtons');
    const runnerView = document.getElementById('runnerView');
    
    if (!actionButtons) return;
    
    console.log("Updating button visibility");
    console.log("User role:", window.userRole);
    console.log("Runner view display:", runnerView.style.display);
    
    // Direct check on the DOM elements
    if (window.userRole === 'runner' && runnerView.style.display !== 'none') {
      console.log("Showing runner buttons");
      actionButtons.style.display = 'block';
    } else {
      console.log("Hiding runner buttons");
      actionButtons.style.display = 'none';
    }
  }
  
  // Set initial visibility with a delay to ensure DOM is fully loaded
  setTimeout(updateButtonVisibility, 1000);
  
  // Add direct click handler to the toggle button
  const toggleBtn = document.getElementById('toggleViewBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      console.log("Toggle button clicked");
      // Use a longer delay to ensure the toggle view function completes
      setTimeout(updateButtonVisibility, 500);
    });
  }
  
  // Poll for visibility changes every 2 seconds
  setInterval(updateButtonVisibility, 2000);
  
  // Verify rig initialization
  verifyRigInitialization();
});

// Check if rig has been initialized properly
function verifyRigInitialization() {
  fetch('/api/rigs')
    .then(response => response.json())
    .then(rigData => {
      const stack = rigData.find(rig => rig.rig_id === 'stack');
      
      if (!stack || !Array.isArray(stack.cards) || stack.cards.length === 0 || 
          (stack.cards.length === 1 && stack.cards[0] === 'Red')) {
        console.warn('Rig stack not properly initialized. Attempting to initialize...');
        
        // Try to initialize via deck.js utility
        if (window.deckUtils && window.deckUtils.updateRunnerRig) {
          window.deckUtils.updateRunnerRig()
            .then(() => console.log('Runner rig initialized successfully'))
            .catch(err => console.error('Failed to initialize rig:', err));
        } else {
          console.error('deckUtils not available to initialize rig');
          alert('Le rig n\'est pas correctement initialisé. Essayez de réinitialiser les rôles.');
        }
      } else {
        console.log(`Rig stack properly initialized with ${stack.cards.length} cards`);
      }
    })
    .catch(error => console.error('Error checking rig initialization:', error));
}
