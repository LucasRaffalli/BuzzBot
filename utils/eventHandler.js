const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    const eventsPath = path.join(__dirname, '../events');
    
    // Vérifier si le dossier events existe
    if (!fs.existsSync(eventsPath)) {
        console.warn('⚠️ Le dossier events n\'existe pas');
        return;
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    if (eventFiles.length === 0) {
        console.warn('⚠️ Aucun événement trouvé dans le dossier events');
        return;
    }
    
    let loadedEvents = 0;
    
    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            // Vérifier que l'événement a les propriétés requises
            if ('name' in event && 'execute' in event) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                loadedEvents++;
                console.log(`   ✓ Événement chargé: ${event.name}`);
            } else {
                console.warn(`   ⚠️ L'événement ${file} est mal formaté`);
            }
        } catch (error) {
            console.error(`   ❌ Erreur lors du chargement de ${file}:`, error.message);
        }
    }
    
    console.log(`📅 ${loadedEvents} événement(s) chargé(s)`);
};
