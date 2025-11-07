const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Gère le système MultiBuzz avec votes
 */

// Gérer l'ajout d'un buzzer en mode MultiBuzz
async function handleMultiBuzz(interaction, buzzState) {
    // Ajouter le buzzer à la liste
    buzzState.multiBuzzers.push({
        userId: interaction.user.id,
        username: interaction.user.tag,
        member: interaction.member
    });

    const position = buzzState.multiBuzzers.length;

    await interaction.reply({
        content: `🔔 **BUZZ!** Vous êtes le n°${position}! Vous pouvez maintenant parler!`,
        ephemeral: true
    });

    // Si c'est le 3ème, créer le système de vote
    if (buzzState.multiBuzzers.length === 3) {
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🎪 MultiBuzz - 3 participants!')
            .setDescription(
                `Les 3 plus rapides peuvent maintenant parler:\n\n` +
                `1️⃣ <@${buzzState.multiBuzzers[0].userId}>\n` +
                `2️⃣ <@${buzzState.multiBuzzers[1].userId}>\n` +
                `3️⃣ <@${buzzState.multiBuzzers[2].userId}>\n\n` +
                `💬 **Discutez et votez pour la meilleure réponse!**\n\n` +
                `🗳️ Votez ci-dessous pour désigner qui vous pensez avoir la meilleure réponse.\n` +
                `🎯 L'admin utilisera ensuite \`/goodbuzz\` pour valider si la réponse est correcte.`
            );

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('vote_1')
                    .setLabel(`${buzzState.multiBuzzers[0].username.split('#')[0]}`)
                    .setEmoji('1️⃣')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('vote_2')
                    .setLabel(`${buzzState.multiBuzzers[1].username.split('#')[0]}`)
                    .setEmoji('2️⃣')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('vote_3')
                    .setLabel(`${buzzState.multiBuzzers[2].username.split('#')[0]}`)
                    .setEmoji('3️⃣')
                    .setStyle(ButtonStyle.Primary)
            );

        await interaction.followUp({
            embeds: [embed],
            components: [row1]
        });

        // Initialiser les votes
        buzzState.voteData = {
            votes: { '1': [], '2': [], '3': [] }
        };

        console.log(`✓ MultiBuzz complet - 3 buzzers prêts à voter`);
    } else {
        await interaction.followUp({
            content: `⚡ **${interaction.user}** est le n°${position}! ${3 - position} place(s) restante(s)...`,
            ephemeral: false
        });
    }
}

// Gérer un vote
async function handleVote(interaction, buzzState) {
    if (!buzzState.voteData) {
        return interaction.reply({
            content: '❌ Aucun vote en cours!',
            ephemeral: true
        });
    }

    const voteNumber = interaction.customId.split('_')[1]; // 'vote_1' -> '1'
    const voterId = interaction.user.id;

    // Vérifier si l'utilisateur a déjà voté
    const hasVoted = Object.values(buzzState.voteData.votes).some(votes => votes.includes(voterId));
    
    if (hasVoted) {
        return interaction.reply({
            content: '⚠️ Vous avez déjà voté!',
            ephemeral: true
        });
    }

    // Enregistrer le vote
    buzzState.voteData.votes[voteNumber].push(voterId);

    await interaction.reply({
        content: `✅ Votre vote pour **${buzzState.multiBuzzers[parseInt(voteNumber) - 1].username}** a été enregistré!`,
        ephemeral: true
    });

    // Afficher les résultats actuels
    const totalVotes = Object.values(buzzState.voteData.votes).reduce((sum, votes) => sum + votes.length, 0);
    console.log(`✓ Vote enregistré (${totalVotes} votes au total)`);
}

// Obtenir les résultats du vote
function getVoteResults(buzzState) {
    if (!buzzState.voteData) {
        return null;
    }

    const results = [];
    for (let i = 1; i <= 3; i++) {
        results.push({
            player: buzzState.multiBuzzers[i - 1],
            votes: buzzState.voteData.votes[i.toString()].length
        });
    }

    // Trier par nombre de votes (décroissant)
    results.sort((a, b) => b.votes - a.votes);

    return results;
}

module.exports = {
    handleMultiBuzz,
    handleVote,
    getVoteResults
};
