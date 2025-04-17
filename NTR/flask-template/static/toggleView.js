async function toggleView() {
  const corpDiv = document.getElementById("corpView");
  const runnerDiv = document.getElementById("runnerView");
  const btn = document.getElementById("toggleViewBtn");
  const actionButtons = document.getElementById('runnerActionButtons');
  let isCorp = corpDiv.style.display !== "none";

  // Charger l'état actuel du jeu
  let response = await fetch("/api/game");
  let game = await response.json();

  // Mettre à jour le champ current_view dans le JSON (ajoutez-le si besoin)
  game.current_view = isCorp ? "runner" : "corp";

  // Envoyer la mise à jour au backend
  await fetch("/api/game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(game),
  });

  // Alterner l'affichage
  if (isCorp) {
    corpDiv.style.display = "none";
    runnerDiv.style.display = "block";
    btn.textContent = "Voir côté Corp";
    
    // Standardized way to show runner buttons
    if (actionButtons && window.userRole === 'runner') {
      // Use a consistent display style that won't change when interacted with
      actionButtons.style.cssText = 'position: fixed; right: 20px; top: 130px; width: 260px; z-index: 100; display: block !important;';
      
      // Ensure all buttons inside have consistent styling
      const allButtons = actionButtons.querySelectorAll('button');
      allButtons.forEach(button => {
        button.classList.add('btn');  // Ensure Bootstrap class is applied
        // Prevent any click events from changing the container display
        button.addEventListener('click', function(e) {
          e.stopPropagation();  // Stop event from bubbling up
          setTimeout(() => {
            // Force display back to block after any click
            actionButtons.style.display = 'block';
          }, 10);
        }, true);
      });
    }
  } else {
    corpDiv.style.display = "block";
    runnerDiv.style.display = "none";
    btn.textContent = "Voir côté Runner";
    
    // Completely hide runner buttons when viewing corp side
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }
  }
  
  // Dispatch an event to notify that the view has been toggled
  document.dispatchEvent(new CustomEvent('viewToggled', {
    detail: { view: isCorp ? 'runner' : 'corp' }
  }));
}