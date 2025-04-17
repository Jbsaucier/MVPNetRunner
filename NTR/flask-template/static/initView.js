// Affiche la bonne vue selon current_view au chargement
(function() {
  const game = window.initialGame || null;
  if (game) {
    if (game.current_view === "corp") {
      document.getElementById("corpView").style.display = "";
      document.getElementById("runnerView").style.display = "none";
      document.getElementById("toggleViewBtn").textContent = "Voir côté Runner";
    } else {
      document.getElementById("corpView").style.display = "none";
      document.getElementById("runnerView").style.display = "";
      document.getElementById("toggleViewBtn").textContent = "Voir côté Corp";
    }
  } else {
    fetch("/api/game")
      .then(r => r.json())
      .then(game => {
        if (game.current_view === "corp") {
          document.getElementById("corpView").style.display = "";
          document.getElementById("runnerView").style.display = "none";
          document.getElementById("toggleViewBtn").textContent = "Voir côté Runner";
        } else {
          document.getElementById("corpView").style.display = "none";
          document.getElementById("runnerView").style.display = "";
          document.getElementById("toggleViewBtn").textContent = "Voir côté Corp";
        }
      });
  }
})();