const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmutebuzz')
        .setDescription('Démute tous les participants pour permettre à tout le monde de parler')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
    
    async execute(interaction) {
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
                content: '❌ Seul le créateur de l\'événement ou un administrateur peut utiliser cette commande!',
                ephemeral: true
            });
        }
        
        // Vérifier si le bot est dans un canal vocal
        const connection = getVoiceConnection(interaction.guildId);
        
        if (!connection) {
            return interaction.reply({
                content: '❌ Aucun événement n\'est en cours!',
                ephemeral: true
            });
        }

        // Vérifier si l'utilisateur est dans un canal vocal
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ Vous devez être dans le canal vocal pour utiliser cette commande!',
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;

        // Vérifier les permissions
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionFlagsBits.MuteMembers)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas la permission de démuter les membres!',
                ephemeral: true
            });
        }

        try {
            // Démuter tous les membres (sauf les bots)
            const members = voiceChannel.members.filter(member => !member.user.bot);
            let unmutedCount = 0;

            for (const [, member] of members) {
                try {
                    if (member.voice.serverMute) {
                        await member.voice.setMute(false, `Démute libre par ${interaction.user.tag}`);
                        unmutedCount++;
                    }
                } catch (error) {
                    console.error(`Erreur lors du démute de ${member.user.tag}:`, error.message);
                }
            }

            console.log(`✅ UNMUTE BUZZ: ${unmutedCount} membre(s) démuté(s) par ${interaction.user.tag}`);

            // Désactiver le système BUZZ (tout le monde peut parler librement)
            const buzzState = interaction.client.buzzState.get(interaction.guildId);
            if (buzzState) {
                buzzState.canBuzz = false; // Désactiver le BUZZ
                buzzState.currentSpeaker = null;
            }

            // Créer l'embed de confirmation
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🔓 Discussion libre!')
                .setDescription(
                    `Tous les participants ont été démutés!\n\n` +
                    `**${unmutedCount}** personne(s) démutée(s)\n\n` +
                    `Tout le monde peut maintenant parler librement.\n` +
                    `Utilisez \`/rebuzz\` pour réactiver le système BUZZ.`
                )
                .setTimestamp()
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('❌ Erreur lors du démute:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du démute!',
                ephemeral: true
            });
        }
    },
};
