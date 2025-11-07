# 🎪 Système MultiBuzz - Guide d'implémentation

## ✅ Ce qui est fait

1. **Commande /startevent** modifiée
   - Option pour choisir entre SimpleBuzz et MultiBuzz
   - État du buzz stocke le mode choisi

2. **Utils/multibuzzHandler.js** créé
   - Gère l'ajout des 3 buzzers
   - Crée le système de vote automatiquement
   - Gère les votes des participants

## 🔧 Ce qu'il reste à faire manuellement

### Étape 1: Modifier events/interactionCreate.js

Dans la section `if (interaction.customId === 'buzz_to_speak')`, après la ligne 174 environ:

**Remplacer tout le code après "Démuter l'utilisateur" par:**

```javascript
// Démuter l'utilisateur
await interaction.member.voice.setMute(false, 'BUZZ activé!');

// MODE SIMPLE BUZZ
if (buzzState.mode === 'simple') {
    buzzState.canBuzz = false;
    buzzState.currentSpeaker = interaction.user.id;

    await interaction.reply({
        content: '🔔 **BUZZ!** Vous êtes le plus rapide! Vous pouvez maintenant parler!\n⏳ En attente de la validation de l\'admin...',
        ephemeral: true
    });

    await interaction.followUp({
        content: `⚡ **${interaction.user}** a été le plus rapide et peut maintenant parler!\n\n🎯 Admin: Utilisez \`/goodbuzz\` pour donner 1 point ou \`/badbuzz\` pour passer au suivant.`,
        ephemeral: false
    });
    
    console.log(`✓ ${interaction.user.tag} a gagné le BUZZ (SimpleBuzz)`);
}
// MODE MULTI BUZZ
else {
    const { handleMultiBuzz } = require('../utils/multibuzzHandler');
    await handleMultiBuzz(interaction, buzzState);
}
```

### Étape 2: Ajouter la gestion des votes

Toujours dans events/interactionCreate.js, **après** la section du bouton `buzz_to_speak`, ajouter:

```javascript
// Gérer les votes MultiBuzz
if (interaction.customId.startsWith('vote_')) {
    const buzzState = interaction.client.buzzState.get(interaction.guildId);
    if (buzzState && buzzState.mode === 'multi') {
        const { handleVote } = require('../utils/multibuzzHandler');
        await handleVote(interaction, buzzState);
    }
}
```

### Étape 3: Modifier commands/goodbuzz.js

Ajouter la gestion des points MultiBuzz:

**Au début de la commande, après avoir récupéré buzzState:**

```javascript
const buzzState = interaction.client.buzzState.get(interaction.guildId);

if (!buzzState) {
    return interaction.reply({
        content: '❌ Aucun événement en cours!',
        ephemeral: true
    });
}

// MODE MULTI BUZZ - Afficher les résultats du vote
if (buzzState.mode === 'multi' && buzzState.voteData) {
    const { getVoteResults } = require('../utils/multibuzzHandler');
    const results = getVoteResults(buzzState);
    
    // Le gagnant du vote (le plus de votes)
    const winner = results[0];
    // Les perdants (2 derniers)
    const losers = [results[1], results[2]];
    
    // Ajouter 2 points au gagnant
    const { addWin } = require('../utils/leaderboard');
    const winnerPoints = addWin(interaction.guildId, winner.player.userId, winner.player.username);
    addWin(interaction.guildId, winner.player.userId, winner.player.username); // +2 au total
    
    // Retirer 2 points aux perdants (vous pouvez créer une fonction removePoints)
    // Pour l'instant on les affiche juste
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ MultiBuzz - Résultats!')
        .setDescription(
            `**Résultats du vote:**\n\n` +
            `🥇 **Gagnant:** <@${winner.player.userId}> (${winner.votes} votes)\n` +
            `   └ +2 points (Total: ${winnerPoints})\n\n` +
            `🥈 <@${losers[0].player.userId}> (${losers[0].votes} votes) - Pas de changement\n` +
            `🥉 <@${losers[1].player.userId}> (${losers[1].votes} votes) - Pas de changement\n\n` +
            `🎯 **La réponse est correcte!**`
        )
        .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Réinitialiser le MultiBuzz
    buzzState.multiBuzzers = [];
    buzzState.voteData = null;
    
    return;
}
```

## 🎮 Fonctionnement final

1. `/startevent mode:MultiBuzz` - Admin démarre
2. 3 personnes buzzent → Tous démutés
3. Ils discutent et donnent leur réponse
4. Les autres votent pour la meilleure réponse
5. `/goodbuzz` - Admin valide → Le gagnant du vote reçoit +2 points

## 📝 Note

Les fichiers sont prêts mais nécessitent ces modifications manuelles dans interactionCreate.js et goodbuzz.js à cause de problèmes d'encodage.

Voulez-vous que je vous aide à faire ces modifications?
