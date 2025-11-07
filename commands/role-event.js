const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-event')
        .setDescription('Configure le système de rôle buzzEvent')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    async execute(interaction) {
        // Vérifier les permissions du bot
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas la permission de gérer les rôles!',
                ephemeral: true
            });
        }

        // Chercher ou créer le rôle buzzEvent
        let role = interaction.guild.roles.cache.find(r => r.name === 'buzzEvent');
        
        if (!role) {
            try {
                role = await interaction.guild.roles.create({
                    name: 'buzzEvent',
                    color: '#FFA500', // Orange
                    reason: 'Rôle créé automatiquement par le bot pour les événements',
                    permissions: []
                });
                console.log(`✅ Rôle buzzEvent créé sur ${interaction.guild.name}`);
            } catch (error) {
                console.error('Erreur lors de la création du rôle:', error);
                return interaction.reply({
                    content: '❌ Erreur lors de la création du rôle. Vérifiez mes permissions!',
                    ephemeral: true
                });
            }
        }

        // Créer l'embed
        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('🔔 Notifications d\'événements')
            .setDescription(
                `Cliquez sur le bouton ci-dessous pour obtenir le rôle ${role}!\n\n` +
                `Ce rôle vous permettra d'être notifié des événements à venir.`
            )
            .setFooter({ text: 'Vous pouvez retirer le rôle à tout moment en cliquant à nouveau' });

        // Créer le bouton
        const button = new ButtonBuilder()
            .setCustomId('get_buzzEvent_role')
            .setLabel('Obtenir le rôle buzzEvent')
            .setEmoji('🔔')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder()
            .addComponents(button);

        // Envoyer le message
        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    },
};
