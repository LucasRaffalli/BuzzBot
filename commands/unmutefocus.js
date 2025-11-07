const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmutefocus')
        .setDescription('Démute des personnes spécifiques dans le canal vocal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addUserOption(option =>
            option.setName('user1')
                .setDescription('Première personne à démuter')
                .setRequired(true)
        )
        .addUserOption(option =>
            option.setName('user2')
                .setDescription('Deuxième personne à démuter')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user3')
                .setDescription('Troisième personne à démuter')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user4')
                .setDescription('Quatrième personne à démuter')
                .setRequired(false)
        )
        .addUserOption(option =>
            option.setName('user5')
                .setDescription('Cinquième personne à démuter')
                .setRequired(false)
        ),
    
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
        
        // Vérifier si l'utilisateur est dans un canal vocal
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ Vous devez être dans un canal vocal pour utiliser cette commande!',
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
            // Récupérer tous les utilisateurs spécifiés
            const users = [];
            for (let i = 1; i <= 5; i++) {
                const user = interaction.options.getUser(`user${i}`);
                if (user) {
                    users.push(user);
                }
            }

            if (users.length === 0) {
                return interaction.reply({
                    content: '❌ Vous devez spécifier au moins un utilisateur!',
                    ephemeral: true
                });
            }

            // Démuter chaque utilisateur
            const results = {
                success: [],
                notInVoice: [],
                alreadyUnmuted: [],
                errors: []
            };

            for (const user of users) {
                try {
                    const member = await interaction.guild.members.fetch(user.id);
                    
                    // Vérifier si le membre est dans le canal vocal
                    if (!member.voice.channel) {
                        results.notInVoice.push(user.tag);
                        continue;
                    }

                    // Vérifier si déjà démuté
                    if (!member.voice.serverMute) {
                        results.alreadyUnmuted.push(user.tag);
                        continue;
                    }

                    // Démuter
                    await member.voice.setMute(false, `Focus démute par ${interaction.user.tag}`);
                    results.success.push(user.tag);
                    
                } catch (error) {
                    console.error(`Erreur lors du démute de ${user.tag}:`, error.message);
                    results.errors.push(user.tag);
                }
            }

            // Créer l'embed de résultat
            const embed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎤 Démute Focus')
                .setTimestamp()
                .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            let description = '';

            if (results.success.length > 0) {
                description += `✅ **Démutés:** (${results.success.length})\n`;
                results.success.forEach(tag => {
                    description += `• ${tag}\n`;
                });
                description += '\n';
            }

            if (results.alreadyUnmuted.length > 0) {
                description += `ℹ️ **Déjà démutés:** (${results.alreadyUnmuted.length})\n`;
                results.alreadyUnmuted.forEach(tag => {
                    description += `• ${tag}\n`;
                });
                description += '\n';
            }

            if (results.notInVoice.length > 0) {
                description += `⚠️ **Pas dans le vocal:** (${results.notInVoice.length})\n`;
                results.notInVoice.forEach(tag => {
                    description += `• ${tag}\n`;
                });
                description += '\n';
            }

            if (results.errors.length > 0) {
                description += `❌ **Erreurs:** (${results.errors.length})\n`;
                results.errors.forEach(tag => {
                    description += `• ${tag}\n`;
                });
            }

            embed.setDescription(description || 'Aucune action effectuée.');

            await interaction.reply({ embeds: [embed] });

            console.log(`✅ Focus démute par ${interaction.user.tag}: ${results.success.length} personne(s)`);

        } catch (error) {
            console.error('❌ Erreur lors du démute focus:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du démute!',
                ephemeral: true
            });
        }
    },
};
