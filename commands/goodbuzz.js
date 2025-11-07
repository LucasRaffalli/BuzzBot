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
            
            // Démuter les 3 joueurs pour discuter
            const voiceChannel = interaction.guild.channels.cache.get(buzzState.voiceChannelId);
            if (voiceChannel) {
                const members = voiceChannel.members.filter(m => !m.user.bot);
                let unmutedCount = 0;
                for (const [, m] of members) {
                    try {
                        if (m.voice.serverMute) {
                            await m.voice.setMute(false, 'MultiBuzz validé - discussion libre');
                            unmutedCount++;
                        }
                    } catch (err) {
                        console.error(`Erreur lors du démute de ${m.user.tag}:`, err.message);
                    }
                }
                console.log(`🔓 ${unmutedCount} personne(s) démutée(s) pour discussion`);
            }
            
            // Réinitialiser le MultiBuzz (VERROUILLÉ - en attente de /rebuzz)
            buzzState.multiBuzzers = [];
            buzzState.voteData = null;
            buzzState.canBuzz = false; // VERROUILLÉ
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);
            
            console.log(`✅ MultiBuzz validé - Gagnant: ${winner.player.username} (+2 pts) - Tout le monde démuté`);
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
            
            // Démuter tout le monde pour discuter
            const voiceChannel = interaction.guild.channels.cache.get(buzzState.voiceChannelId);
            if (voiceChannel) {
                const members = voiceChannel.members.filter(m => !m.user.bot);
                let unmutedCount = 0;
                for (const [, m] of members) {
                    try {
                        if (m.voice.serverMute) {
                            await m.voice.setMute(false, 'Bonne réponse - discussion libre');
                            unmutedCount++;
                        }
                    } catch (err) {
                        console.error(`Erreur lors du démute de ${m.user.tag}:`, err.message);
                    }
                }
                console.log(`🔓 ${unmutedCount} personne(s) démutée(s) pour discussion`);
            }
            
            // Réinitialiser (VERROUILLÉ - en attente de /rebuzz)
            buzzState.currentSpeaker = null;
            buzzState.canBuzz = false; // VERROUILLÉ
            buzzState.attackData = null;
            
            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);
            
            console.log(`✅ ${member.user.tag} a reçu 1 point (Total: ${totalWins}) - Tout le monde démuté`);
            
        } catch (error) {
            console.error('❌ Erreur lors de la validation:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la validation!',
                ephemeral: true
            });
        }
    },
};
