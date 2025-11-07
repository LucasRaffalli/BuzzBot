const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { resetGuildLeaderboard } = require('../utils/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetleaderboard')
        .setDescription('⚠️ Réinitialise complètement le classement du serveur')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    async execute(interaction) {
        // Confirmation avant suppression
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('⚠️ Confirmation requise')
            .setDescription(
                '**Êtes-vous sûr de vouloir réinitialiser le leaderboard?**\n\n' +
                '⚠️ Cette action est **IRRÉVERSIBLE**!\n' +
                '📊 Toutes les statistiques seront **définitivement supprimées**.\n\n' +
                'Tapez `/resetleaderboard` à nouveau dans les 30 secondes pour confirmer.'
            );
        
        // Vérifier si c'est la première fois ou la confirmation
        const confirmKey = `reset_confirm_${interaction.guildId}_${interaction.user.id}`;
        
        if (!interaction.client.resetConfirmations) {
            interaction.client.resetConfirmations = new Map();
        }
        
        const lastConfirm = interaction.client.resetConfirmations.get(confirmKey);
        const now = Date.now();
        
        // Si pas de confirmation ou expirée (> 30 secondes)
        if (!lastConfirm || (now - lastConfirm) > 30000) {
            interaction.client.resetConfirmations.set(confirmKey, now);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // Confirmation validée, procéder à la réinitialisation
        const success = resetGuildLeaderboard(interaction.guildId);
        
        // Nettoyer la confirmation
        interaction.client.resetConfirmations.delete(confirmKey);
        
        if (success) {
            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Leaderboard réinitialisé')
                .setDescription(
                    'Le classement a été complètement réinitialisé!\n\n' +
                    'Toutes les statistiques ont été supprimées.'
                )
                .setTimestamp()
                .setFooter({ text: `Par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
            
            await interaction.reply({ embeds: [successEmbed] });
            console.log(`✅ Leaderboard réinitialisé sur ${interaction.guild.name} par ${interaction.user.tag}`);
        } else {
            await interaction.reply({
                content: '❌ Aucune statistique à réinitialiser ou erreur lors de la réinitialisation.',
                ephemeral: true
            });
        }
    },
};
