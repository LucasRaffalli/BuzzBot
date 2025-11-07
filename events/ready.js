const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    
    execute(client) {
        console.log('\n╔════════════════════════════════════╗');
        console.log(`║  ✅ Bot connecté: ${client.user.tag.padEnd(18)} ║`);
        console.log('╚════════════════════════════════════╝');
        console.log(`📊 Serveurs: ${client.guilds.cache.size}`);
        console.log(`👥 Utilisateurs: ${client.users.cache.size}`);
        console.log(`📝 Commandes: ${client.commands.size}`);
        console.log('════════════════════════════════════\n');
        
        // Définir le statut du bot
        client.user.setPresence({
            activities: [{ name: 'vos commandes | /help', type: 3 }],
            status: 'online'
        });
    },
};
