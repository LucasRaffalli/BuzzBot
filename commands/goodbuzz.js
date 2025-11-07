const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addWin } = require('../utils/leaderboard');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('goodbuzz')
        .setDescription('✅ Valide la réponse et donne 1 point au participant qui a buzzé')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
        // Récupérer l'état du BUZZ
        const buzzState = interaction.client.buzzState.get(interaction.guildId);
        
        if (!buzzState) {
            return interaction.reply({
                content: '❌ Aucun événement en cours! Utilisez `/startevent` pour démarrer un événement.',
                ephemeral: true
            });
        }
        
        // Vérifier que c'est le créateur ou un admin
        if (buzzState.createdBy !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut valider les réponses!',
                ephemeral: true
            });
        }
        
        console.log(`[Event ${buzzState.eventId}] Validation goodbuzz par ${interaction.user.tag}`);

        // MODE MULTI BUZZ - Gérer le vote
        if (buzzState.mode === 'multi' && buzzState.voteData) {
            const { getVoteResults } = require('../utils/multibuzzHandler');
            const results = getVoteResults(buzzState);
            
            if (!results || results.length === 0) {
                return interaction.reply({
                    content: '❌ Aucun vote en cours!',
                    ephemeral: true
                });
            }
            
            // Le gagnant du vote (le plus de votes)
            const winner = results[0];
            const losers = [results[1], results[2]];
            
            // Ajouter 2 points au gagnant
            const winnerPoints = addWin(interaction.guildId, winner.player.userId, winner.player.username);
            addWin(interaction.guildId, winner.player.userId, winner.player.username); // +1 de plus = +2 au total
            
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ MultiBuzz - Résultats!')
                .setDescription(
                    `**Résultats du vote:**\n\n` +
                    `🥇 **Gagnant:** <@${winner.player.userId}> (${winner.votes} votes)\n` +
                    `   └ **+2 points** (Total: ${winnerPoints})\n\n` +
                    `🥈 <@${losers[0].player.userId}> (${losers[0].votes} votes) - Pas de changement\n` +
                    `🥉 <@${losers[1].player.userId}> (${losers[1].votes} votes) - Pas de changement\n\n` +
                    `🎯 **La réponse est correcte!**`
                )
                .setTimestamp()
                .setFooter({ text: `Validé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [embed] });
            
            // Réinitialiser le MultiBuzz
            buzzState.multiBuzzers = [];
            buzzState.voteData = null;
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);
            
            // Renvoyer le bouton BUZZ
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);
            
            console.log(`✅ MultiBuzz validé - Gagnant: ${winner.player.username} (+2 pts)`);
            return;
        }

        // MODE SIMPLE BUZZ
        if (!buzzState.currentSpeaker) {
            return interaction.reply({
                content: '❌ Personne n\'a buzzé actuellement!',
                ephemeral: true
            });
        }
        
        try {
            // Récupérer le membre qui a buzzé
            const member = await interaction.guild.members.fetch(buzzState.currentSpeaker);
            
            // Ajouter 1 point au leaderboard
            const totalWins = addWin(interaction.guildId, member.id, member.user.tag);
            
            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Bonne réponse!')
                .setDescription(
                    `**${member.user}** a donné la bonne réponse!\n\n` +
                    `🏆 **+1 point**\n` +
                    `📊 Total: **${totalWins}** point${totalWins > 1 ? 's' : ''}`
                )
                .setTimestamp()
                .setFooter({ text: `Validé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [embed] });
            
            // Réinitialiser et renvoyer le bouton BUZZ
            buzzState.currentSpeaker = null;
            buzzState.canBuzz = true;
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);
            
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);
            
            console.log(`✅ ${member.user.tag} a reçu 1 point (Total: ${totalWins})`);
            
        } catch (error) {
            console.error('❌ Erreur lors de la validation:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la validation!',
                ephemeral: true
            });
        }
    },
};
