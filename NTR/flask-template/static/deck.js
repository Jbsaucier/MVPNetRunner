// Initialize server cards from deck data

// Function to create unique instances of cards based on quantity
function createUniqueCards(cards) {
  const uniqueCards = [];
  
  cards.forEach(card => {
    for (let i = 0; i < card.quantity; i++) {
      const uniqueCard = { ...card };
      // Create unique card_code for duplicates
      if (card.quantity > 1) {
        uniqueCard.card_code = `${card.card_code}-${i+1}`;
      }
      // Remove quantity as it's no longer needed for individual cards
      delete uniqueCard.quantity;
      // Add additional card properties needed for game
      uniqueCard.id = uniqueCard.card_code;
      uniqueCard.faceup = false;
      uniqueCard.tokens = 0;
      uniqueCard.image_url = `/static/img/cards/${uniqueCard.card_code.split('-')[0]}.jpg`;
      
      uniqueCards.push(uniqueCard);
    }
  });
  
  return uniqueCards;
}

// Initialize Corp servers (R&D, HQ, Archives)
function initializeCorpServers() {
  return fetch('/api/deck')
    .then(response => response.json())
    .then(deckData => {
      const corpDeck = deckData.syndicate_deck;
      const uniqueCards = createUniqueCards(corpDeck.cards);
      
      // Shuffle the cards
      const shuffledCards = [...uniqueCards].sort(() => Math.random() - 0.5);
      
      // Set up Corp servers
      const servers = {
        central: [
          {
            id: "rd",
            name: "R&D",
            ice: [],
            cards: shuffledCards // All cards go to R&D initially
          },
          {
            id: "hq",
            name: "HQ",
            ice: [],
            cards: [] // Corp hand
          },
          {
            id: "archives",
            name: "Archives",
            ice: [],
            cards: [] // Discard pile
          }
        ],
        remote: []
      };
      
      return servers;
    });
}

// Initialize Runner stack in the correct format for rig.json
function initializeRunnerStack() {
  return fetch('/api/deck')
    .then(response => response.json())
    .then(deckData => {
      const runnerDeck = deckData.catalyst_deck;
      const uniqueCards = createUniqueCards(runnerDeck.cards);
      
      // Shuffle the cards
      const shuffledCards = [...uniqueCards].sort(() => Math.random() - 0.5);
      
      // Create rig structure that matches your rig.json format
      const rigData = [
        {
          "rig_id": "heap",
          "user_id": "",
          "cards": []
        },
        {
          "rig_id": "stack",
          "user_id": "",
          "cards": shuffledCards  // Put all runner cards in the stack
        },
        {
          "rig_id": "identity",
          "user_id": "",
          "cards": []
        },
        {
          "rig_id": "programs",
          "user_id": "",
          "cards": []
        },
        {
          "rig_id": "hardware",
          "user_id": "",
          "cards": []
        },
        {
          "rig_id": "resources",
          "user_id": "",
          "cards": []
        }
      ];
      
      return rigData;
    });
}

// Also add a function to actually update the rig.json via API
function updateRunnerRig() {
  return initializeRunnerStack()
    .then(rigData => {
      // Post the data to update the rig.json file
      return fetch('/api/rigs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rigData)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to update rig data: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('Rig data updated successfully');
        return data;
      });
    })
    .catch(error => {
      console.error('Error updating rig data:', error);
    });
}

// Export functions 
window.deckUtils = {
  initializeCorpServers,
  initializeRunnerStack,
  updateRunnerRig  // Add the new function to the exports
};
