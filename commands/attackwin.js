const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addWin, removePoints, getUserStats } = require('../utils/leaderboard');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attackwin')
        .setDescription('⚔️ L\'attaquant a répondu correctement')
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
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut valider les attaques!',
                ephemeral: true
            });
        }

        if (!buzzState.attackData) {
            return interaction.reply({
                content: '❌ Aucune attaque en cours! L\'attaquant doit d\'abord buzzer et choisir sa cible.',
                ephemeral: true
            });
        }
        
        console.log(`[Event ${buzzState.eventId}] Attaque réussie par ${interaction.user.tag}`);

        const { attacker, target } = buzzState.attackData;

        try {
            // Récupérer les membres
            const attackerMember = await interaction.guild.members.fetch(attacker.userId);
            const targetMember = await interaction.guild.members.fetch(target.userId);

            // Attaquant gagne +1 point
            const attackerNewTotal = addWin(interaction.guildId, attacker.userId, attacker.username);

            // Cible perd -1 point
            const targetStats = getUserStats(interaction.guildId, target.userId);
            let targetNewTotal = 0;
            
            if (targetStats && targetStats.wins > 0) {
                const removeResult = removePoints(interaction.guildId, target.userId, 1);
                targetNewTotal = removeResult.success ? removeResult.newTotal : targetStats.wins;
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('⚔️ Attaque réussie!')
                .setDescription(
                    `**${attackerMember.user}** a correctement répondu!\n\n` +
                    `🎯 **Attaquant:** ${attackerMember.user}\n` +
                    `   └ **+1 point** (Total: ${attackerNewTotal})\n\n` +
                    `💔 **Cible:** ${targetMember.user}\n` +
                    `   └ **-1 point** (Total: ${targetNewTotal})\n\n` +
                    `✅ **L'attaque a réussi!**`
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
                            await m.voice.setMute(false, 'Attaque réussie - discussion libre');
                            unmutedCount++;
                        }
                    } catch (err) {
                        console.error(`Erreur lors du démute de ${m.user.tag}:`, err.message);
                    }
                }
                console.log(`🔓 ${unmutedCount} personne(s) démutée(s) pour discussion`);
            }

            // Réinitialiser l'état d'attaque (VERROUILLÉ - en attente de /rebuzz)
            buzzState.attackData = null;
            buzzState.currentSpeaker = null;
            buzzState.canBuzz = false; // VERROUILLÉ

            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);

            console.log(`⚔️ Attaque réussie: ${attacker.username} (+1) vs ${target.username} (-1) - Tout le monde démuté`);

        } catch (error) {
            console.error('❌ Erreur lors de la validation de l\'attaque:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la validation de l\'attaque!',
                ephemeral: true
            });
        }
    },
};
