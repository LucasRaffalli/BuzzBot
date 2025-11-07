const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addWin, removePoints, getUserStats } = require('../utils/leaderboard');
const { sendBuzzButton } = require('../utils/buzzButton');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('attackfail')
        .setDescription('⚔️ L\'attaquant a répondu incorrectement')
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
        
        console.log(`[Event ${buzzState.eventId}] Attaque échouée par ${interaction.user.tag}`);

        const { attacker, target } = buzzState.attackData;

        try {
            // Récupérer les membres
            const attackerMember = await interaction.guild.members.fetch(attacker.userId);
            const targetMember = await interaction.guild.members.fetch(target.userId);

            // Attaquant perd -1 point
            const attackerStats = getUserStats(interaction.guildId, attacker.userId);
            let attackerNewTotal = 0;
            
            if (attackerStats && attackerStats.wins > 0) {
                const removeResult = removePoints(interaction.guildId, attacker.userId, 1);
                attackerNewTotal = removeResult.success ? removeResult.newTotal : attackerStats.wins;
            }

            // Cible gagne +1 point
            const targetNewTotal = addWin(interaction.guildId, target.userId, target.username);

            const embed = new EmbedBuilder()
                .setColor('#8B0000')
                .setTitle('⚔️ Attaque échouée!')
                .setDescription(
                    `**${attackerMember.user}** a incorrectement répondu!\n\n` +
                    `💔 **Attaquant:** ${attackerMember.user}\n` +
                    `   └ **-1 point** (Total: ${attackerNewTotal})\n\n` +
                    `🎯 **Cible:** ${targetMember.user}\n` +
                    `   └ **+1 point** (Total: ${targetNewTotal})\n\n` +
                    `❌ **L'attaque a échoué!**`
                )
                .setTimestamp()
                .setFooter({ text: `Validé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed] });

            // Remute l'attaquant
            await attackerMember.voice.setMute(true, 'Attaque échouée');

            // Réinitialiser l'état d'attaque
            buzzState.attackData = null;
            buzzState.currentSpeaker = null;
            buzzState.canBuzz = true;

            // Sauvegarder les modifications
            interaction.client.buzzState.set(interaction.guildId, buzzState);
            syncBuzzState(interaction.client, interaction.guildId);

            // Renvoyer le bouton BUZZ
            await sendBuzzButton(interaction.client, interaction.guildId, buzzState);

            console.log(`⚔️ Attaque échouée: ${attacker.username} (-1) vs ${target.username} (+1)`);

        } catch (error) {
            console.error('❌ Erreur lors de la validation de l\'attaque:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors de la validation de l\'attaque!',
                ephemeral: true
            });
        }
    },
};
